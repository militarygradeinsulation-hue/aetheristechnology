// Receives inbound email from a Cloudflare Email Worker (or compatible MIME poster).
// Authenticates via shared INBOUND_EMAIL_SECRET header, parses MIME, and stores
// the message in the matching rep mailbox.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
// @ts-ignore - postal-mime esm bundle
import PostalMime from "https://esm.sh/postal-mime@2.2.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-inbound-secret",
};

function normalizeAddr(a: any): string {
  if (!a) return "";
  if (typeof a === "string") return a.trim().toLowerCase();
  if (a.address) return String(a.address).trim().toLowerCase();
  return "";
}

function normalizeList(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeAddr).filter(Boolean);
}

function normalizeSubject(s: string | null | undefined): string {
  return String(s || "")
    .replace(/^(?:re|fwd?|aw|tr):\s*/gi, "")
    .replace(/^(?:re|fwd?|aw|tr):\s*/gi, "")
    .trim()
    .toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const expected = Deno.env.get("INBOUND_EMAIL_SECRET");
    const provided = req.headers.get("x-inbound-secret");
    if (!expected || !provided || provided !== expected) {
      return new Response("Unauthorized", { status: 401 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SVC);

    // Accept either { raw: "<base64-or-string mime>", to?: "..." } or raw MIME body
    const ctype = req.headers.get("content-type") || "";
    let rawMime: string;
    let routedTo: string | null = null;
    if (ctype.includes("application/json")) {
      const body = await req.json();
      const raw = body?.raw;
      if (!raw) return new Response("Missing raw MIME", { status: 400 });
      // Allow base64-encoded MIME
      if (typeof raw === "string" && /^[A-Za-z0-9+/=\r\n]+$/.test(raw) && raw.length > 200 && !raw.includes(":")) {
        try {
          rawMime = atob(raw.replace(/\s+/g, ""));
        } catch {
          rawMime = String(raw);
        }
      } else {
        rawMime = String(raw);
      }
      routedTo = body?.to ? String(body.to).toLowerCase() : null;
    } else {
      rawMime = await req.text();
    }

    // Auto-loop guard for MIME we generate ourselves
    if (/^Auto-Submitted:\s*auto-replied/im.test(rawMime)) {
      return new Response(JSON.stringify({ ignored: "auto-reply loop" }), { status: 200 });
    }

    const parser = new PostalMime();
    const parsed = await parser.parse(rawMime);

    const fromObj = parsed.from || {};
    const fromAddress = normalizeAddr(fromObj);
    const fromName = (fromObj as any)?.name || null;
    const toList = normalizeList(parsed.to);
    const ccList = normalizeList(parsed.cc);
    const subject = parsed.subject || "(no subject)";
    const bodyText = parsed.text || "";
    const bodyHtml = parsed.html || "";
    const messageId = parsed.messageId || `<${crypto.randomUUID()}@inbound>`;
    const inReplyTo = parsed.inReplyTo || null;

    // Decide which mailbox this is for
    const targets = routedTo
      ? [routedTo]
      : [...toList, ...ccList];
    if (targets.length === 0) {
      return new Response(JSON.stringify({ ignored: "no recipients" }), { status: 200 });
    }

    const { data: mailboxes } = await sb
      .from("rep_mailboxes")
      .select("*")
      .in("address", targets);

    if (!mailboxes || mailboxes.length === 0) {
      console.log("Inbound for unknown mailbox", { targets, fromAddress, subject });
      return new Response(JSON.stringify({ ignored: "no matching mailbox" }), { status: 200 });
    }

    // Persist raw MIME for forensic recovery
    const rawPath = `raw/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.eml`;
    try {
      await sb.storage.from("rep-email-attachments").upload(
        rawPath,
        new Blob([rawMime], { type: "message/rfc822" }),
        { upsert: false },
      );
    } catch (e) {
      console.warn("Failed to store raw MIME", e);
    }

    // Upload attachments to storage
    const attMeta: any[] = [];
    for (const att of parsed.attachments || []) {
      try {
        const buf = att.content instanceof Uint8Array ? att.content : new Uint8Array(att.content);
        const safeName = String(att.filename || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
        const path = `attachments/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await sb.storage
          .from("rep-email-attachments")
          .upload(path, new Blob([buf], { type: att.mimeType || "application/octet-stream" }), { upsert: false });
        if (!upErr) {
          attMeta.push({
            name: safeName,
            size: buf.byteLength,
            mime: att.mimeType || "application/octet-stream",
            storage_path: path,
          });
        }
      } catch (e) {
        console.warn("attachment upload failed", e);
      }
    }

    // Thread by In-Reply-To, fall back to normalized subject
    let threadId: string | null = null;
    if (inReplyTo) {
      const { data: parent } = await sb
        .from("rep_email_messages")
        .select("thread_id")
        .eq("message_id", inReplyTo)
        .maybeSingle();
      threadId = parent?.thread_id || inReplyTo;
    } else {
      const norm = normalizeSubject(subject);
      if (norm) {
        const { data: sib } = await sb
          .from("rep_email_messages")
          .select("thread_id")
          .ilike("subject", `%${norm}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        threadId = sib?.thread_id || messageId;
      } else {
        threadId = messageId;
      }
    }

    for (const m of mailboxes) {
      const addr = String(m.address).toLowerCase();
      if (!m.is_active) continue;
      await sb.from("rep_email_messages").insert({
        mailbox_address: addr,
        direction: "inbound",
        folder: "inbox",
        from_address: fromAddress,
        from_name: fromName,
        to_addresses: toList,
        cc_addresses: ccList,
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
        message_id: messageId,
        in_reply_to: inReplyTo,
        thread_id: threadId,
        attachments: attMeta,
        raw_mime_path: rawPath,
        is_read: false,
      });

      await sb
        .from("rep_mailboxes")
        .update({ last_inbound_at: new Date().toISOString() })
        .eq("id", m.id);

      // Optional forwarding
      if (m.forwarding_to) {
        try {
          await sb.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              message_id: `<fwd-${crypto.randomUUID()}@aetheris.technology>`,
              to: m.forwarding_to,
              from: `<${addr}>`,
              sender_domain: "notify.aetheris.technology",
              subject: `[Fwd] ${subject}`,
              html: bodyHtml || `<pre>${bodyText.replace(/[<>&]/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" } as any)[c])}</pre>`,
              text: `Originally to ${addr} from ${fromAddress}\n\n${bodyText}`,
              purpose: "transactional",
              label: "rep-mail-forward",
              headers: { "Auto-Submitted": "auto-forwarded" },
              queued_at: new Date().toISOString(),
            },
          });
        } catch (e) {
          console.warn("forwarding failed", e);
        }
      }

      // Optional auto-reply (anti-loop: only to non-auto senders, once per sender per 24h)
      if (m.auto_reply_enabled && m.auto_reply_body && fromAddress) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: recentReplies } = await sb
          .from("rep_email_messages")
          .select("id", { count: "exact", head: true })
          .eq("mailbox_address", addr)
          .eq("direction", "outbound")
          .contains("to_addresses", [fromAddress])
          .gte("created_at", since);
        if ((recentReplies || 0) === 0) {
          try {
            await sb.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                message_id: `<auto-${crypto.randomUUID()}@aetheris.technology>`,
                to: fromAddress,
                from: `<${addr}>`,
                sender_domain: "notify.aetheris.technology",
                subject: `Re: ${subject}`,
                html: m.auto_reply_body.replace(/\n/g, "<br/>"),
                text: m.auto_reply_body,
                purpose: "transactional",
                label: "rep-mail-autoreply",
                headers: { "Auto-Submitted": "auto-replied" },
                queued_at: new Date().toISOString(),
              },
            });
          } catch (e) {
            console.warn("auto-reply enqueue failed", e);
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, count: mailboxes.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("inbound-email-webhook error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

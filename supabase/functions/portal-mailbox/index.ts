// Portal-side mailbox API for reps (read inbox, send mail, manage settings).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_DOMAIN = "aetheris.technology";
const SENDER_DOMAIN = "notify.aetheris.technology";
const DAILY_SEND_LIMIT = 100;

function isValidEmail(addr: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,63}@[a-z0-9.-]+\.[a-z]{2,}$/i.test(addr);
}

function htmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function textToHtml(text: string): string {
  return htmlEscape(text).replace(/\n/g, "<br/>");
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function getMailboxForCode(sb: any, code: string) {
  const { data } = await sb
    .from("rep_mailboxes")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
    if (!claims) return json(401, { error: "Unauthorized" });

    const sb = createClient(SUPABASE_URL, SVC);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    const mailbox = await getMailboxForCode(sb, claims.code);
    if (!mailbox) return json(404, { error: "no_mailbox", message: "No mailbox assigned to your code yet. Contact your admin." });
    if (!mailbox.is_active && action !== "get_mailbox") {
      return json(403, { error: "mailbox_disabled" });
    }
    const addr = String(mailbox.address).toLowerCase();

    if (action === "get_mailbox") {
      return json(200, { mailbox });
    }

    if (action === "unread_count") {
      const { count } = await sb
        .from("rep_email_messages")
        .select("id", { count: "exact", head: true })
        .eq("mailbox_address", addr)
        .eq("folder", "inbox")
        .eq("is_read", false);
      return json(200, { count: count || 0 });
    }

    if (action === "list_messages") {
      const folder = ["inbox", "sent", "drafts", "trash"].includes(body.folder) ? body.folder : "inbox";
      const limit = Math.min(Number(body.limit) || 50, 200);
      const search = body.search ? String(body.search).slice(0, 200) : null;
      let q = sb
        .from("rep_email_messages")
        .select("id,direction,folder,from_address,from_name,to_addresses,subject,body_text,is_read,is_starred,thread_id,attachments,created_at")
        .eq("mailbox_address", addr)
        .eq("folder", folder)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (search) {
        q = q.or(
          `subject.ilike.%${search}%,from_address.ilike.%${search}%,body_text.ilike.%${search}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return json(200, { messages: data || [] });
    }

    if (action === "get_message") {
      const id = String(body.id || "");
      const { data, error } = await sb
        .from("rep_email_messages")
        .select("*")
        .eq("id", id)
        .eq("mailbox_address", addr)
        .maybeSingle();
      if (error) throw error;
      if (!data) return json(404, { error: "not_found" });
      // Generate signed URLs for any attachments
      const atts = Array.isArray(data.attachments) ? data.attachments : [];
      const signed: any[] = [];
      for (const a of atts) {
        if (a?.storage_path) {
          const { data: u } = await sb.storage
            .from("rep-email-attachments")
            .createSignedUrl(a.storage_path, 60 * 60);
          signed.push({ ...a, signed_url: u?.signedUrl || null });
        } else {
          signed.push(a);
        }
      }
      data.attachments = signed;
      return json(200, { message: data });
    }

    if (action === "mark_read") {
      const id = String(body.id || "");
      const isRead = body.is_read !== false;
      await sb
        .from("rep_email_messages")
        .update({ is_read: isRead })
        .eq("id", id)
        .eq("mailbox_address", addr);
      return json(200, { ok: true });
    }

    if (action === "toggle_star") {
      const id = String(body.id || "");
      const { data: cur } = await sb
        .from("rep_email_messages")
        .select("is_starred")
        .eq("id", id)
        .eq("mailbox_address", addr)
        .maybeSingle();
      if (!cur) return json(404, { error: "not_found" });
      await sb
        .from("rep_email_messages")
        .update({ is_starred: !cur.is_starred })
        .eq("id", id)
        .eq("mailbox_address", addr);
      return json(200, { ok: true });
    }

    if (action === "move_to_trash") {
      const id = String(body.id || "");
      await sb
        .from("rep_email_messages")
        .update({ folder: "trash" })
        .eq("id", id)
        .eq("mailbox_address", addr);
      return json(200, { ok: true });
    }

    if (action === "delete_forever") {
      const id = String(body.id || "");
      await sb
        .from("rep_email_messages")
        .delete()
        .eq("id", id)
        .eq("mailbox_address", addr);
      return json(200, { ok: true });
    }

    if (action === "update_settings") {
      const patch: Record<string, any> = {};
      if (typeof body.signature === "string") patch.signature = body.signature.slice(0, 2000);
      if ("forwarding_to" in body) {
        const f = body.forwarding_to ? String(body.forwarding_to).trim().toLowerCase() : null;
        if (f && !isValidEmail(f)) return json(400, { error: "Invalid forwarding address" });
        patch.forwarding_to = f;
      }
      if ("personal_email" in body) {
        const p = body.personal_email ? String(body.personal_email).trim().toLowerCase() : null;
        if (p && !isValidEmail(p)) return json(400, { error: "Invalid personal email" });
        patch.personal_email = p;
      }
      if (typeof body.forward_inbound === "boolean") patch.forward_inbound = body.forward_inbound;
      if (typeof body.mask_outbound === "boolean") patch.mask_outbound = body.mask_outbound;
      if (typeof body.auto_reply_enabled === "boolean") patch.auto_reply_enabled = body.auto_reply_enabled;
      if (typeof body.auto_reply_body === "string") patch.auto_reply_body = body.auto_reply_body.slice(0, 2000);
      const { data, error } = await sb
        .from("rep_mailboxes")
        .update(patch)
        .eq("id", mailbox.id)
        .select()
        .single();
      if (error) return json(400, { error: error.message });
      return json(200, { mailbox: data });
    }

    if (action === "save_draft") {
      const draftId = body.id ? String(body.id) : null;
      const to = Array.isArray(body.to) ? body.to.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : [];
      const cc = Array.isArray(body.cc) ? body.cc.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : [];
      const bcc = Array.isArray(body.bcc) ? body.bcc.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : [];
      const subject = String(body.subject || "").slice(0, 500);
      const bodyText = String(body.body_text || "").slice(0, 100000);
      const inReplyTo = body.in_reply_to ? String(body.in_reply_to) : null;
      const threadId = body.thread_id ? String(body.thread_id) : null;

      if (draftId) {
        const { data: updated, error } = await sb
          .from("rep_email_messages")
          .update({
            to_addresses: to, cc_addresses: cc, bcc_addresses: bcc,
            subject, body_text: bodyText, body_html: textToHtml(bodyText),
            in_reply_to: inReplyTo, thread_id: threadId,
          })
          .eq("id", draftId)
          .eq("mailbox_address", addr)
          .eq("folder", "drafts")
          .select()
          .single();
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true, message: updated });
      }

      const { data: saved, error } = await sb
        .from("rep_email_messages")
        .insert({
          mailbox_address: addr,
          direction: "outbound",
          folder: "drafts",
          from_address: addr,
          from_name: mailbox.code,
          to_addresses: to, cc_addresses: cc, bcc_addresses: bcc,
          subject, body_text: bodyText, body_html: textToHtml(bodyText),
          message_id: `<draft-${crypto.randomUUID()}@${EMAIL_DOMAIN}>`,
          in_reply_to: inReplyTo,
          thread_id: threadId,
          is_read: true,
        })
        .select()
        .single();
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true, message: saved });
    }

    if (action === "upload_attachment") {
      const name = String(body.name || "").slice(0, 200);
      const mime = String(body.mime || "application/octet-stream").slice(0, 100);
      const dataB64 = String(body.data_b64 || "");
      if (!name || !dataB64) return json(400, { error: "name + data_b64 required" });
      const bin = Uint8Array.from(atob(dataB64), c => c.charCodeAt(0));
      if (bin.length > 10 * 1024 * 1024) return json(400, { error: "File exceeds 10MB" });
      const path = `${mailbox.code}/${crypto.randomUUID()}-${name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
      const { error: upErr } = await sb.storage
        .from("rep-email-attachments")
        .upload(path, bin, { contentType: mime, upsert: false });
      if (upErr) return json(500, { error: upErr.message });
      return json(200, { ok: true, attachment: { name, size: bin.length, mime, storage_path: path } });
    }

    if (action === "send") {
      const to = Array.isArray(body.to) ? body.to.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : [];
      const cc = Array.isArray(body.cc) ? body.cc.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : [];
      const bcc = Array.isArray(body.bcc) ? body.bcc.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean) : [];
      const subject = String(body.subject || "").slice(0, 500);
      const bodyText = String(body.body_text || "").slice(0, 100000);
      const inReplyTo = body.in_reply_to ? String(body.in_reply_to) : null;
      const threadId = body.thread_id ? String(body.thread_id) : null;
      // Validate attachments (rep-email-attachments bucket; uploaded client-side before send)
      const rawAtts = Array.isArray(body.attachments) ? body.attachments : [];
      const attachments = rawAtts
        .filter((a: any) => a && typeof a.storage_path === "string" && typeof a.name === "string")
        .slice(0, 10)
        .map((a: any) => ({
          name: String(a.name).slice(0, 200),
          size: Number(a.size) || 0,
          mime: String(a.mime || "application/octet-stream").slice(0, 100),
          storage_path: String(a.storage_path),
        }));
      const totalAttBytes = attachments.reduce((s: number, a: any) => s + (a.size || 0), 0);
      if (totalAttBytes > 25 * 1024 * 1024) {
        return json(400, { error: "Attachments exceed 25MB total" });
      }

      if (to.length === 0) return json(400, { error: "At least one recipient required" });
      for (const a of [...to, ...cc, ...bcc]) {
        if (!isValidEmail(a)) return json(400, { error: `Invalid address: ${a}` });
      }
      if (!subject.trim()) return json(400, { error: "Subject required" });
      if (!bodyText.trim()) return json(400, { error: "Message body required" });

      // Daily send rate limit per mailbox
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: sentToday } = await sb
        .from("rep_email_messages")
        .select("id", { count: "exact", head: true })
        .eq("mailbox_address", addr)
        .eq("direction", "outbound")
        .gte("created_at", since);
      if ((sentToday || 0) >= DAILY_SEND_LIMIT) {
        return json(429, { error: `Daily send limit reached (${DAILY_SEND_LIMIT}/24h)` });
      }

      // Suppression check
      const { data: suppressed } = await sb
        .from("suppressed_emails")
        .select("email")
        .in("email", to);
      const suppressedSet = new Set((suppressed || []).map((r: any) => String(r.email).toLowerCase()));
      const allowedTo = to.filter((a: string) => !suppressedSet.has(a));
      if (allowedTo.length === 0) {
        return json(400, { error: "All recipients are suppressed (bounced or unsubscribed)" });
      }

      const fromName = mailbox.code; // simple display fallback
      const fromHeader = `<${addr}>`;
      const sigBlock = mailbox.signature ? `\n\n--\n${mailbox.signature}` : "";

      // Sign attachment URLs (7-day expiry) so recipients can download them
      const signedAtts: Array<{ name: string; size: number; mime: string; storage_path: string; signed_url: string }> = [];
      for (const a of attachments) {
        const { data: signed } = await sb.storage
          .from("rep-email-attachments")
          .createSignedUrl(a.storage_path, 60 * 60 * 24 * 7);
        signedAtts.push({ ...a, signed_url: signed?.signedUrl || "" });
      }

      const attachmentTextBlock = signedAtts.length
        ? `\n\n--\nAttachments:\n${signedAtts.map(a => `• ${a.name} (${Math.round(a.size / 1024)} KB) — ${a.signed_url}`).join("\n")}`
        : "";
      const finalText = `${bodyText}${attachmentTextBlock}${sigBlock}`;
      const finalHtml = textToHtml(finalText);

      const messageId = `<${crypto.randomUUID()}@${EMAIL_DOMAIN}>`;

      // Get/create unsubscribe token for the primary recipient (required by the email API)
      const primaryRecipient = allowedTo[0].toLowerCase();
      let unsubscribeToken: string | null = null;
      const { data: existingTok } = await sb
        .from("email_unsubscribe_tokens")
        .select("token, used_at")
        .eq("email", primaryRecipient)
        .maybeSingle();
      if (existingTok && !existingTok.used_at) {
        unsubscribeToken = existingTok.token;
      } else {
        const newTok = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
        await sb
          .from("email_unsubscribe_tokens")
          .upsert({ token: newTok, email: primaryRecipient }, { onConflict: "email", ignoreDuplicates: true });
        const { data: stored } = await sb
          .from("email_unsubscribe_tokens")
          .select("token")
          .eq("email", primaryRecipient)
          .maybeSingle();
        unsubscribeToken = stored?.token || newTok;
      }

      // Build headers — Reply-To and Return-Path so replies come back to us
      const extraHeaders: Record<string, string> = {
        "Reply-To": addr,
        "Return-Path": addr,
      };
      if (inReplyTo) {
        extraHeaders["In-Reply-To"] = inReplyTo;
        extraHeaders["References"] = inReplyTo;
      }

      // Enqueue via existing email queue infrastructure
      const { error: enqErr } = await sb.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: messageId,
          to: allowedTo.join(", ") + (cc.length ? `, ${cc.map((a: string) => a).join(", ")}` : ""),
          to_list: allowedTo,
          cc_list: cc,
          bcc_list: bcc,
          from: fromHeader,
          sender_domain: SENDER_DOMAIN,
          subject,
          html: finalHtml,
          text: finalText,
          purpose: "transactional",
          unsubscribe_token: unsubscribeToken,
          label: `rep-mail:${mailbox.code}`,
          idempotency_key: `rep-mail-${messageId}`,
          headers: extraHeaders,
          queued_at: new Date().toISOString(),
        },
      });
      if (enqErr) {
        console.error("enqueue failed", enqErr);
        return json(500, { error: "Failed to queue email" });
      }

      // Log in sent folder
      const { data: saved } = await sb
        .from("rep_email_messages")
        .insert({
          mailbox_address: addr,
          direction: "outbound",
          folder: "sent",
          from_address: addr,
          from_name: fromName,
          to_addresses: to,
          cc_addresses: cc,
          bcc_addresses: bcc,
          subject,
          body_text: finalText,
          body_html: finalHtml,
          message_id: messageId,
          in_reply_to: inReplyTo,
          thread_id: threadId || messageId,
          is_read: true,
          attachments: signedAtts,
        })
        .select()
        .single();

      await sb
        .from("rep_mailboxes")
        .update({ last_outbound_at: new Date().toISOString() })
        .eq("id", mailbox.id);

      return json(200, { ok: true, message: saved });
    }

    return json(400, { error: "unknown action" });
  } catch (e: any) {
    console.error("portal-mailbox error:", e);
    return json(500, { error: String(e?.message || e) });
  }
});

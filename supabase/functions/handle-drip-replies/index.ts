import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";
const PLAYBOOK_URL =
  "https://ihdjpxhcaiaixmqxyqoe.supabase.co/storage/v1/object/public/playbooks/sales-process-reengineering.pdf";

type Classification = {
  intent: "interested" | "question" | "unsubscribe" | "not_interested" | "auto_reply" | "other";
  reasoning: string;
  reply_subject?: string;
  reply_body_html?: string;
};

async function classifyAndDraftReply(
  emailBody: string,
  emailSubject: string,
  prospect: any,
  apiKey: string,
): Promise<Classification | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are Joseph Toney's reply triage and response assistant.

Joseph runs Aetheris Technology (aetheris.technology). He sent a cold email to a local business owner offering free walkthroughs of an AI system that captures leads, follows up automatically, and automates branding.

Your job: read the prospect's reply and decide what to do.

INTENTS:
- "interested": They want to learn more, try it, or hear about it. Includes "tell me more", "how does it work", "I'd like to try", "send info".
- "question": They asked a specific question (pricing, what it does, how it works for X industry, etc).
- "unsubscribe": They want off the list. Includes "unsubscribe", "remove me", "stop emailing", "take me off your list", "do not contact". Be liberal here.
- "not_interested": Soft no. "no thanks", "not for me", "not right now", "wrong person", "I'm good", "no time".
- "auto_reply": Out of office, vacation responder, mailer daemon, bounce, automatic system response.
- "other": Anything else (forwarded to wrong person, asking who you are, hostile reply, spam complaint).

If intent is "interested" or "question", ALSO write a reply email. Rules for the reply:
1. NEVER use dashes as punctuation. No em dashes, en dashes, or hyphens as separators.
2. Under 100 words. Conversational. Like a text from a friend.
3. Sign off as "Joseph".
4. NO scheduled meetings, no calendars, no Calendly links. If they want to talk, say "happy to walk you through it whenever, just reply with what works".
5. If they asked about pricing, say "depends on what you need, but the walkthrough is always free. Let me know what you're trying to fix and I'll tell you straight up if it's a fit."
6. If they want to learn more, send them the playbook link: ${PLAYBOOK_URL} as the free thing they can read right now, and offer to walk them through whatever they want.
7. Reference their business naturally if you can.
8. Use simple HTML with <p> tags. One link max.

If intent is "unsubscribe", "not_interested", "auto_reply", or "other": do NOT write a reply. Set reply fields to null.

Return a JSON object with: intent, reasoning, reply_subject (or null), reply_body_html (or null).`,
        },
        {
          role: "user",
          content: `Prospect: ${prospect.business_name || "Unknown business"} (${prospect.email})
Industry: ${prospect.industry || "Unknown"}

Original email subject: ${emailSubject}
Their reply:
${emailBody.slice(0, 2000)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify_reply",
            description: "Classify the reply intent and optionally draft a response.",
            parameters: {
              type: "object",
              properties: {
                intent: {
                  type: "string",
                  enum: ["interested", "question", "unsubscribe", "not_interested", "auto_reply", "other"],
                },
                reasoning: { type: "string" },
                reply_subject: { type: ["string", "null"] },
                reply_body_html: { type: ["string", "null"] },
              },
              required: ["intent", "reasoning", "reply_subject", "reply_body_html"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "classify_reply" } },
    }),
  });

  if (!res.ok) {
    console.error("Classify failed:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;
  try {
    return JSON.parse(toolCall.function.arguments) as Classification;
  } catch {
    return null;
  }
}

async function sendReply(
  toEmail: string,
  subject: string,
  bodyHtml: string,
  apiKey: string,
  outlookKey: string,
): Promise<boolean> {
  const res = await fetch(`${OUTLOOK_GATEWAY}/me/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": outlookKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: bodyHtml },
        toRecipients: [{ emailAddress: { address: toEmail } }],
      },
    }),
  });
  if (!res.ok) {
    console.error(`Send reply to ${toEmail} failed:`, res.status, await res.text());
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const OUTLOOK_API_KEY = Deno.env.get("MICROSOFT_OUTLOOK_API_KEY");
    if (!OUTLOOK_API_KEY) throw new Error("MICROSOFT_OUTLOOK_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Active or replied prospects we should still process replies from
    const { data: activeProspects } = await supabase
      .from("drip_prospects")
      .select("*")
      .in("status", ["active", "replied"]);

    if (!activeProspects || activeProspects.length === 0) {
      return new Response(JSON.stringify({ message: "No active prospects" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prospectMap = new Map(
      activeProspects.map((p: any) => [p.email.toLowerCase(), p])
    );

    // Read inbox messages from last 24h. Pull body too.
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const filterDate = since.toISOString();

    const inboxRes = await fetch(
      `${OUTLOOK_GATEWAY}/me/messages?$top=100&$orderby=receivedDateTime desc&$filter=receivedDateTime ge ${filterDate}&$select=from,subject,receivedDateTime,id,body,bodyPreview`,
      {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": OUTLOOK_API_KEY,
        },
      }
    );

    if (!inboxRes.ok) {
      const errText = await inboxRes.text();
      console.error("Outlook inbox read failed:", inboxRes.status, errText);
      throw new Error(`Outlook API error: ${inboxRes.status}`);
    }

    const inboxData = await inboxRes.json();
    const messages = inboxData.value || [];

    let interested = 0;
    let unsubscribed = 0;
    let notInterested = 0;
    let autoReplies = 0;
    let repliesSent = 0;
    let other = 0;
    const processedMsgIds = new Set<string>();

    for (const msg of messages) {
      const senderEmail = msg.from?.emailAddress?.address?.toLowerCase();
      if (!senderEmail) continue;

      const prospect = prospectMap.get(senderEmail);
      if (!prospect) continue;

      // Avoid double-processing the same message
      if (processedMsgIds.has(msg.id)) continue;
      processedMsgIds.add(msg.id);

      const bodyText = msg.body?.content || msg.bodyPreview || "";
      const subject = msg.subject || "";

      const classification = await classifyAndDraftReply(
        bodyText,
        subject,
        prospect,
        LOVABLE_API_KEY,
      );

      if (!classification) {
        console.error(`Failed to classify reply from ${senderEmail}`);
        continue;
      }

      console.log(`[${senderEmail}] intent=${classification.intent} :: ${classification.reasoning}`);

      switch (classification.intent) {
        case "unsubscribe": {
          await supabase
            .from("drip_prospects")
            .update({ status: "unsubscribed" })
            .eq("id", prospect.id);
          await supabase
            .from("drip_emails")
            .update({ status: "skipped" })
            .eq("prospect_id", prospect.id)
            .eq("status", "pending");
          await supabase
            .from("suppressed_emails")
            .upsert(
              { email: senderEmail, reason: "unsubscribe", metadata: { source: "drip_reply", classified_by_ai: true } },
              { onConflict: "email" },
            );
          unsubscribed++;
          break;
        }
        case "not_interested": {
          await supabase
            .from("drip_prospects")
            .update({ status: "not_interested" })
            .eq("id", prospect.id);
          await supabase
            .from("drip_emails")
            .update({ status: "skipped" })
            .eq("prospect_id", prospect.id)
            .eq("status", "pending");
          notInterested++;
          break;
        }
        case "auto_reply": {
          // Don't change status, don't reply, don't cancel sequence
          autoReplies++;
          break;
        }
        case "interested":
        case "question": {
          // Mark as replied (stops further automated drip emails)
          await supabase
            .from("drip_prospects")
            .update({ status: "replied" })
            .eq("id", prospect.id);
          await supabase
            .from("drip_emails")
            .update({ status: "skipped" })
            .eq("prospect_id", prospect.id)
            .eq("status", "pending");

          // Send the AI-drafted reply
          if (classification.reply_subject && classification.reply_body_html) {
            const replySubject = classification.reply_subject.startsWith("Re:")
              ? classification.reply_subject
              : `Re: ${subject || "your message"}`;
            const ok = await sendReply(
              senderEmail,
              replySubject,
              classification.reply_body_html,
              LOVABLE_API_KEY,
              OUTLOOK_API_KEY,
            );
            if (ok) {
              repliesSent++;
              // Log it as a "sent" outbound for visibility
              await supabase.from("drip_emails").insert({
                prospect_id: prospect.id,
                sequence_id: (await supabase.from("drip_sequences").select("id").eq("is_active", true).limit(1).single()).data?.id,
                step_index: 99, // marker for AI-generated reply
                scheduled_for: new Date().toISOString(),
                sent_at: new Date().toISOString(),
                status: "sent",
                subject: replySubject,
                body_html: classification.reply_body_html,
              });
            }
          }
          interested++;
          break;
        }
        default: {
          await supabase
            .from("drip_prospects")
            .update({ status: "replied" })
            .eq("id", prospect.id);
          await supabase
            .from("drip_emails")
            .update({ status: "skipped" })
            .eq("prospect_id", prospect.id)
            .eq("status", "pending");
          other++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processedMsgIds.size} replies`,
        interested,
        replies_sent: repliesSent,
        unsubscribed,
        not_interested: notInterested,
        auto_replies: autoReplies,
        other,
        inbox_scanned: messages.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("handle-drip-replies error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

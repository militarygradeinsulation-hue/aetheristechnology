import { supabase } from "@/integrations/supabase/client";

export interface ToolLeadPayload {
  email: string;
  tool_slug: string;
  tool_title?: string;
  source?: string;
  name?: string;
  phone?: string;
  company?: string;
  rep_code?: string;
}

/**
 * Capture a lead for a public tool. Routes through the `tool-lead-capture`
 * edge function so that a) the row lands in public.tool_leads and b) the
 * admin notification email fires for NEW leads. Falls back to a direct
 * insert if the edge function is unreachable so no lead is ever lost.
 */
export async function captureToolLead(payload: ToolLeadPayload): Promise<{ ok: boolean; isNew?: boolean }> {
  const email = payload.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false };

  const body = {
    ...payload,
    email,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  try {
    const { data, error } = await supabase.functions.invoke("tool-lead-capture", { body });
    if (!error && data?.ok) return { ok: true, isNew: !!data.isNew };
  } catch {
    /* fall through */
  }

  // Fallback: at minimum record the lead so it isn't lost
  try {
    await supabase.from("tool_leads").insert({
      email,
      tool_slug: payload.tool_slug,
      tool_title: payload.tool_title,
      source: payload.source || "fallback",
      name: payload.name,
      phone: payload.phone,
      company: payload.company,
      rep_code: payload.rep_code,
      user_agent: body.user_agent,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

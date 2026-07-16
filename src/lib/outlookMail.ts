// Client wrapper for the in-app Outlook compose drawer.
// Mounts a singleton component (OutlookMailDrawer) and exposes an `openOutlookCompose`
// function that any caller can use to pop the drawer with a prefilled message.
import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";

export interface ComposeOpts {
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
  html?: boolean;
}

const EVENT_NAME = "aetheris:openOutlookCompose";

export function openOutlookCompose(to: string, opts: ComposeOpts = {}) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { to, ...opts } }));
}

export function onOutlookCompose(handler: (detail: { to: string } & ComposeOpts) => void) {
  const fn = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(EVENT_NAME, fn);
  return () => window.removeEventListener(EVENT_NAME, fn);
}

async function call<T = any>(fn: string, body: Record<string, any> = {}): Promise<T> {
  const token = getPortalToken();
  if (!token) throw new Error("Not signed in");
  const { data, error } = await supabase.functions.invoke(fn, {
    body,
    headers: { "x-portal-token": token },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export interface OutlookMessage {
  id: string;
  subject: string;
  from: string;
  from_name: string;
  to: string[];
  received: string;
  preview: string;
  is_read: boolean;
  web_link: string | null;
  conversation_id: string | null;
}

export async function sendOutlookMail(payload: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  html?: boolean;
}): Promise<{ ok: true; from: string | null }> {
  return await call("outlook-send-mail", payload);
}

export async function listOutlookMessagesWith(email: string, top = 10): Promise<{ messages: OutlookMessage[]; from: string | null }> {
  return await call("outlook-list-messages", { email, top });
}

import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";

export interface AdminLibraryItem {
  id: string;
  tool_type: string;
  title: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  file_url: string | null;
  created_at: string;
}

function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { "x-admin-token": token } : {};
}

export async function saveToAdminLibrary(args: {
  tool_type: string;
  title: string;
  input_data: unknown;
  output_data: unknown;
  file_url?: string | null;
  created_at?: string;
}) {
  const { data, error } = await supabase.functions.invoke("admin-library", {
    body: { action: "save", ...args },
    headers: adminHeaders(),
  });
  if (error) throw error;
  return data?.item as AdminLibraryItem;
}

export async function listAdminLibrary(opts?: { toolType?: string; maxPages?: number }): Promise<AdminLibraryItem[]> {
  const pageSize = 50;
  const maxPages = opts?.maxPages ?? 10; // up to 500 most recent
  const out: AdminLibraryItem[] = [];
  for (let page = 0; page < maxPages; page++) {
    const { data, error } = await supabase.functions.invoke("admin-library", {
      body: { action: "list", limit: pageSize, offset: page * pageSize, tool_type: opts?.toolType },
      headers: adminHeaders(),
    });
    if (error) throw error;
    const items = (data?.items || []) as AdminLibraryItem[];
    out.push(...items);
    if (!data?.hasMore || items.length < pageSize) break;
  }
  return out;
}

export async function updateAdminLibraryItem(id: string, output_data: unknown): Promise<AdminLibraryItem> {
  const { data, error } = await supabase.functions.invoke("admin-library", {
    body: { action: "update", id, output_data },
    headers: adminHeaders(),
  });
  if (error) throw error;
  return data?.item as AdminLibraryItem;
}

export async function rescheduleAdminLibraryItem(id: string, created_at: string): Promise<AdminLibraryItem> {
  const { data, error } = await supabase.functions.invoke("admin-library", {
    body: { action: "update", id, created_at },
    headers: adminHeaders(),
  });
  if (error) throw error;
  return data?.item as AdminLibraryItem;
}

export async function deleteFromAdminLibrary(id: string) {
  const { error } = await supabase.functions.invoke("admin-library", {
    body: { action: "delete", id },
    headers: adminHeaders(),
  });
  if (error) throw error;
}

export async function publishPlaybookToWebsite(args: {
  title: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  file_url: string;
  icon_name?: string;
}): Promise<{ alreadyPublished?: boolean }> {
  const { data, error } = await supabase.functions.invoke("admin-library", {
    body: { action: "publish_playbook", ...args },
    headers: adminHeaders(),
  });
  if (error) throw error;
  return { alreadyPublished: !!data?.alreadyPublished };


/** Convert a tool result into plain text for copy/download. */
export function formatLibraryItemAsText(item: AdminLibraryItem): string {
  const out = item.output_data as Record<string, unknown>;
  const lines: string[] = [];
  lines.push(`# ${item.title}`);
  lines.push(`Tool: ${item.tool_type}`);
  lines.push(`Saved: ${new Date(item.created_at).toLocaleString()}`);
  lines.push("");
  if (item.file_url) {
    lines.push(`Download: ${item.file_url}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push(JSON.stringify(out, null, 2));
  return lines.join("\n");
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

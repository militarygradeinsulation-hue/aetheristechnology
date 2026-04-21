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
}) {
  const { data, error } = await supabase.functions.invoke("admin-library", {
    body: { action: "save", ...args },
    headers: adminHeaders(),
  });
  if (error) throw error;
  return data?.item as AdminLibraryItem;
}

export async function listAdminLibrary(): Promise<AdminLibraryItem[]> {
  const { data, error } = await supabase.functions.invoke("admin-library", {
    body: { action: "list" },
    headers: adminHeaders(),
  });
  if (error) throw error;
  return (data?.items || []) as AdminLibraryItem[];
}

export async function updateAdminLibraryItem(id: string, output_data: unknown): Promise<AdminLibraryItem> {
  const { data, error } = await supabase.functions.invoke("admin-library", {
    body: { action: "update", id, output_data },
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

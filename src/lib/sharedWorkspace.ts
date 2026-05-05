import { supabase } from "@/integrations/supabase/client";

export type Person = "admin" | "bradon";
export const PERSONS: Person[] = ["admin", "bradon"];
export const personLabel = (p: Person) => (p === "admin" ? "Casey (You)" : "Bradon");

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskBucket = "today" | "week" | "later";

export interface SharedTask {
  id: string;
  title: string;
  description: string | null;
  owner: Person;
  assignee: Person;
  status: TaskStatus;
  priority: TaskPriority;
  bucket: TaskBucket;
  due_at: string | null;
  starts_at: string | null;
  completed_at: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface SharedNote {
  id: string;
  author: Person;
  body: string;
  task_id: string | null;
  pinned: boolean;
  created_at: string;
}

export interface SharedFile {
  id: string;
  uploader: Person;
  task_id: string | null;
  storage_path: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  caption: string | null;
  created_at: string;
}

export interface SharedNotification {
  id: string;
  recipient: Person;
  kind: string;
  title: string;
  body: string | null;
  task_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const STORAGE_BUCKET = "workspace-files";

export const fileUrl = (path: string) =>
  supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;

export async function uploadFile(file: File, uploader: Person, taskId?: string | null, caption?: string) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${uploader}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { error: dbErr } = await supabase.from("shared_files").insert({
    uploader,
    task_id: taskId || null,
    storage_path: path,
    filename: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    caption: caption || null,
  });
  if (dbErr) throw dbErr;
  return path;
}

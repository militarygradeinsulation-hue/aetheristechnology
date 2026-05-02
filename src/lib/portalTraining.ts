import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";
import { getAdminToken } from "@/lib/adminAuth";

export type TrainingKind = "mcq" | "open";

export interface TrainingAttachment {
  name: string;
  url: string;
  kind?: string;
}

export interface Training {
  id: string;
  title: string;
  description: string | null;
  kind: TrainingKind;
  passing_score: number;
  attachments: TrainingAttachment[];
  reference_text?: string | null;
  is_published: boolean;
  order_index: number;
  created_at: string;
  my_progress?: { best: number; passed: boolean; last_at: string | null; attempts: number } | null;
}

export interface TrainingQuestion {
  id: string;
  question_text: string;
  options: string[] | null;
  correct_index?: number | null; // admin only
  rubric?: string | null;
  weight: number;
  order_index: number;
}

export interface TrainingAttempt {
  id: string;
  training_id: string;
  rep_code: string;
  answers: Array<{ question_id: string; answer: string | number }>;
  score: number | null;
  passed: boolean | null;
  ai_feedback: string | null;
  per_question_feedback: Array<{ question_id: string; score: number; comment: string }> | null;
  started_at: string;
  completed_at: string | null;
  trainings?: { title: string; kind: TrainingKind; passing_score: number } | null;
}

export interface TrainingQA {
  id: string;
  training_id: string | null;
  rep_code: string;
  rep_name: string | null;
  question: string;
  ai_answer: string | null;
  admin_answer: string | null;
  status: "open" | "answered" | "closed";
  created_at: string;
  trainings?: { title: string } | null;
}

async function callWith(headers: Record<string, string>, action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("portal-training", {
    body: { action, ...payload },
    headers,
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
}

function repHeaders() {
  const token = getPortalToken();
  if (!token) throw new Error("No portal session");
  return { "x-portal-token": token };
}

function adminHeaders() {
  const token = getAdminToken();
  if (!token) throw new Error("No admin session");
  return { "x-admin-token": token };
}

// ─── Rep API ───
export const repTraining = {
  list: () => callWith(repHeaders(), "list_trainings") as Promise<{ trainings: Training[] }>,
  get: (id: string) =>
    callWith(repHeaders(), "get_training", { id }) as Promise<{ training: Training; questions: TrainingQuestion[] }>,
  submit: (training_id: string, answers: Array<{ question_id: string; answer: string | number }>) =>
    callWith(repHeaders(), "submit_attempt", { training_id, answers }) as Promise<{ attempt: TrainingAttempt }>,
  myAttempts: () => callWith(repHeaders(), "my_attempts") as Promise<{ attempts: TrainingAttempt[] }>,
  listQA: (training_id?: string) =>
    callWith(repHeaders(), "list_qa", training_id ? { training_id } : {}) as Promise<{ qa: TrainingQA[] }>,
  ask: (question: string, training_id?: string) =>
    callWith(repHeaders(), "ask_qa", training_id ? { question, training_id } : { question }) as Promise<{ qa: TrainingQA }>,
};

// ─── Admin API ───
export const adminTraining = {
  list: () => callWith(adminHeaders(), "admin_list_trainings") as Promise<{ trainings: Training[] }>,
  get: (id: string) =>
    callWith(adminHeaders(), "admin_get_training", { id }) as Promise<{ training: Training; questions: TrainingQuestion[] }>,
  save: (training: Partial<Training> & { id?: string }, questions: Array<Partial<TrainingQuestion>>) =>
    callWith(adminHeaders(), "admin_save_training", { training, questions }) as Promise<{ id: string }>,
  remove: (id: string) => callWith(adminHeaders(), "admin_delete_training", { id }) as Promise<{ ok: true }>,
  attempts: (training_id?: string) =>
    callWith(adminHeaders(), "admin_list_attempts", training_id ? { training_id } : {}) as Promise<{
      attempts: TrainingAttempt[];
    }>,
  qa: () => callWith(adminHeaders(), "admin_list_qa") as Promise<{ qa: TrainingQA[] }>,
  answerQA: (id: string, admin_answer: string) =>
    callWith(adminHeaders(), "admin_answer_qa", { id, admin_answer }) as Promise<{ ok: true }>,
};

// ─── Storage upload ───
export async function uploadTrainingFile(file: File): Promise<TrainingAttachment> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("training-uploads").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("training-uploads").getPublicUrl(path);
  return { name: file.name, url: data.publicUrl, kind: file.type || "file" };
}

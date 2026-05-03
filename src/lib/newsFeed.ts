import { getAdminToken } from "./adminAuth";

export interface NewsPost {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  cover_image_url: string | null;
  category: string | null;
  tags: string[];
  author_name: string;
  published: boolean;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

const URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/news-feed`;

async function call<T>(payload: Record<string, unknown>, admin = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (admin) {
    const t = getAdminToken();
    if (t) headers["x-admin-token"] = t;
  }
  const res = await fetch(URL, { method: "POST", headers, body: JSON.stringify(payload) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function listNews(limit = 50): Promise<NewsPost[]> {
  const r = await call<{ posts: NewsPost[] }>({ action: "list", limit });
  return r.posts;
}

export async function getNews(slug: string): Promise<NewsPost> {
  const r = await call<{ post: NewsPost }>({ action: "get", slug });
  return r.post;
}

export async function incrementNewsView(slug: string): Promise<void> {
  try { await call({ action: "increment_view", slug }); } catch { /* noop */ }
}

export async function adminListNews(): Promise<NewsPost[]> {
  const r = await call<{ posts: NewsPost[] }>({ action: "admin_list" }, true);
  return r.posts;
}

export async function adminCreateNews(input: Partial<NewsPost>): Promise<NewsPost> {
  const r = await call<{ post: NewsPost }>({ action: "create", ...input }, true);
  return r.post;
}

export async function adminUpdateNews(id: string, patch: Partial<NewsPost>): Promise<NewsPost> {
  const r = await call<{ post: NewsPost }>({ action: "update", id, ...patch }, true);
  return r.post;
}

export async function adminDeleteNews(id: string): Promise<void> {
  await call({ action: "delete", id }, true);
}

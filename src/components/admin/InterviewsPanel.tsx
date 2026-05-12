import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Calendar as CalendarIcon, Loader2, RefreshCw, ExternalLink,
  Sparkles, FileText, Mail, Phone, Video, MapPin, CheckCircle2, XCircle, Clock, User as UserIcon,
} from "lucide-react";
import type { Person } from "@/lib/sharedWorkspace";

export interface SharedInterview {
  id: string;
  candidate_name: string;
  candidate_email: string | null;
  candidate_phone: string | null;
  share_code: string | null;
  resume_path: string | null;
  resume_filename: string | null;
  ai_fit_score: number | null;
  ai_summary: string | null;
  ai_strengths: string[] | null;
  ai_concerns: string[] | null;
  scheduled_at: string | null;
  meeting_link: string | null;
  location: string | null;
  interviewer: "admin" | "bradon" | "both";
  status: "pending" | "scheduled" | "completed" | "passed" | "rejected";
  source: "manual" | "careers";
  created_by: "admin" | "bradon";
  notes: string | null;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Props { me: Person; }

const STATUS_COLORS: Record<SharedInterview["status"], string> = {
  pending: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-amber/20 text-amber border-amber/40",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  passed: "bg-green-500/20 text-green-400 border-green-500/40",
  rejected: "bg-destructive/20 text-destructive border-destructive/40",
};

export const InterviewsPanel: React.FC<Props> = ({ me }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<SharedInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "all" | "mine" | "completed">("upcoming");
  const [draft, setDraft] = useState({
    candidate_name: "", candidate_email: "", scheduled_at: "",
    meeting_link: "", interviewer: me as "admin" | "bradon" | "both", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shared_interviews")
      .select("*")
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (error) toast({ title: "Failed to load interviews", description: error.message, variant: "destructive" });
    else setItems((data || []) as SharedInterview[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return items.filter(i => {
      if (filter === "upcoming") return !i.scheduled_at || (new Date(i.scheduled_at).getTime() >= now - 3600000 && i.status !== "rejected" && i.status !== "passed");
      if (filter === "mine") return i.interviewer === me || i.interviewer === "both" || i.created_by === me;
      if (filter === "completed") return i.status === "completed" || i.status === "passed" || i.status === "rejected";
      return true;
    });
  }, [items, filter, me]);

  const create = async () => {
    if (!draft.candidate_name.trim()) { toast({ title: "Candidate name required", variant: "destructive" }); return; }
    setCreating(true);
    const { error } = await supabase.from("shared_interviews").insert({
      candidate_name: draft.candidate_name.trim(),
      candidate_email: draft.candidate_email.trim() || null,
      scheduled_at: draft.scheduled_at || null,
      meeting_link: draft.meeting_link.trim() || null,
      interviewer: draft.interviewer,
      notes: draft.notes.trim() || null,
      status: draft.scheduled_at ? "scheduled" : "pending",
      source: "manual",
      created_by: me,
    });
    setCreating(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setDraft({ candidate_name: "", candidate_email: "", scheduled_at: "", meeting_link: "", interviewer: me, notes: "" });
    toast({ title: "Interview added" });
    load();
  };

  const update = async (id: string, patch: Partial<SharedInterview>) => {
    const { error } = await supabase.from("shared_interviews").update(patch).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this interview?")) return;
    const { error } = await supabase.from("shared_interviews").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else load();
  };

  const addToCalendar = async (i: SharedInterview) => {
    if (!i.scheduled_at) { toast({ title: "Set a date/time first", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("shared_tasks").insert({
      title: `Interview: ${i.candidate_name}`,
      description: [i.meeting_link ? `Link: ${i.meeting_link}` : null, i.candidate_email, i.notes].filter(Boolean).join("\n"),
      owner: me, assignee: i.interviewer === "both" ? me : i.interviewer,
      priority: "high", bucket: "today", due_at: i.scheduled_at,
    }).select("id").single();
    if (error) { toast({ title: "Calendar failed", description: error.message, variant: "destructive" }); return; }
    await update(i.id, { task_id: (data as any)?.id });
    toast({ title: "Added to shared calendar" });
  };

  const openResume = async (shareCode: string | null) => {
    if (!shareCode) return;
    const { getAdminToken } = await import("@/lib/adminAuth");
    const token = getAdminToken();
    if (!token) { toast({ title: "Resume only viewable from admin session", variant: "destructive" }); return; }
    const popup = window.open("", "_blank");
    try {
      const { data, error } = await supabase.functions.invoke("careers-test", {
        body: { action: "admin_resume_url", share_code: shareCode },
        headers: { "x-admin-token": token },
      });
      if (error) throw new Error(error.message);
      const html = (data as any)?.html;
      if (html && popup) { popup.document.open(); popup.document.write(html); popup.document.close(); return; }
      const url = (data as any)?.url;
      if (url) { if (popup) popup.location.href = url; else window.open(url, "_blank", "noopener,noreferrer"); }
    } catch (e) {
      popup?.close();
      toast({ title: "Could not open resume", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="font-display flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-amber" /> Interviews
              <span className="text-xs font-normal text-muted-foreground">{items.length} total</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 rounded-lg bg-secondary/30">
            <div>
              <Label className="text-xs">Person</Label>
              <Input value={draft.candidate_name} onChange={e => setDraft(s => ({ ...s, candidate_name: e.target.value }))} placeholder="Candidate name" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={draft.candidate_email} onChange={e => setDraft(s => ({ ...s, candidate_email: e.target.value }))} placeholder="name@example.com" />
            </div>
            <div>
              <Label className="text-xs">Date & time</Label>
              <Input type="datetime-local" value={draft.scheduled_at} onChange={e => setDraft(s => ({ ...s, scheduled_at: e.target.value }))} />
            </div>
            <div className="lg:col-span-2">
              <Label className="text-xs">Meeting link / resume URL</Label>
              <Input value={draft.meeting_link} onChange={e => setDraft(s => ({ ...s, meeting_link: e.target.value }))} placeholder="https://meet… or resume URL" />
            </div>
            <div>
              <Label className="text-xs">Interviewer</Label>
              <Select value={draft.interviewer} onValueChange={v => setDraft(s => ({ ...s, interviewer: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Joseph</SelectItem>
                  <SelectItem value="bradon">Bradon</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={draft.notes} onChange={e => setDraft(s => ({ ...s, notes: e.target.value }))} placeholder="Context, questions, etc." />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <Button onClick={create} disabled={creating} className="bg-amber text-background hover:bg-amber/90">
                <Plus className="w-4 h-4 mr-1" /> Add interview
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(["upcoming", "mine", "completed", "all"] as const).map(f => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}
                className={filter === f ? "bg-amber text-background hover:bg-amber/90" : ""}>
                {f === "upcoming" ? "Upcoming" : f === "mine" ? "Mine" : f === "completed" ? "Completed" : "All"}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {loading && items.length === 0 ? (
              <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No interviews here yet.</p>
            ) : filtered.map(i => (
              <div key={i.id} className="rounded-lg border border-border/50 bg-card/40 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-foreground">{i.candidate_name}</span>
                      <Badge className={`border text-xs capitalize ${STATUS_COLORS[i.status]}`}>{i.status}</Badge>
                      {i.ai_fit_score != null && (
                        <Badge className={`border text-xs ${i.ai_fit_score >= 80 ? "bg-green-500/20 text-green-400 border-green-500/40" : i.ai_fit_score >= 60 ? "bg-amber/20 text-amber border-amber/40" : "bg-destructive/20 text-destructive border-destructive/40"}`}>
                          <Sparkles className="w-3 h-3 mr-1" />Fit {i.ai_fit_score}/100
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]"><UserIcon className="w-2.5 h-2.5 mr-1" />{i.interviewer}</Badge>
                      {i.source === "careers" && <Badge variant="outline" className="text-[10px]">From Careers</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      {i.candidate_email && <a href={`mailto:${i.candidate_email}`} className="flex items-center gap-1 hover:text-amber"><Mail className="w-3 h-3" />{i.candidate_email}</a>}
                      {i.candidate_phone && <a href={`tel:${i.candidate_phone}`} className="flex items-center gap-1 hover:text-amber"><Phone className="w-3 h-3" />{i.candidate_phone}</a>}
                      {i.scheduled_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(i.scheduled_at).toLocaleString()}</span>}
                      {i.meeting_link && <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-amber"><Video className="w-3 h-3" />Link <ExternalLink className="w-3 h-3" /></a>}
                      {i.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{i.location}</span>}
                    </div>
                    {i.ai_summary && (
                      <div className="mt-2 rounded border border-amber/30 bg-amber/5 p-2 text-xs space-y-1">
                        <p className="whitespace-pre-wrap">{i.ai_summary}</p>
                        {!!i.ai_strengths?.length && (
                          <div><div className="text-[10px] font-mono uppercase text-green-400">Strengths</div>
                            <ul className="list-disc list-inside">{i.ai_strengths.map((s, idx) => <li key={idx}>{s}</li>)}</ul></div>
                        )}
                        {!!i.ai_concerns?.length && (
                          <div><div className="text-[10px] font-mono uppercase text-destructive">Concerns</div>
                            <ul className="list-disc list-inside">{i.ai_concerns.map((s, idx) => <li key={idx}>{s}</li>)}</ul></div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {i.share_code && i.resume_path && (
                      <Button size="sm" variant="outline" onClick={() => openResume(i.share_code)}>
                        <FileText className="w-3 h-3 mr-1" /> Resume
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => addToCalendar(i)} disabled={!!i.task_id || !i.scheduled_at}>
                      <CalendarIcon className="w-3 h-3 mr-1" />{i.task_id ? "On calendar" : "Add to calendar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(i.id)} className="text-red-400">
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>

                {/* Inline edit row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border/40">
                  <Input type="datetime-local"
                    value={i.scheduled_at ? new Date(new Date(i.scheduled_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                    onChange={e => update(i.id, { scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null, status: e.target.value && i.status === "pending" ? "scheduled" : i.status })}
                    className="h-8 text-xs" />
                  <Input value={i.meeting_link || ""} onChange={e => update(i.id, { meeting_link: e.target.value || null })} placeholder="Meeting link" className="h-8 text-xs" />
                  <Select value={i.interviewer} onValueChange={v => update(i.id, { interviewer: v as any })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Joseph</SelectItem>
                      <SelectItem value="bradon">Bradon</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={i.status} onValueChange={v => update(i.id, { status: v as any })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="passed">Passed ✓</SelectItem>
                      <SelectItem value="rejected">Rejected ✗</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  defaultValue={i.notes || ""}
                  onBlur={e => { if ((e.target.value || "") !== (i.notes || "")) update(i.id, { notes: e.target.value || null }); }}
                  placeholder="Shared notes (Joseph + Bradon)…"
                  className="min-h-[50px] text-xs bg-background/40"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewsPanel;

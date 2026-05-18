import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, RefreshCw, Trash2, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import html2canvas from "html2canvas-pro";
import { supabase } from "@/integrations/supabase/client";
import { GLOBAL_ROUTE_HINTS } from "@/lib/onboardingCurriculum";
import { listScreenshots, uploadScreenshot, deleteScreenshot } from "@/lib/onboardingApi";

const TOKEN_KEY = "aetheris_portal_token";
const PROFILE_KEY = "aetheris_portal_profile";

type Status = "idle" | "loading" | "capturing" | "uploading" | "done" | "error";

interface RowState {
  status: Status;
  message?: string;
}

export const AdminOnboardingScreenshots: React.FC = () => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [shots, setShots] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const refresh = async () => {
    try { setShots(await listScreenshots()); } catch (e) {
      toast({ title: "Failed to load screenshots", description: (e as Error).message, variant: "destructive" });
    }
  };
  useEffect(() => { refresh(); }, []);

  const authenticate = async () => {
    if (!/^\d{4,12}$/.test(code.trim())) {
      toast({ title: "Enter a valid rep code", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("rep-portal-login", {
        body: { code: code.trim() },
      });
      if (error) throw error;
      const r = data as { ok?: boolean; token?: string; exp?: number; profile?: unknown; error?: string };
      if (!r?.ok || !r.token) throw new Error(r?.error || "Login failed");
      // Inject session into THIS origin's localStorage (iframes will share it)
      const stored = `${r.exp}.${r.token}`;
      localStorage.setItem(TOKEN_KEY, stored);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(r.profile));
      setAuthed(true);
      toast({ title: "Portal session active", description: "You can now capture screenshots." });
    } catch (e) {
      toast({ title: "Login failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const waitForIframe = (route: string) =>
    new Promise<HTMLIFrameElement>((resolve, reject) => {
      const iframe = iframeRef.current;
      if (!iframe) return reject(new Error("iframe missing"));
      let settled = false;
      const onLoad = () => {
        if (settled) return;
        settled = true;
        iframe.removeEventListener("load", onLoad);
        // Settle delay so React/charts render
        setTimeout(() => resolve(iframe), 2500);
      };
      iframe.addEventListener("load", onLoad);
      iframe.src = route;
      setTimeout(() => {
        if (!settled) {
          settled = true;
          iframe.removeEventListener("load", onLoad);
          reject(new Error("iframe load timeout"));
        }
      }, 20000);
    });

  const captureOne = async (key: string, route: string) => {
    setActiveKey(key);
    setRows((r) => ({ ...r, [key]: { status: "loading" } }));
    try {
      const iframe = await waitForIframe(route);
      const doc = iframe.contentDocument;
      if (!doc?.body) throw new Error("Cannot access iframe content (cross-origin?)");
      setRows((r) => ({ ...r, [key]: { status: "capturing" } }));
      const canvas = await html2canvas(doc.body, {
        backgroundColor: "#0f1115",
        useCORS: true,
        logging: false,
        width: doc.documentElement.clientWidth,
        height: doc.documentElement.clientHeight,
        windowWidth: doc.documentElement.clientWidth,
        windowHeight: doc.documentElement.clientHeight,
      });
      const dataUrl = canvas.toDataURL("image/png");
      setRows((r) => ({ ...r, [key]: { status: "uploading" } }));
      const url = await uploadScreenshot(key, dataUrl);
      setShots((s) => ({ ...s, [key]: url }));
      setRows((r) => ({ ...r, [key]: { status: "done" } }));
    } catch (e) {
      setRows((r) => ({ ...r, [key]: { status: "error", message: (e as Error).message } }));
      throw e;
    } finally {
      setActiveKey(null);
    }
  };

  const captureAll = async () => {
    if (!authed) { toast({ title: "Authenticate first", variant: "destructive" }); return; }
    if (!confirm(`Capture all ${Object.keys(GLOBAL_ROUTE_HINTS).length} screenshots? This takes about a minute.`)) return;
    setBulkBusy(true);
    for (const [key, route] of Object.entries(GLOBAL_ROUTE_HINTS)) {
      try { await captureOne(key, route); }
      catch (e) { console.error(`[screenshots] ${key} failed`, e); }
    }
    setBulkBusy(false);
    toast({ title: "Capture complete", description: `${Object.keys(shots).length} screenshots saved` });
  };

  const handleUpload = async (key: string, file: File) => {
    setRows((r) => ({ ...r, [key]: { status: "uploading" } }));
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = () => rej(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const url = await uploadScreenshot(key, dataUrl);
      setShots((s) => ({ ...s, [key]: url }));
      setRows((r) => ({ ...r, [key]: { status: "done" } }));
      toast({ title: "Uploaded", description: key });
    } catch (e) {
      setRows((r) => ({ ...r, [key]: { status: "error", message: (e as Error).message } }));
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete screenshot for "${key}"?`)) return;
    try {
      await deleteScreenshot(key);
      setShots((s) => { const n = { ...s }; delete n[key]; return n; });
      setRows((r) => ({ ...r, [key]: { status: "idle" } }));
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" /> Portal Screenshot Capture
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Onboarding videos pair narration with a real screenshot of each portal area. Sign in with a rep code, then capture each tab. Captured images are bound by route key and auto-attached the next time you generate or re-gen a module.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!authed ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs uppercase font-mono text-muted-foreground">Rep code (any active code works)</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 123456" />
            </div>
            <Button onClick={authenticate}>Sign in to capture</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-muted/30">
            <div className="text-xs font-mono text-muted-foreground">
              Portal session active · {Object.keys(shots).length} / {Object.keys(GLOBAL_ROUTE_HINTS).length} captured
            </div>
            <Button size="sm" onClick={captureAll} disabled={bulkBusy}>
              {bulkBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
              Capture all
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(GLOBAL_ROUTE_HINTS).map(([key, route]) => {
            const url = shots[key];
            const state = rows[key];
            const busy = state && ["loading", "capturing", "uploading"].includes(state.status);
            return (
              <div key={key} className="border border-border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-sm truncate">{key}</div>
                    <div className="text-xs text-muted-foreground truncate">{route}</div>
                  </div>
                  {url && <Badge variant="secondary" className="text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Captured</Badge>}
                  {state?.status === "error" && <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>}
                </div>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="block aspect-video bg-muted rounded overflow-hidden border border-border">
                    <img src={url} alt={key} className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <div className="aspect-video bg-muted/30 rounded border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                    No screenshot yet
                  </div>
                )}
                {state?.message && <div className="text-xs text-destructive">{state.message}</div>}
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" disabled={!authed || busy || bulkBusy} onClick={() => captureOne(key, route).catch(() => {})}>
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span className="ml-1.5">{url ? "Re-capture" : "Capture"}</span>
                  </Button>
                  <label className="inline-flex">
                    <Button size="sm" variant="ghost" asChild>
                      <span><Upload className="w-3.5 h-3.5 mr-1" />Upload</span>
                    </Button>
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(key, f); e.target.value = ""; }}
                    />
                  </label>
                  {url && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(key)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hidden capture iframe, sized like a desktop preview */}
        <div className="border border-dashed border-border rounded-md overflow-hidden" style={{ height: activeKey ? 720 : 0, transition: "height 0.3s" }}>
          <iframe
            ref={iframeRef}
            title="capture"
            style={{ width: 1280, height: 720, border: 0, transform: "scale(0.78)", transformOrigin: "top left" }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminOnboardingScreenshots;

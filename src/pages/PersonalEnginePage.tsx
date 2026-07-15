import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setAdminToken, getAdminToken } from "@/lib/adminAuth";
import LinkedInPostStudio from "@/components/admin/LinkedInPostStudio";
import { Loader2 } from "lucide-react";

const STORAGE_KEY = "aetheris_personal_engine_key";

const PersonalEnginePage = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        // If we still have a valid admin token, skip minting.
        if (getAdminToken()) { setStatus("ready"); return; }

        let key = params.get("k") || params.get("key") || "";
        if (!key) key = localStorage.getItem(STORAGE_KEY) || "";
        if (!key) { setStatus("error"); setErrMsg("Missing key."); return; }

        const { data, error } = await supabase.functions.invoke("personal-engine-token", {
          body: { key },
        });
        if (error) throw error;
        if (!data?.token) throw new Error(data?.error || "No token returned");
        setAdminToken(data.token);
        localStorage.setItem(STORAGE_KEY, key);
        // Clean the key out of the URL so it doesn't linger in history/screenshots.
        const url = new URL(window.location.href);
        url.searchParams.delete("k");
        url.searchParams.delete("key");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
        setStatus("ready");
      } catch (e) {
        setErrMsg(e instanceof Error ? e.message : "Auth failed");
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Unlocking Content Engine…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive p-6 text-center">
        <div>
          <div className="font-mono uppercase text-xs mb-2">Access denied</div>
          <div className="text-sm">{errMsg}</div>
          <div className="text-xs text-muted-foreground mt-3">Append <code>?k=YOUR_KEY</code> to the URL.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber">Personal · Mobile</div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Content Engine</h1>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("aetheris_admin_token");
              localStorage.removeItem(STORAGE_KEY);
              window.location.href = "/";
            }}
            className="text-[10px] font-mono uppercase text-muted-foreground hover:text-destructive"
          >
            Sign out
          </button>
        </div>
        <LinkedInPostStudio />
      </div>
    </div>
  );
};

export default PersonalEnginePage;

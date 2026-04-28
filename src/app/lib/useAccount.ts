import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Account {
  id: string;
  user_id: string;
  hubspot_portal_id: string | null;
  hubspot_connected_at: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  sync_progress: any;
  updated_at?: string;
}

export const useAccount = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccount = useCallback(async () => {
    if (!user) {
      setAccount(null);
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      setAccount(existing as Account);
    } else {
      const { data: created } = await supabase
        .from("accounts")
        .insert({ user_id: user.id })
        .select()
        .single();
      setAccount((created as Account) ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  // Cross-device awareness: poll the account every 5s and refetch when the
  // tab becomes visible. This way, work started on another device (sync,
  // audit, etc.) shows up here without a manual reload.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchAccount, 5000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchAccount();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, fetchAccount]);

  return { account, loading, refetch: fetchAccount };
};

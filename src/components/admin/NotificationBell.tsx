import React, { useCallback, useEffect, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Person, SharedNotification, personLabel } from "@/lib/sharedWorkspace";

interface Props {
  me: Person;
  onCountChange?: (n: number) => void;
}

export const NotificationBell: React.FC<Props> = ({ me, onCountChange }) => {
  const [items, setItems] = useState<SharedNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { fetchNotifications } = await import("@/lib/sharedWorkspaceApi");
      const data = await fetchNotifications(me);
      setItems(data);
      onCountChange?.(data.filter(i => !i.read_at).length);
    } catch { /* ignore */ }
  }, [me, onCountChange]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => { clearInterval(iv); };
  }, [load, me]);

  const unread = items.filter(i => !i.read_at).length;

  const markOne = async (id: string) => {
    await supabase.from("shared_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    load();
  };
  const markAll = async () => {
    await supabase.from("shared_notifications").update({ read_at: new Date().toISOString() })
      .eq("recipient", me).is("read_at", null);
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="text-sm font-display font-semibold">Notifications · {personLabel(me)}</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} className="h-7 text-xs">
              <CheckCheck className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 && <p className="text-xs text-muted-foreground p-6 text-center">All clear.</p>}
          {items.map(n => (
            <div key={n.id} className={`p-3 border-b border-border/50 text-xs ${n.read_at ? "opacity-60" : "bg-amber/5"}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">{n.kind}</Badge>
                    <span className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <div className="font-medium mt-1">{n.title}</div>
                  {n.body && <div className="text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
                </div>
                {!n.read_at && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markOne(n.id)} title="Mark read">
                    <Check className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;

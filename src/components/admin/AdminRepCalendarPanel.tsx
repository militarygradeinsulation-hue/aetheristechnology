import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import { listCalendar, type RepSummary } from "@/lib/portalCalendar";
import { RepCalendarView } from "@/components/portal/RepCalendarView";
import { useToast } from "@/hooks/use-toast";

export const AdminRepCalendarPanel: React.FC = () => {
  const { toast } = useToast();
  const [reps, setReps] = useState<RepSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    listCalendar({})
      .then((d) => {
        const list = d.reps || [];
        setReps(list);
        if (list.length > 0 && !selected) setSelected(list[0].code);
      })
      .catch((e) => toast({ title: "Couldn't load reps", description: e.message, variant: "destructive" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber" /> Rep Calendars
            </CardTitle>
            <div className="w-64">
              <Select value={selected ?? ""} onValueChange={setSelected}>
                <SelectTrigger><SelectValue placeholder="Pick a rep" /></SelectTrigger>
                <SelectContent>
                  {reps.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.rep_name || r.code} {r.role === "partner" && " · Partner"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            View any rep's calendar. Click any entry to add coaching notes that the rep will see.
          </p>
        </CardContent>
      </Card>
      {selected && <RepCalendarView isAdmin repCode={selected} />}
    </div>
  );
};

export default AdminRepCalendarPanel;

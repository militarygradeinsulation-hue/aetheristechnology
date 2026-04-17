import React from "react";
import { Phone, Mail, Calendar, FileText, ClipboardList, MessageSquare } from "lucide-react";
import type { CrmContact, CrmInteraction, InteractionType } from "@/lib/crm";

const ICONS: Record<InteractionType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  form: FileText,
  task: ClipboardList,
};

const COLORS: Record<InteractionType, string> = {
  call: "text-blue-400 bg-blue-500/10",
  email: "text-amber bg-amber/10",
  meeting: "text-purple-400 bg-purple-500/10",
  note: "text-muted-foreground bg-muted",
  form: "text-green-400 bg-green-500/10",
  task: "text-pink-400 bg-pink-500/10",
};

interface Props {
  interactions: CrmInteraction[];
  contacts: CrmContact[];
  contactId?: string; // optional filter
}

export const InteractionTimeline: React.FC<Props> = ({ interactions, contacts, contactId }) => {
  const filtered = contactId ? interactions.filter(i => i.contact_id === contactId) : interactions;
  const contactMap = Object.fromEntries(contacts.map(c => [c.id, c.full_name]));

  if (!filtered.length) {
    return <div className="glass p-8 rounded-xl text-center text-muted-foreground text-sm">No activity yet.</div>;
  }

  return (
    <div className="space-y-3">
      {filtered.map(i => {
        const Icon = ICONS[i.type] || MessageSquare;
        return (
          <div key={i.id} className="glass p-4 rounded-xl flex gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${COLORS[i.type] || COLORS.note}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-sm text-foreground truncate">{i.subject || i.type}</div>
                <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                  {new Date(i.occurred_at).toLocaleString()}
                </span>
              </div>
              {!contactId && i.contact_id && contactMap[i.contact_id] && (
                <div className="text-xs text-amber mt-0.5">{contactMap[i.contact_id]}</div>
              )}
              {i.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{i.body}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

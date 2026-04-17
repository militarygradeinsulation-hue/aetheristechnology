// Shared CRM layout used by both the admin tool and the public demo.
// Renders the four sub-views (Pipeline, Contacts, Companies, Activity)
// with read-only protection on the public demo via the `readOnly` prop.

import React, { useMemo, useState } from "react";
import { Building2, Contact2, KanbanSquare, Activity, Search } from "lucide-react";
import type { CrmDataset } from "@/lib/crm";
import { DealsPipeline } from "./DealsPipeline";
import { ContactsList } from "./ContactsList";
import { CompaniesList } from "./CompaniesList";
import { InteractionTimeline } from "./InteractionTimeline";
import { ContactDetail } from "./ContactDetail";

export type CrmView = "pipeline" | "contacts" | "companies" | "activity";

interface Props {
  dataset: CrmDataset;
  loading?: boolean;
  readOnly?: boolean;
  onMutate?: () => void; // refetch trigger for admin mode
}

export const CrmShell: React.FC<Props> = ({ dataset, loading, readOnly, onMutate }) => {
  const [view, setView] = useState<CrmView>("pipeline");
  const [search, setSearch] = useState("");
  const [openContactId, setOpenContactId] = useState<string | null>(null);

  const tabs: { key: CrmView; label: string; icon: React.ElementType }[] = [
    { key: "pipeline", label: "Pipeline", icon: KanbanSquare },
    { key: "contacts", label: "Contacts", icon: Contact2 },
    { key: "companies", label: "Companies", icon: Building2 },
    { key: "activity", label: "Activity", icon: Activity },
  ];

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dataset.contacts;
    return dataset.contacts.filter(c =>
      [c.full_name, c.email, c.title, (c.tags || []).join(" ")]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    );
  }, [dataset.contacts, search]);

  const openContact = openContactId
    ? dataset.contacts.find(c => c.id === openContactId) || null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => { setView(t.key); setOpenContactId(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors ${
                  view === t.key
                    ? "bg-primary text-primary-foreground"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="pl-9 pr-3 py-2 rounded-lg glass text-sm w-64 outline-none focus:ring-1 focus:ring-amber"
          />
        </div>
      </div>

      {loading && (
        <div className="glass p-12 rounded-xl text-center text-muted-foreground">
          Loading CRM…
        </div>
      )}

      {!loading && openContact && (
        <ContactDetail
          contact={openContact}
          dataset={dataset}
          onClose={() => setOpenContactId(null)}
          readOnly={readOnly}
        />
      )}

      {!loading && !openContact && view === "pipeline" && (
        <DealsPipeline dataset={dataset} readOnly={readOnly} onMutate={onMutate} />
      )}
      {!loading && !openContact && view === "contacts" && (
        <ContactsList
          dataset={{ ...dataset, contacts: filteredContacts }}
          onOpen={setOpenContactId}
        />
      )}
      {!loading && !openContact && view === "companies" && (
        <CompaniesList dataset={dataset} />
      )}
      {!loading && !openContact && view === "activity" && (
        <InteractionTimeline interactions={dataset.interactions} contacts={dataset.contacts} />
      )}
    </div>
  );
};

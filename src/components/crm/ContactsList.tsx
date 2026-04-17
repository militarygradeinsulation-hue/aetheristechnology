import React from "react";
import type { CrmDataset } from "@/lib/crm";
import { Mail, Phone, Building2 } from "lucide-react";

interface Props {
  dataset: CrmDataset;
  onOpen: (id: string) => void;
}

export const ContactsList: React.FC<Props> = ({ dataset, onOpen }) => {
  const companyMap = Object.fromEntries(dataset.companies.map(c => [c.id, c.name]));

  if (!dataset.contacts.length) {
    return <div className="glass p-12 rounded-xl text-center text-muted-foreground">No contacts yet.</div>;
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">Name</th>
            <th className="text-left px-4 py-3 hidden md:table-cell">Title</th>
            <th className="text-left px-4 py-3 hidden lg:table-cell">Company</th>
            <th className="text-left px-4 py-3 hidden md:table-cell">Contact</th>
            <th className="text-left px-4 py-3">Tags</th>
          </tr>
        </thead>
        <tbody>
          {dataset.contacts.map(c => (
            <tr
              key={c.id}
              onClick={() => onOpen(c.id)}
              className="border-t border-border hover:bg-secondary/30 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <div className="font-semibold text-foreground">{c.full_name}</div>
                {c.source && <div className="text-[10px] text-muted-foreground mt-0.5">via {c.source}</div>}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.title || "—"}</td>
              <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                {c.company_id && companyMap[c.company_id] ? (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {companyMap[c.company_id]}
                  </span>
                ) : "—"}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                <div className="flex flex-col gap-0.5 text-xs">
                  {c.email && (
                    <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>
                  )}
                  {c.phone && (
                    <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(c.tags || []).map(t => (
                    <span key={t} className="text-[10px] bg-amber/20 text-amber px-2 py-0.5 rounded-full font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

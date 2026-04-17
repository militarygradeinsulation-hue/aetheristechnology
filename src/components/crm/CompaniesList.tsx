import React from "react";
import type { CrmDataset } from "@/lib/crm";
import { Building2, Globe, Users, MapPin } from "lucide-react";

export const CompaniesList: React.FC<{ dataset: CrmDataset }> = ({ dataset }) => {
  const contactCounts: Record<string, number> = {};
  const dealCounts: Record<string, number> = {};
  dataset.contacts.forEach(c => { if (c.company_id) contactCounts[c.company_id] = (contactCounts[c.company_id] || 0) + 1; });
  dataset.deals.forEach(d => { if (d.company_id) dealCounts[d.company_id] = (dealCounts[d.company_id] || 0) + 1; });

  if (!dataset.companies.length) {
    return <div className="glass p-12 rounded-xl text-center text-muted-foreground">No companies yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {dataset.companies.map(co => (
        <div key={co.id} className="glass p-5 rounded-xl border border-border hover:border-amber/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-amber" />
            <h4 className="font-bold text-foreground font-display">{co.name}</h4>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            {co.industry && <div>{co.industry}{co.size ? ` · ${co.size}` : ""}</div>}
            {co.location && <div className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {co.location}</div>}
            {co.website && <div className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> {co.website}</div>}
          </div>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="inline-flex items-center gap-1 text-foreground">
              <Users className="w-3 h-3 text-amber" /> {contactCounts[co.id] || 0} contact{(contactCounts[co.id] || 0) === 1 ? "" : "s"}
            </span>
            <span className="text-foreground">{dealCounts[co.id] || 0} deal{(dealCounts[co.id] || 0) === 1 ? "" : "s"}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

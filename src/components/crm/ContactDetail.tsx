import React from "react";
import { ChevronLeft, Mail, Phone, Building2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney, type CrmContact, type CrmDataset } from "@/lib/crm";
import { InteractionTimeline } from "./InteractionTimeline";

interface Props {
  contact: CrmContact;
  dataset: CrmDataset;
  onClose: () => void;
  readOnly?: boolean;
}

export const ContactDetail: React.FC<Props> = ({ contact, dataset, onClose }) => {
  const company = contact.company_id ? dataset.companies.find(c => c.id === contact.company_id) : null;
  const deals = dataset.deals.filter(d => d.contact_id === contact.id);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onClose}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Contacts
      </Button>

      <div className="glass p-6 rounded-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-foreground font-display">{contact.full_name}</h3>
            {contact.title && <p className="text-muted-foreground text-sm mt-1">{contact.title}</p>}
            {company && (
              <p className="text-amber text-sm mt-1 inline-flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {company.name}
              </p>
            )}
          </div>
          <div className="text-sm space-y-1">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-amber">
                <Mail className="w-4 h-4" /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-amber">
                <Phone className="w-4 h-4" /> {contact.phone}
              </a>
            )}
          </div>
        </div>

        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {contact.tags.map(t => (
              <span key={t} className="text-xs bg-amber/20 text-amber px-2 py-0.5 rounded-full font-mono inline-flex items-center gap-1">
                <Tag className="w-3 h-3" /> {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {deals.length > 0 && (
        <div className="glass p-6 rounded-xl">
          <h4 className="font-bold text-foreground font-display mb-3">Deals ({deals.length})</h4>
          <div className="space-y-2">
            {deals.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-foreground">{d.title}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{d.stage}</div>
                </div>
                <div className="text-amber font-bold font-display">{formatMoney(d.value_cents, d.currency)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-bold text-foreground font-display mb-3">Activity</h4>
        <InteractionTimeline
          interactions={dataset.interactions}
          contacts={dataset.contacts}
          contactId={contact.id}
        />
      </div>
    </div>
  );
};

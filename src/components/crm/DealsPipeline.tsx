// Kanban pipeline. Drag-drop in admin mode actually updates `crm_deals.stage`
// in Supabase; in demo mode it shows a toast and reverts.

import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DEAL_STAGES, STAGE_LABEL, formatMoney, type CrmDataset, type CrmDeal, type DealStage } from "@/lib/crm";

interface Props {
  dataset: CrmDataset;
  readOnly?: boolean;
  onMutate?: () => void;
}

const DealCard: React.FC<{ deal: CrmDeal; companyName?: string; contactName?: string }> = ({ deal, companyName, contactName }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`glass p-3 rounded-lg cursor-grab active:cursor-grabbing border border-border hover:border-amber/40 transition-colors ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="font-semibold text-sm text-foreground line-clamp-2">{deal.title}</div>
      <div className="text-xs text-muted-foreground mt-1">{companyName || contactName || "—"}</div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-amber font-bold text-sm font-display">{formatMoney(deal.value_cents, deal.currency)}</span>
        {deal.expected_close_date && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {new Date(deal.expected_close_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};

const Column: React.FC<{ stage: DealStage; deals: CrmDeal[]; total: number; renderCard: (d: CrmDeal) => React.ReactNode }> = ({ stage, deals, total, renderCard }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${stage}` });
  return (
    <div
      ref={setNodeRef}
      className={`glass rounded-xl p-3 min-h-[300px] border transition-colors ${isOver ? "border-amber" : "border-border"}`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{STAGE_LABEL[stage]}</h4>
        <span className="text-[10px] text-amber font-mono">{deals.length}</span>
      </div>
      <div className="text-[10px] text-muted-foreground font-mono mb-3 px-1">{formatMoney(total)}</div>
      <div className="space-y-2">
        {deals.map(d => <div key={d.id}>{renderCard(d)}</div>)}
      </div>
    </div>
  );
};

export const DealsPipeline: React.FC<Props> = ({ dataset, readOnly, onMutate }) => {
  const { toast } = useToast();
  const [localDeals, setLocalDeals] = useState<CrmDeal[]>(dataset.deals);
  useEffect(() => { setLocalDeals(dataset.deals); }, [dataset.deals]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const m: Record<DealStage, CrmDeal[]> = { lead: [], qualified: [], proposal: [], won: [], lost: [] };
    localDeals.forEach(d => { m[d.stage]?.push(d); });
    return m;
  }, [localDeals]);

  const totals = useMemo(() => {
    const m: Record<DealStage, number> = { lead: 0, qualified: 0, proposal: 0, won: 0, lost: 0 };
    localDeals.forEach(d => { m[d.stage] = (m[d.stage] || 0) + d.value_cents; });
    return m;
  }, [localDeals]);

  const companyMap = useMemo(() => Object.fromEntries(dataset.companies.map(c => [c.id, c.name])), [dataset.companies]);
  const contactMap = useMemo(() => Object.fromEntries(dataset.contacts.map(c => [c.id, c.full_name])), [dataset.contacts]);

  const handleDragEnd = async (e: DragEndEvent) => {
    const dealId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : "";
    if (!overId.startsWith("col-")) return;
    const newStage = overId.slice(4) as DealStage;
    const deal = localDeals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    if (readOnly) {
      toast({
        title: "Demo mode",
        description: "Sign up to manage real deals in your CRM.",
      });
      return;
    }

    // Optimistic update
    setLocalDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    const { error } = await supabase.from("crm_deals").update({ stage: newStage }).eq("id", dealId);
    if (error) {
      toast({ title: "Failed to move deal", description: error.message, variant: "destructive" });
      setLocalDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: deal.stage } : d));
    } else {
      onMutate?.();
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {DEAL_STAGES.map(stage => (
          <Column
            key={stage}
            stage={stage}
            deals={grouped[stage]}
            total={totals[stage]}
            renderCard={(d) => (
              <DealCard
                deal={d}
                companyName={d.company_id ? companyMap[d.company_id] : undefined}
                contactName={d.contact_id ? contactMap[d.contact_id] : undefined}
              />
            )}
          />
        ))}
      </div>
    </DndContext>
  );
};

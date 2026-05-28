import React from "react";
import { ChevronDown, ChevronRight, X, ExternalLink, GripVertical, Maximize2 } from "lucide-react";
import { TOOL_BY_ID } from "./toolRegistry";
import { Link } from "react-router-dom";
import type { WidgetSize } from "@/lib/workbench";

interface Props {
  toolId: string;
  collapsed: boolean;
  size: WidgetSize;
  onToggle: () => void;
  onRemove: () => void;
  onCycleSize: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

// Per-widget body height. Drives the inner scroll area.
const sizeMaxH: Record<WidgetSize, string> = {
  sm: "max-h-[40vh]",
  md: "max-h-[60vh]",
  lg: "max-h-[80vh]",
  xl: "max-h-none",
};
const sizeLabel: Record<WidgetSize, string> = { sm: "S", md: "M", lg: "L", xl: "XL" };

export const WorkbenchWidget: React.FC<Props> = ({
  toolId, collapsed, size, onToggle, onRemove, onCycleSize,
  onDragStart, onDragOver, onDrop,
}) => {
  const tool = TOOL_BY_ID[toolId];
  if (!tool) return null;
  const Icon = tool.icon;
  return (
    <div
      className="forensic-tile rounded-lg overflow-hidden"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-card/60">
        <button
          draggable
          onDragStart={onDragStart}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-amber"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button onClick={onToggle} className="text-muted-foreground hover:text-amber" title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <Icon className="w-4 h-4 text-amber" />
        <span className="text-sm font-semibold text-foreground flex-1 truncate">{tool.label}</span>
        <button
          onClick={onCycleSize}
          className="flex items-center gap-1 px-2 py-0.5 rounded border border-border/60 text-[10px] font-mono uppercase tracking-wider text-amber hover:bg-amber/10"
          title="Cycle widget size (S → M → L → XL)"
        >
          <Maximize2 className="w-3 h-3" />
          {sizeLabel[size]}
        </button>
        {tool.fullPagePath && (
          <Link
            to={tool.fullPagePath}
            className="text-muted-foreground hover:text-amber"
            title="Open full page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" title="Remove widget">
          <X className="w-4 h-4" />
        </button>
      </div>
      {!collapsed && (
        <div className={`p-3 ${sizeMaxH[size]} overflow-y-auto bg-background/40`}>
          {tool.render()}
        </div>
      )}
    </div>
  );
};

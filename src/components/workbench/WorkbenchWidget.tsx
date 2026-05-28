import React from "react";
import { ChevronDown, ChevronRight, X, ExternalLink, GripVertical } from "lucide-react";
import { TOOL_BY_ID } from "./toolRegistry";
import { Link } from "react-router-dom";

interface Props {
  toolId: string;
  collapsed: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export const WorkbenchWidget: React.FC<Props> = ({
  toolId, collapsed, onToggle, onRemove, onDragStart, onDragOver, onDrop,
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
        <button onClick={onToggle} className="text-muted-foreground hover:text-amber">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <Icon className="w-4 h-4 text-amber" />
        <span className="text-sm font-semibold text-foreground flex-1 truncate">{tool.label}</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
          {tool.group}
        </span>
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
        <div className="p-3 max-h-[70vh] overflow-y-auto bg-background/40">
          {tool.render()}
        </div>
      )}
    </div>
  );
};

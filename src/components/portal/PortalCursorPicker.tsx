import React from 'react';
import { MousePointer2, Search } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { usePortalCursor, CURSOR_OPTIONS, type CursorStyle } from '@/lib/portalCursor';

export const PortalCursorPicker: React.FC = () => {
  const { style, setStyle } = usePortalCursor();
  return (
    <Select value={style} onValueChange={(v) => setStyle(v as CursorStyle)}>
      <SelectTrigger
        className="h-9 w-[160px] border-amber/40 text-amber hover:bg-amber/10 gap-2"
        aria-label="Choose cursor style"
        title="Choose your portal cursor"
      >
        {style === 'magnifier'
          ? <Search className="w-4 h-4" />
          : <MousePointer2 className="w-4 h-4" />}
        <SelectValue placeholder="Cursor" />
      </SelectTrigger>
      <SelectContent>
        {CURSOR_OPTIONS.map(opt => (
          <SelectItem key={opt.id} value={opt.id}>
            <div className="flex flex-col">
              <span className="text-sm">{opt.label}</span>
              <span className="text-[10px] text-muted-foreground">{opt.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default PortalCursorPicker;

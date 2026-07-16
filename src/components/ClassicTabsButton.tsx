import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, LayoutGrid } from 'lucide-react';
import { useTabSize } from '@/lib/tabSize';
import { useTabColorMode } from '@/lib/portalTabColors';
import { useClassicTabs } from '@/lib/classicTabs';
import { useToast } from '@/hooks/use-toast';

/**
 * Toggle the original tab appearance: one flat row of tab buttons (no
 * category sections / dropdowns), uniform color, 100% size.
 */
export const ClassicTabsButton: React.FC<{ className?: string }> = ({ className }) => {
  const { setScale } = useTabSize();
  const { setMode } = useTabColorMode();
  const { classic, setClassic } = useClassicTabs();
  const { toast } = useToast();

  const enable = () => {
    setClassic(true);
    setScale(1);
    setMode('uniform');
    toast({ title: 'Classic tab view ON', description: 'Flat tab row, no category sections.' });
  };
  const disable = () => {
    setClassic(false);
    toast({ title: 'Classic tab view OFF', description: 'Restored category sections.' });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`h-9 ${className || ''}`}
      title={classic
        ? 'Classic flat tabs are ON. Click to restore category sections.'
        : 'Restore the original flat tab row (no category dropdowns).'}
      onClick={classic ? disable : enable}
    >
      {classic
        ? <><LayoutGrid className="w-3.5 h-3.5 mr-1 text-amber" /> Category tabs</>
        : <><RotateCcw className="w-3.5 h-3.5 mr-1 text-amber" /> Classic tabs</>}
    </Button>
  );
};

export default ClassicTabsButton;

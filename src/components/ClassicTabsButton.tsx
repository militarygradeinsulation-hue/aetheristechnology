import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useTabSize } from '@/lib/tabSize';
import { useTabColorMode } from '@/lib/portalTabColors';
import { useToast } from '@/hooks/use-toast';

/**
 * One-click "restore the original tab appearance" — resets the tab size
 * slider back to 100% and switches color mode back to uniform.
 */
export const ClassicTabsButton: React.FC<{ className?: string }> = ({ className }) => {
  const { setScale } = useTabSize();
  const { setMode } = useTabColorMode();
  const { toast } = useToast();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`h-9 ${className || ''}`}
      title="Restore the original tab appearance (uniform color, 100% size)"
      onClick={() => {
        setScale(1);
        setMode('uniform');
        toast({ title: 'Classic tab view restored', description: 'Uniform color, 100% size.' });
      }}
    >
      <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber" />
      Classic tabs
    </Button>
  );
};

export default ClassicTabsButton;

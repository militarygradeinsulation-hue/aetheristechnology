import React from 'react';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';
import { useTabColorMode } from '@/lib/portalTabColors';

export const TabColorToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { mode, toggle } = useTabColorMode();
  const isRainbow = mode === 'rainbow';
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      className={`h-9 ${className || ''}`}
      title={isRainbow ? 'Tabs use different colors. Click for uniform.' : 'Tabs use one color. Click for rainbow.'}
    >
      <Palette className={`w-3.5 h-3.5 mr-1 ${isRainbow ? 'text-fuchsia-400' : 'text-amber'}`} />
      {isRainbow ? 'Rainbow tabs' : 'Uniform tabs'}
    </Button>
  );
};

export default TabColorToggle;

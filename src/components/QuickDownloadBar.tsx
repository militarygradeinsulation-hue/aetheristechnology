import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { downloadLibraryItemAsPdf } from '@/lib/generateLibraryPdf';
import { formatLibraryItemAsText, downloadText, type AdminLibraryItem } from '@/lib/adminLibrary';
import { EasyReadButton } from '@/components/EasyReadButton';

interface Props {
  toolType: string;
  title: string;
  outputData: any;
  inputData?: any;
  className?: string;
}

/** Quick download / copy / .txt bar shown inline as soon as a tool finishes generating a report. */
export const QuickDownloadBar: React.FC<Props> = ({ toolType, title, outputData, inputData, className }) => {
  const [copied, setCopied] = React.useState(false);

  const buildItem = (): AdminLibraryItem => ({
    id: 'inline',
    tool_type: toolType,
    title,
    input_data: (inputData || {}) as Record<string, unknown>,
    output_data: (outputData || {}) as Record<string, unknown>,
    file_url: null,
    created_at: new Date().toISOString(),
  });

  const handlePdf = () => {
    try {
      downloadLibraryItemAsPdf(buildItem());
      toast({ title: 'PDF downloaded' });
    } catch (e: any) {
      toast({ title: 'Download failed', description: e?.message || 'Try again', variant: 'destructive' });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatLibraryItemAsText(buildItem()));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleTxt = () => {
    const safe = title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80);
    downloadText(`${safe}.txt`, formatLibraryItemAsText(buildItem()));
  };

  return (
    <div className={`glass rounded-xl p-3 border border-amber/30 flex flex-wrap items-center gap-2 justify-between ${className || ''}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-amber px-1">Report ready · Quick download</span>
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={handlePdf} className="bg-amber hover:bg-amber/90 text-background font-bold">
          <Download className="w-4 h-4 mr-1" /> PDF
        </Button>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />} Copy
        </Button>
        <Button size="sm" variant="ghost" onClick={handleTxt}>.txt</Button>
      </div>
    </div>
  );
};

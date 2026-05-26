// Standalone wrapper around DetectiveMode so it can run as a top-level tool
// (admin tools + rep My Tools) without requiring a saved lead. The user enters
// a website + business name, we build a minimal lead shape, and DetectiveMode
// auto-runs its own forensic prep (scan, RDAP, scrape, enrichment).
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileSearch } from 'lucide-react';
import { DetectiveMode } from '@/components/portal/DetectiveMode';
import { hasValidAdminToken } from '@/lib/adminAuth';

export const DetectiveModeStandalone: React.FC = () => {
  const [website, setWebsite] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [started, setStarted] = useState(false);

  const auth: 'admin' | 'portal' = hasValidAdminToken() ? 'admin' : 'portal';

  if (started) {
    const lead = {
      business_name: businessName.trim() || website.trim(),
      website: website.trim(),
      industry: industry.trim() || undefined,
    } as any;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[10px] uppercase tracking-widest font-mono text-amber">
            Detective Mode · {lead.business_name}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStarted(false)}
            className="h-7 text-[11px]"
          >
            New target
          </Button>
        </div>
        <DetectiveMode
          lead={lead}
          scan={null}
          rr={null}
          fc={null}
          enrichment={null}
          auth={auth}
        />
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-amber/30 bg-amber/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileSearch className="w-5 h-5 text-amber" />
        <h3 className="font-display text-lg font-bold tracking-wide">Detective Mode</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Drop a website + business name. The detective auto-runs the full forensic prep
        (scan, RDAP, scrape, enrichment), walks its monologue, picks the best angle,
        and writes the opener.
      </p>
      <div className="grid md:grid-cols-3 gap-2">
        <Input
          placeholder="Website (https://...)"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && website.trim()) setStarted(true); }}
        />
        <Input
          placeholder="Business name (optional)"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
        <Input
          placeholder="Industry (optional)"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => setStarted(true)}
          disabled={!website.trim()}
          className="bg-amber hover:bg-amber/90 text-charcoal font-bold"
        >
          <Search className="w-4 h-4 mr-1" /> Open the case
        </Button>
      </div>
    </div>
  );
};

export default DetectiveModeStandalone;

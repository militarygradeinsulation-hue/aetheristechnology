import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, FileText, StickyNote, Settings as SettingsIcon, Users } from 'lucide-react';
import { WorkspaceHistory } from './WorkspaceHistory';
import { WorkspaceNotes } from './WorkspaceNotes';
import { WorkspaceSettings } from './WorkspaceSettings';
import SharedWorkspace from '@/components/admin/SharedWorkspace';
import type { Person } from '@/lib/sharedWorkspace';

type SubTab = 'shared' | 'history' | 'notes' | 'settings';

interface WorkspaceTabProps {
  sharedPerson?: Person;
}

export const WorkspaceTab: React.FC<WorkspaceTabProps> = ({ sharedPerson = 'bradon' }) => {
  const [sub, setSub] = useState<SubTab>('shared');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-display">My Workspace</h2>
          <p className="text-sm text-muted-foreground">
            Your personal CRM — saved tool runs, notes, and defaults. Tied to your code.
          </p>
        </div>
        {sub !== 'settings' && (
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={sub === 'history' ? 'Search history…' : 'Search notes…'}
              className="pl-9"
            />
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {([
          { k: 'shared', label: 'Shared Live', Icon: Users },
          { k: 'history', label: 'History', Icon: FileText },
          { k: 'notes', label: 'Notes', Icon: StickyNote },
          { k: 'settings', label: 'Settings', Icon: SettingsIcon },
        ] as const).map(({ k, label, Icon }) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              sub === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {sub === 'shared' && <SharedWorkspace me={sharedPerson} />}
      {sub === 'history' && <WorkspaceHistory searchQuery={search} />}
      {sub === 'notes' && <WorkspaceNotes searchQuery={search} />}
      {sub === 'settings' && <WorkspaceSettings />}
    </div>
  );
};

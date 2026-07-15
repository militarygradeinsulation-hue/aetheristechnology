// Data + generators for the Aetheris Vibe OS — the operating system this firm
// uses to run AI pair-programming (Lovable/Bolt/Cursor/Claude) engagements
// without regressions, drift, or fabricated data reaching production.

export interface VibeLaw {
  id: number;
  name: string;
  fixes: string;
  rules: string[];
}

export const VIBE_LAWS: VibeLaw[] = [
  {
    id: 1,
    name: 'Regression Lock',
    fixes: "Fix-and-break cycle (Lovable's top complaint)",
    rules: [
      'One change objective per prompt',
      'Protected Manifest enforced on every prompt',
      'Verify block names 2-3 things that must still work',
      'Checkpoint/commit before touching auth, data models, or payments',
    ],
  },
  {
    id: 2,
    name: 'Persistent Case File',
    fixes: 'Context drift and forgotten decisions',
    rules: [
      'PROJECT_KNOWLEDGE.md in tool knowledge at all times',
      'Updated at end of every session',
      'AI is told context every session, never asked to remember',
    ],
  },
  {
    id: 3,
    name: 'Security Floor',
    fixes: '45% OWASP vuln rate, backwards auth, exposed keys, open endpoints',
    rules: [
      'RLS enabled on every Supabase table',
      'Auth or signature verification on every endpoint',
      'Secrets server-side only, never in frontend code',
      'Validate all client-supplied data including headers',
      'Verify unfamiliar packages exist before installing',
    ],
  },
  {
    id: 4,
    name: 'Credit Discipline',
    fixes: "Token burn (Bolt's parking meter problem)",
    rules: [
      'Plan in chat mode, execute in build mode',
      'Diagnosis prompt required before any retry',
      'Batch related edits into one structured prompt',
    ],
  },
  {
    id: 5,
    name: 'Real Data Only',
    fixes: 'Fabricated demo data reaching production',
    rules: [
      'No synthetic companies, testimonials, or metrics',
      'Seed data flagged with removal comment and logged as open thread',
      'Demo mode is an explicit toggle, never a default',
    ],
  },
  {
    id: 6,
    name: 'Maintainable Output',
    fixes: 'Unreadable AI spaghetti that developers call chaos',
    rules: [
      'Components under 300 lines',
      'camelCase functions, PascalCase components, kebab-case files',
      'Dead code removed when replaced',
      'One-line intent comments on non-obvious blocks',
    ],
  },
];

export interface VibePhase {
  id: number;
  name: string;
  gate: string;
}

export const VIBE_PHASES: VibePhase[] = [
  { id: 0, name: 'Charter', gate: 'Charter written into Case File' },
  { id: 1, name: 'Foundation', gate: 'Design tokens and schema locked in Case File' },
  { id: 2, name: 'Structure', gate: 'Login, full navigation, logout all work; auth added to Protected Manifest' },
  { id: 3, name: 'Features', gate: 'All charter features function with real data; each on Protected Manifest' },
  { id: 4, name: 'Hardening', gate: 'Security floor checklist fully checked in writing' },
  { id: 5, name: 'Launch', gate: 'Payments live, monitoring on, closing Case File entry written' },
];

export const DESIGN_TOKENS = {
  background: '#0A0A0A',
  surface: '#141414',
  accent: '#C9A227',
  textPrimary: '#EDEDED',
  textMuted: '#8A8A8A',
};

export const STANDING_ORDERS = [
  'One change objective per prompt. Refuse bundled requests; ask to split them.',
  'Never modify anything on the Protected Manifest unless the prompt explicitly unlocks it by name.',
  'Never refactor, restyle, or "improve" code outside the stated objective.',
  'Security floor: RLS on every table, auth on every endpoint, secrets server-side only, validate all client input.',
  'No synthetic or fabricated data. Seed data must be flagged `// SEED DATA - REMOVE BEFORE LAUNCH` and logged under Open Threads.',
  'Components under 300 lines. Remove dead code you replace. Consistent naming: camelCase functions, PascalCase components, kebab-case files.',
  'If a request conflicts with these orders, say so before building anything.',
];

export interface VibeCharter {
  projectName: string;
  oneLiner: string;
  audience: string;
  features: string; // free text, one per line
  outOfScope: string;
  frontend: string;
  backend: string;
  auth: string;
  payments: string;
  integrations: string;
  phase: number;
}

export const DEFAULT_CHARTER: VibeCharter = {
  projectName: '',
  oneLiner: '',
  audience: '',
  features: '',
  outOfScope: '',
  frontend: 'Lovable / React + TypeScript',
  backend: 'Supabase',
  auth: 'Supabase Auth',
  payments: 'Stripe — mode: TEST until Phase 5',
  integrations: '',
  phase: 0,
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function listLines(value: string): string[] {
  return value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export function generateCaseFile(charter: VibeCharter): string {
  const name = charter.projectName.trim() || '[PROJECT NAME]';
  const features = listLines(charter.features);
  const phase = VIBE_PHASES[charter.phase] ?? VIBE_PHASES[0];

  const lines: string[] = [];
  lines.push(`# PROJECT CASE FILE — ${name}`);
  lines.push('');
  lines.push(`**Opened:** ${today()} · **Status:** Phase ${phase.id} — ${phase.name}`);
  lines.push('');
  lines.push('> Paste this file into Lovable Knowledge, CLAUDE.md, or .cursorrules. Update it at the end of every session. The AI reads this before every prompt.');
  lines.push('');
  lines.push('## Standing Orders (never override these)');
  STANDING_ORDERS.forEach((o, i) => lines.push(`${i + 1}. ${o}`));
  lines.push('');
  lines.push('## Charter');
  lines.push(`- **What this app does:** ${charter.oneLiner.trim() || '[one sentence]'}`);
  lines.push(`- **Who uses it:** ${charter.audience.trim() || '[audience]'}`);
  lines.push('- **Core v1 features:**');
  if (features.length) {
    features.forEach((f) => lines.push(`  1. ${f}`));
  } else {
    lines.push('  1. [ ]');
  }
  lines.push(`- **Explicitly out of scope for v1:** ${charter.outOfScope.trim() || '[ ]'}`);
  lines.push('');
  lines.push('## Stack');
  lines.push(`- Frontend: ${charter.frontend.trim() || '[ ]'}`);
  lines.push(`- Backend: ${charter.backend.trim() || '[ ]'}`);
  lines.push(`- Auth: ${charter.auth.trim() || '[ ]'}`);
  lines.push(`- Payments: ${charter.payments.trim() || '[ ]'}`);
  lines.push(`- Integrations: ${charter.integrations.trim() || '[ ]'}`);
  lines.push('');
  lines.push('## Design Tokens (locked at Phase 1)');
  Object.entries(DESIGN_TOKENS).forEach(([k, v]) => lines.push(`- ${k}: \`${v}\``));
  lines.push('- Do not introduce colors, fonts, or spacing outside these tokens.');
  lines.push('');
  lines.push('## Data Model');
  lines.push('| Table | Purpose | RLS enabled |');
  lines.push('|---|---|---|');
  lines.push('| | | ☐ |');
  lines.push('');
  lines.push('## Protected Manifest (do not touch)');
  lines.push('| Item | Protected since | Files |');
  lines.push('|---|---|---|');
  lines.push('| | | |');
  lines.push('');
  lines.push('## Decision Log');
  lines.push('| Date | Decision | Why |');
  lines.push('|---|---|---|');
  lines.push('| | | |');
  lines.push('');
  lines.push('## Open Threads');
  lines.push('- [ ]');
  lines.push('');
  lines.push('## Session Log');
  lines.push(`- ${today()} — Objective: ___ | Changed: ___ | Broke/fixed: ___ | Next: ___`);
  lines.push('');

  return lines.join('\n');
}

export interface PromptInput {
  objective: string;
  scopeItems: string; // free text, one per line
  protectedItems: string; // free text, one per line
  verifyItems: string; // free text, one per line
}

export function generateFiveBlockPrompt(charter: VibeCharter, input: PromptInput): string {
  const name = charter.projectName.trim() || '[PROJECT NAME]';
  const phase = VIBE_PHASES[charter.phase] ?? VIBE_PHASES[0];
  const scope = listLines(input.scopeItems);
  const protectedItems = listLines(input.protectedItems);
  const verify = listLines(input.verifyItems);

  const lines: string[] = [];
  lines.push('CONTEXT');
  lines.push(`Project: ${name}. ${charter.oneLiner.trim() || '[one sentence description]'}`);
  lines.push(`Current phase: ${phase.id} — ${phase.name}. Gate: ${phase.gate}.`);
  lines.push('Read the Case File in project knowledge before acting on this prompt.');
  lines.push('');
  lines.push('OBJECTIVE');
  lines.push(input.objective.trim() || '[the single change you want made]');
  lines.push('');
  lines.push('CONSTRAINTS');
  lines.push('- RLS enabled on every Supabase table; auth or signature verification on every endpoint.');
  lines.push('- Secrets stay server-side only. Validate all client-supplied data, including headers.');
  lines.push('- No synthetic or fabricated data. Flag any seed data `// SEED DATA - REMOVE BEFORE LAUNCH`.');
  lines.push('- Components under 300 lines. camelCase functions, PascalCase components, kebab-case files.');
  lines.push('- Diagnose the root cause before retrying; do not bundle unrelated fixes into this prompt.');
  lines.push('');
  lines.push('SCOPE_LOCK');
  lines.push(
    `Change only: ${scope.length ? scope.join(', ') : '<files/features>'}. ` +
      `Do not modify anything on the Protected Manifest${protectedItems.length ? ` (${protectedItems.join(', ')})` : ''}. ` +
      'Do not refactor, restyle, or improve anything not named in the Objective.'
  );
  lines.push('');
  lines.push('VERIFY');
  lines.push(
    `After this change, confirm these still work: ${verify.length ? verify.join(', ') : '<2-3 items>'}.`
  );

  return lines.join('\n');
}

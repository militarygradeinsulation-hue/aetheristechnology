// ChipBridge — exposes the entire app (backend + frontend) to the Chip perceive
// script. Installs onto `window.ChipBridge` so `chip.js` (or any Chip.attach()
// call) can query live data, invoke edge functions, list tables, read route
// state, and trigger any registered UI tool.
//
// Scope: unrestricted by design — Chip runs inside the authenticated admin
// session and inherits its RLS. There is no allow-list; every table the caller
// can read via the Supabase JS client is reachable through the bridge.

import { supabase } from '@/integrations/supabase/client';

type ToolHandler = (args?: any) => any | Promise<any>;

export interface ChipSnapshot {
  ts: number;
  route: string;
  viewport: { w: number; h: number };
  user: { id: string | null; email: string | null };
  tables: string[];
  tools: string[];
  lastVerdict: any;
}

// Registry of frontend tools Chip can invoke. Any component can call
// ChipBridge.registerTool('name', handler) at mount and unregister on unmount.
const tools = new Map<string, ToolHandler>();

// Known public tables (mirrors src prompt list). Chip can also call
// bridge.query(anyTable) — this list is just for discovery.
const KNOWN_TABLES = [
  'accounts','activity_log','admin_users','ai_detection_scans','assistant_actions',
  'assistant_conversations','assistant_messages','audit_runs','blog_posts',
  'call_recordings','campaign_assets','careers_applications','commissions',
  'company_calendar','contact_submissions','crm_companies','crm_contacts','crm_deals',
  'customers','drip_emails','drip_prospects','drip_sequences','events','event_signups',
  'forecast_briefings','forensic_scans','hubspot_meetings','hygiene_actions',
  'hygiene_scans','identified_visitors','lead_action_items','mirror_companies',
  'mirror_contacts','mirror_deals','mirror_engagements','news_posts',
  'onboarding_progress','pattern_results','pending_actions','playbooks','profiles',
  'purchases','rep_activity','rep_calendar_events','rep_codes','rep_leads',
  'rep_notes','rep_plays','rep_quotas','resume_scans','sales','shared_tasks',
  'site_events','subscriptions','testimonials','tool_generations','tool_leads',
  'trainings','training_attempts','webinar_registrations','webinars',
];

export interface ChipBridgeAPI {
  version: string;
  installedAt: number;
  supabase: typeof supabase;
  // Data
  query: (table: string, opts?: {
    select?: string;
    limit?: number;
    order?: { column: string; ascending?: boolean };
    filter?: Array<[string, string, any]>;  // [column, op, value]
  }) => Promise<any>;
  count: (table: string) => Promise<number | null>;
  listTables: () => string[];
  // Edge functions
  invoke: (name: string, body?: any) => Promise<any>;
  // UI tool registry
  registerTool: (name: string, fn: ToolHandler) => () => void;
  runTool: (name: string, args?: any) => Promise<any>;
  listTools: () => string[];
  // Runtime state
  snapshot: () => Promise<ChipSnapshot>;
  navigate: (path: string) => void;
  // Perceive helpers
  lastVerdict: any;
  setVerdict: (v: any) => void;
  // Event bus (Chip can subscribe/emit)
  emit: (event: string, payload?: any) => void;
  on: (event: string, cb: (payload?: any) => void) => () => void;
}

const listeners = new Map<string, Set<(p?: any) => void>>();

export function installChipBridge(): ChipBridgeAPI {
  if (typeof window === 'undefined') return {} as ChipBridgeAPI;
  const w = window as any;
  if (w.ChipBridge) return w.ChipBridge as ChipBridgeAPI;

  const api: ChipBridgeAPI = {
    version: '1.0.0',
    installedAt: Date.now(),
    supabase,

    async query(table, opts = {}) {
      let q: any = supabase.from(table as any).select(opts.select ?? '*');
      if (opts.filter) {
        for (const [col, op, val] of opts.filter) {
          q = q[op]?.(col, val) ?? q;
        }
      }
      if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? false });
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    },

    async count(table) {
      const { count, error } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
      if (error) return null;
      return count ?? null;
    },

    listTables() { return [...KNOWN_TABLES]; },

    async invoke(name, body) {
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw new Error(error.message);
      return data;
    },

    registerTool(name, fn) {
      tools.set(name, fn);
      return () => { tools.delete(name); };
    },

    async runTool(name, args) {
      const fn = tools.get(name);
      if (!fn) throw new Error(`Unknown tool: ${name}`);
      return await fn(args);
    },

    listTools() { return [...tools.keys()]; },

    async snapshot() {
      const { data: { user } } = await supabase.auth.getUser();
      return {
        ts: Date.now(),
        route: window.location.pathname + window.location.search,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        user: { id: user?.id ?? null, email: user?.email ?? null },
        tables: KNOWN_TABLES,
        tools: [...tools.keys()],
        lastVerdict: (window as any).__chipVerdict ?? null,
      };
    },

    navigate(path) {
      // Uses HTML5 history so React Router picks it up.
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },

    get lastVerdict() { return (window as any).__chipVerdict ?? null; },
    setVerdict(v) { (window as any).__chipVerdict = v; api.emit('verdict', v); },

    emit(event, payload) {
      listeners.get(event)?.forEach(cb => { try { cb(payload); } catch {} });
    },
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return () => { listeners.get(event)?.delete(cb); };
    },
  };

  w.ChipBridge = api;
  // Signal availability to any Chip script waiting for the bridge.
  window.dispatchEvent(new CustomEvent('chip-bridge-ready', { detail: api }));
  return api;
}

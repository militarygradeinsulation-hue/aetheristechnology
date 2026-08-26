# Digital You / Essence Engine

An attachable "Digital You" — an operating layer that wraps around an existing tool (here,
Channel Intelligence) instead of replacing it. The dashboard keeps its own state, filters,
history, and dataset; Digital You connects through a controlled bridge and grows a memory,
a decision engine, and a team of specialized copies of itself on top.

```
Existing Tool → Integration Bridge → Digital You Memory → Digital Core → Specialized You
→ Decision DNA → Goal Engine → Actions → Proof → Corrections → Better Digital You
```

Channel Intelligence is just the first capability wired into that bridge. The same pattern
(open the tool, push a snapshot, absorb it into memory) is how a CRM, Golden Report, email
system, analytics tool, or custom Aetheris tool would attach next.

## Try it

Open `digital-you-essence-engine.html` directly in a browser — no build step, no server. It's
the whole engine in one file. From the **Channel Intelligence Bridge** tab, click **Open Channel
Intelligence Dashboard**, then come back and click **Absorb Current Dashboard** to pull its
filters/KPIs/data/history into Digital You's Memory Graph, with a Proof System entry recording
exactly what happened.

You can also open `channel-intelligence-dashboard.html` directly and click **Open Digital You**
to start from that side instead — the bridge works either direction.

## What's in this package

| File | What it is |
|---|---|
| `digital-you-essence-engine.html` | Standalone, single-file Digital You prototype. Everything inlined — the easiest way to try it. |
| `channel-intelligence-dashboard.html` | The existing tool being wrapped: its own filters, KPIs, ROI/spend allocation simulator, forecasting, raw dataset, and history — all local to itself. |
| `essence-engine.js` / `essence-engine.css` | The attachable engine as separate files, for embedding into another page: `<script src="essence-engine.js">` + `EssenceEngine.mount(el)`. This is the same code that's inlined into the standalone HTML above. |
| `adapters/provider-adapter.example.js` | Browser-side client for wiring a real AI backend in. No API keys here — it POSTs to your own server. |
| `adapters/storage-adapter.js` | Swaps persistence from localStorage to a REST backend or Supabase, without touching the engine. |
| `server/provider-server.example.js` | Reference Node server holding the real Anthropic API key and exposing `/chat`, `/decompose-goal`, `/evaluate-decision`, `/test-voice`. |
| `schema.sql` | Production Postgres/Supabase schema — identities, specialized instances, memory, thought rules, goals, tasks, decisions, ideas, corrections, proof, connected-system snapshots — with RLS. |

## What's coded and working right now

Everything below runs for real in the browser, with no backend required:

- **Digital Core** — identity, mission, standards, boundaries, style/voice config.
- **My Digital Team** — create Executive You, Marketing You, Operations You, Research You, or
  unlimited custom copies, each with its own autonomy level and memory scope.
- **Autonomy ladder** — Observe → Recommend → Draft → Execute With Approval → Autonomous. An
  instance's rung gates what it's allowed to do without a human.
- **Decision DNA / Teach Me You** — teach a situation → notice → consider → usually-do rule
  without building a workflow.
- **Memory Graph** — principles, preferences, observations, connected intelligence, corrections,
  decision patterns, tagged and filterable.
- **Goal Engine → Live Work** — give it an outcome, it decomposes into tasks that land in a
  single cross-team work stream.
- **What Would I Do?** — ask a problem; the active Digital You retrieves matching memory and
  decision rules, shows its reasoning trace, and gives a confidence-scored recommendation.
- **That's Not Me** — corrections become a new memory node *and* a new decision rule, not just
  a note.
- **Idea Engine** — capture an opportunity, convert it straight into a Goal Engine goal.
- **Decision Center** — anything above an instance's autonomy rung (or below a confidence
  threshold) waits here for a human instead of auto-executing.
- **Proof System** — actor, action, reason, evidence, confidence, outcome, and recorded time for
  everything Digital You does or is asked.
- **Legacy / portability** — export the whole Digital You as one JSON file; import it elsewhere.
- **Channel Intelligence Bridge** — absorb the dashboard's filters/KPIs/data/history into memory,
  live, via `postMessage` + `BroadcastChannel`, with a `localStorage` mirror as a fallback.

The reasoning behind What Would I Do? and Goal Engine, by default, is a transparent local
heuristic (keyword-overlap retrieval over memory and decision rules) — not a network call, and
not faking an LLM. It's honest about low confidence when nothing matches. Swap in a real model
by wiring the provider adapter (see below); the UI and Proof System behave identically either
way, they just cite a different reasoner.

## What's a hook, not a fake

Three things are deliberately **not** implemented in the browser, because doing them for real
needs authenticated server-side services and this prototype doesn't put secrets in client code:

1. **Real AI reasoning** for Goal Engine / What Would I Do?, beyond the local heuristic —
   wire `adapters/provider-adapter.example.js` to `server/provider-server.example.js` (or your
   own backend) and set `isRemote: true`.
2. **Real voice/avatar generation** — Voice & Identity is a config screen with an honest
   "Test Connection" that reports *not connected* until a real provider is wired server-side.
3. **24/7 autonomous execution / sending messages / controlling external systems** — the
   Autonomy ladder and Decision Center model this correctly, but actually *acting* outside the
   browser (posting, emailing, calling another system) needs a real backend with real
   credentials behind the same adapter seam.

## Wiring a real backend

```html
<script src="essence-engine.js"></script>
<script src="adapters/provider-adapter.example.js"></script>
<script src="adapters/storage-adapter.js"></script>
<script>
  window.DigitalYouProviderAdapter = createRemoteProviderAdapter({
    baseUrl: "https://your-server.example.com",
    name: "Aetheris Backend"
  });
  window.DigitalYouStorageAdapter = createRemoteStorageAdapter({
    baseUrl: "https://your-server.example.com/api/digital-you",
    identityId: "the-signed-in-user's-identity-id"
  });
  EssenceEngine.mount(document.getElementById("app"));
</script>
```

Run the reference server:

```bash
npm install @anthropic-ai/sdk zod
ANTHROPIC_API_KEY=sk-ant-... node server/provider-server.example.js
```

Apply the schema to a Postgres/Supabase project:

```bash
psql "$DATABASE_URL" -f schema.sql
# or: use the Supabase MCP/CLI apply_migration with this file's contents
```

## Responsive design

Both HTML files follow the same responsive principle as the original Channel Intelligence
dashboard: a desktop grid (KPI cards, two-column panels) that collapses to a single column with
a slide-out drawer nav below ~900px, matching the dashboard's own mobile collapse behavior.

## Storage adapter

Out of the box, everything persists to `localStorage` (`essence_engine_db_v1`) — that's what
makes the standalone file work by just opening it. Swap `window.DigitalYouStorageAdapter` for
`createRemoteStorageAdapter(...)` (REST) or `createSupabaseStorageAdapter(...)` (direct Supabase,
table names matching `schema.sql`) to move to server persistence without touching the engine.

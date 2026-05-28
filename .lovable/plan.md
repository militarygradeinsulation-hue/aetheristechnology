# Plan: Floating Workbench Overlay

A persistent "Workbench" button you can summon from any page. It opens a floating panel where you stack any tool as a collapsible widget, run several at once, and your drafts survive reloads. Saved layouts let you switch between, say, "Morning prospecting" and "Reply session" in one click.

## What you'll see

- A small floating **Workbench** button (bottom-right, above FloatingContact) on every admin/rep portal page.
- Click → a right-side slide-over panel opens (resizable, dismissable, doesn't block the page underneath).
- Inside: a stack of **collapsible tool widgets**. Each widget = one tool (Outreach Email, Website Scanner, All-in-One, Post-from-Source, Sales Script, Follow-up Plan, Content Calendar, Playbook, Brand Contradiction Finder, Friction Audit, LinkedIn Banner, Strategic Questions, Resume Forensics, Detective Mode, etc.).
- Top of panel: **"+ Add tool"** dropdown, **layout selector** (Default / saved layouts), **Save layout** / **Edit** / **Delete**.
- Each widget has: collapse, reorder (drag handle), remove, and an "open full page" link.
- Half-finished work (email drafts, scan URL, generator inputs) stays when you close the panel or reload the page.

## Saved layouts

Same model as the existing `PortalViewSelector`:
- "Default" = empty workbench.
- User can save named layouts: which tools are in the stack, order, collapsed/expanded state.
- Stored per-rep so each person gets their own.

## Tools available as widgets (all current tools)

Grouped in the "+ Add tool" menu:
- **Outreach**: Outreach Email, Post-from-Source, LinkedIn Banner, Sales Script, Follow-up Plan
- **Diagnostics**: Website Scanner, Brand Contradiction Finder, Friction Audit, Strategic Questions, Detective Mode, Resume Forensics
- **Content**: All-in-One Generator, Content Calendar, Playbook Creator, Social Content
- **Brief Builders**: Interview Briefing, Lead Game Plan

Each tool's existing component is reused as-is inside a widget shell — no duplication of logic.

## Technical section

**New files**
- `src/components/workbench/FloatingWorkbench.tsx` — the floating button + slide-over container (uses shadcn `Sheet`, side="right", size variants for `sm/md/lg/full`).
- `src/components/workbench/WorkbenchStack.tsx` — renders the ordered widget list with drag-to-reorder (lightweight, no new dep — HTML5 drag/drop).
- `src/components/workbench/WorkbenchWidget.tsx` — collapsible shell (header: icon, title, expand/collapse, remove, "open full"). Uses shadcn `Collapsible`.
- `src/components/workbench/toolRegistry.ts` — central registry mapping `toolId → { label, icon, group, Component, fullPagePath }`. One entry per tool, pointing to the existing component (e.g. `OutreachEmailCreator`, `WebsiteScanner`, `AllInOneGenerator`, etc.).
- `src/lib/workbench.ts` — localStorage-backed persistence:
  - `workbench.${repCode}.stack` — current `[{ toolId, collapsed }]`
  - `workbench.${repCode}.layouts` — `[{ name, stack }]`
  - `workbench.${repCode}.activeLayout`
  - `workbench.${repCode}.toolState.${toolId}` — per-tool form/draft state (each tool component will accept an optional `persistKey` prop and use a tiny `useWorkbenchPersistedState` hook to read/write here).

**Persistence approach (drafts survive reload)**
- Add `useWorkbenchPersistedState<T>(persistKey, initial)` hook (debounced localStorage write).
- For widget instances, the registry passes `persistKey="workbench.${repCode}.toolState.${toolId}"` into the component.
- Most existing tool components use `useState` for their inputs; we add 1-line opt-in: replace `useState` with `useWorkbenchPersistedState` only inside widget-mounted instances by wrapping each registered component in a tiny adapter that supplies an initial-state hydrator. Components used on their full pages stay unchanged.
  - Concretely: each registry entry wraps the component in `<PersistedToolWrapper persistKey={...}>` which uses React context to expose a `usePersisted` helper. Tools that don't opt in still work — they just won't survive reload (acceptable for view-only tools like Detective Mode).
- Heavy tools (Website Scanner results, generated content) already write to `library` table — we won't re-persist that, just inputs.

**Mounting**
- Mount `<FloatingWorkbench />` once inside `src/pages/PortalPage.tsx` (rep portal) and in the admin shell (`AdminDashboard` / wherever `FloatingContact` is rendered for staff).
- Hide on public marketing pages (`/`, `/leak-audit`, blog) — gate on `useStaffUnlock`/rep code presence.

**Styling**
- Reuse `forensic-tile` card style, amber accents, JetBrains Mono micro-labels. No new design tokens.
- Slide-over widths: `sm` (420px), `md` (640px), `lg` (900px), `full` (full-screen). Toggle via header buttons.
- On mobile: full-width sheet, accordion still works.

**Out of scope (this pass)**
- Drag-to-tile grid layout (rejected per your accordion preference).
- Cross-tool data piping (e.g. Scanner → Outreach prefill). Easy follow-up once registry exists.
- Server-side sync of layouts (localStorage only for v1; can promote to `rep_workspace_prefs` later).

## Files changed

- **New**: `src/components/workbench/{FloatingWorkbench,WorkbenchStack,WorkbenchWidget,PersistedToolWrapper}.tsx`, `src/components/workbench/toolRegistry.ts`, `src/lib/workbench.ts`, `src/hooks/useWorkbenchPersistedState.ts`
- **Edited**: `src/pages/PortalPage.tsx` (mount overlay), `src/pages/AdminDashboard.tsx` (mount overlay for staff), `src/components/FloatingContact.tsx` (offset z-index/position so the two buttons don't overlap)

No DB migrations. No edge functions. Pure frontend.

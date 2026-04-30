# Embed Sales Tools Inside the Portal

## Problem
Today the portal's **My Tools** tab is just a grid of links. Clicking a tool opens the public marketing page in a new tab (`/scan`, `/sales-scripts`, etc.). Reps get bounced out of the portal and the pages still show paywall language even though the tools unlock for them. You wanted it to feel like the admin area — pick a tool, it loads inline, fully unlocked, no navigation away.

## Solution
Convert the **My Tools** tab into an in-portal tool launcher. Clicking a tool swaps the panel to render that tool's component directly inside the portal, with a "Back to all tools" button. Every tool runs in `adminMode` so paywalls/locked sections never appear.

### New behavior in the `tools` tab
```
┌──────────────────────────────────────────┐
│  Sales Tools                             │
│  [grid of 8 tool cards]                  │
└──────────────────────────────────────────┘
        ↓ click "Website Scanner"
┌──────────────────────────────────────────┐
│  ← Back to all tools                     │
│  Website Scanner                         │
│  ────────────────────────────            │
│  <WebsiteScanner staffUnlock />          │
└──────────────────────────────────────────┘
```

### Tools wired in (all 8)
| Card | Component rendered inline |
|---|---|
| Free Leak Audit | `WhatsWrongDiagnostic` (the leak-audit quiz) |
| Website Scanner | `WebsiteScanner` with `staffUnlock` |
| Business Diagnostic Quiz | `BusinessDiagnostic` |
| Sales Script Generator | `SalesScriptGenerator` with `adminMode` |
| Follow-Up Plan | `FollowUpPlanGenerator` with `adminMode` |
| Strategic Question Engine | `StrategicQuestionEngine` with `adminMode` |
| Brand Contradiction Finder | `BrandContradictionFinder` with `adminMode` |
| Friction Vocabulary Audit | `FrictionVocabularyAudit` with `adminMode` |

Each card keeps the existing public URL displayed underneath so reps can still copy/share it as a lead magnet — but the card click launches the embedded version, not a new tab. A small "Open public page ↗" secondary link will preserve the share use-case.

## Files to change

**`src/pages/PortalPage.tsx`**
- Replace the `REP_TOOLS` link grid with a launcher pattern.
- Add `const [activeTool, setActiveTool] = useState<string | null>(null)`.
- Import the 8 tool components.
- Add a small `<ToolEmbed>` switch that returns the right component for `activeTool`, all passed `adminMode={true}` (or `staffUnlock` for the scanner). Since the user is logged into the portal, the unlock is implicit — pass `true` directly.
- Replace tool grid rendering: each card becomes a `<button>` that sets `activeTool`. Keep a tiny `Open public page ↗` link in the corner for the shareable URL.
- When `activeTool` is set, hide the grid and render header `← Back to all tools` + the embedded tool.

**No changes needed elsewhere** — every tool component already supports `adminMode` / `staffUnlock` props and works standalone.

## Notes
- The public pages stay exactly as they are (still used as lead magnets reps share).
- The Company Portal tab and AI Coach tab are unchanged.
- No backend, schema, or auth changes.

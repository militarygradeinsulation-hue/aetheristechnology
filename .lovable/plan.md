## Goal

Take the two uploaded decks (`The_LinkedIn_Revenue_Engine.pptx`, `LinkedIn_Forensic_Dossier.pptx`) and bake them into the Aetheris system as the operating doctrine for LinkedIn — so every generated post, every scheduled day, and every rep behaviour matches the playbook.

Your existing 5-format architecture (Case File / Leak of the Week / Diagnostic / Operator's Journal / Contrarian) stays — these decks layer **distribution mechanics** on top of it.

---

## What's in the decks (the rules we'll encode)

**Engine model — three gears that run simultaneously:**
1. Borrowed Distribution (Comment-Jacking + Reciprocity Pods)
2. Forensic Content (Expensive Mistake hooks + Audit Carousels)
3. Surgical Outbound (Loom audits + Soft Front Door + Reverse-Engineered search)

**Post architecture rules:**
- Hook = specific number + specific wound (e.g., *"$4M company losing 31% of inbound leads from one CRM field"*)
- Carousels/cheat sheets get 7x dwell — force them into the rotation
- Build numbered serialised IP: **Autopsy #1, #2, #3…** (Tuesday weekly)
- Every public post ends with a **Soft Front Door** CTA: *"Comment AUTOPSY for the checklist"* → DM the asset → ask one curious question → never pitch in DM

**Distribution rules:**
- Comment-jack 5 industry giants daily within 30 min of their post
- Reverse-engineer demand: search *"looking for help with [HubSpot / lead flow / CRM]"* → comment, then DM 24h later with a Loom offer
- Bypass the C-suite — target mid-level Marketing/Ops managers
- Loom audit reply rate 20–40% vs cold InMail 1–2%

**Cadence rules:**
- 90-day activation curve — quitters fail at day ~30 (the "Quit Zone")
- 7-month, 95/5 buying cycle — most of the audience isn't buying yet
- Daily choreography: 08:00 post, 09:00 comment-jack, 11:00 Loom batch, 14:00 demand search, 16:00 Soft Front Door DMs

---

## Plan

### 1. Encode the doctrine as project memory

Create `mem://marketing/linkedin-playbook` capturing:
- The 3 gears + the daily choreography table
- Hook formula + Soft Front Door DM script
- Loom audit script + reply-rate benchmarks
- Reverse-engineered search queries
- 90-day activation expectation (don't kill the system at day 30)

Add it to `mem://index.md` so every future generation respects it.

### 2. Upgrade `generate-social-content` edge function

Currently produces 7 posts using the 5 formats. Add to the prompt:
- **Hook rule:** every Case File and Leak-of-the-Week post must open with `$X + specific %` + named wound
- **Soft Front Door CTA:** every post (except Operator's Journal) ends with `Comment [KEYWORD] for the [asset]` — keyword is unique per post
- **Carousel flag:** mark 2 posts/week as `format_type: "carousel"` with 7–10 slide outlines
- **Autopsy series:** Tuesday's Case File is always titled `Autopsy #N: [vertical] — [the leak]`
- New JSON field per post: `softFrontDoor: { keyword, asset_name, dm_script, follow_up_question }`

### 3. New page: `/playbook/linkedin` (Daily Choreography)

A dark forensic dashboard that turns the Dossier into a daily checklist:
- Top: the 3 gears with status pills
- Middle: today's 5 timed blocks (08:00 / 09:00 / 11:00 / 14:00 / 16:00) with the exact action and a "mark complete" toggle (local state, no backend needed)
- Right rail: the **90-Day Activation Curve** with current day counter so reps see they're not in the Quit Zone
- Bottom: copy-to-clipboard scripts (Loom, Soft Front Door DM, Reverse-engineered search comment, Mid-level bypass DM)

Linked from the admin sidebar and from the Content Calendar page.

### 4. Wire the playbook into the existing Content Calendar

In `src/components/admin/ContentCalendar.tsx`, add a small **"Doctrine"** strip above the calendar showing:
- Today's required action from the choreography
- This week's Autopsy number
- A "Generate this week's pack" button that calls the upgraded social-content generator

### 5. Update brand-strategy + content-architecture memory

Patch `mem://business/brand-strategy` and `mem://marketing/content-architecture` to reference the new doctrine file so the Hormozi/Naval/Sutherland structural-influence layer keeps working but now also obeys the deck rules (hook formula, Soft Front Door, carousel cadence, Autopsy series).

---

## Technical details

| File | Change |
|---|---|
| `mem://marketing/linkedin-playbook` | NEW — full doctrine from both decks |
| `mem://index.md` | Add reference line under Memories |
| `mem://business/brand-strategy` | Append "Distribution doctrine → see linkedin-playbook" |
| `mem://marketing/content-architecture` | Append carousel/Soft Front Door/Autopsy rules |
| `supabase/functions/generate-social-content/index.ts` | Expand prompt with hook formula, Soft Front Door object, carousel flagging, Autopsy series naming |
| `src/pages/LinkedInPlaybookPage.tsx` | NEW — Daily Choreography dashboard |
| `src/App.tsx` | Add `/playbook/linkedin` route |
| `src/components/admin/ContentCalendar.tsx` | Add Doctrine strip + generate-pack button |
| `src/pages/AdminDashboard.tsx` | Sidebar link to the new playbook page |

No new database tables needed — the playbook page is stateless (daily checklist resets at midnight via `localStorage` keyed by date). The generator already writes to `admin_library`, so the calendar will pick up the upgraded posts automatically.

---

## What you'll see when this ships

1. A live `/playbook/linkedin` page you open every morning that tells you exactly what to do at 08:00, 09:00, 11:00, 14:00, 16:00 — with copy-paste scripts.
2. Every weekly content pack now includes a Tuesday Autopsy entry, 2 carousel posts, and a unique Soft Front Door keyword on every post.
3. The Content Calendar shows today's choreography action + current Autopsy number at the top.
4. All future AI generations (this app and any new tool you add) automatically obey the doctrine because it lives in memory.


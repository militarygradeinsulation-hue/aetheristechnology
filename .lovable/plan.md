

## What you're asking

Use your HubSpot meeting link as the primary "Book a meeting" call-to-action across the site. The LinkedIn `safety/go` wrapper is just LinkedIn's redirect — the real destination is:

`https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst`

That's already the exact URL embedded in `src/components/HubSpotMeeting.tsx` on `/contact`. So the embed is fine — what's missing is a **direct "Book a Meeting" link/button** wired into the high-traffic spots.

## What I'll change

### 1. Add "Book a Meeting" to the floating contact widget
`src/components/FloatingContact.tsx` — add a new button (above the diagnostic CTA) that opens the HubSpot link in a new tab. Same amber styling, calendar icon. Also add it to the mobile `StickyContactBar`.

### 2. Add it to the contact modal
`src/components/ContactModal.tsx` — new row above the diagnostic CTA: "Book a Meeting → Pick a time on my calendar" with a calendar icon, opens HubSpot in a new tab.

### 3. Add it to the Contact page CTA block
`src/components/Contact.tsx` — add a third primary button next to "Call to Start" / "Email to Start": **"Book a Meeting"** (calendar icon, opens HubSpot in new tab). This gives visitors who hate phone/email a frictionless option without scrolling to the embed below.

### 4. Centralize the URL
New file `src/lib/links.ts` exporting `BOOK_MEETING_URL` so the link lives in one place and we never drift.

### 5. Track clicks
Every new button fires `trackEvent('book_meeting_click', { location: '...' })` so we can see in admin analytics which placement converts.

## What I will NOT change

- Won't touch the existing `/contact` HubSpot embed — it stays as the deep-dive option.
- Won't replace the "View the Diagnostic" CTA — meeting booking is added alongside it, not instead of it.
- Won't add it to the navbar (would clutter; the floating widget covers global access).
- Won't use the LinkedIn `safety/go` wrapper URL — we link straight to HubSpot to avoid the extra redirect hop.

## Files touched

- New: `src/lib/links.ts`
- `src/components/FloatingContact.tsx`
- `src/components/ContactModal.tsx`
- `src/components/Contact.tsx`

## Validation

- Open `/` → click floating bubble → see "Book a Meeting" button → opens HubSpot calendar in new tab.
- Mobile sticky bar shows a "Book" icon that opens the calendar.
- Open contact modal from navbar → "Book a Meeting" row visible and clickable.
- Open `/contact` → three buttons (Call / Email / Book a Meeting) above the existing HubSpot embed.


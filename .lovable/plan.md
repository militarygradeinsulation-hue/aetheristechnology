Add a "Back to Admin" button in `src/app/AppLayout.tsx` so users in the Revenue Recovery app (`/app/*`) can jump back to the main admin dashboard (`/admin`).

## Changes

**File: `src/app/AppLayout.tsx`**

1. Import `ArrowLeft` icon from `lucide-react`.
2. Add a `Link` to `/admin` in the sidebar footer (above the email + Sign out block), styled as a subtle secondary action so it doesn't compete with primary nav items.
3. Mirror the same link in the mobile header (next to "Sign out") so it's reachable on small screens too.

## Visual

Desktop sidebar footer (new top row):
```text
[← Back to Admin]
user@email.com
[⎋ Sign out]
```

Mobile header:
```text
[Logo Revenue Recovery]   [Admin]  [Sign out]
```

No new routes, no auth changes — `/admin` already exists and uses its own passcode gate.

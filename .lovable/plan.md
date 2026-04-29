# Why LinkedIn isn't connecting

The flow is broken in two places, both rooted in the same problem: **the admin dashboard runs inside the Lovable preview iframe, but LinkedIn refuses to load inside an iframe and the OAuth redirect can't make it back to the iframe.**

## Root causes

1. **Redirect URI is dynamic and almost certainly not whitelisted in your LinkedIn app.**
   `handleLinkedinConnect` builds `redirect_uri = ${window.location.origin}/admin`. Inside the Lovable preview that becomes `https://id-preview--<uuid>.lovable.app/admin` (or `lovableproject.com`). LinkedIn rejects any redirect URI that isn't *exactly* listed under "Authorized redirect URLs" in your LinkedIn Developer app, so the consent screen returns an error before the code is ever issued.

2. **Navigation happens inside the iframe.** `window.location.href = data.url` tries to load `linkedin.com/oauth/...` inside the preview iframe. LinkedIn sets `X-Frame-Options: DENY`, so the page is blocked and the user sees a blank/refused frame. Even if it loaded, LinkedIn would redirect back to the preview iframe URL — not to your real `/admin` page where the user is logged in.

3. **The callback runs on `/admin` of whichever origin LinkedIn redirected to**, but the admin token (in `localStorage`) lives per-origin. If LinkedIn redirects to the published domain and the user authenticated on the preview (or vice versa), `getAdminToken()` returns null and `handleLinkedinCallback` silently no-ops.

## Fix plan

### 1. Pin the redirect URI to one canonical, registered URL
- Add a `LINKEDIN_REDIRECT_URI` constant, default `https://aetheris.technology/admin`.
- Use that exact value in both `authorize` and `callback` calls (must match byte-for-byte).
- Tell the user to add that URL to their LinkedIn app's "Authorized redirect URLs".

### 2. Break out of the iframe when starting OAuth
In `handleLinkedinConnect`, after getting the authorize URL:
- Try `window.top.location.href = data.url` (matches the pattern already used in `HubSpotConnectCard.tsx`).
- Fall back to `window.open(url, '_blank')` if cross-origin frame access is blocked.

### 3. Make the callback resilient
- On mount, if `?code=...&state=admin_oauth` is present but `getAdminToken()` is null, show a toast "Open admin from your bookmarked URL and try again" instead of silently failing.
- Pass the canonical `redirect_uri` constant to the `callback` invocation (currently rebuilt from `window.location.origin` — must match what was sent in step 1 or LinkedIn rejects the code exchange).

### 4. Surface real errors
- LinkedIn returns errors as `?error=...&error_description=...` on the redirect. The current effect only checks for `code`. Add handling that toasts the error description so future failures are visible instead of silent.
- Add `console.log` of `data` / `error` in `handleLinkedinConnect` so the next attempt produces something in the browser console.

### 5. Verify required secrets/scopes
- `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are present in secrets ✅.
- The function requests scopes `openid profile w_member_social`. Confirm those three products are enabled on the LinkedIn app ("Sign In with LinkedIn using OpenID Connect" + "Share on LinkedIn"). If "Share on LinkedIn" isn't approved, `w_member_social` causes the consent screen to error immediately.

## Files to change

- `src/pages/AdminDashboard.tsx` — add `LINKEDIN_REDIRECT_URI` constant, top-frame navigation, error handling, token-missing guard.
- (No edge function changes required — `linkedin-auth/index.ts` already echoes back whatever `redirect_uri` the client sends.)

## What you'll need to do once

In your LinkedIn Developer Portal → your app → **Auth** tab → **Authorized redirect URLs**, add:
```
https://aetheris.technology/admin
```
(Or whichever single canonical URL you want to use. Tell me which one and I'll wire it in.)

## Open question

Which domain should be the canonical OAuth redirect?
- `https://aetheris.technology/admin` (your custom domain — recommended)
- `https://aetheristechnology.lovable.app/admin` (Lovable published)
- Something else

Once you confirm, I'll implement the fixes above.
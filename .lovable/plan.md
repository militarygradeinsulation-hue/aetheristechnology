## Problem

On `/admin` → Forecast tab, `ForecastCenter` (mounted with `authMode="admin"`) calls the `portal-forecast` edge function. Every call is returning **401 Unauthorized**, producing the toast "Could not load briefing — Edge Function returned a non-2xx status code". Other admin-token endpoints (`admin-data`, `admin-rep-codes`) on the same page succeed with the same token, so the admin PIN token itself is valid — `portal-forecast` is rejecting it specifically.

## Fix

### 1. Add diagnostic logging to `portal-forecast`
Before responding 401, log which token (admin / portal) was received and which verifier failed. This makes the real cause visible in edge function logs on the next request.

```ts
const adminTokRaw = getAdminTokenFromRequest(req);
const portalTokRaw = getPortalTokenFromRequest(req);
const adminOk = await verifyAdminToken(adminTokRaw, SERVICE);
const portalClaims = adminOk ? null : await verifyPortalToken(portalTokRaw, SERVICE);
if (!adminOk && !portalClaims) {
  console.warn("portal-forecast unauthorized", {
    hasAdminTok: !!adminTokRaw,
    adminTokLen: adminTokRaw?.length,
    hasPortalTok: !!portalTokRaw,
  });
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, ... });
}
```

### 2. Align CORS allow-headers with the other admin functions
Add the supabase-js client headers so preflight matches what supabase-js sends and we don't fail silently in Safari/strict CORS:

```ts
"Access-Control-Allow-Headers":
  "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
```

### 3. Friendlier client error message
In `src/components/portal/ForecastCenter.tsx`, when `portalForecast.getToday()` throws with a 401-shaped error and `authMode === "admin"`, prompt the user to re-enter their PIN at `/admin/login` instead of just showing "Edge Function returned a non-2xx status code".

### 4. Redeploy + retest
Deploy `portal-forecast`, refresh the Forecast tab, then re-read edge logs. The new log line will tell us whether the admin token is being dropped in transit (CORS / supabase-js issue) or actually failing HMAC verification (key mismatch / clock skew). Apply the targeted fix from there — most likely either:
- Re-issuing the admin PIN token (re-login at `/admin/login`) if the token in localStorage was signed with a stale service-role key.
- A small tweak to `verifyAdminToken` if logs show the token shape is fine but verification still returns false.

## Files touched
- `supabase/functions/portal-forecast/index.ts` (logging + CORS headers)
- `src/components/portal/ForecastCenter.tsx` (friendlier 401 toast + re-login CTA)

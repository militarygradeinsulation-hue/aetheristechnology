

# Rep Portal Login Page

## Overview
Create a dedicated Rep Portal page where sales reps can log in using their 6-digit code and email. Once authenticated, they see their sales performance dashboard (total sales, commissions earned, commission rate).

## New Page: `/rep-portal`

A simple login form with two fields:
- **Rep Code** (6-digit code)
- **Email** (must match the `rep_email` on their `rep_codes` record)

On submit, validate the code and email against the `rep_codes` table. If matched, show a dashboard with their stats (total sales, total commission, commission rate, active status).

No Supabase Auth involved -- this is a lightweight code+email lookup, similar to how admin PIN login works but simpler (no token needed since reps only see their own read-only stats).

## Database Change

The `rep_codes` table already has `rep_email` (nullable). No schema change needed -- reps just need their email populated. The existing anon SELECT policy (`is_active = true`) already allows validation from the client.

## Files

| File | Change |
|------|--------|
| `src/pages/RepPortalPage.tsx` | New page with code+email login form and stats dashboard |
| `src/App.tsx` | Add `/rep-portal` route |

## UI Flow

1. Rep visits `/rep-portal`
2. Enters their 6-digit code and email
3. Client queries `rep_codes` where `code` matches and `is_active = true`
4. If `rep_email` matches the entered email, show dashboard with:
   - Rep name, code, commission rate
   - Total sales (formatted from cents)
   - Total commission earned
   - Active status
5. If no match or email mismatch, show error toast

## Security Notes

- The anon RLS policy only exposes active rep codes -- no sensitive data beyond what the rep already knows (their own stats)
- Email matching adds a second factor so random code guesses don't reveal data
- No write access for anon users on `rep_codes`


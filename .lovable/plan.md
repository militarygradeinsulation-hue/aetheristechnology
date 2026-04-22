

# Fix Playbook Creator RLS Error

## Problem
The `PlaybookCreator` component tries to INSERT into `generated_playbooks` from the browser using the anon/public key. The only INSERT-capable RLS policy requires `service_role`, so the insert fails with "new row violates row-level security policy."

## Solution
Move the record creation into the `generate-custom-playbook` edge function (which already runs with `service_role`). The client will send the form data directly to the function instead of inserting first.

## Files Changed

| File | Change |
|------|--------|
| `src/components/PlaybookCreator.tsx` | Remove the client-side `.insert()` call. Instead, send `{ title, subtitle, pillar, tags }` directly to the `generate-custom-playbook` edge function. |
| `supabase/functions/generate-custom-playbook/index.ts` | Accept `topicData` (title, subtitle, pillar, tags) as an alternative to `playbookId`. When received, create the `generated_playbooks` record server-side (with service role), then proceed with generation as before. |

## Detail

**Edge function change**: If the request body contains `topicData` instead of `playbookId`, the function will:
1. Insert a new row into `generated_playbooks` with status `pending`
2. Continue with the existing generation flow using the new record's ID
3. Return the file URL as before

**Client change**: The `PlaybookCreator` submit handler will invoke the function with `{ topicData: { title, subtitle, pillar, tags, icon } }` and read the result directly, removing the two-step insert-then-invoke pattern.


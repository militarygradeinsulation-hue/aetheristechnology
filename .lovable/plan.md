I’ll fix the HubSpot connection flow using the scope list you provided and force a clean reconnect.

## What I’ll change

### 1. Update the HubSpot OAuth start function
In `supabase/functions/hubspot-oauth-start/index.ts`, I’ll replace the current oversized required/optional scope arrays with your exact requested scope set, split as:

**Required core scopes**
```text
crm.objects.contacts.read crm.objects.contacts.write crm.objects.deals.read crm.objects.deals.write crm.objects.companies.read crm.objects.companies.write crm.objects.owners.read crm.schemas.contacts.read crm.schemas.deals.read crm.schemas.companies.read crm.objects.engagements.read automation oauth
```

**Optional but needed scopes**
```text
crm.objects.subscriptions.read crm.objects.subscriptions.write crm.objects.invoices.read crm.objects.invoices.write crm.objects.orders.read crm.objects.orders.write crm.objects.line_items.read crm.objects.line_items.write crm.objects.notes.read crm.objects.notes.write crm.objects.calls.read crm.objects.calls.write crm.objects.emails.read crm.objects.emails.write crm.objects.meetings.read crm.objects.meetings.write crm.objects.tasks.read crm.objects.tasks.write crm.objects.goals.read crm.objects.goals.write crm.objects.custom_objects.read crm.objects.custom_objects.write crm.objects.lists.read crm.objects.lists.write content webhooks
```

I’ll make sure `automation` and `oauth` are separate scopes. Your pasted text had `automation` followed by `oauthcrm.objects.subscriptions.read`; I’ll correct that into `automation oauth` plus the next scope.

### 2. Build the authorize URL correctly
The generated HubSpot install URL will include:

```text
scope=<13 required scopes>
optional_scope=<26 optional scopes>
```

This keeps the core install strict while allowing tier-gated/extra features to be granted when available.

### 3. Deploy the updated backend function
I’ll redeploy `hubspot-oauth-start` so the Settings page uses the corrected OAuth URL immediately.

### 4. Clear the stored HubSpot connection tokens
I’ll reset HubSpot connection fields on the existing `accounts` row(s):

```text
hubspot_portal_id = null
hubspot_access_token_encrypted = null
hubspot_refresh_token_encrypted = null
hubspot_access_token_expires_at = null
hubspot_connected_at = null
hubspot_scopes = null
last_sync_status / last_sync_error reset
sync_progress = {}
```

That forces the next Connect action to show HubSpot’s fresh consent screen instead of reusing the old authorization.

## After this is done
You’ll go to `/app/settings`, click **Connect HubSpot**, approve the scope request, and the connection should complete with the corrected scope set.
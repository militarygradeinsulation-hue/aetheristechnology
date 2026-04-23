

## Fix the HubSpot redirect URL mismatch

The error is a configuration mismatch on **HubSpot's side**, not a code bug. Your app sends this redirect URL during OAuth:

```
https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/hubspot-oauth-callback
```

HubSpot is rejecting it because that exact string is not in your app's **Redirect URLs** allow-list.

### What you need to do in HubSpot (2 minutes, no code change)

1. Go to https://developers.hubspot.com → **Apps** → open the app you created
2. Click **Auth** in the left sidebar
3. Under **Redirect URLs**, click **Add another URL** and paste this **exactly** (no trailing slash, no spaces):
   ```
   https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/hubspot-oauth-callback
   ```
4. Scroll to the bottom and click **Save changes**
5. While you're on the Auth page, confirm your **Scopes** section includes all of these (add any missing, then save again):
   - `crm.objects.contacts.read`
   - `crm.objects.deals.read`
   - `crm.objects.companies.read`
   - `crm.schemas.contacts.read`
   - `crm.schemas.deals.read`
   - `oauth`
6. Return to your app preview at `/app/dashboard` and click **Connect HubSpot** again

### Common gotchas

- **Wrong app**: If you have multiple HubSpot apps, make sure you're editing the same one whose Client ID/Secret you pasted as secrets here. The Client ID at the top of the Auth page should match the one in your secrets.
- **MCP Auth App vs. Public App**: If you accidentally created an "MCP Auth App" instead of a regular **Public App**, the redirect URL field works differently. You need a Public App.
- **Trailing slash**: HubSpot treats `…/hubspot-oauth-callback` and `…/hubspot-oauth-callback/` as different URLs. Use the version without the trailing slash.

### No code changes required

Your edge functions are correct. Once you save the redirect URL on HubSpot's side, the connection will succeed and the initial sync will start automatically.


# Social posting playbook — for browser-controlling agents

This is the runbook to hand to a browser-control chat session (Claude with
browser control, ChatGPT with browser control, etc.) when you want it to
publish something to LinkedIn, X, Facebook, or Instagram **without** going
through a developer API. Paste the relevant section into that agent's chat.

There are two posting paths in this app now — use whichever fits:

1. **Native OAuth (LinkedIn / X / Facebook / Instagram)** — Admin → Tools →
   "X (Twitter) Publisher" / "Facebook & Instagram Publisher" / "LinkedIn
   Publisher". Real API calls, no browser automation, but needs developer
   app credentials (`X_CLIENT_ID`/`X_CLIENT_SECRET`,
   `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET`) set as Supabase secrets first.
2. **Browser-Agent Post Queue** (this playbook) — Admin → Tools →
   "Browser-Agent Post Queue". No API keys. A human or agent logs into the
   platform normally in a browser tab and posts by hand, then records the
   result back in the queue.

Path 2 carries real account-suspension risk if you automate it at volume or
unattended — most platforms' Terms of Service prohibit non-API automation of
login/posting. Use it deliberately, on your own accounts, and don't run it
unattended at scale.

## Roles in this workflow

- **Admin panel (this codebase, on GitHub, synced to Lovable)** — owns the
  queue. Content gets added at Admin → Tools → Browser-Agent Post Queue.
- **Browser-control agent** (you) — reads pending rows, opens the target
  platform in a real browser tab, logs in, pastes the content, publishes,
  and reports the result back into the same admin panel.
- **Email-capable agent** — if the platform sends a 2FA code or a "new
  login" verification email during sign-in, check the inbox for that code
  and hand it back to the browser-control agent mid-login.

## Step-by-step

1. **Open the queue.** Go to `https://<your-site-domain>/admin`, log in with
   the admin PIN, open Tools → **Browser-Agent Post Queue**.
2. **Find a `pending` row.** Each row shows: platform, the exact content to
   post, an optional media URL, and Copy buttons for both.
3. **Open the platform in a new tab** and log in if you aren't already:
   - LinkedIn: `linkedin.com`
   - X: `x.com`
   - Facebook: `facebook.com` (post from the target Page, not a personal
     profile, if this is a business account)
   - Instagram: `instagram.com`
   If the login flow asks for a verification code, ask the email-capable
   agent to check the inbox for the code (search subject lines like "code",
   "verify", or the platform's name) and enter it.
4. **Compose the post.** Click the compose button, paste the copied content
   verbatim (use the Copy content button in the queue row — don't
   retype/paraphrase it), attach the media if a Media URL was provided
   (download it first if the platform needs a file upload rather than a
   URL), and publish.
5. **Copy the live post's URL** from the address bar or the post's "..." /
   share menu once it's up.
6. **Report back.** Return to the admin tab, paste that URL into the
   **Result URL** field on the row, and click **Posted**. If publishing
   failed (login blocked, content rejected, CAPTCHA, etc.), fill in
   **Failure reason** and click **Failed** instead — don't leave the row
   pending.
7. **Move to the next pending row** and repeat.

## Adding new content to the queue

Anyone (or any agent with admin access) can add a row directly from the same
panel: pick the platform, paste the content, optionally add a media URL, and
click **Add to queue**. It starts as `pending` until a browser-control agent
picks it up.

## Notes for the agent

- Post the content exactly as given — don't edit copy, add hashtags, or
  change wording unless the row's `notes` field says to.
- One row = one post. Don't batch multiple rows into a single post.
- If a row is already `claimed` by another agent, skip it — don't
  double-post.
- If you can't complete a row (locked out, CAPTCHA you can't solve, account
  needs manual re-verification), mark it **Failed** with the reason rather
  than leaving it stuck as `pending` or `claimed`.

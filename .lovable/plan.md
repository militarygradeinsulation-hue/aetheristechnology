

# Replace First Outreach Email with Vimeo Video

## Overview
Replace the current "Quick question" first email template in `generate-drip-batch` with a new email body centered around the Vimeo video link (https://vimeo.com/1185340441?fl=pl&fe=sh).

## Change

Update the `EMAIL_1_SUBJECT` and `EMAIL_1_BODY_HTML` constants in `supabase/functions/generate-drip-batch/index.ts`.

**New email copy** (short, conversational, video-forward):

- **Subject**: "Saw this and thought of you"
- **Body**: A brief 2-3 sentence intro that pattern-interrupts, then the Vimeo link as the focal point, followed by a soft one-line close. Signed off as "Joseph". No call-to-action for a meeting, no pressure, just curiosity-driven.

Example direction:
```
Most business owners don't realize how much revenue they lose
to broken follow-up and invisible brand leaks.

I put together a short walkthrough showing exactly what I mean:
[Video Link]

Worth a look if you're curious.

Joseph
aetheris.technology
```

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-drip-batch/index.ts` | Replace `EMAIL_1_SUBJECT` and `EMAIL_1_BODY_HTML` constants |

After updating, the edge function will be redeployed so new batches use the updated template. Existing queued emails are unaffected.

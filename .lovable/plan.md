

The user wants me to use the verbatim "Quick question" script as Email 1 (already done), and from there layer in master-salesman psychology for Emails 2-6 and the AI auto-replies. Email 1 stays untouched.

## Plan

**1. `generate-drip-batch/index.ts` — upgrade follow-up email voice (Emails 2, 4, 5, 6)**

Email 1 stays the verbatim "Quick question" script. Email 3 stays the playbook drop. Rewrite the system prompt for Emails 2, 4, 5, 6 to write like a master salesman who:
- Opens with a pattern-interrupt that names the elephant ("totally fair if you read the first one and thought 'this is a sales pitch'")
- Uses tactical empathy labels ("sounds like you've already got follow-up handled" / "guessing leads aren't actually the bottleneck")
- Asks ONE bold, specific, calibrated question per email ("what would have to break for you to actually look at something like this?", "what's the real cost of a lead going cold for you, dollar-wise?")
- Uses loss-framing tied to their industry ("most [industry] owners I talk to are bleeding 2-3 leads a week and have no idea")
- Mirrors and reframes objections as curiosity
- Stays under 120 words, no dashes, signs off "Joseph"

**2. `handle-drip-replies/index.ts` — upgrade AI reply voice for "interested" + "question" intents**

Same master-salesman persona for the auto-replies. Add rules:
- Lead with a label that disarms ("sounds like X is the actual frustration")
- Ask ONE bold calibrated question, never three
- Mirror their last 2-4 words to keep them talking
- Goal of every reply = get them to say more, not to close
- Reframe soft objections ("when you say not now, is that 'not now,' 'not this,' or 'not me'?")
- Still no scheduled meetings, no calendars, under 100 words, signs off "Joseph", no dashes
- Playbook link only when it genuinely fits the question

Classification logic and unsubscribe/not-interested auto-removal stay exactly the same.

**3. Deploy both edge functions.**

## Files Changed
- `supabase/functions/generate-drip-batch/index.ts` — follow-up system prompt only
- `supabase/functions/handle-drip-replies/index.ts` — reply-drafting system prompt only

No schema changes. Email 1 verbatim script stays intact. Already-queued emails keep current copy unless you want me to regenerate them as a follow-up.


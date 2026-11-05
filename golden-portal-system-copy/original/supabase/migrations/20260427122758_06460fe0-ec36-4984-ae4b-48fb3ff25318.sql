UPDATE public.drip_sequences
SET name = 'HubSpot CRM Leak Audit Outreach',
    description = 'Cold outbound for HubSpot users — pitches the free CRM leak audit and the $2,500 setup + $1,500/mo + 15% recovery model.',
    steps = $$[
      {
        "delay_days": 0,
        "subject_template": "Quick question about your HubSpot",
        "body_prompt": "Open warm and direct, written to a sales/RevOps leader who uses HubSpot. Say something like: most HubSpot orgs we look at are quietly leaking revenue — stalled deals nobody worked, dead leads still tagged 'MQL', quotes that got ghosted, follow-ups that never went out. We connect to your HubSpot, run an AI scan, and show you exactly what it's costing you in dollars. The audit is free. If you want, we can run it on your account this week — takes about 30 minutes of your time. Sign off as a real person. No CTAs other than 'reply yes and I'll send a calendar link'."
      },
      {
        "delay_days": 3,
        "subject_template": "The 4 leaks every HubSpot has",
        "body_prompt": "Drop value. Walk through the 4 leaks we find in almost every HubSpot org: (1) stalled deals stuck in stage for 30+ days that nobody's flagged, (2) contacts marked as 'customer' or 'lead' in lifecycle stage who haven't been touched in 90+ days, (3) quotes sent that never got a follow-up, (4) deals with no owner or wrong owner. Tell them they can find #1 themselves: open HubSpot → Sales → Deals → filter by 'Last activity > 30 days ago' and 'Stage != Closed'. Whatever number they see, that's their leak. Mention we run a free scan that quantifies all four in dollars. No pressure."
      },
      {
        "delay_days": 7,
        "subject_template": "What we found in a HubSpot like yours last month",
        "body_prompt": "Tell a short, anonymized case-file story. A company similar in size to theirs ran our free HubSpot leak audit. We found $284K of pipeline sitting in stalled deals nobody had touched in 45+ days, 1,800 dead leads still tagged as MQL bleeding their attribution, and 62 sent quotes with zero follow-up. We deployed automations to recover it. Mention our model plainly: $2,500 setup, $1,500/month to keep it running, and 15% of whatever revenue we actually recover for them over the next year. If we don't recover money, they don't pay the performance fee. The audit alone is free. Offer to run theirs."
      },
      {
        "delay_days": 12,
        "subject_template": "I''ll bet $1,000 I can find leaks in your HubSpot",
        "body_prompt": "Contrarian, confident, slightly cocky tone. Say: I'll bet $1,000 I can find at least $50K in recoverable revenue inside your HubSpot in under 30 minutes. Not because your team is bad — because every CRM leaks. Stalled deals, ghosted quotes, dead leads, missing follow-ups, no-owner records. Our scan is free. If we don't find it, you walk away. If we do, we show you exactly where the money is and you decide what to do with it. End with: want me to run it this week?"
      },
      {
        "delay_days": 18,
        "subject_template": "How the recovery fee actually works",
        "body_prompt": "Address the elephant in the room — pricing. Walk through the model clearly: free audit (no commitment), $2,500 one-time setup if they want us to deploy the recovery automations, $1,500/month to keep them running, and 15% of revenue we actually recover for them over the next 12 months. Performance fee is recovery-only — if we don't recover money, they don't pay it. Most clients see the recovery fee start hitting in month 2-3. Frame it as: the audit tells you what's leaking, the engagement actually plugs it. Offer to send a 1-page summary of how the fee structure works."
      },
      {
        "delay_days": 25,
        "subject_template": "Last note — then I''ll stop",
        "body_prompt": "Polite, no-pressure final email. Acknowledge they're busy and the inbox is loud. Recap one line: free HubSpot leak audit, we find the money your CRM is hiding, you decide if you want us to recover it. Make it easy to say no — 'no worries if the timing's off, I won't keep nudging.' If they ever want it later, the offer stands. Sign off warmly. No CTA beyond 'reply if you ever want me to take a look.'"
      }
    ]$$::jsonb,
    updated_at = now()
WHERE id = '7ee4d42b-4d34-4aa8-a40c-bb984c7e0076';
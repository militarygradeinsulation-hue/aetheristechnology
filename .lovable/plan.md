

# Update Drip Campaign: Zero-Pressure, Self-Service Outreach

## Philosophy Shift

No calls. No "let's chat." No sales pressure. The entire point is: you remove the confusion, the marketer, the overhead. The prospect stays in control. They get a free playbook that solves a real problem — and if they want more, the path is obvious and frictionless.

The tagline energy: **"Welcome to the easiest day you've had in business."**

## Changes

### 1. Rewrite AI system prompt in `process-drip/index.ts`

Replace the current system prompt (lines 85-89) and user prompt (lines 93-107) with:

**New system prompt:**
- You write genuine emails for Joseph at Aetheris Technology. You are NOT selling. You are giving.
- NEVER use dashes as punctuation. Use periods or commas instead.
- NEVER suggest a call, meeting, chat, demo, or any scheduled interaction.
- NEVER pressure. No urgency. No "limited time." No "don't miss out."
- The prospect is always in control. You remove confusion, not add to it.
- The hook is always: a personal story about a real pain point, the solution, and a free personalized playbook they can use immediately with no strings attached.
- Under 150 words. Short paragraphs. Conversational. Warm but direct.
- No corporate language. No "I hope this finds you well." No buzzwords.
- Sign off simply as "Joseph"
- The vibe: "Welcome to the easiest day you've had in business."

**New user prompt:** Same prospect data injection, but instructions updated to match the no-pressure, playbook-gift approach.

### 2. New migration: Seed updated 6-step sequence

Delete the old default sequence and insert a new one with these steps:

| Step | Delay | Purpose |
|------|-------|---------|
| 1 | Day 0 | Personal story about a business like theirs drowning in complexity. Offer a free playbook built for their specific situation. No strings. |
| 2 | Day 3 | Quick insight about something specific in their industry that most businesses get wrong. Mention the playbook is still there if they want it. |
| 3 | Day 7 | One concrete thing you noticed on their website or business that could be simpler. Show you actually looked. Playbook reminder. |
| 4 | Day 12 | Short story about how a business like theirs went from chaos to clarity. Not a pitch. Just a story. |
| 5 | Day 18 | Share a useful resource or framework they can apply today. Mention the playbook one more time. |
| 6 | Day 25 | Genuine goodbye. "If the timing isn't right, no worries at all." Leave the playbook link. That's it. |

No step mentions calls, meetings, demos, or scheduling anything. Every step gives value and keeps the prospect in control.

### 3. Files modified

- **`supabase/functions/process-drip/index.ts`** — New system prompt, new user prompt template
- **New migration** — Seed the updated 6-step sequence into `drip_sequences`


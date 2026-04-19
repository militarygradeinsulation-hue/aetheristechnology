
The brand audit you ran on your own site scored **35/100**. The contradictions are real and fixable in the codebase. Here's exactly what to do — focused, tactical, no fluff.

## What to fix

### 1. CRITICAL — Replace `aetheris.technology@outlook.com` everywhere
A consulting firm using a free Outlook address actively destroys the "premium" positioning. Replace every instance with **`hello@aetheris.technology`** (or `contact@aetheris.technology` — your call).

**Files to update (sitewide find/replace):**
- `src/components/Hero.tsx`, `src/components/Contact.tsx`, `src/components/ContactForm.tsx` (notification template)
- `src/pages/BlogPostPage.tsx`, `src/pages/ResourcesPage.tsx`, `src/pages/TermsPage.tsx`, `src/pages/ContactPage.tsx`, `src/pages/Home.tsx`
- `index.html` (JSON-LD schema)
- Any edge function that sends from outlook.com

**Email infrastructure**: This requires the `aetheris.technology` domain to be set up for sending. I'll check the current email config and either use the existing verified domain or trigger the email setup dialog. No DNS work needed in code — Lovable Emails handles it.

### 2. CRITICAL — Fix the "Digital Strategy" stock-image section
The audit flagged generic 3D-rendered stock images contradicting the "fix outdated visuals" promise. I need to find this section first (likely on Home or a service page) and either:
- Replace those images with custom AI-generated visuals (using Lovable AI image gen, watermarked "Aetheris AI Studio" per your brand rules), OR
- Remove the section if it can't be visually upgraded immediately

I'll locate it during implementation and confirm the approach before regenerating images.

### 3. HIGH — Tone down transactional sales tactics on the contact form
Currently `src/components/ContactForm.tsx` has:
- 🔥 emoji + "Limited-Time" + animate-pulse banner (twice)
- "💥 $500 Full Analytics Package (Limited-Time Discount)" in a dropdown labeled "What are you interested in?"
- Heading "Tell Me What's Broken" + "My website is ugly" / "Just figure it out for me!" options

Audit said this reads as transactional discount-urgency, not Co-CEO consulting.

**Changes:**
- Remove both 🔥 "Limited-Time" promo banners
- Reposition the analytics package on `/services` as a **"Strategic Discovery Audit"** ($500), framed as foundational diagnostic work — no countdown urgency, no fire emojis
- Soften service options to consultative language: "Revenue leaks in marketing" / "Outdated digital presence" / "CRM systems audit" / "Operational diagnostic" / "Not sure yet — let's talk"
- Keep "Tell Me What's Broken" heading (it's on-brand blunt) but remove the 💥/🔥 emojis sitewide in form copy

### 4. MODERATE — Reframe Free Tools as "Capability Demonstrations"
Audit flagged the 15+ "Try It Free" tools as diluting consulting authority. Don't remove them — reframe them.

**`src/components/FreeTools.tsx`:**
- Section heading: "Capability Demonstrations" or "See Our AI in Action" (instead of generic free-tools framing)
- Button label: "Explore Tool" instead of "Try It Free →"
- Add a one-line subheader: *"These are working examples of the AI systems we deploy for clients. Use them free — and see what custom-built versions could do for your business."*

### 5. MODERATE — Reframe fixed-price diagnostics as "foundational engagements"
Audit flagged `$750 Rapid Evaluation` / `$7,500 14-Day Diagnostic` (or current playbook prices `$500` / `$2,500`) sitting next to "$25,000+ custom" as making bespoke work feel like a menu item.

**`src/components/ServicesPricing.tsx` copy tweaks** (no price changes — your pricing memory is the source of truth):
- Section subheader above the diagnostic tiles: *"Every custom engagement begins with one of these foundational diagnostics."*
- On each diagnostic tile, add a small line: *"Foundational step toward custom implementation"*
- This frames them as on-ramps, not parallel SKUs

## Out of scope
- No price changes (your pricing memory is locked)
- No removal of the Free Tools themselves — only reframing
- No Background, animations, or layout changes
- No changes to admin, CRM, or library systems

## Files touched
- Email replacements: ~9 files (listed above)
- `src/components/ContactForm.tsx` — promo banners + service options
- `src/components/FreeTools.tsx` — heading + CTA copy
- `src/components/ServicesPricing.tsx` — diagnostic framing copy
- Plus: locate + fix the "Digital Strategy" stock-image section (1-2 files TBD)
- Email infrastructure setup (if `hello@aetheris.technology` not yet sending)

## Expected score impact
Fixing #1 (email) + #3 (sales urgency) alone should move the brand alignment score from 35 → ~70+. All five together targets 85+.

<lov-actions>
<lov-suggestion message="Approved — implement all 5 fixes. Use hello@aetheris.technology as the new email, set up email sending if needed, locate and replace the Digital Strategy stock images with custom AI-generated visuals, and apply all the copy reframing.">Approve all 5 fixes</lov-suggestion>
<lov-suggestion message="Approve fixes 1, 3, 4, 5 but skip #2 for now — leave the Digital Strategy section's stock images alone until I pick replacement visuals myself.">Approve all except images</lov-suggestion>
<lov-suggestion message="Use contact@aetheris.technology instead of hello@aetheris.technology, and proceed with all 5 fixes.">Use contact@ instead</lov-suggestion>
</lov-actions>

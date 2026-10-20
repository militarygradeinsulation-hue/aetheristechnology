# Lovable Browser + Smart Prompt Enhancer

Copy and paste the following prompt into your standalone Lovable project to add the advanced screen-monitoring and learning-based prompt enhancement feature:

---

## Build Prompt for Lovable

```
Add an advanced "Lovable Browser + Smart Prompt Enhancer" feature to the Lovable Prompt Optimizer with real-time screen analysis and credit-saving intelligence.

### Core Features:

1. **Embedded Browser Panel**
   - Add a floating sidebar (right side, 35% width on desktop) that can be toggled
   - Embed an iframe or web view showing the user's current vibe coding system
   - Allow users to point to any URL they're building with (their Lovable project, their Framer site, etc.)
   - Non-intrusive: Collapses to a thin tab when minimized
   - Show "Browser" label with icon on the collapsed tab

2. **Real-Time Screen Analysis**
   - Monitor the embedded screen for visual patterns, layout structure, and design elements
   - Automatically detect:
     * Current component type (hero section, card, form, modal, etc.)
     * Design aesthetic being used (minimal, bold, premium, playful)
     * Color palette and typography
     * Layout patterns (grid, flex, single column, etc.)
     * UI component types visible (buttons, inputs, cards, etc.)
   - Update analysis every 2 seconds when browser panel is active
   - Show current analysis in a "Screen Analysis" panel below the browser

3. **Smart Prompt Enhancement**
   - When user drafts a prompt in the chat, analyze it against the current screen
   - Use real-time browser analysis to automatically enhance/refine the user's prompt
   - Enhancement logic:
     * If user's prompt is vague, inject specific visual details from current screen
     * If user mentions a component, reference similar components visible in current design
     * If color/font choices exist in current design, suggest matching them
     * Detect and prevent credit-wasting patterns (e.g., asking for something already on screen)
   - Display enhanced version in a "Smart Enhancement" section
   - Show a toggle: "Use Original" vs "Use Enhanced Prompt"
   - Explain what was improved in small text

4. **Learning System**
   - Track user's input vs. generated prompt + enhancement results
   - Build a pattern library of:
     * User's common terms and what they mean (e.g., "minimal hero" → specific aesthetic)
     * Design style preferences based on their current project
     * Component variations they frequently request
     * Common mistakes/rework patterns
   - Apply learnings to future prompt enhancements
   - Show "Learning applied from X past sessions" in enhancement explanation

5. **Credit-Saving Detection & Alerts**
   - Analyze proposed prompt against current screen design
   - Detect potential credit-wasting scenarios:
     * Asking to redesign something already built on current page
     * Requesting layout that's already implemented
     * Asking for components that exist but in different style
     * Duplicate component requests
   - Show alert: "💰 Credit-Saving Tip: This component already exists in your current design. Use the Edit button to adjust instead of re-prompting."
   - Provide "Quick Edit Path" suggestions (Edit existing component vs. New prompt)
   - Track savings in a "Credits Saved This Session" counter

6. **Context Preservation**
   - Save browser URL in conversation
   - Link each prompt generation to the screen state it was created against
   - Show "Created with current design visible" indicator
   - Allow reverting to prompt from earlier in session when screen was different
   - Display timestamp + thumbnail of screen state with each prompt

7. **UI Layout**
   - Left side: Chat interface (same as current - unchanged)
   - Right side: 
     * Top 40%: Embedded browser panel with toggle/collapse
     * Middle 25%: Screen Analysis (real-time pattern detection)
     * Bottom 35%: Prompt preview with "Smart Enhancement" section
   - When browser collapsed: Shows "Browser" tab, other panels expand
   - Sticky headers on all panels
   - Smooth transitions when toggling browser visibility

8. **Smart Enhancement Display**
   - Show side-by-side comparison:
     * Left: "Your Prompt" (what user typed)
     * Right: "Enhanced Prompt" (with AI improvements)
   - Highlight added/modified sections in subtle color
   - Include explanation: "Enhanced: Added specific button styling from current design"
   - Buttons: "Copy Original" | "Copy Enhanced" | "Toggle to Chat Mode"

9. **Optional: Direct Lovable Integration**
   - If possible, add "Send to Lovable" button that opens current enhanced prompt in a new Lovable tab
   - Send both the enhanced prompt AND current screen URL as context
   - Allow user to optionally drag-drop design reference into Lovable

### Technical Implementation:

1. Use iframe or web component to embed browser panel
2. Extract DOM/visual analysis from embedded content (if same-origin or CORS-enabled)
3. Local learning: Use browser localStorage to persist learning patterns + session history
4. Real-time analysis: Run analysis on 2-second intervals when browser active
5. Prompt enhancement: Run analysis before user sends message, show enhancement UI
6. Toast notifications: Show credit-saving alerts as toast notifications
7. Responsive: On mobile, show browser panel as full-screen modal overlay instead of sidebar

### Data to Persist:

- Browser URL for each prompt
- Screen analysis snapshot (resolution, component types, colors, fonts)
- User prompt + enhanced version + which was used
- Learning patterns (common terms, preferences, component library)
- Session credits saved counter
- Timestamp + browser state for each message

### Success Indicators:

- Browser panel loads and displays embedded website
- Screen analysis runs automatically and detects components
- Smart enhancement triggers when user types prompt
- Learning system improves suggestions over multiple prompts in session
- Credit-saving alerts appear for redundant requests
- All copy buttons work with enhanced prompts
- Mobile view shows browser as modal overlay
- Conversation history includes browser context

### Best Practices to Enforce:

- Never clear the browser panel without asking
- Show "Screen changed" notification when iframe detects new content
- Disable enhancement if browser panel is empty/not loaded
- Batch similar learnings (don't clutter UI with too many patterns)
- Only show high-confidence credit-saving alerts (>80% confidence)
- Preserve learning between sessions using persistent storage
```

---

## Implementation Sequence

### Phase 1: Browser Panel (Foundation)
1. Add floating sidebar to right side
2. Implement iframe/web view for URL input
3. Add toggle/collapse functionality
4. Style with Tailwind CSS to match current UI
5. Test URL input and iframe loading

### Phase 2: Screen Analysis (Systems)
1. Add real-time analysis of embedded content
2. Detect component types and design aesthetics
3. Display analysis in a panel below browser
4. Implement 2-second refresh interval
5. Test pattern detection accuracy

### Phase 3: Smart Enhancement (Precision)
1. Analyze user prompts against screen analysis
2. Generate smart enhancements
3. Display side-by-side comparison UI
4. Add toggle between original/enhanced
5. Test enhancement quality and relevance

### Phase 4: Learning + Credit Savings (Iteration)
1. Implement local learning storage
2. Track credit-saving opportunities
3. Build pattern library from user history
4. Add credit-saving alerts with high confidence
5. Test learning over multiple sessions

### Phase 5: Polish & Mobile (Optimization)
1. Responsive design for mobile (modal overlay)
2. Performance optimization for real-time analysis
3. Error handling for failed iframe loads
4. Accessibility improvements
5. Mobile testing

---

## Key Files to Create/Modify

**New Components:**
- `LovableBrowserPanel.tsx` - Embedded browser with URL input
- `ScreenAnalysis.tsx` - Real-time screen pattern detection display
- `SmartEnhancement.tsx` - Side-by-side prompt comparison
- `LearningSystem.tsx` - Pattern library and learning display

**Logic:**
- `lovable-browser-api.ts` - Screen analysis algorithms
- `learning-engine.ts` - Pattern tracking and learning
- `credit-saver-alerts.ts` - Credit-waste detection

**Update:**
- `LovableOptimizer/index.tsx` - Integrate new panels into layout

---

## Testing Checklist

- [ ] Browser panel opens/closes smoothly
- [ ] URL input loads iframe content
- [ ] Screen analysis detects components (buttons, cards, inputs, etc.)
- [ ] Aesthetic detection works (minimal, bold, premium)
- [ ] Smart enhancement triggers on user input
- [ ] Enhanced prompt shows improvements highlighted
- [ ] Toggle between original/enhanced works
- [ ] Credit-saving alerts appear for redundant prompts
- [ ] Learning patterns save and persist in localStorage
- [ ] Copy buttons work for both original and enhanced
- [ ] Mobile view shows browser as modal
- [ ] No console errors
- [ ] Performance good (analysis doesn't slow chat)
- [ ] Cross-origin iframes work (or fallback gracefully)
- [ ] Session history preserves browser context

---

## Integration Notes

This feature builds on top of the existing Lovable Prompt Optimizer:
- Reuses the chat interface and message history
- Reuses the prompt generation logic
- Adds new sidebar UI for browser + analysis
- Integrates with existing copy and toast functionality
- Uses Sonner for alert notifications (already imported)
- Uses Tailwind CSS for styling (already set up)

The feature is **optional** but highly recommended for power users who want to:
- Avoid credit-wasting redundant prompts
- Build designs faster with context-aware prompts
- Learn their own design patterns over time
- Get real-time feedback on build efficiency

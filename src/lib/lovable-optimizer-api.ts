interface OptimizationContext {
  userInput: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

interface LovablePromptResult {
  prompt: string;
  title: string;
  phase: string;
  bestPractices: string[];
  creditSavingTips: string[];
}

const LOVABLE_BEST_PRACTICES = `
## Lovable Prompting Best Practices

### Phase 1: Foundation
- **Plan before you prompt**: Define what you're building, who it's for, why they'll use it, and the key action
- **Map the user journey**: Think in transitions - what the user sees first, what builds trust, what gives confidence, where the action leads
- **Get the design right first**: Decide visual language early (calm/elegant, bold/disruptive, premium/sleek) using buzzwords

### Phase 2: Think in Systems
- **Prompt by component, not page**: Build modular parts (hero, feature grid, testimonial slider, pricing table) one at a time
- **Design with real content**: Don't use lorem ipsum or "feature 1/2/3" - use real words and copy
- **Speak atomic**: Describe buttons, cards, modals, badges, toggles, chips, forms with precision
- **Use buzzwords to dial in aesthetic**: minimal, expressive, cinematic, playful, premium, developer-focused

### Phase 3: Build with Precision
- **Use prompt patterns**: Develop repeatable layout recipes with consistent rhythm
- **Add visuals via URL**: Embed product demos, Midjourney videos, or tutorial videos with clear placement instructions
- **Layer context with Edit button**: Use the edit function for specific refinements instead of rewriting full prompts

### Phase 4: Iterate and Ship
- **Build with Lovable Cloud in mind**: Anticipate auth logic, dynamic content, loading/error states
- **Version control**: Make one meaningful change at a time, use milestones (layout locked, content added, logic wired)

### Credit-Saving Strategies
- Ask Lovable clarifying questions first (add: "Ask me any questions you need to fully understand this")
- One distinct UI block = one prompt
- Reuse components across pages with the Edit button
- Start with component library building
- Use real content from day one to avoid layout rework
`;

export async function optimizeLovablePrompt(
  context: OptimizationContext
): Promise<LovablePromptResult> {
  try {
    // For now, this uses local logic. In production, call your Claude API
    return generatePromptLocally(context);
  } catch (error) {
    console.error("Prompt optimization error:", error);
    return fallbackPrompt();
  }
}

function generatePromptLocally(
  context: OptimizationContext
): LovablePromptResult {
  const { userInput, conversationHistory } = context;
  const lowerInput = userInput.toLowerCase();
  const conversationText = conversationHistory
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  // Analyze project type
  const isLanding =
    lowerInput.includes("landing") ||
    lowerInput.includes("homepage") ||
    lowerInput.includes("hero");
  const isDashboard =
    lowerInput.includes("dashboard") ||
    lowerInput.includes("analytics") ||
    lowerInput.includes("chart");
  const isMobile =
    lowerInput.includes("mobile") ||
    lowerInput.includes("app") ||
    lowerInput.includes("ios") ||
    lowerInput.includes("android");
  const isForm =
    lowerInput.includes("form") || lowerInput.includes("input");
  const isMarketplace =
    lowerInput.includes("marketplace") ||
    lowerInput.includes("product listing") ||
    lowerInput.includes("ecommerce");

  // Analyze aesthetic preferences
  const isMinimal =
    lowerInput.includes("minimal") ||
    lowerInput.includes("clean") ||
    lowerInput.includes("simple") ||
    lowerInput.includes("minimalist");
  const isPremium =
    lowerInput.includes("premium") ||
    lowerInput.includes("luxury") ||
    lowerInput.includes("elegant");
  const isBold =
    lowerInput.includes("bold") ||
    lowerInput.includes("expressive") ||
    lowerInput.includes("vibrant");

  // Generate based on type
  if (isLanding) {
    return generateLandingPagePrompt(
      { isMinimal, isPremium, isBold },
      userInput
    );
  } else if (isDashboard) {
    return generateDashboardPrompt({ isMinimal, isPremium, isBold }, userInput);
  } else if (isMobile) {
    return generateMobilePrompt({ isMinimal, isPremium, isBold }, userInput);
  } else if (isForm) {
    return generateFormPrompt({ isMinimal, isPremium, isBold }, userInput);
  } else if (isMarketplace) {
    return generateMarketplacePrompt(
      { isMinimal, isPremium, isBold },
      userInput
    );
  }

  // Default: Foundation phase prompt
  return generateFoundationPrompt(userInput);
}

function generateLandingPagePrompt(
  style: {
    isMinimal: boolean;
    isPremium: boolean;
    isBold: boolean;
  },
  userInput: string
): LovablePromptResult {
  const designDirection = style.isPremium
    ? "premium and cinematic"
    : style.isBold
      ? "bold and expressive"
      : "clean and minimal";

  const prompt = `Create a landing page hero section with these elements:

**Structure:**
- Full-width hero container
- Headline (main value proposition)
- Subheadline (supporting benefit or social proof)
- Primary CTA button
- Secondary CTA or link (optional)
- Visual area for hero image/video embed

**Design Guidelines:**
- Aesthetic: ${designDirection}
- Use real, benefit-focused copy (not placeholder text)
- Ensure proper visual hierarchy with generous spacing
- Include subtle micro-interactions on hover
- Mobile-responsive layout with stacked elements on small screens

**Content Specifics:**
Before building, ask me:
1. What's the exact headline and subheadline copy?
2. Who is the target audience (Gen Z/professionals/enterprises)?
3. What's the primary action the user should take?
4. Do you have a hero image/video URL to embed?

Start with these clarifying questions, then build the hero component.`;

  return {
    prompt,
    title: "Landing Page Hero Section",
    phase: "Phase 1: Foundation",
    bestPractices: [
      "Plan the user journey first",
      "Use real, benefit-focused copy",
      "Apply design buzzwords early",
      "Make CTA intention clear",
      "Include visual space planning",
    ],
    creditSavingTips: [
      "Ask clarifying questions first to avoid rework",
      "Build hero separately from feature section",
      "Use the Edit button to refine copy, not re-prompt",
      "Plan image/video URLs in advance",
    ],
  };
}

function generateDashboardPrompt(
  style: {
    isMinimal: boolean;
    isPremium: boolean;
    isBold: boolean;
  },
  userInput: string
): LovablePromptResult {
  const designDirection = style.isPremium
    ? "premium with soft shadows"
    : style.isBold
      ? "bold with strong contrast"
      : "clean with minimal decoration";

  const prompt = `Create a reusable analytics card component for a dashboard with:

**Card Structure:**
- Metric label (e.g., "Total Revenue")
- Large number/value display
- Small inline chart or sparkline (optional)
- Status badge or indicator (optional)
- Comparison text (e.g., "+12% vs last month")

**Styling:**
- Design: ${designDirection}
- Consistent spacing: 16px padding inside cards
- Hover state: Subtle lift with shadow increase
- Typography: Clear hierarchy - label (small), value (large), meta (small)
- Responsive: Grid layout (2-3 cols on desktop, 1 on mobile)

**Functionality Requirements:**
Ask before building:
1. What metrics will this card display?
2. How many cards per dashboard row?
3. Should cards be clickable? If so, where do they link?
4. Do you need filtering or date range selection?
5. Any specific color scheme for metrics (green/red for growth)?

Make this component atomic and reusable across your dashboard.`;

  return {
    prompt,
    title: "Reusable Dashboard Analytics Card",
    phase: "Phase 2: Systems",
    bestPractices: [
      "Build modular, reusable components",
      "Use consistent spacing and typography",
      "Design for responsive grids",
      "Include hover and active states",
      "Plan for dynamic data binding",
    ],
    creditSavingTips: [
      "Create one card component, then duplicate and edit for variations",
      "Use grid patterns to save prompting time",
      "Define spacing tokens upfront",
      "Batch similar cards into one prompt instead of separate prompts",
    ],
  };
}

function generateMobilePrompt(
  style: {
    isMinimal: boolean;
    isPremium: boolean;
    isBold: boolean;
  },
  userInput: string
): LovablePromptResult {
  const designDirection = style.isPremium
    ? "sleek and modern"
    : style.isBold
      ? "vibrant and engaging"
      : "clean and intuitive";

  const prompt = `Create a mobile app navigation component with:

**Navigation Bar:**
- Bottom tab bar (4-5 navigation items)
- Icon + label for each tab
- Active state highlighting
- Smooth transition animations
- Touch-friendly tap targets (minimum 48px height)

**Design Details:**
- Aesthetic: ${designDirection}
- Consistent icon style across all tabs
- Clear visual distinction between active/inactive states
- Glassmorphism or soft shadow effect optional
- Safe area padding for notches/home indicators

**Accessibility:**
- High contrast between active/inactive
- Descriptive icon labels
- Semantic navigation structure

**Before Building, Tell Me:**
1. What are the 4-5 main navigation sections?
2. Do you have specific icon names/assets, or should I design them?
3. What colors represent active/inactive states?
4. Any specific brand colors to use?
5. Should navigation be fixed or sticky?

Build this as a reusable component for your entire app.`;

  return {
    prompt,
    title: "Mobile App Navigation Bar",
    phase: "Phase 2: Systems",
    bestPractices: [
      "Touch-friendly spacing (48px minimum)",
      "Icon + label clarity",
      "Smooth micro-interactions",
      "Consistent design across app",
      "Accessible color contrast",
    ],
    creditSavingTips: [
      "Define navigation structure once, use throughout app",
      "Create one navigation template, customize via Edit",
      "Use consistent icon set to avoid duplicate prompts",
      "Batch all nav variants into one prompt",
    ],
  };
}

function generateFormPrompt(
  style: {
    isMinimal: boolean;
    isPremium: boolean;
    isBold: boolean;
  },
  userInput: string
): LovablePromptResult {
  const prompt = `Create a form component with:

**Form Structure:**
- Input fields (text, email, password)
- Labels and placeholders
- Error messaging
- Success state
- Submit button
- Optional: Validation feedback, helper text

**Design Guidelines:**
- Proper spacing between fields (20-24px)
- Clear label positioning (above input)
- Error states in red with descriptive messages
- Disabled states with reduced opacity
- Focus states with border color change

**Functionality:**
Ask me first:
1. What fields does this form need?
2. What are required vs optional fields?
3. Where does the form submit to?
4. Any special validation (email, phone, dates)?
5. Success message or redirect after submit?

Ensure form is mobile-responsive and accessible.`;

  return {
    prompt,
    title: "Form Component",
    phase: "Phase 2: Systems",
    bestPractices: [
      "Real field labels and types",
      "Clear error messaging",
      "Accessible validation",
      "Mobile-friendly spacing",
      "Visual feedback for all states",
    ],
    creditSavingTips: [
      "Define all fields upfront to avoid re-prompting",
      "Create base form, edit for variations",
      "Use Edit button for error/success state refinements",
    ],
  };
}

function generateMarketplacePrompt(
  style: {
    isMinimal: boolean;
    isPremium: boolean;
    isBold: boolean;
  },
  userInput: string
): LovablePromptResult {
  const prompt = `Create a marketplace product card component:

**Card Layout:**
- Product image/thumbnail
- Product name/title
- Price display
- Rating/review count
- Brief description
- Add to cart or View button
- Optional: Sale badge, availability status

**Design:**
- Consistent card dimensions
- Hover state: Lift effect + image zoom
- Shadow and border styling
- Mobile-responsive grid (2-3 cols on desktop, 1 on mobile)

**Before Building:**
1. What information matters most for your products?
2. Do you have actual product images/URLs?
3. How should pricing be displayed (currency, discounts)?
4. Should cards be clickable to detail page?
5. Any special badges (Sale, New, Featured)?

Create this as an atomic card that reuses across your marketplace.`;

  return {
    prompt,
    title: "Marketplace Product Card",
    phase: "Phase 2: Systems",
    bestPractices: [
      "Use real product data/images",
      "Consistent card dimensions",
      "Clear price and CTA",
      "Hover interactions",
      "Responsive grid layout",
    ],
    creditSavingTips: [
      "Build one card, replicate with grid",
      "Use Edit for price/badge variations",
      "Batch product cards instead of individual prompts",
      "Create component library approach",
    ],
  };
}

function generateFoundationPrompt(userInput: string): LovablePromptResult {
  return {
    prompt: `Before building your UI, I need to understand your vision better. Please answer these questions:

**Project Definition:**
1. What are you building? (landing page, app, dashboard, etc.)
2. Who is your primary user? (Gen Z, professionals, enterprises?)
3. What's the main action you want them to take?
4. What's your visual vibe? (minimal, bold, premium, playful, etc.)

**Technical Details:**
5. Is this a single component or full page/product?
6. Do you have any real content, copy, or wireframes?
7. Will this integrate with a backend or database? If so, what kind of data?
8. Do you have brand colors or a design system already?

**Lovable-Specific:**
Once I understand these, I'll create an optimized prompt that:
- Follows Lovable best practices
- Builds component-first to save credits
- Asks clarifying questions upfront
- Specifies atomic UI elements clearly
- Applies design buzzwords for consistency

Share as much as you can, and I'll generate a prompt ready to drop into Lovable.`,

    title: "Initial Project Discovery",
    phase: "Phase 1: Foundation",
    bestPractices: [
      "Plan before prompting",
      "Define visual direction early",
      "Use real content from start",
      "Map user journey",
    ],
    creditSavingTips: [
      "Answer discovery questions thoroughly upfront",
      "Gather all content/copy before first prompt",
      "Define color scheme and typography early",
      "Plan component structure in advance",
    ],
  };
}

function fallbackPrompt(): LovablePromptResult {
  return {
    prompt: `Tell me more about your design. I need to understand:
- What component or page are you building?
- Who will use it?
- What should they do with it?
- What's your design style?`,
    title: "Project Discovery",
    phase: "Phase 1: Foundation",
    bestPractices: ["Plan before prompting"],
    creditSavingTips: [
      "Provide detailed project brief to avoid rework",
    ],
  };
}

export function formatLovablePromptForCopy(result: LovablePromptResult): string {
  return `${result.prompt}

---
Best Practices Applied:
${result.bestPractices.map((p) => `✓ ${p}`).join("\n")}

Credit-Saving Tips:
${result.creditSavingTips.map((t) => `• ${t}`).join("\n")}`;
}

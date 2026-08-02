import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, Copy, ExternalLink, Send, Loader2, Code2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { optimizeLovablePrompt, formatLovablePromptForCopy } from "@/lib/lovable-optimizer-api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface OptimizedPrompt {
  title: string;
  prompt: string;
  phase: string;
  bestPractices: string[];
}

export function LovableOptimizer() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Welcome to the Lovable Prompt Optimizer! 🚀\n\nI'm here to help you craft efficient, high-quality prompts for Lovable while maximizing your credits. Instead of giving Lovable vague instructions, I'll ask clarifying questions and generate detailed, component-focused prompts based on proven best practices.\n\nTell me: What would you like to build? Describe your feature, product, or design idea.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [optimizedPrompt, setOptimizedPrompt] = useState<OptimizedPrompt | null>(
    null
  );
  const [showPlanning, setShowPlanning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Generate optimized prompt using the API
      const optimizationResult = await optimizeLovablePrompt({
        userInput: userMessage.content,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      setOptimizedPrompt(optimizationResult);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateContextualResponse(
          userMessage.content,
          messages,
          optimizationResult
        ),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, there was an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyPrompt = () => {
    if (optimizedPrompt) {
      const fullText = formatLovablePromptForCopy(optimizedPrompt);
      navigator.clipboard.writeText(fullText);
      toast.success("Prompt copied to clipboard");
    }
  };

  const copyPromptOnly = () => {
    if (optimizedPrompt) {
      navigator.clipboard.writeText(optimizedPrompt.prompt);
      toast.success("Prompt copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Lovable Prompt Optimizer
                </h1>
                <p className="text-xs text-slate-400">
                  Smart prompting to maximize your credits
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPlanning(!showPlanning)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                {showPlanning ? "Hide" : "Show"} Planning Guide
              </Button>
              <a
                href="https://docs.lovable.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Lovable Docs
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Main Chat Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Planning Guide */}
          {showPlanning && (
            <Card className="border-slate-700 bg-slate-800/50">
              <div className="p-4">
                <h3 className="font-semibold text-white mb-3">
                  Lovable Best Practices
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                  <div>
                    <p className="font-medium text-slate-200 mb-1">
                      Phase 1: Foundation
                    </p>
                    <ul className="space-y-1 text-slate-400">
                      <li>• Plan before prompting</li>
                      <li>• Map user journey</li>
                      <li>• Define design direction</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-slate-200 mb-1">
                      Phase 2: Systems
                    </p>
                    <ul className="space-y-1 text-slate-400">
                      <li>• Build by component</li>
                      <li>• Use real content</li>
                      <li>• Apply buzzwords</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-slate-200 mb-1">
                      Phase 3: Precision
                    </p>
                    <ul className="space-y-1 text-slate-400">
                      <li>• Use layout patterns</li>
                      <li>• Add visuals via URL</li>
                      <li>• Leverage Edit button</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-slate-200 mb-1">
                      Phase 4: Iterate
                    </p>
                    <ul className="space-y-1 text-slate-400">
                      <li>• Think Cloud-first</li>
                      <li>• Version control</li>
                      <li>• Ship & iterate</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Chat Messages */}
          <Card className="flex-1 border-slate-700 bg-slate-800/50 flex flex-col max-h-[600px]">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-xs font-bold text-white">LPO</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 max-w-xs lg:max-w-md xl:max-w-lg whitespace-pre-wrap text-sm",
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-br-none"
                        : "bg-slate-700 text-slate-100 rounded-bl-none"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start animate-in fade-in">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                  <div className="bg-slate-700 rounded-lg rounded-bl-none px-4 py-2 text-slate-100 text-sm">
                    Analyzing your request...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendMessage}
              className="border-t border-slate-700 p-4"
            >
              <div className="flex gap-2">
                <Input
                  placeholder="Describe what you want to build..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Prompt Preview & Tools */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <Card className="border-slate-700 bg-slate-800/50">
            <div className="p-4">
              <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 hover:bg-slate-700 text-slate-300"
                  onClick={() =>
                    setInput(
                      "I want to build a landing page. Ask me clarifying questions."
                    )
                  }
                >
                  <ArrowRight className="w-3 h-3 mr-2" />
                  Landing Page
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 hover:bg-slate-700 text-slate-300"
                  onClick={() =>
                    setInput(
                      "I need a dashboard component. Ask me clarifying questions."
                    )
                  }
                >
                  <ArrowRight className="w-3 h-3 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-slate-600 hover:bg-slate-700 text-slate-300"
                  onClick={() =>
                    setInput(
                      "Build a mobile app interface. Ask me clarifying questions."
                    )
                  }
                >
                  <ArrowRight className="w-3 h-3 mr-2" />
                  Mobile App
                </Button>
              </div>
            </div>
          </Card>

          {/* Generated Prompt */}
          {optimizedPrompt && (
            <Card className="border-slate-700 bg-slate-800/50 sticky top-24">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      {optimizedPrompt.phase}
                    </p>
                    <h3 className="font-semibold text-white text-sm">
                      {optimizedPrompt.title}
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyPromptOnly}
                    className="text-slate-400 hover:text-white"
                    title="Copy prompt only"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>

                <div className="bg-slate-900 rounded-lg p-3 mb-3 border border-slate-700 max-h-48 overflow-y-auto">
                  <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                    {optimizedPrompt.prompt}
                  </p>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-slate-400 font-medium mb-2">
                    Best Practices Applied:
                  </p>
                  <ul className="space-y-1">
                    {optimizedPrompt.bestPractices.map((practice, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-400 flex gap-2"
                      >
                        <span className="text-purple-400">✓</span>
                        {practice}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm"
                    onClick={() => {
                      window.open("https://lovable.dev", "_blank");
                    }}
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Open Lovable
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 hover:bg-slate-700 text-slate-300 text-sm"
                    onClick={copyPrompt}
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copy Full Prompt
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Credits Info */}
          <Card className="border-slate-700 bg-slate-800/50">
            <div className="p-4">
              <h3 className="font-semibold text-white mb-3 text-sm">
                💡 Credit Optimization Tips
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>• Build by component, not full pages</li>
                <li>• Use real content from the start</li>
                <li>• Ask Lovable clarifying questions first</li>
                <li>• One prompt per distinct UI block</li>
                <li>• Use the Edit button for refinements</li>
                <li>• Plan your design direction upfront</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function generateContextualResponse(
  userInput: string,
  messages: Message[],
  optimizationResult?: any
): string {
  const lowerInput = userInput.toLowerCase();

  // If we have an optimized prompt, reference it
  if (
    optimizationResult &&
    optimizationResult.phase &&
    optimizationResult.title
  ) {
    return `Perfect! I've generated an optimized prompt for your project.

**I'm recommending:** ${optimizationResult.title} (${optimizationResult.phase})

**Best Practices I'll Apply:**
${optimizationResult.bestPractices.map((p: string) => `✓ ${p}`).join("\n")}

**To Save Credits:**
${optimizationResult.creditSavingTips.slice(0, 2).map((t: string) => `• ${t}`).join("\n")}

The optimized prompt is ready on the right side. You can copy it and paste it directly into Lovable, or tell me if you need adjustments!`;
  }

  if (messages.length < 2) {
    return `Awesome! Let me help you craft a highly efficient Lovable prompt.

To create the best prompt, I need to understand:

1. **What are you building?** (landing page, component, dashboard, app, etc.)
2. **Who's the user?** (Gen Z, professionals, enterprises, consumers)
3. **What's your design vibe?** (minimal, bold, premium, playful, modern)
4. **Do you have real content?** (actual copy, images, or URLs to embed)

The more specific you are, the better the prompt I'll generate. This saves you both time and credits by getting it right the first time!`;
  }

  if (
    lowerInput.includes("landing") ||
    lowerInput.includes("homepage") ||
    lowerInput.includes("hero")
  ) {
    return `Great choice! A landing page is perfect for Lovable.

Here's my strategy:
1. **Start with the Hero** - Define headline, subheadline, CTA, visual space
2. **Then Features Section** - Build components that showcase value
3. **Finally Footer/CTA** - Drive the conversion action

I've generated an optimized hero prompt for you. It includes:
✓ Ask-first clarifying questions to avoid rework
✓ Real content structure (not lorem ipsum)
✓ Design buzzwords for visual direction
✓ Mobile-responsive guidance

The prompt is ready to copy and paste into Lovable. Would you like me to adjust it or generate the features section prompt next?`;
  }

  if (
    lowerInput.includes("dashboard") ||
    lowerInput.includes("analytics")
  ) {
    return `Perfect for Lovable! Dashboards work best when built component-first.

**My Recommendation:**
1. Start with a single analytics card component
2. Build the card once, then replicate it with the grid
3. Use Lovable's Edit button to customize each card's data
4. This approach saves credits vs. building each card separately

I've generated a reusable card prompt for you. It:
✓ Creates atomic, reusable components
✓ Includes responsive grid guidance
✓ Has hover and active states
✓ Asks for your specific metrics upfront

Copy the prompt and start with one card, then build your dashboard grid!`;
  }

  if (lowerInput.includes("minimal") || lowerInput.includes("clean")) {
    return `Minimal design is perfect for credit efficiency with Lovable.

**Why it works:**
- Fewer components to build
- Clear visual hierarchy
- Easy to refine with Edit button
- Reusable atomic parts

I've crafted a minimal-focused prompt that emphasizes:
✓ Generous whitespace
✓ Semantic component structure
✓ Readable typography hierarchy
✓ Mobile-first responsive approach

Ready to drop into Lovable. Tell me if you want me to adjust anything!`;
  }

  return `Got it! I'm building your optimized prompt now.

Based on what you've told me, I'm creating a prompt that:
✓ Asks Lovable clarifying questions first
✓ Builds component-by-component (not full page at once)
✓ Uses real content, not placeholders
✓ Applies design buzzwords for consistency
✓ Maximizes credit efficiency

Check the right panel for your optimized, ready-to-use prompt!`;
}


import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, BookOpen, FileText, Shield, BarChart3, Video, Sparkles, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StripeEmbeddedCheckout } from '@/components/StripeEmbeddedCheckout';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  TrendingUp, BookOpen, FileText, Shield, BarChart3, Video,
};

const PILLARS = ['All', 'Marketing Technology', 'Strategic Consulting', 'AI Transformation'] as const;

export const TOPIC_POOL = [
  { title: "The Revenue Attribution Playbook", subtitle: "Closing the Gap Between Marketing Spend and Pipeline Revenue", pillar: "Marketing Technology", tags: ["Revenue Attribution", "Marketing Analytics", "ROI Tracking"], icon: "BarChart3" },
  { title: "The CRM Adoption Recovery Guide", subtitle: "Why 68% of CRM Implementations Fail and How to Fix Yours", pillar: "Marketing Technology", tags: ["CRM Strategy", "Sales Enablement", "Technology Adoption"], icon: "Shield" },
  { title: "The Marketing Automation Maturity Model", subtitle: "From Batch-and-Blast to Predictive Revenue Engines", pillar: "Marketing Technology", tags: ["Marketing Automation", "Lead Nurturing", "Predictive Analytics"], icon: "TrendingUp" },
  { title: "The Data-Driven Content Engine", subtitle: "Building a Semantic Content Strategy That AI Recommends", pillar: "Marketing Technology", tags: ["Content Strategy", "Semantic SEO", "AI Discovery"], icon: "FileText" },
  { title: "The Martech Stack Rationalization Framework", subtitle: "Eliminating Tool Sprawl and Maximizing Integration Value", pillar: "Marketing Technology", tags: ["Martech Optimization", "Tool Audit", "Integration Strategy"], icon: "BarChart3" },
  { title: "The Conversion Rate Intelligence Playbook", subtitle: "Using Behavioral Data to Engineer 3x Pipeline Growth", pillar: "Marketing Technology", tags: ["CRO", "Behavioral Analytics", "Pipeline Growth"], icon: "TrendingUp" },
  { title: "The Operational Systems Diagnostic Playbook", subtitle: "14 Days to Identify Every Revenue Leak in Your Business", pillar: "Strategic Consulting", tags: ["Operations", "Revenue Optimization", "Business Diagnostics"], icon: "Shield" },
  { title: "The Strategic Pricing Architecture Guide", subtitle: "Value-Based Pricing Models That 4x Professional Services Revenue", pillar: "Strategic Consulting", tags: ["Pricing Strategy", "Value-Based Pricing", "Revenue Architecture"], icon: "TrendingUp" },
  { title: "The Client Retention Multiplier", subtitle: "How to Build a Referral Engine That Replaces Cold Outreach", pillar: "Strategic Consulting", tags: ["Client Retention", "Referral Strategy", "Relationship Capital"], icon: "BookOpen" },
  { title: "The Executive Decision Framework", subtitle: "Eliminating Analysis Paralysis in High-Stakes Business Pivots", pillar: "Strategic Consulting", tags: ["Executive Leadership", "Decision Making", "Strategic Planning"], icon: "BookOpen" },
  { title: "The Scalable Services Blueprint", subtitle: "Productizing Expertise Without Sacrificing Quality", pillar: "Strategic Consulting", tags: ["Service Productization", "Scalability", "Business Model"], icon: "FileText" },
  { title: "The Competitive Intelligence Operating System", subtitle: "Real-Time Market Positioning in the AI Economy", pillar: "Strategic Consulting", tags: ["Competitive Intelligence", "Market Positioning", "AI Economy"], icon: "Shield" },
  { title: "The AI Visibility Scorecard Framework", subtitle: "Measuring and Maximizing Your Brand's AI Search Presence", pillar: "AI Transformation", tags: ["AI Visibility", "GEO", "Brand Presence"], icon: "BarChart3" },
  { title: "The Autonomous Workforce Integration Guide", subtitle: "Deploying AI Agents Without Destroying Team Culture", pillar: "AI Transformation", tags: ["AI Agents", "Workforce Transformation", "Change Management"], icon: "Video" },
  { title: "The Generative Engine Optimization Masterclass", subtitle: "From SEO to GEO — The Complete Transition Playbook", pillar: "AI Transformation", tags: ["GEO", "AI Search", "Content Optimization"], icon: "TrendingUp" },
  { title: "The AI-First Customer Experience Blueprint", subtitle: "Designing Touchpoints That Learn, Adapt, and Convert", pillar: "AI Transformation", tags: ["Customer Experience", "AI Personalization", "Conversion Design"], icon: "BookOpen" },
  { title: "The Predictive Analytics Implementation Roadmap", subtitle: "From Historical Reporting to Revenue Forecasting in 90 Days", pillar: "AI Transformation", tags: ["Predictive Analytics", "Revenue Forecasting", "Data Strategy"], icon: "BarChart3" },
  { title: "The AI Ethics and Governance Playbook", subtitle: "Building Trust While Deploying Autonomous Systems", pillar: "AI Transformation", tags: ["AI Ethics", "Governance", "Trust Architecture"], icon: "Shield" },
  { title: "The Account-Based Marketing Execution Guide", subtitle: "Targeting the 20% of Accounts That Drive 80% of Revenue", pillar: "Marketing Technology", tags: ["ABM", "Target Accounts", "Revenue Concentration"], icon: "TrendingUp" },
  { title: "The Email Deliverability & Reputation Playbook", subtitle: "Stop Landing in Spam — Engineering Inbox Placement at Scale", pillar: "Marketing Technology", tags: ["Email Marketing", "Deliverability", "Sender Reputation"], icon: "FileText" },
  { title: "The Social Proof Automation Framework", subtitle: "Systematizing Testimonials, Reviews, and Case Studies", pillar: "Marketing Technology", tags: ["Social Proof", "Testimonials", "Trust Signals"], icon: "BookOpen" },
  { title: "The Marketing Analytics Dashboard Blueprint", subtitle: "Building Real-Time Visibility Into Every Dollar Spent", pillar: "Marketing Technology", tags: ["Marketing Dashboards", "Real-Time Analytics", "Data Visualization"], icon: "BarChart3" },
  { title: "The Lead Scoring & Qualification Engine", subtitle: "Separating Tire-Kickers from Buyers With Predictive Models", pillar: "Marketing Technology", tags: ["Lead Scoring", "Sales Qualification", "Predictive Models"], icon: "TrendingUp" },
  { title: "The SEO-to-Revenue Pipeline Playbook", subtitle: "Connecting Organic Traffic to Closed Deals in 90 Days", pillar: "Marketing Technology", tags: ["SEO Strategy", "Pipeline Attribution", "Organic Revenue"], icon: "BarChart3" },
  { title: "The Video Marketing ROI Framework", subtitle: "From Content Creation to Pipeline Impact Measurement", pillar: "Marketing Technology", tags: ["Video Marketing", "Content ROI", "Pipeline Impact"], icon: "Video" },
  { title: "The Cash Flow Optimization Playbook", subtitle: "Accelerating Collections and Engineering Predictable Revenue", pillar: "Strategic Consulting", tags: ["Cash Flow", "Collections", "Revenue Predictability"], icon: "TrendingUp" },
  { title: "The Strategic Partnership Framework", subtitle: "Building Channel Partnerships That Multiply Revenue Without Adding Headcount", pillar: "Strategic Consulting", tags: ["Partnerships", "Channel Strategy", "Revenue Multiplication"], icon: "BookOpen" },
  { title: "The Talent Acquisition & Retention Playbook", subtitle: "Competing for A-Players When You Can't Compete on Salary", pillar: "Strategic Consulting", tags: ["Talent Strategy", "Retention", "Employer Brand"], icon: "Shield" },
  { title: "The Crisis Management Operating System", subtitle: "Turning Business Disruptions Into Competitive Advantages", pillar: "Strategic Consulting", tags: ["Crisis Management", "Business Continuity", "Resilience"], icon: "Shield" },
  { title: "The Customer Acquisition Cost Reduction Guide", subtitle: "Cutting CAC by 40% Without Cutting Marketing Spend", pillar: "Strategic Consulting", tags: ["CAC Optimization", "Unit Economics", "Growth Efficiency"], icon: "BarChart3" },
  { title: "The Sales Process Reengineering Playbook", subtitle: "From Intuition-Based Selling to Data-Driven Revenue Operations", pillar: "Strategic Consulting", tags: ["Sales Process", "Revenue Operations", "Data-Driven Sales"], icon: "TrendingUp" },
  { title: "The Board-Ready Financial Modeling Guide", subtitle: "Building Projections That Investors and Lenders Actually Trust", pillar: "Strategic Consulting", tags: ["Financial Modeling", "Investor Relations", "Forecasting"], icon: "BarChart3" },
  { title: "The AI-Powered Sales Enablement Playbook", subtitle: "Arming Your Sales Team With Intelligence That Closes Deals", pillar: "AI Transformation", tags: ["AI Sales Tools", "Sales Intelligence", "Deal Acceleration"], icon: "TrendingUp" },
  { title: "The Intelligent Document Processing Guide", subtitle: "Eliminating Manual Data Entry With AI-Powered Extraction", pillar: "AI Transformation", tags: ["Document AI", "Process Automation", "Data Extraction"], icon: "FileText" },
  { title: "The AI Chatbot Strategy & Deployment Guide", subtitle: "From FAQ Bot to Revenue-Generating Conversational AI", pillar: "AI Transformation", tags: ["Conversational AI", "Chatbot Strategy", "Customer Service AI"], icon: "BookOpen" },
  { title: "The Computer Vision for Business Playbook", subtitle: "Practical Applications of Visual AI Beyond the Hype", pillar: "AI Transformation", tags: ["Computer Vision", "Visual AI", "Business Applications"], icon: "Video" },
  { title: "The AI Content Production Pipeline", subtitle: "Scaling Thought Leadership Without Scaling Your Team", pillar: "AI Transformation", tags: ["AI Content", "Thought Leadership", "Content Scaling"], icon: "FileText" },
  { title: "The Machine Learning ROI Calculator Framework", subtitle: "Quantifying AI Investment Returns for the C-Suite", pillar: "AI Transformation", tags: ["ML ROI", "AI Investment", "Business Case"], icon: "BarChart3" },
  { title: "The AI-Driven Competitive Analysis System", subtitle: "Real-Time Market Intelligence Powered by Machine Learning", pillar: "AI Transformation", tags: ["Competitive Analysis", "Market Intelligence", "AI Monitoring"], icon: "Shield" },
];

interface PlaybookTopicBrowserProps {
  existingTitles?: string[];
}

export const PlaybookTopicBrowser: React.FC<PlaybookTopicBrowserProps> = ({ existingTitles = [] }) => {
  const [search, setSearch] = useState('');
  const [activePillar, setActivePillar] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<typeof TOPIC_POOL[0] | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const existingSet = useMemo(() => new Set(existingTitles), [existingTitles]);

  const filtered = useMemo(() => {
    return TOPIC_POOL.filter(t => {
      if (existingSet.has(t.title)) return false;
      if (activePillar !== 'All' && t.pillar !== activePillar) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
      }
      return true;
    });
  }, [search, activePillar, existingSet]);

  const handleBuy = () => {
    if (!user) {
      navigate('/login?redirect=/resources');
      return;
    }
    setShowCheckout(true);
  };

  return (
    <section className="pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 font-display">
            Build Your Own <span className="text-amber glow-text">Playbook</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pick a topic. <span className="text-amber font-semibold">OUR Strategic Business AI</span> generates a comprehensive 20+ page strategic playbook — custom frameworks, data, and action plans. <span className="text-amber font-semibold">$25 each.</span>
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary/50 border-border"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {PILLARS.map(p => (
              <Button
                key={p}
                variant={activePillar === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePillar(p)}
                className={activePillar === p ? 'bg-primary text-primary-foreground' : 'glass-hover border-border'}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>

        {/* Topic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((topic) => {
            const IconComp = ICON_MAP[topic.icon] || FileText;
            return (
              <button
                key={topic.title}
                onClick={() => setSelectedTopic(topic)}
                className="glass p-5 rounded-xl border border-border hover:border-amber/30 transition-all text-left group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
                    <IconComp className="w-5 h-5 text-amber" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground font-display leading-tight">{topic.title}</h3>
                    <p className="text-xs text-amber mt-0.5">{topic.pillar}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{topic.subtitle}</p>
                <div className="flex flex-wrap gap-1">
                  {topic.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No topics match your search.</p>
        )}

        {/* Topic Detail Modal */}
        <Dialog open={!!selectedTopic && !showCheckout} onOpenChange={(o) => !o && setSelectedTopic(null)}>
          <DialogContent className="glass border-border max-w-lg">
            {selectedTopic && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-foreground font-display text-xl">{selectedTopic.title}</DialogTitle>
                  <DialogDescription className="text-amber font-medium">{selectedTopic.subtitle}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pillar</p>
                    <Badge variant="outline" className="border-amber/30 text-amber">{selectedTopic.pillar}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Topics Covered</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTopic.tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="glass p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-1">What you get:</p>
                    <ul className="text-sm text-foreground space-y-1">
                      <li>• 20+ page strategic playbook (PDF)</li>
                      <li>• Proprietary named frameworks</li>
                      <li>• Implementation roadmap with KPIs</li>
                      <li>• ROI projection models</li>
                      <li>• Case studies with real metrics</li>
                    </ul>
                  </div>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    size="lg"
                    onClick={handleBuy}
                  >
                    {user ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate & Buy — $25
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Sign In to Purchase
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Checkout Modal */}
        <Dialog open={showCheckout} onOpenChange={(o) => { if (!o) { setShowCheckout(false); setSelectedTopic(null); } }}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground font-display">Complete Your Purchase</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedTopic?.title}
              </DialogDescription>
            </DialogHeader>
            {selectedTopic && user && (
              <StripeEmbeddedCheckout
                priceId="custom_playbook_once"
                customerEmail={user.email || undefined}
                returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=playbook&topic=${encodeURIComponent(selectedTopic.title)}`}
                metadata={{
                  playbook_topic: selectedTopic.title,
                  playbook_topic_data: JSON.stringify(selectedTopic),
                  user_id: user.id,
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

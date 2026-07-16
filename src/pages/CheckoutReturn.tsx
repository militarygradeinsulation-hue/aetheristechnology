import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, Download, AlertCircle, Package, Gift, Sparkles } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { TOPIC_POOL } from "@/components/PlaybookTopicBrowser";

function SubscriptionReturn({ sessionId }: { sessionId: string }) {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription-by-session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      if (query.state.data?.id) return false;
      return 2000;
    },
  });

  if (isLoading || !subscription) {
    return (
      <>
        <Loader2 className="w-16 h-16 text-amber mx-auto mb-4 animate-spin" />
        <h1 className="text-3xl font-bold text-foreground mb-3">Activating Subscription...</h1>
        <p className="text-muted-foreground mb-6">Setting up your AI consultant. This takes a moment.</p>
      </>
    );
  }

  return (
    <>
      <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-foreground mb-3">Subscription Active!</h1>
      <p className="text-muted-foreground mb-6">
        Let's set up your AI consultant so it can start learning about your business and deliver personalized content every month.
      </p>
      <Link to={`/subscriber-onboarding?subscription_id=${subscription.id}`}>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" size="lg">
          Set Up My AI Consultant &rarr;
        </Button>
      </Link>
    </>
  );
}

function DeliverableReadyView({ deliverables }: { deliverables: any[] }) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClaimPlaybook = async () => {
    if (!selectedTopic || !user) {
      if (!user) navigate('/login?redirect=/resources');
      return;
    }
    const topic = TOPIC_POOL.find(t => t.title === selectedTopic);
    if (!topic) return;

    const { error } = await supabase.from('generated_playbooks').insert({
      user_id: user.id,
      topic_title: topic.title,
      topic_data: topic as any,
      status: 'pending',
      stripe_session_id: null,
    });

    if (!error) {
      await supabase.functions.invoke('generate-custom-playbook', {
        body: { topicTitle: topic.title, userId: user.id },
      });
      setClaimed(true);
    }
  };

  return (
    <>
      <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-foreground mb-3 font-display">
        {deliverables.length > 1 ? 'Your Bundle is Ready!' : 'Your Content is Ready!'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {deliverables.length > 1
          ? `All ${deliverables.length} deliverables have been generated.`
          : 'Your AI-generated content is ready to use.'}
      </p>
      <div className="space-y-3 max-w-md mx-auto mb-6">
        {deliverables.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{formatToolType(d.tool_type)}</span>
            </div>
            {d.file_url ? (
              <a href={d.file_url} download>
                <Button size="sm" variant="outline" className="gap-1">
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </a>
            ) : (
              <span className="text-xs text-primary font-medium">✓ Generated</span>
            )}
          </div>
        ))}
      </div>

      {/* Bonus Playbook Picker */}
      {!claimed ? (
        <div className="max-w-md mx-auto mb-6 p-4 bg-amber/[0.06] border border-amber/25 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-amber" />
            <span className="text-sm font-bold text-foreground">Bonus: Pick a Free Playbook</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            As a thank you for your purchase, choose any strategic playbook, on us.
          </p>
          <select
            value={selectedTopic || ''}
            onChange={(e) => setSelectedTopic(e.target.value || null)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-3"
          >
            <option value="">Select a playbook topic...</option>
            {TOPIC_POOL.map(t => (
              <option key={t.title} value={t.title}>{t.title}</option>
            ))}
          </select>
          <Button
            onClick={handleClaimPlaybook}
            disabled={!selectedTopic}
            className="w-full bg-amber hover:bg-amber/90 text-background gap-2"
            size="sm"
          >
            <Sparkles className="w-4 h-4" /> Claim Free Playbook
          </Button>
        </div>
      ) : (
        <div className="max-w-md mx-auto mb-6 p-4 bg-primary/[0.06] border border-primary/25 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground">Playbook claimed!</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your free playbook is being generated. Check <Link to="/resources" className="text-primary hover:underline">Playbooks</Link> in a few minutes.
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-4">
        A copy has also been sent to your email.
      </p>
      <Link to="/" className="text-primary hover:underline font-medium">
        &larr; Back to Home
      </Link>
    </>
  );
}

function DeliverableReturn({ sessionId }: { sessionId: string }) {
  const { data: deliverables, isLoading } = useQuery({
    queryKey: ['purchase-deliverables', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_deliverables_by_session', { _session_id: sessionId });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: (query) => {
      const items = query.state.data;
      if (!items || items.length === 0) return 2000;
      const allDone = items.every((d: any) => d.status === 'ready' || d.status === 'failed');
      return allDone ? false : 3000;
    },
  });

  if (isLoading || !deliverables || deliverables.length === 0) {
    return (
      <>
        <Loader2 className="w-16 h-16 text-amber mx-auto mb-4 animate-spin" />
        <h1 className="text-3xl font-bold text-foreground mb-3 font-display">Generating Your Content...</h1>
        <p className="text-muted-foreground mb-6">Our AI is building your deliverables. This usually takes 1-2 minutes.</p>
      </>
    );
  }

  const allReady = deliverables.every((d: any) => d.status === 'ready');
  const anyFailed = deliverables.some((d: any) => d.status === 'failed');
  const anyPending = deliverables.some((d: any) => d.status === 'pending' || d.status === 'generating');

  if (anyPending) {
    return (
      <>
        <Loader2 className="w-16 h-16 text-amber mx-auto mb-4 animate-spin" />
        <h1 className="text-3xl font-bold text-foreground mb-3 font-display">Generating Your Content...</h1>
        <p className="text-muted-foreground mb-6">
          {deliverables.length > 1
            ? `Generating ${deliverables.length} deliverables. This usually takes 1-2 minutes.`
            : 'Our AI is building your deliverable. This usually takes 1-2 minutes.'}
        </p>
        <div className="space-y-2 text-left max-w-sm mx-auto">
          {deliverables.map((d: any) => (
            <div key={d.id} className="flex items-center gap-2 text-sm">
              {d.status === 'ready' ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : d.status === 'failed' ? (
                <AlertCircle className="w-4 h-4 text-destructive" />
              ) : (
                <Loader2 className="w-4 h-4 text-amber animate-spin" />
              )}
              <span className="text-foreground">{formatToolType(d.tool_type)}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (allReady) {
    return <DeliverableReadyView deliverables={deliverables} />;
  }

  // Some failed
  return (
    <>
      <AlertCircle className="w-16 h-16 text-amber mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-3 font-display">Partial Generation</h1>
      <p className="text-muted-foreground mb-6">
        Some items were generated successfully, but others had issues.
      </p>
      <div className="space-y-3 max-w-md mx-auto mb-6">
        {deliverables.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              {d.status === 'ready' ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              <span className="text-sm font-medium text-foreground">{formatToolType(d.tool_type)}</span>
            </div>
            {d.status === 'ready' && d.file_url ? (
              <a href={d.file_url} download>
                <Button size="sm" variant="outline" className="gap-1">
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </a>
            ) : d.status === 'ready' ? (
              <span className="text-xs text-primary font-medium">✓ Generated</span>
            ) : (
              <span className="text-xs text-destructive font-medium">Failed</span>
            )}
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        Contact us at <a href="tel:+13173762110" className="text-primary font-semibold">(317) 376-2110</a> for help with failed items.
      </p>
      <Link to="/" className="text-primary hover:underline font-medium">
        &larr; Back to Home
      </Link>
    </>
  );
}

function formatToolType(toolType: string): string {
  const labels: Record<string, string> = {
    social_content: "Social Content Pack",
    sales_scripts: "Sales Script Pack",
    content_calendar: "Content Calendar",
    follow_up_plan: "Follow-Up Plan",
    strategic_questions: "Strategic Question Engine",
    brand_contradictions: "Brand Contradiction Finder",
    friction_audit: "Friction Vocabulary Audit",
    website_report: "Full Website Report",
    digital_snapshot: "Digital Snapshot",
    strategy_blueprint: "Strategy Blueprint",
  };
  return labels[toolType] || toolType;
}

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const type = searchParams.get("type");
  const topic = searchParams.get("topic");

  const isPlaybook = type === "playbook";
  const isPlaybookUnlock = type === "playbook_unlock";
  const isScanReport = type === "scan_report";
  const isSubscription = type === "subscription";
  const isDeliverable = type === "deliverable" || type === "bundle";
  const playbookId = searchParams.get("playbook_id");

  const { data: playbook } = useQuery({
    queryKey: ['generated-playbook', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_playbooks')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isPlaybook && !!sessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'ready' || status === 'failed') return false;
      return 3000;
    },
  });

  // Check if this session has deliverables (auto-detect if type not set)
  const { data: hasDeliverables } = useQuery({
    queryKey: ['check-deliverables', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_deliverables_by_session', { _session_id: sessionId! });
      if (error) throw error;
      return Array.isArray(data) && data.length > 0;
    },
    enabled: !!sessionId && !isPlaybook && !isScanReport && !isSubscription && !isDeliverable,
  });

  const showDeliverable = isDeliverable || hasDeliverables;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          {sessionId ? (
            <>
              {isPlaybook ? (
                <>
                  {(!playbook || playbook.status === 'pending' || playbook.status === 'generating') && (
                    <>
                      <Loader2 className="w-16 h-16 text-amber mx-auto mb-4 animate-spin" />
                      <h1 className="text-3xl font-bold text-foreground mb-3 font-display">
                        Generating Your Playbook
                      </h1>
                      <p className="text-muted-foreground mb-2">
                        {topic && <span className="text-amber font-medium">{decodeURIComponent(topic)}</span>}
                      </p>
                      <p className="text-muted-foreground mb-6">
                        Our AI is writing your custom strategic playbook. This usually takes 1-2 minutes.
                      </p>
                    </>
                  )}
                  {playbook?.status === 'ready' && (
                    <>
                      <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                      <h1 className="text-3xl font-bold text-foreground mb-3 font-display">
                        Your Playbook is Ready!
                      </h1>
                      <p className="text-muted-foreground mb-6">
                        {playbook.topic_title}
                      </p>
                      <a href={playbook.file_url!} download>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mb-4" size="lg">
                          <Download className="w-5 h-5" /> Download PDF
                        </Button>
                      </a>
                      <br />
                      <Link to="/resources" className="text-primary hover:underline font-medium">
                        &larr; Back to Playbooks
                      </Link>
                    </>
                  )}
                  {playbook?.status === 'failed' && (
                    <>
                      <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                      <h1 className="text-2xl font-bold text-foreground mb-3">Generation Failed</h1>
                      <p className="text-muted-foreground mb-6">
                        Something went wrong generating your playbook. Please contact us at{' '}
                        <a href="tel:+13173762110" className="text-primary font-semibold">(317) 376-2110</a> and we'll get you sorted.
                      </p>
                      <Link to="/resources" className="text-primary hover:underline font-medium">
                        &larr; Back to Playbooks
                      </Link>
                    </>
                  )}
                </>
              ) : isScanReport ? (
                <>
                  <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-foreground mb-3">Report Unlocked!</h1>
                  <p className="text-muted-foreground mb-6">
                    Your full website diagnostic report is now available. Head back to the scanner to view all findings.
                  </p>
                  <Link to="/scan">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" size="lg">
                      View Full Report &rarr;
                    </Button>
                  </Link>
                </>
              ) : isSubscription ? (
                <SubscriptionReturn sessionId={sessionId!} />
              ) : isPlaybookUnlock ? (
                <>
                  <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-foreground mb-3 font-display">Playbook Unlocked!</h1>
                  <p className="text-muted-foreground mb-6">
                    Your playbook is now available for download.
                  </p>
                  <Link to="/resources">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" size="lg">
                      <Download className="w-5 h-5" /> Go to Playbooks
                    </Button>
                  </Link>
                </>
              ) : showDeliverable ? (
                <DeliverableReturn sessionId={sessionId!} />
              ) : (
                <>
                  <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-foreground mb-3">Payment Complete!</h1>
                  <p className="text-muted-foreground mb-6">
                    Thank you for your purchase. We'll be in touch within 24 hours to get started.
                    If you need anything immediately, call us at{' '}
                    <a href="tel:+13173762110" className="text-primary font-semibold">(317) 376-2110</a>.
                  </p>
                  <Link to="/" className="text-primary hover:underline font-medium">
                    &larr; Back to Home
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-3">No Session Found</h1>
              <p className="text-muted-foreground mb-6">It looks like this page was accessed without a valid checkout session.</p>
              <Link to="/" className="text-primary hover:underline font-medium">
                &larr; Back to Home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

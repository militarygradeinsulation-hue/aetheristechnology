import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DollarSign, TrendingUp, Target, Zap, CheckCircle, XCircle, Phone, Mail, Share2 } from 'lucide-react';
import { REP_PRODUCTS, TIER_RATES, fmtUsd, repCentsForProduct } from '@/lib/repProducts';

const CareersPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    experience: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Name and email are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const id = crypto.randomUUID();
    const trimmedEmail = form.email.trim();
    const trimmedName = form.name.trim();
    const { error } = await supabase.from('rep_signups').insert([{
      id,
      name: trimmedName,
      email: trimmedEmail,
      phone: form.phone.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      experience: form.experience.trim() || null,
    }]);
    setLoading(false);
    if (error) {
      toast({ title: "Something went wrong. Try again.", variant: "destructive" });
      return;
    }
    // Send welcome email with playbook
    supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'rep-welcome',
        recipientEmail: trimmedEmail,
        idempotencyKey: `rep-welcome-${id}`,
        templateData: { name: trimmedName },
      },
    });
    // Notify joseph@ about the new application
    supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'rep-application-notification',
        recipientEmail: 'joseph@aetheris.technology',
        idempotencyKey: `rep-app-notify-${id}`,
        templateData: {
          name: trimmedName,
          email: trimmedEmail,
          phone: form.phone.trim() || undefined,
          linkedin_url: form.linkedin_url.trim() || undefined,
          experience: form.experience.trim() || undefined,
        },
      },
    });
    setSubmitted(true);
    toast({ title: "You're in. Welcome to the team. Check your email for the playbook." });
  };

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Sales Rep — Commission-Only | Aetheris AI"
        description="Independent commission sales role. Sell business forensics & digital transformation to SMB owners. Earn 15% on every deal — including recurring revenue."
        path="/careers"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-24 pb-16">
          {!submitted ? <SignupSection form={form} onChange={handleChange} onSubmit={handleSubmit} loading={loading} /> : <PlaybookSection />}
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

const SignupSection = ({ form, onChange, onSubmit, loading }: {
  form: { name: string; email: string; phone: string; linkedin_url: string; experience: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}) => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6">
    <div className="text-center mb-12">
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
        Commission-Only Sales Reps <span className="text-primary">Wanted</span>
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
        We sell <strong className="text-foreground">business forensics</strong> to SMB owners — companies leaking 8–15% of revenue
        through invisible operational gaps. The pain is universal. The market is every business in America. Your commission is recurring.
      </p>
    </div>

    <Card className="bg-amber/10 border-amber/40 mb-10">
      <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div>
          <p className="font-display text-lg text-foreground">Applications are gated. Pass the test first.</p>
          <p className="text-sm text-muted-foreground">20 questions, 45 minutes, 70% to pass. No test = no application. Random apps go in the trash.</p>
        </div>
        <a href="/careers/test"><Button size="lg" className="bg-amber text-background hover:bg-amber/90">Take the Test →</Button></a>
      </CardContent>
    </Card>

    <div className="grid md:grid-cols-2 gap-6 mb-12">
      {[
        { icon: DollarSign, title: "Flat 15% Commission", desc: "On every closed deal — including recurring monthly revenue, for as long as the client stays subscribed." },
        { icon: Target, title: "Universal Pain", desc: "Every business is leaking revenue. They just can't see it from inside the building. We hand you the flashlight." },
        { icon: TrendingUp, title: "Recurring Revenue", desc: "Subscriptions and Fractional retainers pay you every month. One closed retainer = $885/mo to you, indefinitely." },
        { icon: Zap, title: "No Inventory, No Delivery", desc: "You sell. We deliver. You get paid. Operator-led forensics — you don't have to know the tech." },
      ].map(({ icon: Icon, title, desc }) => (
        <Card key={title} className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-6 flex items-start gap-4">
            <Icon className="w-8 h-8 text-primary shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card className="bg-card/60 backdrop-blur border-amber/40">
      <CardHeader>
        <CardTitle className="text-2xl text-foreground">One Door In: The Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          We don't accept blind applications. If you can't be bothered to read the site and pass a 20-question knowledge test,
          you won't be bothered to follow up with prospects. Pass the test → application unlocks → we review every passing app personally.
        </p>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
          <li>Read the site — especially <a href="/leak-audit" className="text-amber hover:underline">/leak-audit</a> and <a href="/services" className="text-amber hover:underline">/services</a>.</li>
          <li>Take the 20-question test (45 min, 70% to pass).</li>
          <li>Pass it → application form unlocks instantly with your share code.</li>
          <li>Joseph personally reviews every passing application within 48 hours.</li>
        </ol>
        <a href="/careers/test" className="block">
          <Button size="lg" className="w-full bg-amber text-background hover:bg-amber/90">
            Start the Test →
          </Button>
        </a>
        <p className="text-xs text-center text-muted-foreground">There is no application form on this page. The test is the only way in.</p>
      </CardContent>
    </Card>
  </div>
);

const PlaybookSection = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
    <div className="text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
        Welcome to <span className="text-primary">Aetheris AI</span>
      </h1>
      <p className="text-xl text-muted-foreground mb-6">Your sales playbook is below. Read it. Learn it. Start closing.</p>
      <a
        href="https://ihdjpxhcaiaixmqxyqoe.supabase.co/storage/v1/object/public/playbooks/rep_playbook.pdf"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button size="lg" className="gap-2">
          <Download className="w-5 h-5" /> Download Playbook PDF
        </Button>
      </a>
    </div>

    {/* PRICING LADDER */}
    <Card className="bg-card/60 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><DollarSign className="text-primary" /> The Pricing Ladder</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">You sell a ladder of services. Start small, build trust, close big.</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Purpose</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Digital Snapshot", "$125", "Automated report", "Door opener — shows them their gaps"],
              ["Website Evaluation", "$500", "Detailed analysis + call", "Builds authority, earns trust"],
              ["14-Day Diagnostic", "$2,500", "Deep-dive operational audit", "Finds the real problems"],
              ["Implementation", "$5K–$25K+", "Full build-out", "Website, CRM, automation, the works"],
            ].map(([service, price, format, purpose]) => (
              <TableRow key={service}>
                <TableCell className="font-medium text-foreground">{service}</TableCell>
                <TableCell className="text-primary font-semibold">{price}</TableCell>
                <TableCell className="text-muted-foreground">{format}</TableCell>
                <TableCell className="text-muted-foreground">{purpose}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* COMMISSION */}
    <Card className="bg-card/60 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="text-primary" /> Your Commission</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-foreground font-medium">
            Flat <span className="text-primary font-bold">15%</span> of every sale tied to your code — including recurring monthly invoices for the life of the subscription.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            One rule. No tiers. No caps. No clawbacks on completed work. The split is locked: 70% company / 15% rep / 15% partner override. Easy math on every product, every time.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Client Price</TableHead>
              <TableHead className="text-right">Tier</TableHead>
              <TableHead className="text-right">Your Cut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {REP_PRODUCTS.map((p) => (
              <TableRow key={p.name} className={p.highlight ? 'bg-primary/5' : undefined}>
                <TableCell className={p.highlight ? 'font-semibold text-foreground' : 'text-foreground'}>
                  {p.name}{p.recurring ? ' (recurring)' : ''}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {fmtUsd(p.priceCents)}{p.recurring ? '/mo' : ''}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  T{p.tier} · {Math.round(TIER_RATES[p.tier].rep * 100)}%
                </TableCell>
                <TableCell className={`text-right font-semibold ${p.highlight ? 'text-primary' : 'text-foreground'}`}>
                  {fmtUsd(repCentsForProduct(p))}{p.recurring ? '/mo' : ''}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="text-foreground">Monthly Subscriptions</TableCell>
              <TableCell className="text-right text-muted-foreground">varies</TableCell>
              <TableCell className="text-right text-muted-foreground">flat 15%</TableCell>
              <TableCell className="text-right font-semibold text-primary">15% of every invoice, for life</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p className="text-sm text-muted-foreground">Commission paid within 7 days of client payment clearing. No clawbacks on completed work.</p>
      </CardContent>
    </Card>

    {/* HOW TO SELL */}
    <Card className="bg-card/60 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Target className="text-primary" /> How to Sell</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">The Outreach Sequence</h3>
          <p className="text-muted-foreground mb-4">Lead with observation, not pitch. You're pointing out a problem they already feel.</p>
          <div className="space-y-3">
            {[
              "Visit their website. Find 2-3 obvious problems (slow load, no mobile, outdated photos, no CTA).",
              "Send a short email or LinkedIn message: 'I looked at your site — you're leaving money on the table. Want me to show you where?'",
              "Offer the $149 Digital Snapshot as the entry point. It's cheap, it's fast, and it proves value.",
              "Once they see the report, they'll ask 'what now?' That's when you introduce the Strategy Blueprint or 14-Day Diagnostic.",
              "Implementation and Fractional CTO/CMO retainers sell themselves after the diagnostic reveals the full damage.",
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                <p className="text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="text-green-500" /> What to Do
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              {[
                "Be direct. These are business owners, not babies.",
                "Use specific numbers from their website.",
                "Reference competitors who look better online.",
                "Follow up 3 times minimum. Most close on follow-up 2 or 3.",
                "Ask questions. Let them talk about their frustrations.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2"><span className="text-green-500">✓</span> {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <XCircle className="text-destructive" /> What NOT to Do
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              {[
                "Don't lead with price. Lead with the problem.",
                "Don't oversell. The Snapshot does the selling for you.",
                "Don't trash-talk their current vendor. Just show the gaps.",
                "Don't promise timelines you can't control.",
                "Don't disappear after the first 'no.' It's rarely final.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2"><span className="text-destructive">✗</span> {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* SAMPLE EARNINGS */}
    <Card className="bg-card/60 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><DollarSign className="text-primary" /> Realistic Monthly Earnings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">Honest math at 10% across the real product ladder:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'Light month', detail: '5 small unlocks + 1 Snapshot', total: '~$40' },
            { label: 'Solid month', detail: '3 Snapshots + 2 Strategy Blueprints + 1 Website Eval', total: '~$164' },
            { label: 'Strong month', detail: '1 × 14-Day Diagnostic + 2 Snapshots + 1 Fractional retainer signed', total: '$910 first month + $590/mo recurring' },
            { label: 'Heavy month', detail: '2 Diagnostics + 1 Fractional retainer', total: '$1,170 first month + $590/mo recurring' },
          ].map((row) => (
            <div key={row.label} className="rounded-lg border border-border/50 bg-card/50 p-4">
              <p className="text-sm text-muted-foreground">{row.label}</p>
              <p className="text-foreground mt-1">{row.detail}</p>
              <p className="text-primary font-semibold mt-1">{row.total}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">Recurring retainers compound. Two Fractional clients held for 12 months = $14,160 in residual commission alone.</p>
      </CardContent>
    </Card>

    {/* HOW TO GET STARTED */}
    <Card className="bg-card/60 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="text-primary" /> How to Get Started — Today</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: Share2, title: "Share Our LinkedIn Posts", desc: "Reshare Aetheris content to your network. Tag playground companies. Start conversations." },
            { icon: Mail, title: "Email Companies Directly", desc: "Find playground companies with bad websites. Send 10 emails a day with a specific observation." },
            { icon: Phone, title: "Call Prospects", desc: "Pick up the phone. Ask for the owner. 'I noticed your website — I think you're losing bids because of it.'" },
            { icon: Target, title: "Use the Website Scanner", desc: "Run their URL through our scanner at aetheristechnology.lovable.app/scan — use the report as your opener." },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="bg-background/50 border-border/30">
              <CardContent className="p-5 flex items-start gap-3">
                <Icon className="w-6 h-6 text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{title}</h4>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-8 p-6 rounded-lg bg-primary/10 border border-primary/20 text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Questions? Need help with a prospect?</p>
          <p className="text-muted-foreground">Email <a href="mailto:aetheris.technology@outlook.com" className="text-primary hover:underline">aetheris.technology@outlook.com</a> or call <a href="tel:+13173762110" className="text-primary hover:underline">(317) 376-2110</a></p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default CareersPage;

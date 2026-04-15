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
        title="Become a Sales Rep — Commission-Only | Aetheris AI"
        description="Join Aetheris AI as an independent commission-based sales rep. Sell digital transformation to playground and recreation companies. Earn 8-25% on every deal."
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
        We sell digital transformation to playground and recreation companies — an industry full of $200K products 
        marketed with $200 websites. The gap is massive. Your commission is real.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6 mb-12">
      {[
        { icon: DollarSign, title: "8–25% Commission", desc: "On every closed deal. No ceiling." },
        { icon: Target, title: "Warm Market", desc: "These companies know they need help. They just don't know who to call." },
        { icon: TrendingUp, title: "$14B Industry", desc: "Global playground market growing at 7% CAGR. Money is moving." },
        { icon: Zap, title: "No Inventory", desc: "You sell services. We deliver. You get paid." },
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

    <Card className="bg-card/60 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl text-foreground">Apply Now</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" name="name" value={form.name} onChange={onChange} required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={onChange} required maxLength={255} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" value={form.phone} onChange={onChange} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input id="linkedin_url" name="linkedin_url" value={form.linkedin_url} onChange={onChange} placeholder="https://linkedin.com/in/..." maxLength={300} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience">Brief Background / Experience</Label>
            <Textarea id="experience" name="experience" value={form.experience} onChange={onChange} rows={3} maxLength={1000} placeholder="Sales background, industry knowledge, anything relevant..." />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Join the Team — See the Playbook"}
          </Button>
        </form>
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Base Commission</TableHead>
              <TableHead>Step-Up Bonus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Digital Snapshot ($125)", "25% — $31.25/sale", "3+ in a week → 30%"],
              ["Website Evaluation ($500)", "25% — $125/sale", "2+ in a month → 28%"],
              ["14-Day Diagnostic ($2,500)", "12% — $300/sale", "Upsell to implementation → +3%"],
              ["Implementation ($5K–$25K+)", "8–10%", "Repeat client → 12%"],
            ].map(([service, base, bonus]) => (
              <TableRow key={service}>
                <TableCell className="font-medium text-foreground">{service}</TableCell>
                <TableCell className="text-primary font-semibold">{base}</TableCell>
                <TableCell className="text-muted-foreground">{bonus}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-sm text-muted-foreground mt-4">Commission paid within 7 days of client payment clearing. No clawbacks on completed work.</p>
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
              "Offer the $125 Digital Snapshot as the entry point. It's cheap, it's fast, and it proves value.",
              "Once they see the report, they'll ask 'what now?' That's when you introduce the evaluation or diagnostic.",
              "Implementation sells itself after the diagnostic reveals the full damage.",
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
                "Don't oversell. The $125 snapshot does the selling for you.",
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
        <CardTitle className="flex items-center gap-2"><DollarSign className="text-primary" /> Sample Monthly Earnings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">A realistic month for someone working this 10–15 hours per week:</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Closed Deal</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Your Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["4× Digital Snapshots", "$500", "$125"],
              ["2× Website Evaluations", "$1,000", "$250"],
              ["1× 14-Day Diagnostic", "$2,500", "$300"],
              ["1× Implementation (small)", "$8,000", "$800"],
            ].map(([deal, rev, comm]) => (
              <TableRow key={deal}>
                <TableCell className="text-foreground">{deal}</TableCell>
                <TableCell className="text-muted-foreground">{rev}</TableCell>
                <TableCell className="text-primary font-semibold">{comm}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 border-primary/30">
              <TableCell className="font-bold text-foreground">Monthly Total</TableCell>
              <TableCell className="font-bold text-foreground">$12,000</TableCell>
              <TableCell className="font-bold text-primary text-lg">$1,475</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p className="text-sm text-muted-foreground mt-4">This is conservative. Top reps closing 2+ implementations per month clear $3K–$5K+ in commission.</p>
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

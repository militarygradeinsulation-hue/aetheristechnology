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

const trackCareersCta = (cta: string) => {
  try {
    const sid = localStorage.getItem('aetheris_session_id') || crypto.randomUUID();
    localStorage.setItem('aetheris_session_id', sid);
    supabase.from('site_events').insert([{
      event_type: 'careers_cta_click',
      event_data: { cta, path: '/careers' } as any,
      session_id: sid,
      user_agent: navigator.userAgent,
    }]);
  } catch {}
};
import {
  DollarSign, TrendingUp, Target, Zap, CheckCircle, XCircle, Phone, Mail, Share2,
  Shield, Rocket, GraduationCap, Users, Clock, Brain, Trophy, MapPin, Headphones,
} from 'lucide-react';
import { REP_PRODUCTS, TIER_RATES, fmtUsd, repCentsForProduct } from '@/lib/repProducts';
import careersHero from '@/assets/careers-hero.jpg';
import careersIntroVideo from '@/assets/careers-intro.mp4';
import careersIntroPoster from '@/assets/careers-intro-poster.jpg';

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
  <div className="max-w-6xl mx-auto px-4 sm:px-6">
    {/* HERO */}
    <div className="relative rounded-2xl overflow-hidden border border-amber/20 mb-12">
      <img
        src={careersHero}
        alt="Aetheris business forensics operator at work — dark room, amber data, dollar-leak signals"
        width={1920}
        height={1080}
        className="w-full h-[420px] md:h-[520px] object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber mb-3">
          Now Hiring · Indianapolis & Remote · Commission-Only
        </p>
        <h1 className="text-4xl md:text-6xl font-bold text-foreground font-display max-w-3xl leading-tight">
          Build a career hunting <span className="text-amber">invisible revenue leaks</span>.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mt-4">
          Every business in America is leaking 8–15% of revenue and can't see it from the inside.
          You bring the flashlight. We deliver the fix. You earn <strong className="text-foreground">15% of every dollar — for life of the client.</strong>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <a href="/careers/test" onClick={() => trackCareersCta('hero_take_test')}>
            <Button size="lg" className="bg-amber text-background hover:bg-amber/90 font-semibold">
              Take the Qualifying Test →
            </Button>
          </a>
          <a href="#why-us">
            <Button size="lg" variant="outline" className="border-amber/40 text-amber hover:bg-amber/10">
              Why Operators Choose Us
            </Button>
          </a>
        </div>
      </div>
    </div>

    {/* OPERATOR INTRO VIDEO */}
    <div className="mb-12">
      <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-amber/30 bg-black shadow-2xl">
        <video
          src={careersIntroVideo}
          poster={careersIntroPoster}
          controls
          muted
          playsInline
          preload="metadata"
          className="w-full h-auto block"
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground mt-3">
        Message from the Architect · Tap to unmute
      </p>
    </div>

    {/* QUICK STATS */}

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
      {[
        { stat: '15%', label: 'Flat commission, recurring' },
        { stat: '7d', label: 'Pay timeline post-clearance' },
        { stat: '$885/mo', label: 'Per Fractional retainer, residual' },
        { stat: '0', label: 'Caps. Clawbacks. Goalposts moved.' },
      ].map((s) => (
        <div key={s.label} className="premium-tile rounded-xl p-5 text-center border border-amber/20">
          <p className="font-display text-3xl md:text-4xl text-amber font-bold">{s.stat}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.label}</p>
        </div>
      ))}
    </div>

    {/* GATE */}
    <Card className="bg-amber/10 border-amber/40 mb-12">
      <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div>
          <p className="font-display text-lg text-foreground">Applications are gated. Pass the test first.</p>
          <p className="text-sm text-muted-foreground">25 questions pulled from a 60-question bank · 50 minutes · 80% to pass · 5 attempts/day. No test = no application. Random apps go in the trash.</p>
        </div>
        <a href="/careers/test" onClick={() => trackCareersCta('gate_take_test')}><Button size="lg" className="bg-amber text-background hover:bg-amber/90">Take the Test →</Button></a>
      </CardContent>
    </Card>

    {/* WHY OPERATORS CHOOSE US */}
    <div id="why-us" className="mb-14">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber text-center">Why Operators Choose Aetheris</p>
      <h2 className="text-3xl md:text-4xl font-bold font-display text-center text-foreground mt-2 mb-8">
        We don't sell software. We sell <span className="text-amber">forensic clarity</span>.
      </h2>
      <div className="grid md:grid-cols-2 gap-5">
        {[
          { icon: DollarSign, title: '15% Flat Commission — Recurring', desc: 'Every closed deal pays you 15%. Subscriptions and Fractional retainers pay you 15% every single month, for the life of the client. Two retainers held 12 months = $21,240 in residual.' },
          { icon: Target, title: 'Universal Pain, Easy Pitch', desc: 'Every business leaks revenue. We hand you a free Leak Audit tool to break the ice and a $2,500 Forensic Diagnostic to close. The pitch writes itself.' },
          { icon: Brain, title: 'Operator-Led — You Don\'t Need to Be Technical', desc: 'You don\'t deliver. You don\'t implement. You sell the diagnosis; Joseph and the engineering team do the surgery. Stay in your lane and earn.' },
          { icon: Rocket, title: 'AI-Powered Sales Stack', desc: 'Built-in AI Sales Coach, Forecast Center, Lead Pool, Business Post Analyst, and 9 closing tools — all free, all inside your portal. No software to buy.' },
          { icon: GraduationCap, title: 'Real Training, Not "Watch This Webinar"', desc: 'In-portal training modules, MCQ + AI-graded scoring, a sales playbook PDF, daily hustle goals, and direct line to the operator. Ramp fast or get cut. We invest in winners.' },
          { icon: Users, title: 'Partner Track — Build a Team, Earn the Override', desc: 'Top reps get promoted to Partner. You bring on reps under your code and earn a 15% override on every sale they close — same recurring math. Build a book of business.' },
          { icon: Trophy, title: 'No Caps. No Tiers. No Clawbacks.', desc: 'One rule. One number. One math equation. The split is locked at 70/15/15 — company / rep / partner. We don\'t move the goalposts.' },
          { icon: Headphones, title: 'Direct Line to the Operator', desc: 'You text Joseph. You call him. No layers, no managers, no HR. If you can sell, you have his cell. That\'s the whole org chart.' },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="bg-card/60 backdrop-blur border-border/50 hover:border-amber/40 transition-colors">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-amber/15 border border-amber/30 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-amber" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground font-display text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>

    {/* PERKS */}
    <div className="mb-14">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber text-center">The Perks</p>
      <h2 className="text-3xl md:text-4xl font-bold font-display text-center text-foreground mt-2 mb-8">
        Built for closers. Run on your terms.
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Clock, title: 'Set Your Own Hours', desc: 'Built-in time clock if you want to track. Otherwise, you\'re your own boss. Results matter, not the calendar.' },
          { icon: MapPin, title: 'Remote-First, Indy-Loved', desc: 'Headquartered in Indianapolis. Reps welcome anywhere in the US. Boots-on-ground in Indy = priority lead routing.' },
          { icon: Shield, title: 'No Cold-Call Quotas', desc: 'No "smile and dial" KPIs. Sell how you sell — LinkedIn, email, in-person, referrals. Whatever works.' },
          { icon: Brain, title: 'Free Access to All Tools', desc: 'Free Leak Audit, Website Scanner, Diagnostic Quiz, Sales Scripts, Follow-Up Plans, and 5 more — all available to send prospects or use yourself.' },
          { icon: Rocket, title: 'Fast Ramp Path', desc: 'Onboarding playbook, daily hustle goals, AI coach, and the company calendar all push you toward your first close in week 1.' },
          { icon: Trophy, title: 'Promotion to Partner', desc: 'Hit consistent numbers, get promoted. Partner status = recruit reps, earn overrides, get a seat at the strategy table.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-border/50 bg-card/40 p-5 hover:border-amber/30 transition-colors">
            <Icon className="w-5 h-5 text-amber mb-3" />
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground mt-1.5">{desc}</p>
          </div>
        ))}
      </div>
    </div>

    {/* PERFECT FOR */}
    <div className="mb-14">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber text-center">Who This Is Perfect For</p>
      <h2 className="text-3xl md:text-4xl font-bold font-display text-center text-foreground mt-2 mb-3">
        If you see yourself here, you're already half-hired.
      </h2>
      <p className="text-center text-sm text-muted-foreground max-w-2xl mx-auto mb-8">
        We're not looking for resumes — we're looking for operators. These are the people who tend to print here.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'The Side-Hustler', desc: 'You have a 9-to-5 but your nights and weekends are wide open. 5–10 closes a month and you\'re replacing your salary in residuals.' },
          { title: 'The Burned-Out Agency Closer', desc: 'You sold marketing, SaaS, or "growth" and watched clients churn in 90 days. Selling forensic diagnostics that actually fix the leak feels different.' },
          { title: 'The Ex-Operator', desc: 'You ran or managed a small business. You know exactly where the money bleeds — because it bled out of yours. That insight closes deals fast.' },
          { title: 'The Indy Local Connector', desc: 'You know Indianapolis owners, chambers, BNI, and the local scene. We route Indy leads to Indy reps first — your rolodex is an unfair advantage.' },
          { title: 'The LinkedIn Native', desc: 'You actually like posting, DMing, and building a personal brand. We give you scripts, hooks, and AI content help — you bring the voice.' },
          { title: 'The Builder Looking for Equity-Track', desc: 'You don\'t want to be a rep forever. Promotion to Partner unlocks overrides, recruiting, and a real seat at the strategy table.' },
        ].map(({ title, desc }) => (
          <div key={title} className="rounded-xl border border-border/50 bg-card/40 p-5 hover:border-amber/30 transition-colors">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber mb-2">Profile</p>
            <p className="font-semibold text-foreground font-display">{title}</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>

    {/* WHY NOW — GROUND FLOOR */}
    <div className="mb-14 rounded-2xl border border-amber/30 bg-gradient-to-br from-amber/[0.06] via-card/40 to-card/40 p-8 md:p-10 backdrop-blur">
      <div className="text-center mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">Why Now</p>
        <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mt-2">
          Ground floor of a category that didn't exist 12 months ago.
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto mt-3 leading-relaxed">
          "Business Forensics" is a brand-new lane — operator-led diagnostics powered by an in-house AI stack. Most agencies are still selling 2019 marketing playbooks. We're selling x-ray vision into a business owner's P&amp;L. The early reps own the territory.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { tag: '01', title: 'Untapped Lane', desc: 'No one else is positioning forensics + AI + operator. You\'re not competing against 50 other "growth consultants" in the inbox.' },
          { tag: '02', title: 'AI Tailwind', desc: 'Owners are finally curious about AI but terrified to deploy it. We give them a diagnostic first — that\'s the wedge nobody else has built.' },
          { tag: '03', title: 'Founder Access', desc: 'Direct line to Joseph. No sales VP, no middle layer. You ping, he responds. Strategy meetings, deal coaching, product requests — all open.' },
          { tag: '04', title: 'Equity-Adjacent Upside', desc: 'Recurring 15% for the life of the account, plus a clear path to Partner overrides. The reps who join now build a residual book that compounds for years.' },
        ].map(({ tag, title, desc }) => (
          <div key={tag} className="rounded-xl border border-border/50 bg-card/60 p-5">
            <p className="font-mono text-[10px] tracking-[0.3em] text-amber">{tag}</p>
            <p className="font-semibold text-foreground font-display mt-2">{title}</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>

    {/* WHO WE'RE LOOKING FOR */}
    <div className="grid md:grid-cols-2 gap-6 mb-12">
      <Card className="bg-card/60 backdrop-blur border-emerald-500/20">
        <CardHeader>
          <CardTitle className="font-display text-foreground flex items-center gap-2">
            <CheckCircle className="text-emerald-500 w-5 h-5" /> You'll Thrive Here If
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {[
              'You\'re self-driven and don\'t need a manager checking on you.',
              'You can hold a real conversation with a business owner without sounding like a script.',
              'You actually believe most businesses are leaking money (because they are).',
              'You want commission upside, not a salary safety net.',
              'You can take rejection like a forensic — clinical, not personal.',
            ].map((t) => <li key={t} className="flex gap-2"><span className="text-emerald-500">✓</span>{t}</li>)}
          </ul>
        </CardContent>
      </Card>
      <Card className="bg-card/60 backdrop-blur border-crimson/20">
        <CardHeader>
          <CardTitle className="font-display text-foreground flex items-center gap-2">
            <XCircle className="text-crimson w-5 h-5" /> Don't Apply If
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {[
              'You need a base salary to feel safe.',
              'You won\'t pick up the phone or message a stranger on LinkedIn.',
              'You think AI is "just a fad" — we run on it.',
              'You want to coast. There\'s no coasting in commission.',
              'You can\'t pass a 20-question reading-comprehension test.',
            ].map((t) => <li key={t} className="flex gap-2"><span className="text-crimson">✗</span>{t}</li>)}
          </ul>
        </CardContent>
      </Card>
    </div>

    {/* GATE — FINAL */}
    <Card className="bg-card/60 backdrop-blur border-amber/40">
      <CardHeader>
        <CardTitle className="text-2xl text-foreground font-display">One Door In: The Test</CardTitle>
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
        <a href="/careers/test" onClick={() => trackCareersCta('how_in_start_test')} className="block">
          <Button size="lg" className="w-full bg-amber text-background hover:bg-amber/90 font-semibold">
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
        <p className="text-muted-foreground mb-4">Honest math at <strong className="text-foreground">15% flat</strong> across the real product ladder:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'Light month', detail: '5 small unlocks + 1 Snapshot', total: '~$60' },
            { label: 'Solid month', detail: '3 Snapshots + 2 Strategy Blueprints + 1 Website Eval', total: '~$245' },
            { label: 'Strong month', detail: '1 × $2,500 Forensic Diagnostic + 2 Snapshots + 1 Fractional retainer signed ($5,900/mo)', total: '$1,365 first month + $885/mo recurring' },
            { label: 'Heavy month', detail: '2 Diagnostics + 1 Fractional retainer', total: '$1,755 first month + $885/mo recurring' },
          ].map((row) => (
            <div key={row.label} className="rounded-lg border border-border/50 bg-card/50 p-4">
              <p className="text-sm text-muted-foreground">{row.label}</p>
              <p className="text-foreground mt-1">{row.detail}</p>
              <p className="text-primary font-semibold mt-1">{row.total}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">Recurring retainers compound. Two Fractional clients held for 12 months = <strong className="text-foreground">$21,240</strong> in residual commission alone.</p>
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
            { icon: Share2, title: "Share Our LinkedIn Posts", desc: "Reshare Aetheris content to your network. Tag SMB owners. Start conversations." },
            { icon: Mail, title: "Email Owners Directly", desc: "Find local SMBs leaking revenue. Send 10 emails a day with one specific observation from their site." },
            { icon: Phone, title: "Call Prospects", desc: "Pick up the phone. Ask for the owner. 'I noticed something on your site — I think you're losing 8–15% of revenue silently. Want to see where?'" },
            { icon: Target, title: "Use the Free Leak Audit", desc: "Send them to aetheris.technology/leak-audit. Their result is your wedge into the $2,500 Forensic Diagnostic." },
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

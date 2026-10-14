import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Calendar, CheckCircle2 } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { LanderNavbar } from "@/components/lander/LanderNavbar";
import { Footer } from "@/components/Footer";
import { BOOK_MEETING_URL } from "@/lib/links";

type Topic = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  intro: string;
  symptomTitle: string;
  symptoms: string[];
  processTitle: string;
  process: Array<{ title: string; detail: string }>;
  note: string;
  faqs: Array<{ question: string; answer: string }>;
};

const contractorFollowUp: Topic = {
  path: "/indianapolis/contractor-follow-up",
  title: "Indianapolis Contractor Follow-Up & Lost Quotes",
  description: "Contractors in Indianapolis: see how missed quote follow-up and unclear handoffs lose work. Use Aetheris Technology's free 14-question Leak Check.",
  eyebrow: "Indianapolis · Contractors & Trades",
  headline: "A quote isn't a sale. Who owns the next conversation?",
  intro: "A roofing estimate goes out Monday. An HVAC prospect asks a question by text on Tuesday. The owner assumes the estimator is following up; the estimator assumes the office handled it. The problem isn't necessarily the price. It's a handoff with no owner, no deadline, and no proof that anyone responded.",
  symptomTitle: "Where contractor follow-up breaks",
  symptoms: [
    "Estimates are sent, but nobody has a list of quotes that still need a second conversation.",
    "An office manager, estimator, and owner each think the next follow-up belongs to someone else.",
    "A lead arrives by phone or text, but the conversation never makes it into the job pipeline.",
    "The team measures how many estimates went out, not how many received a timely next step."
  ],
  processTitle: "A practical five-point follow-up review",
  process: [
    { title: "Trace a real lead", detail: "Pick a recent inquiry and follow it from first contact to estimate, response, and outcome. Keep timestamps, not assumptions." },
    { title: "Assign one owner", detail: "Every open quote needs a named person responsible for the next action, even when multiple employees touch the job." },
    { title: "Make the next action visible", detail: "Record the due date and preferred channel for the next response. A conversation in a private phone should never be the whole record." },
    { title: "Review stale estimates", detail: "Look at open estimates without a recent touch. Separate prospects who declined from those who never heard back." },
    { title: "Measure recovered opportunities", detail: "Compare quoted jobs, response timing, and won work after changing the process. Treat any projected revenue as an estimate until a deal closes." }
  ],
  note: "The free Leak Check helps you notice possible weak spots. It doesn't inspect private CRM records or verify lost jobs. A deeper review needs your permission and evidence from your actual process.",
  faqs: [
    { question: "Does a missed follow-up always mean I lost a job?", answer: "No. It creates uncertainty and may reduce your chance to win the work. Confirm outcomes from your own quotes before calling any amount lost revenue." },
    { question: "Do contractors need a new CRM to fix this?", answer: "Not necessarily. Start by establishing one owner, one next action, and a visible record. We look at existing tools before recommending anything new." },
    { question: "Can Aetheris help service businesses outside Indianapolis?", answer: "Yes. Aetheris is based in Noblesville and works with companies beyond Central Indiana." }
  ]
};

const scatteredLeads: Topic = {
  path: "/indianapolis/service-business-lead-tracking",
  title: "Indianapolis Lead Tracking for Service Businesses",
  description: "Calls, texts, website forms and social messages scattered everywhere? Learn how Indianapolis service businesses can find lead handoff gaps and start a free Leak Check.",
  eyebrow: "Indianapolis · Local Service Businesses",
  headline: "Four places your leads arrive. Zero places the whole story lives.",
  intro: "A prospect fills out a website form. Another messages on Instagram. A third calls a technician who promises to pass it along. When each channel has a separate inbox, nobody can reliably answer which leads are waiting, who responded, or which opportunities became jobs. You don't need more leads until you can account for the ones you already have.",
  symptomTitle: "Signals that inquiry tracking is fragmented",
  symptoms: [
    "Incoming calls, website forms, texts, and social messages live in different apps without a shared record.",
    "No one can confidently tell you the status of every new inquiry from yesterday.",
    "A customer repeats the same details to multiple employees because the previous conversation wasn't documented.",
    "Marketing reports lead counts, while operations cannot connect those leads to scheduled work or revenue."
  ],
  processTitle: "Build a reliable lead record before buying another platform",
  process: [
    { title: "Map intake channels", detail: "Write down every path a new customer can use to reach you, including missed calls and direct messages." },
    { title: "Choose a single source of truth", detail: "Use a shared, permission-controlled record for each inquiry. It can be an existing system; a new subscription isn't the first answer." },
    { title: "Track the minimum fields", detail: "Capture source, contact, service needed, assigned owner, last response, next action, and final outcome." },
    { title: "Check handoffs", detail: "Test what happens when the initial person is unavailable or the customer contacts you through a second channel." },
    { title: "Follow the money", detail: "Compare lead records to quotes, booked work, and actual payments. Avoid presenting guesses as verified recovered ROI." }
  ],
  note: "Aetheris starts by examining the workflow across marketing, sales, and operations. We do not claim access to your private calls, messages, or CRM without permission.",
  faqs: [
    { question: "Can I track text and Instagram inquiries without replacing everything?", answer: "Often, yes. First identify where the handoffs fail and which existing system can serve as the shared record. Integration needs depend on the accounts and permissions you already have." },
    { question: "What should I measure first?", answer: "Start with response time, unassigned inquiries, follow-up coverage, and the number of inquiries that become quoted or booked jobs." },
    { question: "Is the free Leak Check an automated scan of our systems?", answer: "No. It's a 14-question self-assessment that produces a directional PDF. An operator-led investigation is a separate engagement." }
  ]
};

const IndianapolisLeadPage: React.FC = () => {
  const { pathname } = useLocation();
  const topic = pathname === scatteredLeads.path ? scatteredLeads : contractorFollowUp;
  const related = pathname === scatteredLeads.path ? contractorFollowUp : scatteredLeads;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={topic.title}
        description={topic.description}
        path={topic.path}
        keywords={pathname === scatteredLeads.path
          ? "Indianapolis service business lead tracking, missed calls follow up, text message leads, Instagram leads, Noblesville revenue consulting"
          : "Indianapolis contractor follow up, lost estimates, roofing sales follow up, HVAC quotes, Noblesville business forensics"}
        faqs={topic.faqs}
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "Indianapolis", path: "/indianapolis" }, { name: topic.title, path: topic.path }]}
      />
      <LanderNavbar />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-32 sm:pt-40">
        <p className="font-case text-[11px] uppercase tracking-[0.25em] text-amber">{topic.eyebrow}</p>
        <h1 className="mt-6 max-w-4xl font-forensic text-4xl font-bold leading-tight sm:text-5xl">{topic.headline}</h1>
        <p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted-foreground">{topic.intro}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/leak-audit/self-scan" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-amber px-7 py-3 text-sm font-bold text-background">
            Take the free Leak Check <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/book" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-amber/50 px-7 py-3 text-sm font-bold text-amber">
            <Calendar className="h-4 w-4" /> Discuss your process
          </Link>
        </div>

        <section className="mt-20 border-t border-border/60 pt-12">
          <h2 className="font-forensic text-3xl font-bold">{topic.symptomTitle}</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {topic.symptoms.map((symptom) => (
              <div key={symptom} className="rounded-lg border border-border/60 bg-card/30 p-6">
                <CheckCircle2 className="mb-4 h-5 w-5 text-amber" />
                <p className="leading-relaxed text-foreground/85">{symptom}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t border-border/60 pt-12">
          <h2 className="font-forensic text-3xl font-bold">{topic.processTitle}</h2>
          <ol className="mt-8 space-y-6">
            {topic.process.map((step, index) => (
              <li key={step.title} className="flex gap-5 border-b border-border/40 pb-6">
                <span className="shrink-0 font-case text-lg text-amber">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="mt-12 border-l-2 border-amber/60 bg-card/30 p-6 text-sm leading-relaxed text-muted-foreground">
          {topic.note}
        </aside>

        <section className="mt-16 border-t border-border/60 pt-12">
          <h2 className="font-forensic text-3xl font-bold">Questions owners ask</h2>
          <div className="mt-7 space-y-8">
            {topic.faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="font-semibold text-foreground">{faq.question}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-xl border border-amber/30 bg-card/40 p-8">
          <h2 className="font-forensic text-2xl font-bold">Start with the gaps you can see.</h2>
          <p className="mt-3 text-muted-foreground">The free check asks 14 questions. It gives you a PDF and a place to start, without unlocking or running the Golden Report.</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/leak-audit/self-scan" className="inline-flex items-center gap-2 text-sm font-bold text-amber">Start free <ArrowRight className="h-4 w-4" /></Link>
            <Link to={related.path} className="inline-flex items-center gap-2 text-sm text-muted-foreground underline underline-offset-4">Related: {related.title}</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default IndianapolisLeadPage;

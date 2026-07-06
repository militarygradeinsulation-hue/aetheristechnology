import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Eye, Brain, Repeat, Target, TrendingUp } from 'lucide-react';

/**
 * MotivationCard
 * Permanent rep-portal reminder of the 7/11 rule of sales exposure
 * plus the mindset required to sell new, innovative companies.
 * UI-only: no business logic, no data fetching.
 */

const QUOTES = [
  { q: "The sale is made long before the close. Show up before they need you.", a: "Operator's Code" },
  { q: "Innovators don't sell features — they sell the future the prospect can't see yet.", a: "Field Note" },
  { q: "Rejection is data. Silence is data. Keep collecting until the pattern breaks.", a: "Forensic Sales" },
  { q: "You're not chasing the deal. You're outlasting the doubt.", a: "Operator's Code" },
  { q: "Every 'not now' is a 'not yet.' Stay in the rotation.", a: "Field Note" },
  { q: "Pioneers get arrows. Operators get paid. Keep moving.", a: "Operator's Code" },
  { q: "The market rewards the relentless, not the loudest.", a: "Field Note" },
];

export const MotivationCard: React.FC = () => {
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <Card className="border-amber/40 bg-gradient-to-br from-card via-card to-amber/5 shadow-elegant">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber" />
          The Rules of the Game
        </CardTitle>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          Read this before every outreach block
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* The 7/11 rule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-amber/30 bg-background/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-amber" />
              <span className="font-display font-semibold">Rule of 7 — Be Seen</span>
            </div>
            <p className="text-2xl font-bold text-amber font-display">7 touches</p>
            <p className="text-sm text-muted-foreground mt-1">
              A lead has to see you <span className="text-foreground font-semibold">7 times</span> before they
              actually <span className="text-foreground font-semibold">see you</span>. Email, call,
              LinkedIn, comment, in-person — they all count. Touch 1-6 feel invisible.
              That's the job.
            </p>
          </div>

          <div className="rounded-lg border border-amber/30 bg-background/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-amber" />
              <span className="font-display font-semibold">Rule of 11 — Be Remembered</span>
            </div>
            <p className="text-2xl font-bold text-amber font-display">+11 touches</p>
            <p className="text-sm text-muted-foreground mt-1">
              After they finally see you, it takes <span className="text-foreground font-semibold">11 more
              touches</span> before they remember your name without prompting. That's when referrals
              start. That's when inbound flips on.
            </p>
          </div>
        </div>

        {/* The math */}
        <div className="rounded-lg border border-border bg-background/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Repeat className="w-4 h-4 text-amber" />
            <span className="font-display font-semibold text-sm">The Math</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="text-foreground font-semibold">7 to be seen + 11 to be remembered = 18 touches per lead.</span>{' '}
            If you give up at touch 3, you didn't get rejected — you just quit before the game started.
            Most reps stop at 2. That's why most reps lose.
          </p>
        </div>

        {/* Selling innovation */}
        <div className="rounded-lg border border-border bg-background/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber" />
            <span className="font-display font-semibold text-sm">Selling a New, Innovative Company</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>
              <span className="text-foreground">No category = no urgency.</span> Your first job is to
              create the problem in their head before you sell the fix.
            </li>
            <li>
              <span className="text-foreground">Education before pitch.</span> Innovators win by
              teaching, not closing. Every touch should leave them smarter.
            </li>
            <li>
              <span className="text-foreground">Pattern interrupt over polish.</span> Boring loses
              faster than wrong. Be the message they didn't expect.
            </li>
            <li>
              <span className="text-foreground">Founders buy from operators.</span> Speak like a
              practitioner, not a vendor. They smell sales scripts in 4 seconds.
            </li>
          </ul>
        </div>

        {/* Quote */}
        <div className="border-l-2 border-amber pl-4 py-1">
          <p className="text-sm italic text-foreground font-serif">"{quote.q}"</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wider">
            — {quote.a}
          </p>
        </div>

        {/* Call to action */}
        <div className="flex items-center gap-2 text-sm font-display">
          <Target className="w-4 h-4 text-amber" />
          <span className="text-foreground">
            Today's standard: every active lead gets at least <span className="text-amber font-semibold">one</span> meaningful touch. No exceptions.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MotivationCard;

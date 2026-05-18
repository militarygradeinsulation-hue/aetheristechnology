import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Moon, Phone, FileWarning, Repeat, Search, AlertTriangle } from 'lucide-react';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Button } from '@/components/ui/button';

const signals = [
  { Icon: Moon, text: "You wake up at 3am running the same revenue math in your head." },
  { Icon: Phone, text: "Your phone doesn't stop. None of the calls are actually moving the business forward." },
  { Icon: FileWarning, text: "You can feel money leaking somewhere — you just can't point at the hole." },
  { Icon: Repeat, text: "You've tried coaches, agencies, AI gurus, courses. Nothing actually changed the numbers." },
  { Icon: Search, text: "You've stared at the CRM, the P&L, the pipeline. From the inside, it all looks 'fine.'" },
  { Icon: AlertTriangle, text: "You're the bottleneck. Nothing important closes without you, and you're cooked." },
];

export const ThisIsForYou: React.FC = () => {
  return (
    <section className="px-4 py-14">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-10">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Read this before you scroll
            </div>
            <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-[1.1]">
              This isn't just for manufacturers.
              <br className="hidden md:block" />
              <span className="text-amber"> It's for the owner who already knows something's wrong.</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
              You've felt it for months. Maybe years. You've tried to find the fix yourself and you're drained. We're the forensic operator you call when you're done looking.
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className="forensic-tile rounded-sm border border-amber/40 p-6 md:p-8">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-5">
              Call us if any of this sounds like your week →
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {signals.map((s) => (
                <div key={s.text} className="flex items-start gap-3 rounded-sm border border-border/60 bg-background/40 p-4">
                  <div className="shrink-0 w-9 h-9 rounded-sm border border-amber/40 bg-amber/10 flex items-center justify-center">
                    <s.Icon className="w-4 h-4 text-amber" />
                  </div>
                  <p className="text-sm md:text-[15px] text-foreground/90 leading-relaxed">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 pt-6 border-t border-amber/15 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="font-forensic text-lg md:text-xl text-foreground/90 italic">
                If you nodded at even two of these, your business is already leaking. You just can't see it from the inside.
              </p>
              <Link to="/leak-audit" className="shrink-0">
                <Button size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                  Run the free Leak Audit <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

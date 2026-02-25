import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Users, Brain, Mail, BarChart3 } from 'lucide-react';
import meVsYouImg from '@/assets/me-vs-you.jpg';

export const ThePitch: React.FC = () => {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              The <span className="text-cyan glow-text">Pitch</span>
            </h2>
          </div>
        </RevealOnScroll>

        <div className="max-w-4xl mx-auto">
          <RevealOnScroll delay={0.2}>
            <div className="glass p-8 md:p-12 rounded-2xl mb-8">
              <h3 className="text-3xl font-bold text-cyan mb-6 text-center">THE MAGIC ROBOT</h3>
              
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                Running a stand is hard work! You have to squeeze lemons, wave at people to come buy, 
                and remember who likes extra sugar. You get tired.
              </p>

              <p className="text-2xl font-bold text-foreground mb-8 text-center">
                I build you a Magic Robot to help you.
              </p>
            </div>
          </RevealOnScroll>

          <div className="space-y-6">
            <RevealOnScroll delay={0.3}>
              <div className="glass glass-hover p-8 rounded-xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-7 h-7 text-cyan" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-foreground mb-2">
                      It Finds New Friends
                    </h4>
                    <p className="text-lg text-muted-foreground mb-4">
                      (Lead Gen) While you are busy pouring drinks, the Robot runs around the playground 
                      and finds thirsty people. It brings them right to your stand!
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        AUTO-PROSPECTING
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        LEAD SCORING
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        ROUTING
                      </span>
                    </div>
                    <div className="mt-4 p-4 bg-cyan/10 rounded-lg border border-cyan/20">
                      <p className="text-sm font-semibold text-cyan">Live Lead Feed</p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.4}>
              <div className="glass glass-hover p-8 rounded-xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-7 h-7 text-cyan" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-foreground mb-2">
                      It Remembers Everything
                    </h4>
                    <p className="text-lg text-muted-foreground mb-4">
                      (CRM with Context) The Robot has a perfect memory. It remembers every customer—
                      who likes extra ice, who paid last time, and who promised to come back tomorrow.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        PERFECT MEMORY
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        CLIENT PREFERENCES
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        INTERACTION HISTORY
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.5}>
              <div className="glass glass-hover p-8 rounded-xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-7 h-7 text-cyan" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-foreground mb-2">
                      It Talks While You Sleep
                    </h4>
                    <p className="text-lg text-muted-foreground mb-4">
                      (24/7 Marketing Hub) Even when you're home playing video games, the Robot is still 
                      out there telling people about your lemonade. It never gets tired!
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        CONTINUOUS OUTREACH
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        AUTOMATED CAMPAIGNS
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        24/7 ENGAGEMENT
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.6}>
              <div className="glass glass-hover p-8 rounded-xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-7 h-7 text-cyan" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-foreground mb-2">
                      You Just Pour the Lemonade
                    </h4>
                    <p className="text-lg text-muted-foreground mb-4">
                      You focus on making the best lemonade. The Robot handles everything else—
                      finding customers, remembering orders, and spreading the word. 
                      You just pour the lemonade and collect the money.
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        FOCUS ON CORE BUSINESS
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        AUTOMATION HANDLES REST
                      </span>
                      <span className="px-3 py-1 rounded-full glass border border-cyan/20 text-cyan">
                        SCALE REVENUE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay={0.7}>
            <div className="mt-12 glass p-8 rounded-xl">
              <img 
                src={meVsYouImg} 
                alt="Me vs You - I handle the automation and AI work while you receive the revenue growth and business success" 
                className="w-full rounded-lg"
              />
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.8}>
            <div className="mt-8 text-center glass p-8 rounded-xl border-2 border-cyan/30">
              <p className="text-2xl font-bold text-foreground mb-4">
                That's what we consult on for your business.
              </p>
              <p className="text-xl text-muted-foreground">
                We design and guide the Magic Robot. You run your business.
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
};

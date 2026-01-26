import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Briefcase, Users, Lightbulb, Rocket } from 'lucide-react';

import teamActionPhoto from '@/assets/office/team-action-poster.jpg';
import teamCollab1 from '@/assets/office/team-collab-1.jpg';

const highlights = [
  {
    icon: Lightbulb,
    title: "Strategy Sessions",
    description: "We dig deep into your business challenges, mapping out AI solutions that actually make sense for your operations."
  },
  {
    icon: Users,
    title: "Collaborative Building",
    description: "Our team works side-by-side with yours, ensuring every solution fits your workflow perfectly."
  },
  {
    icon: Rocket,
    title: "Real Implementation",
    description: "From whiteboard to deployment—we build, test, and launch AI systems that deliver results from day one."
  }
];

export const OurWorkSection: React.FC = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full border border-cyan/30 mb-6">
              <Briefcase className="w-4 h-4 text-cyan" />
              <span className="text-sm text-muted-foreground">Behind the Scenes</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              How We <span className="text-cyan glow-text">Build</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real conversations, real strategy, real results. Here's a look at how our Indianapolis 
              team works together to build AI solutions that transform businesses.
            </p>
          </div>
        </RevealOnScroll>

        {/* Video + Image Grid */}
        <RevealOnScroll>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
            {/* Team Video */}
            <div className="relative rounded-2xl overflow-hidden group lg:col-span-1">
              <img 
                src={teamActionPhoto}
                alt="Our team in action at Aetheris AI"
                className="w-full h-[300px] lg:h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h4 className="text-lg font-semibold text-foreground">Our Team in Action</h4>
                <p className="text-sm text-muted-foreground">Collaboration at our Indianapolis office</p>
              </div>
            </div>

            {/* Static Image */}
            <div className="relative rounded-2xl overflow-hidden group">
              <img 
                src={teamCollab1} 
                alt="Team strategy session at Aetheris AI" 
                className="w-full h-[300px] object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h4 className="text-lg font-semibold text-foreground">Client Collaboration</h4>
                <p className="text-sm text-muted-foreground">Working directly with business owners</p>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Highlights */}
        <RevealOnScroll delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map((item) => (
              <div 
                key={item.title}
                className="glass rounded-xl p-6 border border-border/50 hover:border-cyan/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-cyan/10 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-cyan" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

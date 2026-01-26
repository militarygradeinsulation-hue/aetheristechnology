import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Users } from 'lucide-react';

import mayaPhoto from '@/assets/team/maya.jpg';
import jordanPhoto from '@/assets/team/jordan.jpg';
import sophiaPhoto from '@/assets/team/sophia.jpg';
import rachelPhoto from '@/assets/team/rachel.jpg';
import emmaPhoto from '@/assets/team/emma.jpg';

const teamMembers = [
  {
    name: "Maya Rodriguez",
    title: "Client Success Coordinator",
    photo: mayaPhoto,
    story: "Maya joined Aetheris about two years ago after managing a small marketing agency downtown. She saw firsthand how overwhelmed small business owners get trying to do everything themselves. When she met Joseph at a networking event and heard what Aetheris does, she knew she had to be part of it. \"Being able to help business owners get their time back? That's what gets me out of bed every morning,\" she says. She's usually the first one in the office—she likes her coffee before the phones start ringing.",
    funFact: "Former marketing agency owner"
  },
  {
    name: "Jordan Mitchell",
    title: "Business Development Associate",
    photo: jordanPhoto,
    story: "Jordan spent five years in restaurant management before making the switch to tech. Long hours, thin margins, constant fires to put out—she knows what it's like to run a business where you're always behind. That's exactly why she took this role. \"When I can help a business owner see how they could save 20 hours a week, that feeling never gets old,\" she explains. Based out of the Indianapolis office, she's usually juggling a few conversations at once.",
    funFact: "5 years in restaurant management"
  },
  {
    name: "Sophia Chen",
    title: "Client Relations Specialist",
    photo: sophiaPhoto,
    story: "Sophia's path to Aetheris was a little unconventional—she was a high school business teacher for six years. She loved helping students understand entrepreneurship, but wanted to work directly with business owners making it happen in the real world. Joseph is actually a friend of her husband's from way back, and when he said they needed someone who could really connect with people and explain complex stuff simply, she jumped at the chance. \"Best decision I ever made. The team here is like family.\"",
    funFact: "Former business teacher"
  },
  {
    name: "Rachel Thompson",
    title: "Client Experience Manager",
    photo: rachelPhoto,
    story: "Rachel has been in customer-facing roles her whole career—started in hospitality, moved to SaaS, and landed at Aetheris about 18 months ago. What she loves about this job is that she's not just answering questions—she's actually helping people solve real problems. \"Before Aetheris, I was at a software company where I felt like a number. Here, Joseph actually asks our opinions. We have real input. Seeing a stressed-out business owner finally breathe because they found a solution—that's the good stuff.\"",
    funFact: "Hospitality → SaaS → Aetheris"
  },
  {
    name: "Emma Patel",
    title: "New Client Specialist",
    photo: emmaPhoto,
    story: "Emma is usually the first person you'll talk to when exploring what Aetheris does. She ran an Etsy business for three years while putting herself through college—shipping, customer service, marketing, bookkeeping, all her. So when she talks to entrepreneurs now, she genuinely gets it. \"I joined Aetheris because I believe in what we're building. Helping people work smarter, not harder? Sign me up,\" she says. She's in the Indy office most days—stop by if you're ever in town!",
    funFact: "Former Etsy entrepreneur"
  }
];

export const TeamSection: React.FC = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full border border-cyan/30 mb-6">
              <Users className="w-4 h-4 text-cyan" />
              <span className="text-sm text-muted-foreground">Our Indianapolis Team</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Meet the <span className="text-cyan glow-text">Team</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real people, real experience, ready to help your business thrive. 
              We're not just tech experts—we've been in your shoes.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <RevealOnScroll key={member.name} delay={index * 0.1}>
              <div className="glass rounded-2xl overflow-hidden border border-border/50 hover:border-cyan/30 transition-all duration-300 group h-full flex flex-col">
                {/* Photo */}
                <div className="relative overflow-hidden">
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-foreground">{member.name}</h3>
                    <p className="text-cyan text-sm">{member.title}</p>
                  </div>
                </div>
                
                {/* Story */}
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {member.story}
                  </p>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <span className="text-xs text-cyan/80 font-medium">
                      Background: {member.funFact}
                    </span>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

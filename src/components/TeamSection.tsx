import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Users } from 'lucide-react';

import mayaPhoto from '@/assets/team/maya.jpg';
import marcusPhoto from '@/assets/team/marcus.jpg';
import emmaPhoto from '@/assets/team/emma.jpg';

const teamMembers = [
  {
    name: "Maya Rodriguez",
    title: "Client Success Coordinator",
    photo: mayaPhoto,
    story: "Maya joined Aetheris about two years ago after running a small marketing agency downtown. She saw firsthand how overwhelmed business owners get trying to do everything themselves. When she met Joseph at a Chamber of Commerce event and heard what Aetheris does, she knew she had to be part of it. \"Being able to help business owners reclaim their time—that's what gets me excited every morning,\" she says. She's usually first in the office with her coffee, ready to tackle whatever comes her way.",
    funFact: "Former marketing agency owner"
  },
  {
    name: "Marcus Johnson",
    title: "Business Development Associate",
    photo: marcusPhoto,
    story: "Marcus spent six years in logistics operations before making the jump to tech. Long hours, tight deadlines, and constant problem-solving—he knows exactly what it feels like to run a business where you're always playing catch-up. That experience is why he's so passionate about this role. \"When I can show a business owner how to save 20 hours a week, and I see that weight lift off their shoulders—that never gets old,\" he explains. He's based in the Indy office, usually juggling multiple conversations at once.",
    funFact: "6 years in logistics operations"
  },
  {
    name: "Emily Sanders",
    title: "New Client Specialist",
    photo: emmaPhoto,
    story: "Emily is usually the first person you'll connect with when exploring Aetheris. She built and ran her own e-commerce business for three years while finishing her degree—handling everything from customer service to fulfillment to marketing. So when she talks to entrepreneurs now, she genuinely understands the hustle. \"I joined Aetheris because I believe in working smarter, not just harder. Helping people find that balance? That's why I'm here,\" she says. Stop by the Indy office sometime—she'll probably offer you coffee.",
    funFact: "Former e-commerce entrepreneur"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
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

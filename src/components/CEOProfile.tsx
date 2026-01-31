import React from 'react';
import { TiltCard } from './TiltCard';
import { RevealOnScroll } from './RevealOnScroll';
import josephToney from '@/assets/joseph-toney.jpg';

export const CEOProfile: React.FC = () => {
  return (
    <section id="about" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Meet the <span className="text-cyan glow-text">Founder</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Visionary leadership driving AI innovation
            </p>
          </div>
        </RevealOnScroll>

        {/* Joseph Toney - CEO */}
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 flex justify-center">
            <RevealOnScroll>
              <TiltCard>
                <div className="glass p-10 rounded-2xl max-w-lg">
                  <img 
                    src={josephToney} 
                    alt="Joseph Toney - CEO & Founder" 
                    className="w-72 h-72 mx-auto mb-8 rounded-full object-cover object-center border-4 border-cyan/30 shadow-2xl"
                  />
                  
                  <h3 className="text-3xl font-bold text-center mb-3 text-foreground">
                    Joseph Toney
                  </h3>
                  <p className="text-cyan text-center text-lg mb-6">CEO & Founder</p>
                </div>
              </TiltCard>
            </RevealOnScroll>
          </div>

          <div className="flex-1 space-y-6">
            <RevealOnScroll delay={0.2}>
              <h3 className="text-3xl font-bold text-foreground mb-6">
                Strategic Business Architect & AI Growth Expert
              </h3>
              
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  With 20 years of proven experience building high-impact systems that fuel growth, 
                  Joseph Toney is a Marine Corps leader turned AI strategist who personally codes 
                  solutions that scale revenue across industries.
                </p>
                
                <p>
                  As CEO and Founder of Aetheris AI (formerly CTOguy), Joseph operates with a CEO mindset, 
                  merging data, strategy, and execution to build marketing engines that move the needle. 
                  From commanding 200+ Marines in the United States Marine Corps to scaling teams of 60+ 
                  employees, he brings military precision to business execution.
                </p>

                <div className="glass p-6 rounded-xl mt-6">
                  <p className="italic text-foreground">
                    "I don't just lead teams—I build the systems myself: coded, tested, deployed. 
                    Whether working with aerospace contractors or small businesses, I deliver results 
                    that leaders can measure."
                  </p>
                </div>

                <div className="glass p-6 rounded-xl mt-6">
                  <h4 className="text-lg font-bold text-cyan mb-4">Hear It In My Own Words</h4>
                  <iframe 
                    width="100%" 
                    height="300" 
                    scrolling="no" 
                    frameBorder="no" 
                    allow="autoplay" 
                    src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2193958235&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true"
                    title="Joseph Toney explains what he does in his own words"
                  />
                  <div style={{ fontSize: '10px', color: '#cccccc', lineBreak: 'anywhere', wordBreak: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontFamily: 'Interstate,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Garuda,Verdana,Tahoma,sans-serif', fontWeight: 100 }}>
                    <a href="https://soundcloud.com/joseph-toney-658917042" title="Joseph Toney" target="_blank" rel="noopener noreferrer" style={{ color: '#cccccc', textDecoration: 'none' }}>Joseph Toney</a> · <a href="https://soundcloud.com/joseph-toney-658917042/1_5163578393861555826" title="1_5163578393861555826" target="_blank" rel="noopener noreferrer" style={{ color: '#cccccc', textDecoration: 'none' }}>1_5163578393861555826</a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6">
                  {[
                    { label: 'Years Experience', value: '20+' },
                    { label: 'Marines Led', value: '200+' },
                    { label: 'Lead Flow Increase', value: '60%' },
                    { label: 'Revenue Managed', value: '$25M' },
                  ].map((stat) => (
                    <div key={stat.label} className="glass p-4 rounded-lg">
                      <div className="text-2xl font-bold text-cyan">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-2 text-sm">
                  <p>
                    <span className="text-cyan font-semibold">Education:</span> Master's in Marketing (4.0 GPA) • 
                    Doctorate in Strategic Media starting 2026
                  </p>
                  <p>
                    <span className="text-cyan font-semibold">Certifications:</span> IBM AI Engineering • 
                    Harvard AI for Business • Google Analytics & Ads Expert
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
};
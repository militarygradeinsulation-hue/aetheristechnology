import React, { useEffect, useRef, useState } from 'react';
import { TiltCard } from './TiltCard';
import { RevealOnScroll } from './RevealOnScroll';
import josephToney from '@/assets/joseph-toney.jpg';
import josephToneyVideo from '@/assets/joseph-toney-intro.mp4';

export const CEOProfile: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!document.getElementById('linkedin-badge-script')) {
      const script = document.createElement('script');
      script.id = 'linkedin-badge-script';
      script.src = 'https://platform.linkedin.com/badges/js/profile.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <section id="about" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-display">
              Meet the <span className="text-amber glow-text">Leadership</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Visionary leaders driving AI innovation
            </p>
          </div>
        </RevealOnScroll>

        {/* Joseph Toney - CEO */}
        <div className="flex flex-col lg:flex-row gap-12 items-center mb-24">
          <div className="flex-1 flex justify-center">
            <RevealOnScroll>
              <TiltCard>
                <div className="glass p-10 rounded-2xl max-w-lg">
                  <div className="w-72 h-72 mx-auto mb-8 rounded-full overflow-hidden border-4 border-amber/30 shadow-2xl relative group">
                    <video
                      ref={videoRef}
                      src={josephToneyVideo}
                      poster={josephToney}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        const v = videoRef.current;
                        if (!v) return;
                        v.muted = !v.muted;
                        setMuted(v.muted);
                      }}
                      className="absolute bottom-2 right-2 z-10 bg-background/80 backdrop-blur-sm border border-amber/30 rounded-full w-8 h-8 flex items-center justify-center text-amber hover:bg-amber/20 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label={muted ? 'Unmute video' : 'Mute video'}
                    >
                      {muted ? '🔇' : '🔊'}
                    </button>
                  </div>
                  
                  <h3 className="text-3xl font-bold text-center mb-3 text-foreground font-display">
                    Joseph Toney
                  </h3>
                  <p className="text-amber text-center text-lg mb-6">CEO & Founder</p>
                  <div className="flex justify-center">
                    <div
                      className="badge-base LI-profile-badge"
                      data-locale="en_US"
                      data-size="medium"
                      data-theme="dark"
                      data-type="VERTICAL"
                      data-vanity="thejosephtoney"
                      data-version="v1"
                    >
                      <a
                        className="badge-base__link LI-simple-link"
                        href="https://www.linkedin.com/in/thejosephtoney?trk=profile-badge"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Joseph T.
                      </a>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </RevealOnScroll>
          </div>

          <div className="flex-1 space-y-6">
            <RevealOnScroll delay={0.2}>
              <h3 className="text-3xl font-bold text-foreground mb-6 font-display">
                Strategic Business Architect & AI Growth Expert
              </h3>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  With 20 years of proven experience building high-impact systems that fuel growth,
                  Joseph Toney leads the Aetheris AI team, a Marine Corps veteran turned AI strategist
                  who personally architects the solutions our clients deploy.
                </p>

                <p>
                  As Founder of Aetheris AI (formerly CTOguy), Joseph operates with a CEO mindset,
                  merging data, strategy, and execution to build marketing engines that move the needle.
                  From commanding 200+ Marines in the United States Marine Corps to scaling teams of 60+
                  employees, he brings military precision to business execution. The Aetheris AI team
                  pairs that operational discipline with deep AI engineering capacity.
                </p>

                <div className="glass p-6 rounded-xl mt-6">
                  <p className="italic text-foreground">
                    "We don't just lead teams, we build the systems ourselves: coded, tested, deployed.
                    Whether the client is an aerospace contractor or a regional SMB, we deliver results
                    leaders can measure."
                  </p>
                </div>

                <div className="glass p-6 rounded-xl mt-6">
                  <h4 className="text-lg font-bold text-amber mb-4">Hear It In My Own Words</h4>
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

                <div className="glass p-6 rounded-xl mt-6">
                  <h4 className="text-lg font-bold text-amber mb-4">🎥 Watch: CEO Video</h4>
                  <p className="text-muted-foreground mb-4 text-sm">
                    See Joseph Toney share his vision and approach to AI-driven business growth.
                  </p>
                  <a
                    href="https://www.linkedin.com/posts/activity-7423480113406627840-1-Nv?utm_source=share&utm_medium=member_android&rcm=ACoAAEjaIxIB8iG2kHS6lgwQqVPL9CugLoGxuho"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber/20 border border-amber/40 text-amber font-semibold hover:bg-amber/30 transition-colors"
                  >
                    ▶ Watch on LinkedIn
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6">
                  {[
                    { label: 'Years Experience', value: '20+' },
                    { label: 'Marines Led', value: '200+' },
                    { label: 'Lead Flow Increase', value: '60%' },
                    { label: 'Revenue Managed', value: '$25M' },
                  ].map((stat) => (
                    <div key={stat.label} className="glass p-4 rounded-lg">
                      <div className="text-2xl font-bold text-amber font-display">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-2 text-sm">
                  <p>
                    <span className="text-amber font-semibold">Education:</span> Master's in Marketing (4.0 GPA) •
                    Doctorate in Strategic Media starting 2026
                  </p>
                  <p>
                    <span className="text-amber font-semibold">Certifications:</span> IBM AI Engineering •
                    Harvard AI for Business • Google Analytics & Ads Expert
                  </p>
                  <p>
                    <span className="text-amber font-semibold">Domains:</span> AI strategy & implementation •
                    LLM workflow architecture • CRM/ERP systems • Marketing automation • Operational diagnostics
                  </p>
                  <p>
                    <span className="text-amber font-semibold">Industries Served:</span> Aerospace & defense •
                    Healthcare • Logistics • Construction • Professional services • SaaS
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

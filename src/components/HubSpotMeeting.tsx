import React, { useEffect } from 'react';
import { RevealOnScroll } from './RevealOnScroll';

export const HubSpotMeeting: React.FC = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
    script.type = 'text/javascript';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <section className="relative py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-display">
              Book a <span className="text-gradient-amber">Meeting</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Pick a time that works for you. No back-and-forth emails needed.
            </p>
          </div>
        </RevealOnScroll>
        <RevealOnScroll delay={0.2}>
          <div className="glass rounded-2xl p-6 md:p-10 border border-border">
            <div
              className="meetings-iframe-container"
              data-src="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst?embed=true"
            />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

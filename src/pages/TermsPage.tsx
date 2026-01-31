import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { ContactModal } from '@/components/ContactModal';

const TermsPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        
        <main className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <RevealOnScroll>
              <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                  Terms of <span className="text-cyan glow-text">Service</span>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Legal Information & Policies
                </p>
              </div>
            </RevealOnScroll>

            <div className="space-y-12">
              {/* Intellectual Property & Ownership Notice */}
              <RevealOnScroll delay={0.1}>
                <section className="glass p-8 rounded-2xl">
                  <h2 className="text-2xl font-bold text-cyan mb-6">
                    Intellectual Property & Ownership Notice
                  </h2>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      All systems, software, workflows, models, architectures, documentation, demonstrations, 
                      videos, and related materials presented on this website or through any associated platform 
                      are the sole and exclusive intellectual property of CTOguy.ai.
                    </p>
                    <p>
                      These materials were conceived, developed, and reduced to practice independently by CTOguy.ai 
                      and are not works made for hire, joint works, or derivative works of any third party unless 
                      expressly stated in a separate written agreement executed by CTOguy.ai.
                    </p>
                    <p>
                      No ownership, license, assignment, or usage rights are granted or implied beyond those 
                      expressly stated herein. All rights are expressly reserved by CTOguy.ai.
                    </p>
                  </div>
                </section>
              </RevealOnScroll>

              {/* Prior Inventions & Reservation of Rights */}
              <RevealOnScroll delay={0.2}>
                <section className="glass p-8 rounded-2xl">
                  <h2 className="text-2xl font-bold text-cyan mb-6">
                    Prior Inventions & Reservation of Rights
                  </h2>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      Certain systems, tools, frameworks, methodologies, and technical architectures referenced 
                      or demonstrated on this site constitute prior inventions and independently developed works 
                      owned by CTOguy.ai.
                    </p>
                    <p>
                      These works were created without reliance on any third-party confidential information, 
                      proprietary data, trade secrets, equipment, facilities, or internal systems and are 
                      expressly excluded from any implied assignment, license, or transfer of ownership.
                    </p>
                    <p>
                      Any similarity to third-party systems, workflows, or implementations is coincidental or 
                      derived solely from publicly available knowledge, general industry practices, or independent 
                      development.
                    </p>
                    <p>
                      All rights, title, and interest in these prior inventions are and shall remain the 
                      exclusive property of CTOguy.ai.
                    </p>
                  </div>
                </section>
              </RevealOnScroll>

              {/* Non-Affiliation & No Endorsement Disclaimer */}
              <RevealOnScroll delay={0.3}>
                <section className="glass p-8 rounded-2xl">
                  <h2 className="text-2xl font-bold text-cyan mb-6">
                    Non-Affiliation & No Endorsement Disclaimer
                  </h2>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      CTOguy.ai operates as an independent technology platform.
                    </p>
                    <p>
                      Nothing on this site shall be construed as an affiliation with, endorsement by, 
                      sponsorship from, or representation of any third party, including manufacturers, 
                      distributors, resellers, service providers, or other organizations.
                    </p>
                    <p>
                      Any references to industries, use cases, equipment categories, or operational 
                      environments are provided solely for illustrative and educational purposes and do 
                      not imply any business relationship or authorization.
                    </p>
                  </div>
                </section>
              </RevealOnScroll>

              {/* Demonstration, Video & Visual Materials Notice */}
              <RevealOnScroll delay={0.4}>
                <section className="glass p-8 rounded-2xl">
                  <h2 className="text-2xl font-bold text-cyan mb-6">
                    Demonstration, Video & Visual Materials Notice
                  </h2>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      All demonstrations, videos, screen recordings, visual assets, and system walkthroughs 
                      displayed on this site reflect independent CTOguy.ai systems operating on non-proprietary, 
                      synthetic, anonymized, or owner-controlled data.
                    </p>
                    <p>
                      No confidential, proprietary, or internal systems of any third party are displayed.
                    </p>
                    <p>
                      Demonstrations are provided for informational and illustrative purposes only and do not 
                      represent live production environments, deployed customer systems, or proprietary 
                      implementations belonging to any other entity.
                    </p>
                  </div>
                </section>
              </RevealOnScroll>

              {/* Privacy & Data Use Policy */}
              <RevealOnScroll delay={0.5}>
                <section className="glass p-8 rounded-2xl">
                  <h2 className="text-2xl font-bold text-cyan mb-6">
                    Privacy & Data Use Policy (System-Specific)
                  </h2>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      CTOguy.ai does not collect, store, process, or display confidential or proprietary 
                      information belonging to any third party.
                    </p>
                    <p>
                      All data presented in demonstrations, screenshots, videos, or system outputs is either:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Owned by CTOguy.ai</li>
                      <li>Synthetic or simulated</li>
                      <li>Anonymized</li>
                      <li>Publicly available</li>
                      <li>Or used with appropriate authorization</li>
                    </ul>
                    <p>
                      CTOguy.ai does not knowingly use or disclose personally identifiable information, 
                      customer records, vendor data, or protected business information belonging to other entities.
                    </p>
                    <p>
                      If you believe any content on this site inadvertently reflects protected information, 
                      please contact CTOguy.ai for prompt review and, if appropriate, removal.
                    </p>
                  </div>
                </section>
              </RevealOnScroll>

              {/* Final Statement */}
              <RevealOnScroll delay={0.6}>
                <section className="glass p-8 rounded-2xl border border-cyan/30">
                  <div className="text-center">
                    <p className="text-lg text-foreground font-semibold">
                      All systems and materials displayed are independently developed and exclusively owned by CTOguy.ai.
                    </p>
                  </div>
                </section>
              </RevealOnScroll>

              {/* Exclusion Notice */}
              <RevealOnScroll delay={0.7}>
                <section className="glass p-8 rounded-2xl bg-muted/20">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground italic">
                      These systems are excluded from the scope of any Agreement made with a business, person, or employer.
                    </p>
                  </div>
                </section>
              </RevealOnScroll>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default TermsPage;

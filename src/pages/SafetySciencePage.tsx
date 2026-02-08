import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Shield, Layers, Thermometer, MapPin, Gauge, CheckSquare, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const SafetySciencePage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const materialComparison = [
    {
      type: 'Rubber (PIP/Tiles)',
      mechanism: 'Compression',
      description: 'These elastic surfaces act like a mechanical spring, temporarily squishing to soak up energy.',
      maintenance: 'Check for cracking and UV degradation'
    },
    {
      type: 'Engineered Wood Fiber',
      mechanism: 'Dispersion',
      description: 'Loose particles slide against each other, using friction to convert fall energy into heat.',
      maintenance: 'Requires frequent raking to maintain depth'
    },
    {
      type: 'Synthetic Turf',
      mechanism: 'Hybrid',
      description: 'Combines blade friction with compression from specialized shock pad underlay.',
      maintenance: 'Monitor infill levels and pad condition'
    },
  ];

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        
        <div className="pt-24 pb-20">
          {/* Hero Section */}
          <section className="container mx-auto px-4 mb-16">
            <RevealOnScroll>
              <div className="text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-cyan/10 border border-cyan/30 rounded-full px-4 py-2 mb-6">
                  <Shield className="w-4 h-4 text-cyan" />
                  <span className="text-sm text-cyan font-medium">Material Science Primer</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  The Physics of a{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan via-cyan-400 to-blue-500">
                    Safe Landing
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                  Understanding the science behind playground safety—from impact attenuation to the 
                  "Winter Paradox"—to make informed decisions about your facilities.
                </p>
              </div>
            </RevealOnScroll>
          </section>

          {/* Section 1: Impact Attenuation */}
          <section className="container mx-auto px-4 mb-16">
            <RevealOnScroll>
              <div className="max-w-4xl mx-auto glass rounded-2xl p-8 md:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-cyan/10 rounded-xl flex-shrink-0">
                    <Shield className="w-8 h-8 text-cyan" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">1. The Hidden Protector</h2>
                    <p className="text-cyan font-medium">Understanding Impact Attenuation</p>
                  </div>
                </div>
                
                <div className="space-y-6 text-muted-foreground">
                  <p className="text-lg">
                    While a playground is a place of movement and joy, the surface beneath is a sophisticated 
                    piece of safety engineering. Its primary role is <strong className="text-foreground">impact attenuation</strong>—the 
                    ability to absorb and dissipate the kinetic energy generated during a fall.
                  </p>
                  
                  <p className="text-lg">
                    Think of it like a baseball catcher's mitt: the ground's job is to "catch" a falling child, 
                    slowing them down gradually so the energy doesn't all go into their body at once.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-card/50 rounded-xl p-6 border border-border">
                      <h3 className="text-xl font-bold text-foreground mb-3">Peak G</h3>
                      <p>The maximum acceleration (shock) experienced during an impact. Think of it as the "thump." 
                      <strong className="text-cyan"> Lower Peak G values indicate a softer, safer landing.</strong></p>
                    </div>
                    <div className="bg-card/50 rounded-xl p-6 border border-border">
                      <h3 className="text-xl font-bold text-foreground mb-3">HIC (Head Injury Criterion)</h3>
                      <p>Evaluates the likelihood of head injury by measuring not just force, but 
                      <strong className="text-cyan"> the duration of energy transfer</strong>. A safe surface prevents 
                      energy from transferring in a sharp, sudden burst.</p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* Section 2: Material Mechanics */}
          <section className="container mx-auto px-4 mb-16">
            <RevealOnScroll>
              <div className="max-w-4xl mx-auto glass rounded-2xl p-8 md:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-cyan/10 rounded-xl flex-shrink-0">
                    <Layers className="w-8 h-8 text-cyan" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">2. Compression vs. Dispersion</h2>
                    <p className="text-cyan font-medium">How Materials Manage Force</p>
                  </div>
                </div>

                <p className="text-lg text-muted-foreground mb-8">
                  Different materials use different mechanical principles to manage the energy of a fall. 
                  Most playground surfaces handle impact through either compression or dispersion.
                </p>

                <div className="space-y-4">
                  {materialComparison.map((material, index) => (
                    <div key={index} className="bg-card/50 rounded-xl p-6 border border-border">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="md:w-1/4">
                          <h3 className="text-lg font-bold text-foreground">{material.type}</h3>
                          <span className="text-sm text-cyan font-medium">{material.mechanism}</span>
                        </div>
                        <div className="md:w-1/2">
                          <p className="text-muted-foreground">{material.description}</p>
                        </div>
                        <div className="md:w-1/4">
                          <p className="text-sm text-muted-foreground italic">{material.maintenance}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 bg-cyan/10 rounded-xl border border-cyan/30">
                  <h4 className="font-bold text-foreground mb-2">The "So What?" of Maintenance</h4>
                  <p className="text-muted-foreground">
                    Because Engineered Wood Fiber (EWF) relies on particles sliding against one another, 
                    it is a "loose-fill" material. When children run, jump, or land, they physically push 
                    particles away from the impact site. Without frequent leveling (raking it back into place), 
                    the layer becomes too thin to provide adequate friction, leaving hard ground exposed.
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* Section 3: Temperature Effects */}
          <section className="container mx-auto px-4 mb-16">
            <RevealOnScroll>
              <div className="max-w-4xl mx-auto glass rounded-2xl p-8 md:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-cyan/10 rounded-xl flex-shrink-0">
                    <Thermometer className="w-8 h-8 text-cyan" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">3. The Thermometer of Safety</h2>
                    <p className="text-cyan font-medium">Temperature and Elasticity</p>
                  </div>
                </div>

                <p className="text-lg text-muted-foreground mb-8">
                  A surface that is safe in the mild air of April may become a hard hazard in the freezing 
                  winds of January. Environmental exposure changes the material's physics at a molecular level.
                </p>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-card/50 rounded-xl p-6 border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-3">☀️ Heat</h3>
                    <p className="text-muted-foreground text-sm">
                      High temperatures temporarily soften rubber. However, long-term UV exposure causes 
                      chemical bonds to break, leading to cracking and brittleness.
                    </p>
                  </div>
                  <div className="bg-card/50 rounded-xl p-6 border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-3">❄️ Cold</h3>
                    <p className="text-muted-foreground text-sm">
                      Rubber undergoes loss of polymer chain mobility. Molecules "stiffen up" and can't 
                      move past each other, significantly increasing Peak G and HIC readings.
                    </p>
                  </div>
                  <div className="bg-card/50 rounded-xl p-6 border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-3">🌧️ Rain/Moisture</h3>
                    <p className="text-muted-foreground text-sm">
                      For wood fiber, water causes particles to stick together and compact. Once compacted, 
                      fibers can no longer slide to create the friction needed for energy dispersion.
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-destructive/10 rounded-xl border border-destructive/30">
                  <h4 className="font-bold text-foreground mb-2">⚠️ The Winter Paradox</h4>
                  <p className="text-muted-foreground">
                    A playground can pass every safety test in the spring but fail miserably in the winter. 
                    Because a surface's safety is a "moving target" that changes with the thermometer, 
                    <strong className="text-foreground"> safety engineers must plan for worst-case weather scenarios, not just the best.</strong>
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* Section 4: High-Risk Zones */}
          <section className="container mx-auto px-4 mb-16">
            <RevealOnScroll>
              <div className="max-w-4xl mx-auto glass rounded-2xl p-8 md:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-cyan/10 rounded-xl flex-shrink-0">
                    <MapPin className="w-8 h-8 text-cyan" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">4. The Geography of Risk</h2>
                    <p className="text-cyan font-medium">Identifying High-Impact Zones</p>
                  </div>
                </div>

                <p className="text-lg text-muted-foreground mb-8">
                  Not every square inch of a playground wears down at the same rate. Professionals use 
                  impact testing to identify "High-Risk Zones" where the physics of play is most intense.
                </p>

                <div className="space-y-4 mb-8">
                  <div className="bg-card/50 rounded-xl p-6 border border-border flex items-start gap-4">
                    <span className="text-2xl">🎢</span>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Beneath Swings</h3>
                      <p className="text-muted-foreground">
                        These areas endure repeated, high-velocity impacts from children jumping or falling 
                        while in a pendulum motion.
                      </p>
                    </div>
                  </div>
                  <div className="bg-card/50 rounded-xl p-6 border border-border flex items-start gap-4">
                    <span className="text-2xl">🛝</span>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Base of Slides</h3>
                      <p className="text-muted-foreground">
                        High-speed landing zone. Constant mechanical abrasion (scuffing) from feet landing 
                        in the same spot thins the material.
                      </p>
                    </div>
                  </div>
                  <div className="bg-card/50 rounded-xl p-6 border border-border flex items-start gap-4">
                    <span className="text-2xl">🧗</span>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Around Climbing Frames</h3>
                      <p className="text-muted-foreground">
                        Falls occur from the greatest heights here, so the surface must be at peak 
                        attenuation capacity to handle increased kinetic energy.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-cyan/10 rounded-xl border border-cyan/30">
                  <h4 className="font-bold text-foreground mb-2">💡 Actionable Insight</h4>
                  <p className="text-muted-foreground">
                    By focusing scientific testing on these zones, organizations can perform targeted repairs. 
                    Instead of the massive cost of replacing an entire field of rubber, they can reinforce or 
                    "top off" specific high-wear areas—<strong className="text-cyan">saving thousands of dollars 
                    while maintaining a high safety ceiling.</strong>
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* Section 5: Testing Standards */}
          <section className="container mx-auto px-4 mb-16">
            <RevealOnScroll>
              <div className="max-w-4xl mx-auto glass rounded-2xl p-8 md:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-cyan/10 rounded-xl flex-shrink-0">
                    <Gauge className="w-8 h-8 text-cyan" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">5. Monitoring the Science</h2>
                    <p className="text-cyan font-medium">Testing, Standards, and Compliance</p>
                  </div>
                </div>

                <p className="text-lg text-muted-foreground mb-8">
                  To verify that a surface meets the "legal blueprint" of safety, engineers use systems 
                  like the Triax, which drop a sensor-filled "missile" to simulate a human head impact.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-card/50 rounded-xl p-6 border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-3">Portable Testers (e.g., GfactorGO)</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      Lightweight and fast; perfect for rapid site checks and seasonal "Daily Dozen" maintenance.
                    </p>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full">Flexibility</span>
                  </div>
                  <div className="bg-card/50 rounded-xl p-6 border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-3">Fully Compliant (Tripod) Systems</h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      Fixed-height drops ensure data meets strict ASTM standards. Required for formal audits 
                      and new installation certification.
                    </p>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full">Repeatability</span>
                  </div>
                </div>

                <div className="p-6 bg-card/50 rounded-xl border border-border">
                  <h4 className="font-bold text-foreground mb-4">Key ASTM Standards</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-cyan" />
                      <span className="text-muted-foreground">ASTM F1292 - Impact Attenuation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-cyan" />
                      <span className="text-muted-foreground">ASTM F3313 - Field Testing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-cyan" />
                      <span className="text-muted-foreground">ASTM F1487 - Equipment Safety</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-cyan" />
                      <span className="text-muted-foreground">CPSC Handbook for Public Playgrounds</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-cyan/10 rounded-xl border border-cyan/30">
                  <h4 className="font-bold text-foreground mb-2">📊 The Safety Investment</h4>
                  <p className="text-muted-foreground">
                    With over 200,000 playground injuries occurring annually, data is a shield. By tracking 
                    Peak G trends over months and years, our AI can predict exactly when a surface will 
                    become unsafe—<strong className="text-cyan">before an injury ever occurs.</strong>
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* Checklist Section */}
          <section className="container mx-auto px-4 mb-16">
            <RevealOnScroll>
              <div className="max-w-4xl mx-auto glass rounded-2xl p-8 md:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-cyan/10 rounded-xl flex-shrink-0">
                    <CheckSquare className="w-8 h-8 text-cyan" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">6. Your Safety Checklist</h2>
                    <p className="text-cyan font-medium">For Aspiring Safety Engineers</p>
                  </div>
                </div>

                <p className="text-lg text-muted-foreground mb-8">
                  Next time you visit a playground, use this checklist to see the material science of safety in action:
                </p>

                <div className="space-y-4">
                  {[
                    'Classify the Mechanics: Is the surface a spring (rubber) or a crumple zone (wood fiber)?',
                    'Inspect the Scuff Zones: Look at the base of slides. Is there visible thinning or "mechanical abrasion"?',
                    'Assess the "Winter Paradox": If it\'s cold, stomp on the surface. Does it feel like concrete?',
                    'Check the Leveling: On wood fiber, has the material been raked recently to prevent compaction?',
                    'Look for Evidence: Scan for certification stickers or date tags from the last professional audit.',
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-card/50 rounded-lg border border-border">
                      <div className="w-6 h-6 rounded border-2 border-cyan flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-cyan font-bold">{index + 1}</span>
                      </div>
                      <p className="text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* CTA Section */}
          <section className="container mx-auto px-4">
            <RevealOnScroll>
              <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-cyan/10 via-cyan/5 to-cyan/10 border border-cyan/30 rounded-2xl p-12">
                <h2 className="text-3xl font-bold mb-4">Ready to Apply This Science?</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Let our AI analyze your playground photos and provide instant safety assessments 
                  based on these material science principles.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/contact">
                    <Button className="bg-cyan hover:bg-cyan/90 text-background font-semibold px-8 py-4 gap-2">
                      Get Free Assessment
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/services">
                    <Button variant="outline" className="border-cyan text-cyan hover:bg-cyan/10 px-8 py-4">
                      View Platform
                    </Button>
                  </Link>
                </div>
              </div>
            </RevealOnScroll>
          </section>
        </div>
        
        <Footer />
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default SafetySciencePage;

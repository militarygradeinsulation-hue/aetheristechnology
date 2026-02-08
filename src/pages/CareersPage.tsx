import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Briefcase, Shield, Users, Code, DollarSign, Award, Zap } from 'lucide-react';

interface JobPosition {
  title: string;
  icon: React.ReactNode;
  description: string;
  responsibilities: string[];
  requirements: string[];
}

const positions: JobPosition[] = [
  {
    title: 'CPSI Safety Inspector',
    icon: <Shield className="w-8 h-8 text-cyan" />,
    description: 'Conduct on-site playground safety assessments using Triax testing equipment and AI-powered photo analysis. Train clients on inspection procedures and help them maintain ASTM/CPSC compliance.',
    responsibilities: [
      'Perform on-site Triax impact testing and document results',
      'Conduct photo-based AI safety assessments and explain findings',
      'Train park staff and school personnel on daily inspection procedures',
      'Identify high-risk zones and prioritize maintenance recommendations',
      'Support clients through ASTM audit preparation',
      'Build relationships with parks departments and school districts'
    ],
    requirements: [
      'CPSI (Certified Playground Safety Inspector) certification required',
      'Experience with playground safety standards (ASTM F1292, F3313, F1487)',
      'Strong communication skills to explain technical concepts clearly',
      'Valid driver\'s license and ability to travel within Indiana',
      'Physical ability to conduct on-site inspections in various weather conditions'
    ]
  },
  {
    title: 'Recreation Industry Account Manager',
    icon: <Users className="w-8 h-8 text-cyan" />,
    description: 'Manage relationships with parks departments, school districts, and recreation facilities. Present our AI safety platform to boards and councils, and help clients maximize the value of their safety programs.',
    responsibilities: [
      'Develop and maintain relationships with key accounts (parks depts, school districts)',
      'Present platform capabilities and ROI to boards and budget committees',
      'Coordinate between clients and our technical/inspection teams',
      'Identify expansion opportunities within existing accounts',
      'Gather client feedback to improve platform features',
      'Meet and exceed quarterly revenue and retention targets'
    ],
    requirements: [
      'Proven experience in B2B account management, preferably in recreation or government',
      'Understanding of public sector procurement and budget cycles',
      'Excellent presentation skills for board and council meetings',
      'Experience with CRM platforms and pipeline management',
      'Passion for child safety and community recreation'
    ]
  },
  {
    title: 'AI/ML Engineer - Safety Systems',
    icon: <Code className="w-8 h-8 text-cyan" />,
    description: 'Build and improve our computer vision models that detect playground safety hazards from photos. Develop predictive analytics for surface degradation and work on our compliance tracking platform.',
    responsibilities: [
      'Develop and train computer vision models for hazard detection',
      'Improve AI accuracy for identifying accessibility issues, surface wear, and hardware problems',
      'Build predictive models correlating weather, usage, and surface degradation',
      'Integrate with Triax testing data and compliance databases',
      'Optimize model performance for real-time photo analysis',
      'Collaborate with safety inspectors to validate model accuracy'
    ],
    requirements: [
      'Strong experience with computer vision (PyTorch, TensorFlow, or similar)',
      'Experience with object detection and image classification',
      'Familiarity with cloud platforms (AWS, GCP) for ML deployment',
      'Python proficiency and experience with ML pipelines',
      'Interest in applying AI to real-world safety problems',
      'Bonus: Understanding of playground safety standards or material science'
    ]
  }
];

const CareersPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

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
                  <Briefcase className="w-4 h-4 text-cyan" />
                  <span className="text-sm text-cyan font-medium">Join Our Team</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  Protect Children Through{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan via-cyan-400 to-blue-500">
                    AI Safety Technology
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                  We're building the premier AI-powered safety platform for the playground and recreation industry. 
                  Join us in preventing injuries and protecting communities.
                </p>
              </div>
            </RevealOnScroll>
          </section>

          {/* Compensation Highlight */}
          <section className="container mx-auto px-4 mb-16">
            <RevealOnScroll>
              <div className="max-w-4xl mx-auto bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-cyan/10 rounded-xl">
                      <DollarSign className="w-10 h-10 text-cyan" />
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold mb-2">Competitive Compensation</h2>
                    <p className="text-muted-foreground">
                      <span className="text-foreground font-semibold">Salary based on experience</span> — 
                      We value your expertise and compensate accordingly. Plus, earn{' '}
                      <span className="text-cyan font-semibold">monthly performance bonuses</span> for 
                      exceeding safety and revenue targets.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-cyan/10 rounded-xl">
                      <Award className="w-10 h-10 text-cyan" />
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* Positions */}
          <section className="container mx-auto px-4 mb-16">
            <RevealOnScroll>
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                Open Positions
              </h2>
            </RevealOnScroll>
            
            <div className="max-w-5xl mx-auto space-y-8">
              {positions.map((position, index) => (
                <RevealOnScroll key={position.title} delay={index * 0.1}>
                  <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 hover:border-cyan/50 transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-start gap-6 mb-6">
                      <div className="p-4 bg-cyan/10 rounded-xl shrink-0">
                        {position.icon}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-3">{position.title}</h3>
                        <p className="text-muted-foreground">{position.description}</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8 mt-6">
                      <div>
                        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-cyan" />
                          What You'll Do
                        </h4>
                        <ul className="space-y-2">
                          {position.responsibilities.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-muted-foreground">
                              <span className="text-cyan mt-1.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-cyan" />
                          What We're Looking For
                        </h4>
                        <ul className="space-y-2">
                          {position.requirements.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-muted-foreground">
                              <span className="text-cyan mt-1.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-cyan" />
                            Salary based on experience
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-4 h-4 text-cyan" />
                            Monthly performance bonus
                          </span>
                        </div>
                        <a
                          href={`mailto:aetheris.technology@outlook.com?subject=Application%20-%20${encodeURIComponent(position.title)}&body=${encodeURIComponent(`Hi PlaySafe AI Team,\n\nI am interested in the ${position.title} position.\n\nPlease find my resume attached.\n\nName:\nPhone:\nLinkedIn:\n\nBrief Introduction:\n\n\nThank you for considering my application.\n\nBest regards`)}`}
                          className="inline-flex items-center justify-center gap-2 bg-cyan hover:bg-cyan/90 text-background font-semibold px-6 py-3 rounded-lg transition-colors"
                        >
                          Apply Now
                        </a>
                      </div>
                    </div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="container mx-auto px-4">
            <RevealOnScroll>
              <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-cyan/10 via-cyan/5 to-cyan/10 border border-cyan/30 rounded-2xl p-12">
                <h2 className="text-3xl font-bold mb-4">Don't See Your Role?</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                  We're always looking for passionate individuals who care about child safety and recreation. 
                  Send us your resume and tell us how you can contribute.
                </p>
                <a
                  href={`mailto:aetheris.technology@outlook.com?subject=General%20Career%20Inquiry&body=${encodeURIComponent(`Hi PlaySafe AI Team,\n\nI am interested in joining your team.\n\nPlease find my resume attached.\n\nName:\nPhone:\nLinkedIn:\n\nHow I can contribute:\n\n\nThank you for your time.\n\nBest regards`)}`}
                  className="inline-flex items-center gap-2 bg-card border border-cyan hover:bg-cyan/10 text-cyan font-semibold px-8 py-4 rounded-lg transition-colors"
                >
                  Get in Touch
                </a>
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

export default CareersPage;

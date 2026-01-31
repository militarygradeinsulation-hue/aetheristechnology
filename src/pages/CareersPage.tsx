import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Briefcase, TrendingUp, Users, Code, DollarSign, Award, Zap } from 'lucide-react';

interface JobPosition {
  title: string;
  icon: React.ReactNode;
  description: string;
  responsibilities: string[];
  requirements: string[];
}

const positions: JobPosition[] = [
  {
    title: 'Sales Representative',
    icon: <TrendingUp className="w-8 h-8 text-cyan" />,
    description: 'Drive revenue growth by connecting businesses with our AI automation solutions. You\'ll be the first point of contact for potential clients, understanding their needs and demonstrating how our technology can transform their operations.',
    responsibilities: [
      'Identify and qualify prospective clients through outbound outreach and inbound leads',
      'Conduct discovery calls and product demonstrations tailored to client needs',
      'Develop and maintain a robust sales pipeline using CRM tools',
      'Collaborate with the team to refine sales strategies and messaging',
      'Meet and exceed monthly and quarterly sales targets',
      'Build long-term relationships with clients to ensure satisfaction and retention'
    ],
    requirements: [
      'Proven track record in B2B sales, preferably in SaaS or technology',
      'Excellent communication and presentation skills',
      'Self-motivated with a hunter mentality',
      'Experience with CRM platforms (Salesforce, HubSpot, etc.)',
      'Ability to understand and articulate technical solutions to non-technical audiences'
    ]
  },
  {
    title: 'CRM Manager',
    icon: <Users className="w-8 h-8 text-cyan" />,
    description: 'Own and optimize our customer relationship management systems to drive efficiency, data quality, and actionable insights. You\'ll ensure our sales and customer success teams have the tools and data they need to excel.',
    responsibilities: [
      'Design, implement, and maintain CRM workflows and automation',
      'Ensure data integrity and hygiene across all customer touchpoints',
      'Create dashboards and reports for sales performance and customer analytics',
      'Train team members on CRM best practices and new features',
      'Integrate CRM with marketing automation, support, and other business tools',
      'Analyze customer data to identify trends, opportunities, and areas for improvement'
    ],
    requirements: [
      'Proven experience managing CRM platforms (Salesforce, HubSpot, Zoho, etc.)',
      'Strong analytical skills and experience with data visualization',
      'Understanding of sales processes and customer lifecycle management',
      'Experience with API integrations and automation tools',
      'Excellent organizational and project management skills'
    ]
  },
  {
    title: 'SaaS Builder / Product Developer',
    icon: <Code className="w-8 h-8 text-cyan" />,
    description: 'Build and scale innovative SaaS products that power our AI automation platform. You\'ll work at the intersection of cutting-edge technology and real-world business problems, creating solutions that help businesses operate smarter.',
    responsibilities: [
      'Design, develop, and deploy scalable SaaS applications and features',
      'Collaborate with product and design teams to translate requirements into technical solutions',
      'Build robust APIs, integrations, and automation workflows',
      'Implement AI/ML features and integrate with LLM-based systems',
      'Ensure code quality through testing, code reviews, and best practices',
      'Monitor and optimize application performance and reliability'
    ],
    requirements: [
      'Strong experience with modern web technologies (React, TypeScript, Node.js)',
      'Experience building and deploying SaaS products at scale',
      'Familiarity with cloud platforms (AWS, GCP, or Azure) and serverless architectures',
      'Understanding of AI/ML concepts and experience with AI APIs',
      'Experience with databases (PostgreSQL, MongoDB, etc.) and API design',
      'Passion for building products that solve real business problems'
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
                  Build the Future of{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan via-cyan-400 to-blue-500">
                    AI Automation
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                  We're looking for driven individuals who want to revolutionize how businesses operate. 
                  Join us in building intelligent systems that work while the world sleeps.
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
                      <span className="text-cyan font-semibold">monthly performance bonuses</span> on top 
                      of your base salary for exceeding targets.
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
                          href={`mailto:aetheris.technology@outlook.com?subject=Application%20-%20${encodeURIComponent(position.title)}&body=${encodeURIComponent(`Hi Aetheris Team,\n\nI am interested in the ${position.title} position.\n\nPlease find my resume attached.\n\nName:\nPhone:\nLinkedIn:\n\nBrief Introduction:\n\n\nThank you for considering my application.\n\nBest regards`)}`}
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
                  We're always looking for talented individuals who are passionate about AI and automation. 
                  Send us your resume and tell us how you can contribute.
                </p>
                <a
                  href={`mailto:aetheris.technology@outlook.com?subject=General%20Career%20Inquiry&body=${encodeURIComponent(`Hi Aetheris Team,\n\nI am interested in joining your team.\n\nPlease find my resume attached.\n\nName:\nPhone:\nLinkedIn:\n\nHow I can contribute:\n\n\nThank you for your time.\n\nBest regards`)}`}
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

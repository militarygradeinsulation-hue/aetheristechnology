import React from 'react';
import { Brain, Code, Database, Sparkles, Zap, Bot, ArrowUpRight, Target, Layers, Building2, Package, UtensilsCrossed, HardHat, Heart, Wrench } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import crmDemoVideo from '@/assets/crm-demo-video.mp4';
import leadGeneratorImg from '@/assets/lead-generator.jpg';
import corporateImg from '@/assets/industry-corporate.jpg';
import logisticsImg from '@/assets/industry-logistics.jpg';
import restaurantImg from '@/assets/industry-restaurant.jpg';
import constructionImg from '@/assets/industry-construction.jpg';
import healthcareImg from '@/assets/industry-healthcare.jpg';
import automotiveImg from '@/assets/industry-automotive.jpg';

export const Services: React.FC = () => {
  const services = [
    {
      icon: Brain,
      title: 'ML Strategy & Advisory',
      description: 'We assess your data landscape and recommend the right ML approach. From feasibility studies to model selection guidance.',
      features: ['Needs Assessment', 'Model Strategy', 'Data Readiness Audit'],
    },
    {
      icon: Bot,
      title: 'Automation Consulting',
      description: 'We identify automation opportunities in your operations and design intelligent workflows tailored to your team.',
      features: ['Process Mapping', 'Workflow Design', 'ROI Analysis'],
    },
    {
      icon: Code,
      title: 'AI Implementation Advisory',
      description: 'Hands-on guidance through every phase of your AI project—from architecture to deployment and beyond.',
      features: ['Architecture Review', 'Vendor Evaluation', 'Implementation Roadmap'],
    },
    {
      icon: Database,
      title: 'Data Strategy Consulting',
      description: 'We help you build a data-driven culture with the right infrastructure, governance, and analytics strategy.',
      features: ['Data Governance', 'Analytics Strategy', 'Infrastructure Planning'],
    },
    {
      icon: Sparkles,
      title: 'AI Transformation Strategy',
      description: 'End-to-end strategic guidance for your AI journey. We help leadership teams make confident, informed decisions.',
      features: ['Executive Workshops', 'Technology Roadmap', 'Change Management'],
    },
    {
      icon: Zap,
      title: 'Performance & Optimization',
      description: 'We audit your existing AI systems and recommend improvements for speed, accuracy, and cost efficiency.',
      features: ['System Audit', 'Optimization Plan', 'Cost Analysis'],
    },
  ];

  const industries = [
    {
      title: 'Corporate & Enterprise',
      description: 'AI-powered forecasting, analytics dashboards, and business intelligence systems',
      image: corporateImg,
      icon: Building2,
      solutions: ['Predictive Analytics', 'Business Intelligence', 'Process Automation'],
    },
    {
      title: 'Logistics & Warehousing',
      description: 'Real-time delivery route optimization and inventory management systems',
      image: logisticsImg,
      icon: Package,
      solutions: ['Route Optimization', 'Inventory Management', 'Supply Chain AI'],
    },
    {
      title: 'Food Service & Hospitality',
      description: 'Kitchen display systems, order management, and customer flow automation',
      image: restaurantImg,
      icon: UtensilsCrossed,
      solutions: ['Order Management', 'Kitchen Automation', 'Customer Analytics'],
    },
    {
      title: 'Construction & Engineering',
      description: 'Project management, scheduling optimization, and resource allocation AI',
      image: constructionImg,
      icon: HardHat,
      solutions: ['Project Planning', 'Resource Management', 'Timeline Optimization'],
    },
    {
      title: 'Healthcare & Medical',
      description: 'Patient management systems, appointment scheduling, and medical record AI',
      image: healthcareImg,
      icon: Heart,
      solutions: ['Patient Management', 'Medical Records', 'Appointment Automation'],
    },
    {
      title: 'Automotive & Repair',
      description: 'Diagnostic systems, parts ordering automation, and service management',
      image: automotiveImg,
      icon: Wrench,
      solutions: ['Diagnostic Automation', 'Parts Management', 'Service Scheduling'],
    },
  ];

  return (
    <section id="services" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* CTOguy.ai Marketing Section */}
        <RevealOnScroll>
          <div className="glass p-8 rounded-xl mb-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Marketing Consulting by <a href="https://ctoguy.ai" target="_blank" rel="noopener noreferrer" className="text-cyan glow-text hover:underline">CTOguy.ai</a>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our marketing consulting practice delivers data-driven strategies and AI-powered campaigns that transform how businesses connect with their customers.
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Consulting <span className="text-cyan glow-text">Services</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Expert AI consulting to guide your business transformation from strategy to execution
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <RevealOnScroll key={service.title} delay={index * 0.1}>
              <div className="glass glass-hover p-8 rounded-xl h-full group cursor-pointer">
                <div className="mb-6">
                  <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <service.icon className="w-7 h-7 text-cyan" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-cyan transition-colors">
                  {service.title}
                </h3>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {service.description}
                </p>

                <div className="space-y-2">
                  {service.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-glow" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        {/* CRM/ERP Demo and Lead Generator Showcase */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RevealOnScroll>
            <div className="glass p-6 rounded-xl">
              <h3 className="text-2xl font-bold mb-4 text-cyan glow-text">
                CRM/ERP Consulting
              </h3>
              <p className="text-muted-foreground mb-6">
                We design and implement intelligent CRM/ERP systems tailored to your operations—guiding you from strategy through deployment.
              </p>
              <div className="rounded-lg overflow-hidden border border-border/50">
                <video 
                  controls 
                  className="w-full h-auto"
                  preload="metadata"
                >
                  <source src={crmDemoVideo} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.2}>
            <div className="glass p-6 rounded-xl">
              <h3 className="text-2xl font-bold mb-4 text-cyan glow-text">
                Lead Generation Strategy
              </h3>
              <p className="text-muted-foreground mb-6">
                We build and optimize AI-powered lead generation systems that continuously discover and qualify high-value prospects for your business.
              </p>
              <div className="rounded-lg overflow-hidden border border-border/50">
                <img 
                  src={leadGeneratorImg} 
                  alt="AI Lead Generator Dashboard showing lead qualification and contact details"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* Success Stories Section */}
        <div className="mt-24">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Client <span className="text-cyan glow-text">Success Stories</span>
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Real-world results from our consulting engagements
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RevealOnScroll delay={0.1}>
              <div className="glass glass-hover p-8 rounded-xl group cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/10 rounded-full blur-3xl group-hover:bg-cyan/20 transition-colors" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-lg bg-primary/20 border border-cyan/20">
                      <Zap className="w-6 h-6 text-cyan" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan transition-colors" />
                  </div>

                  <h4 className="text-2xl font-bold mb-3 text-foreground group-hover:text-cyan transition-colors">
                    Marketing Automation Hub
                  </h4>
                  
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Advised on comprehensive multi-channel marketing automation strategy, delivering 250% ROI improvement for enterprise clients
              </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Marketing Automation
                    </span>
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      AI Strategy
                    </span>
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Analytics
                    </span>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.2}>
              <div className="glass glass-hover p-8 rounded-xl group cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/10 rounded-full blur-3xl group-hover:bg-cyan/20 transition-colors" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-lg bg-primary/20 border border-cyan/20">
                      <Target className="w-6 h-6 text-cyan" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan transition-colors" />
                  </div>

                  <h4 className="text-2xl font-bold mb-3 text-foreground group-hover:text-cyan transition-colors">
                    Custom CRM Development
                  </h4>
                  
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Designed and guided implementation of enterprise-grade CRM systems with automated quote generation and pipeline management
              </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      CRM
                    </span>
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Sales Automation
                    </span>
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Business Intelligence
                    </span>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.3}>
              <div className="glass glass-hover p-8 rounded-xl group cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/10 rounded-full blur-3xl group-hover:bg-cyan/20 transition-colors" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-lg bg-primary/20 border border-cyan/20">
                      <Layers className="w-6 h-6 text-cyan" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan transition-colors" />
                  </div>

                  <h4 className="text-2xl font-bold mb-3 text-foreground group-hover:text-cyan transition-colors">
                    AI Vision Studio
                  </h4>
                  
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Consulted on next-gen perspective analysis capabilities, transforming how businesses understand visual data and spatial relationships
              </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Computer Vision
                    </span>
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      AI Analysis
                    </span>
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Data Intelligence
                    </span>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>

        {/* Portfolio Section */}
        <div className="mt-16">
          <RevealOnScroll>
            <div className="glass glass-hover p-8 rounded-xl text-center group">
              <h3 className="text-2xl font-bold mb-4 text-foreground">
                Explore Our <span className="text-cyan glow-text">Portfolio</span>
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                See our AI tools and solutions in action. Visit our portfolio to explore the Aetheris Toolbox.
              </p>
              <a 
                href="https://aetheristoolbox.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan/20 border border-cyan/30 rounded-lg text-cyan font-semibold hover:bg-cyan/30 transition-colors group-hover:scale-105 transition-transform"
              >
                View Aetheris Toolbox
                <ArrowUpRight className="w-5 h-5" />
              </a>
            </div>
          </RevealOnScroll>
        </div>

        {/* Industries We Transform Section */}
        <div className="mt-24">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Industries We <span className="text-cyan glow-text">Transform</span>
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Expert AI consulting tailored to your industry's unique challenges
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((industry, index) => (
              <RevealOnScroll key={industry.title} delay={index * 0.1}>
                <div className="glass glass-hover rounded-xl overflow-hidden group h-full flex flex-col">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={industry.image}
                      alt={`${industry.title} - AI automation and business intelligence`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 backdrop-blur-sm border border-cyan/30 flex items-center justify-center">
                        <industry.icon className="w-6 h-6 text-cyan" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="text-2xl font-bold mb-3 text-foreground group-hover:text-cyan transition-colors">
                      {industry.title}
                    </h4>
                    
                    <p className="text-muted-foreground mb-4 flex-1">
                      {industry.description}
                    </p>

                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-cyan mb-2">Key Solutions:</div>
                      {industry.solutions.map((solution) => (
                        <div key={solution} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-glow" />
                          <span className="text-muted-foreground">{solution}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          <RevealOnScroll delay={0.6}>
            <div className="mt-12 text-center glass p-8 rounded-xl">
              <p className="text-lg text-muted-foreground mb-4">
                Don't see your industry? We provide expert AI consulting for any business sector.
              </p>
              <p className="text-cyan font-semibold">
                Every industry has unique challenges—we help you navigate them with the right AI strategy.
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
};

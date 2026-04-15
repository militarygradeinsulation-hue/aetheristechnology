import React from 'react';
import { Brain, Code, Database, Sparkles, Zap, Bot, Building2, Package, UtensilsCrossed, HardHat, Heart, Wrench } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import crmDemoVideo from '@/assets/crm-demo-video.mp4';
import leadGeneratorImg from '@/assets/lead-generator.jpg';
import luminaInteriorImg from '@/assets/lumina-interior-design.jpg';
import archiscanRenderImg from '@/assets/archiscan-render.png';
import archiscanSketchImg from '@/assets/archiscan-sketch.jpg';
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground font-display">
              Marketing Consulting by <a href="https://ctoguy.ai" target="_blank" rel="noopener noreferrer" className="text-amber glow-text hover:underline">CTOguy.ai</a>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our marketing consulting practice delivers data-driven strategies and AI-powered campaigns that transform how businesses connect with their customers.
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-display">
              Consulting <span className="text-amber glow-text">Services</span>
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
                    <service.icon className="w-7 h-7 text-amber" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-4 text-foreground group-hover:text-amber transition-colors font-display">
                  {service.title}
                </h3>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {service.description}
                </p>

                <div className="space-y-2">
                  {service.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-glow" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        {/* CRM/ERP Demo, Lead Generator & Interior Design Showcase */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <RevealOnScroll>
            <div className="glass p-6 rounded-xl h-full flex flex-col">
              <h3 className="text-2xl font-bold mb-4 text-amber glow-text font-display">
                CRM/ERP Consulting
              </h3>
              <p className="text-muted-foreground mb-6">
                We design and implement intelligent CRM/ERP systems tailored to your operations—guiding you from strategy through deployment.
              </p>
              <div className="rounded-lg overflow-hidden border border-border/50 mt-auto">
                <div style={{ padding: '75% 0 0 0', position: 'relative' }}>
                  <iframe
                    src="https://player.vimeo.com/video/1169435712?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    title="CRM/ERP System Demo"
                  />
                </div>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.2}>
            <div className="glass p-6 rounded-xl h-full flex flex-col">
              <h3 className="text-2xl font-bold mb-4 text-amber glow-text font-display">
                Lead Generation Strategy
              </h3>
              <p className="text-muted-foreground mb-6">
                We build and optimize AI-powered lead generation systems that continuously discover and qualify high-value prospects for your business.
              </p>
              <div className="rounded-lg overflow-hidden border border-border/50 mt-auto">
                <img 
                  src={leadGeneratorImg} 
                  alt="AI Lead Generator Dashboard showing lead qualification and contact details"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.4}>
            <div className="glass p-6 rounded-xl h-full flex flex-col">
              <h3 className="text-2xl font-bold mb-4 text-amber glow-text font-display">
                AI Interior Design Studio
              </h3>
              <p className="text-muted-foreground mb-6">
                For designers who want to reimagine any room—swap furniture, change styles, colors, layouts. If you can imagine it, the AI can render it.
              </p>
              <div className="rounded-lg overflow-hidden border border-border/50 mt-auto">
                <div style={{ padding: '75% 0 0 0', position: 'relative' }}>
                  <iframe
                    src="https://player.vimeo.com/video/1169432672?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    title="AI Interior Design Studio Demo"
                  />
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* ArchiScan - Architect Sketch to Render */}
        <div className="mt-12">
          <RevealOnScroll delay={0.2}>
            <div className="glass p-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-4 text-amber glow-text font-display">
                ArchiScan — AI Architectural Rendering
              </h3>
              <p className="text-muted-foreground mb-6 max-w-3xl">
                For architects who want to bring their sketches and concepts to life. Upload a hand-drawn sketch or blueprint and watch AI transform it into a photorealistic render—instantly.
              </p>
              <div className="rounded-lg overflow-hidden border border-border/50">
                <div style={{ padding: '75% 0 0 0', position: 'relative' }}>
                  <iframe
                    src="https://player.vimeo.com/video/1169435048?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    title="ArchiScan AI Architectural Rendering Demo"
                  />
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* AI Image Recoloring */}
        <div className="mt-12">
          <RevealOnScroll delay={0.3}>
            <div className="glass p-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-4 text-amber glow-text font-display">
                AI Image Recoloring
              </h3>
              <p className="text-muted-foreground mb-6 max-w-3xl">
                Instantly recolor any image with AI. Change product colors, room palettes, or branding assets in seconds—perfect for designers, marketers, and e-commerce teams.
              </p>
              <div className="rounded-lg overflow-hidden border border-border/50">
                <div style={{ padding: '75% 0 0 0', position: 'relative' }}>
                  <iframe
                    src="https://player.vimeo.com/video/1169434293?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    title="AI Image Recoloring Demo"
                  />
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>



        {/* Industries We Transform Section */}
        <div className="mt-24">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground font-display">
                Industries We <span className="text-amber glow-text">Transform</span>
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
                      <div className="w-12 h-12 rounded-lg bg-primary/20 backdrop-blur-sm border border-amber/30 flex items-center justify-center">
                        <industry.icon className="w-6 h-6 text-amber" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="text-2xl font-bold mb-3 text-foreground group-hover:text-amber transition-colors font-display">
                      {industry.title}
                    </h4>
                    
                    <p className="text-muted-foreground mb-4 flex-1">
                      {industry.description}
                    </p>

                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-amber mb-2">Key Solutions:</div>
                      {industry.solutions.map((solution) => (
                        <div key={solution} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-glow" />
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
              <p className="text-amber font-semibold">
                Every industry has unique challenges—we help you navigate them with the right AI strategy.
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
};

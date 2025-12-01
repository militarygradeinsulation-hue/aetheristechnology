import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Building2, Package, UtensilsCrossed, HardHat, Heart, Wrench } from 'lucide-react';
import corporateImg from '@/assets/industry-corporate.jpg';
import logisticsImg from '@/assets/industry-logistics.jpg';
import restaurantImg from '@/assets/industry-restaurant.jpg';
import constructionImg from '@/assets/industry-construction.jpg';
import healthcareImg from '@/assets/industry-healthcare.jpg';
import automotiveImg from '@/assets/industry-automotive.jpg';

export const IndustriesWeServe: React.FC = () => {
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
    <section className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Industries We <span className="text-cyan glow-text">Transform</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Custom AI solutions tailored to your industry's unique challenges and opportunities
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
                  <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-cyan transition-colors">
                    {industry.title}
                  </h3>
                  
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
              Don't see your industry? We specialize in custom AI solutions for any business sector.
            </p>
            <p className="text-cyan font-semibold">
              Every industry has unique challenges—we build AI that solves them.
            </p>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

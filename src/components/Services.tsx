import React from 'react';
import { Camera, Gauge, TrendingUp, Shield, ClipboardCheck, FileText, ArrowUpRight, Building2, GraduationCap, TreePine, Baby, Home, Church } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

export const Services: React.FC = () => {
  const services = [
    {
      icon: Camera,
      title: 'AI Photo Safety Scan',
      description: 'Upload a photo, receive instant safety analysis. Our AI detects accessibility issues, surface wear, hardware problems, and fall zone inadequacies.',
      features: ['Accessibility Checks', 'Surface Assessment', 'Hardware Inspection'],
    },
    {
      icon: Gauge,
      title: 'Impact Attenuation Monitoring',
      description: 'Track Peak G and HIC readings over time. Integrate with Triax testing equipment for comprehensive surface safety monitoring.',
      features: ['Triax Integration', 'Seasonal Adjustments', 'Compliance Alerts'],
    },
    {
      icon: TrendingUp,
      title: 'Predictive Maintenance',
      description: 'AI predicts when surfaces will become unsafe. Correlate wear patterns with weather to forecast maintenance needs and budget accordingly.',
      features: ['Wear Pattern Analysis', 'Weather Correlation', 'Budget Forecasting'],
    },
    {
      icon: Shield,
      title: 'Compliance Dashboard',
      description: 'Real-time ASTM/CPSC compliance tracking. Stay ahead of inspections with automated alerts and certification management.',
      features: ['ASTM F1292, F3313, F1487', 'CPSC Handbook', 'Auto-Alerts'],
    },
    {
      icon: ClipboardCheck,
      title: 'Digital Inspection Platform',
      description: 'Mobile inspection app with photo verification. Daily Dozen checklists, work order generation, and complete audit trails.',
      features: ['Daily Dozen Checklists', 'Work Order Generation', 'Audit Trails'],
    },
    {
      icon: FileText,
      title: 'Custom Reporting',
      description: 'Automated reports for boards and insurers. Demonstrate risk reduction with before/after analysis and ROI tracking.',
      features: ['Risk Reduction Metrics', 'Before/After Analysis', 'ROI Tracking'],
    },
  ];

  const industries = [
    {
      title: 'Municipal Parks Departments',
      description: 'Comprehensive playground safety management for public parks and recreation facilities',
      icon: Building2,
      solutions: ['Multi-Site Dashboard', 'Budget Planning', 'Public Reporting'],
    },
    {
      title: 'School Districts (K-12)',
      description: 'Protect students with proactive safety monitoring and compliance documentation',
      icon: GraduationCap,
      solutions: ['Student Safety', 'Liability Protection', 'Board Reports'],
    },
    {
      title: 'Private Recreation Facilities',
      description: 'Family entertainment centers, camps, and private clubs with premium safety standards',
      icon: TreePine,
      solutions: ['Premium Compliance', 'Member Safety', 'Insurance Documentation'],
    },
    {
      title: 'Childcare Centers',
      description: 'Daycare and preschool playground safety with age-appropriate equipment monitoring',
      icon: Baby,
      solutions: ['Age-Appropriate Safety', 'Parent Confidence', 'Licensing Support'],
    },
    {
      title: 'HOA/Community Associations',
      description: 'Residential community playground safety management and liability reduction',
      icon: Home,
      solutions: ['Community Protection', 'HOA Compliance', 'Resident Peace of Mind'],
    },
    {
      title: 'Churches & Religious Organizations',
      description: 'Safe play environments for congregation families and community events',
      icon: Church,
      solutions: ['Congregation Safety', 'Event Preparation', 'Volunteer Training'],
    },
  ];

  return (
    <section id="services" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Our <span className="text-cyan glow-text">Platform</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive AI-powered playground safety solutions for the recreation industry
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

        {/* Proven Results Section */}
        <div className="mt-24">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Proven <span className="text-cyan glow-text">Results</span>
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Real-world impact powered by AI safety technology
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
                      <Shield className="w-6 h-6 text-cyan" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan transition-colors" />
                  </div>

                  <h4 className="text-2xl font-bold mb-3 text-foreground group-hover:text-cyan transition-colors">
                    Injury Reduction
                  </h4>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Parks departments using AI safety monitoring report 60% reduction in playground-related injury claims within the first year.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Liability Reduction
                    </span>
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Risk Management
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
                      <TrendingUp className="w-6 h-6 text-cyan" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan transition-colors" />
                  </div>

                  <h4 className="text-2xl font-bold mb-3 text-foreground group-hover:text-cyan transition-colors">
                    Cost Savings
                  </h4>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Targeted repairs based on AI risk mapping save districts an average of 40% on surface replacement costs.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Budget Efficiency
                    </span>
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Predictive Maintenance
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
                      <Camera className="w-6 h-6 text-cyan" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan transition-colors" />
                  </div>

                  <h4 className="text-2xl font-bold mb-3 text-foreground group-hover:text-cyan transition-colors">
                    Compliance Confidence
                  </h4>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    100% of clients pass their annual ASTM audits after implementing our AI-powered compliance dashboard and documentation system.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      ASTM Compliant
                    </span>
                    <span className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">
                      Audit Ready
                    </span>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>

        {/* Industries We Serve Section */}
        <div className="mt-24">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Industries We <span className="text-cyan glow-text">Serve</span>
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Protecting children across the playground and recreation industry
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((industry, index) => (
              <RevealOnScroll key={industry.title} delay={index * 0.1}>
                <div className="glass glass-hover rounded-xl overflow-hidden group h-full flex flex-col p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 backdrop-blur-sm border border-cyan/30 flex items-center justify-center flex-shrink-0">
                      <industry.icon className="w-6 h-6 text-cyan" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-foreground group-hover:text-cyan transition-colors">
                        {industry.title}
                      </h4>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-4 flex-1">
                    {industry.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {industry.solutions.map((solution) => (
                      <span
                        key={solution}
                        className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground"
                      >
                        {solution}
                      </span>
                    ))}
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

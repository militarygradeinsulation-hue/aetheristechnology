import React, { useState } from 'react';
import { Camera, Gauge, TrendingUp, Shield, ClipboardCheck, FileText, ArrowUpRight, Sofa, Palette, Ruler, Home, HardHat, Building2, CalendarClock, CheckSquare } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

type IndustryTab = 'playground' | 'interior' | 'homebuilding';

const industryTabs: { id: IndustryTab; label: string; emoji: string }[] = [
  { id: 'playground', label: 'Playground Safety', emoji: '🛝' },
  { id: 'interior', label: 'Interior Design', emoji: '🏠' },
  { id: 'homebuilding', label: 'Home Building', emoji: '🏗️' },
];

const servicesByIndustry: Record<IndustryTab, { icon: any; title: string; description: string; features: string[] }[]> = {
  playground: [
    { icon: Camera, title: 'AI Photo Safety Scan', description: 'Upload a photo, receive instant safety analysis. Our AI detects accessibility issues, surface wear, hardware problems, and fall zone inadequacies.', features: ['Accessibility Checks', 'Surface Assessment', 'Hardware Inspection'] },
    { icon: Gauge, title: 'Impact Attenuation Monitoring', description: 'Track Peak G and HIC readings over time. Integrate with Triax testing equipment for comprehensive surface safety monitoring.', features: ['Triax Integration', 'Seasonal Adjustments', 'Compliance Alerts'] },
    { icon: TrendingUp, title: 'Predictive Maintenance', description: 'AI predicts when surfaces will become unsafe. Correlate wear patterns with weather to forecast maintenance needs.', features: ['Wear Pattern Analysis', 'Weather Correlation', 'Budget Forecasting'] },
    { icon: Shield, title: 'Compliance Dashboard', description: 'Real-time ASTM/CPSC compliance tracking. Stay ahead of inspections with automated alerts and certification management.', features: ['ASTM F1292, F3313, F1487', 'CPSC Handbook', 'Auto-Alerts'] },
    { icon: ClipboardCheck, title: 'Digital Inspection Platform', description: 'Mobile inspection app with photo verification. Daily Dozen checklists, work order generation, and complete audit trails.', features: ['Daily Dozen Checklists', 'Work Order Generation', 'Audit Trails'] },
    { icon: FileText, title: 'Custom Reporting', description: 'Automated reports for boards and insurers. Demonstrate risk reduction with before/after analysis and ROI tracking.', features: ['Risk Reduction Metrics', 'Before/After Analysis', 'ROI Tracking'] },
  ],
  interior: [
    { icon: Camera, title: 'AI Space Analysis', description: 'Upload room photos for instant analysis of dimensions, lighting quality, traffic flow patterns, and spatial optimization opportunities.', features: ['Room Dimensions', 'Lighting Analysis', 'Traffic Flow'] },
    { icon: Palette, title: 'Style Matching', description: 'AI identifies design styles, recommends complementary pieces, and generates mood boards that match your client\'s aesthetic preferences.', features: ['Style Detection', 'Mood Board Generation', 'Aesthetic Matching'] },
    { icon: Sofa, title: 'Client Visualization', description: 'Generate photorealistic room renderings showing proposed designs. Help clients see the finished space before any work begins.', features: ['Room Renderings', 'Furniture Placement', 'Color Previews'] },
    { icon: Ruler, title: 'Material Recommendations', description: 'AI suggests materials, finishes, and color palettes based on room analysis, client preferences, and current design trends.', features: ['Material Selection', 'Color Palettes', 'Trend Analysis'] },
    { icon: ClipboardCheck, title: 'Project Management', description: 'Track design projects from concept to completion. Manage timelines, vendor coordination, and client approvals.', features: ['Timeline Tracking', 'Vendor Management', 'Client Portals'] },
    { icon: FileText, title: 'Design Proposals', description: 'Auto-generate professional design proposals with AI renderings, material lists, and budget estimates.', features: ['Auto Proposals', 'Budget Estimates', 'Material Lists'] },
  ],
  homebuilding: [
    { icon: Camera, title: 'AI Construction Inspection', description: 'Upload construction photos for instant quality assessment. Identify structural issues, code violations, and workmanship defects.', features: ['Quality Assessment', 'Defect Detection', 'Photo Documentation'] },
    { icon: CalendarClock, title: 'Project Timeline Prediction', description: 'AI analyzes project data to predict delays, optimize scheduling, and keep builds on track and on budget.', features: ['Delay Prediction', 'Schedule Optimization', 'Milestone Tracking'] },
    { icon: CheckSquare, title: 'Code Compliance', description: 'Automated building code compliance checks. Stay ahead of inspections with AI-powered code analysis and documentation.', features: ['Building Codes', 'Inspection Prep', 'Violation Alerts'] },
    { icon: HardHat, title: 'Quality Assessment', description: 'AI evaluates workmanship quality from photos. Track quality trends across subcontractors and project phases.', features: ['Workmanship Scoring', 'Subcontractor Tracking', 'Quality Trends'] },
    { icon: Building2, title: 'Concept Renderings', description: 'Generate photorealistic home concept art for client presentations. Help buyers visualize custom builds before breaking ground.', features: ['Home Renderings', 'Floor Plan Viz', 'Material Previews'] },
    { icon: FileText, title: 'Builder Reports', description: 'Automated progress reports for clients, lenders, and inspectors. Professional documentation at every build stage.', features: ['Progress Reports', 'Lender Documentation', 'Photo Timelines'] },
  ],
};

const industriesList = [
  { title: 'Municipal Parks', description: 'AI safety management for public parks and recreation facilities', icon: Building2, category: 'playground' as IndustryTab },
  { title: 'Residential Design', description: 'AI-powered tools for residential interior designers and decorators', icon: Home, category: 'interior' as IndustryTab },
  { title: 'Custom Home Builders', description: 'AI inspection and project management for custom home construction', icon: HardHat, category: 'homebuilding' as IndustryTab },
  { title: 'School Districts', description: 'Playground safety monitoring for K-12 facilities', icon: Shield, category: 'playground' as IndustryTab },
  { title: 'Commercial Spaces', description: 'Office, retail, and hospitality interior design automation', icon: Sofa, category: 'interior' as IndustryTab },
  { title: 'Remodeling Contractors', description: 'AI quality assurance and project tracking for renovation projects', icon: Ruler, category: 'homebuilding' as IndustryTab },
];

export const Services: React.FC = () => {
  const [activeTab, setActiveTab] = useState<IndustryTab>('playground');

  return (
    <section id="services" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Our <span className="text-cyan glow-text">Platform</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI-powered solutions for playground safety, interior design, and home building
            </p>
          </div>
        </RevealOnScroll>

        {/* Industry Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {industryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all text-lg ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan to-primary text-white shadow-lg shadow-cyan/25'
                  : 'glass border border-border/50 text-muted-foreground hover:text-foreground hover:border-cyan/30'
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesByIndustry[activeTab].map((service, index) => (
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
                <p className="text-muted-foreground mb-6 leading-relaxed">{service.description}</p>
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

        {/* Proven Results */}
        <div className="mt-24">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <p className="text-sm text-cyan mb-2 tracking-widest">TECHNICAL BUILDS BY <a href="https://ctoguy.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan/80 transition-colors">CTOguy.ai</a></p>
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Proven <span className="text-cyan glow-text">Results</span>
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
                Real-world impact powered by AI technology across industries
              </p>
              <a href="https://aetheris.ctoguy.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-cyan hover:text-cyan/80 transition-colors font-medium">
                View Our Portfolio <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Risk Reduction', desc: 'AI-powered analysis reduces safety incidents and design errors by up to 60% within the first year of adoption.', tags: ['Liability Reduction', 'Risk Management'] },
              { icon: TrendingUp, title: 'Cost Savings', desc: 'Targeted actions based on AI analysis save clients an average of 40% on maintenance, redesign, and rework costs.', tags: ['Budget Efficiency', 'Predictive Analytics'] },
              { icon: Camera, title: 'Compliance Confidence', desc: '100% of clients pass their industry audits after implementing our AI-powered compliance and documentation systems.', tags: ['Industry Compliant', 'Audit Ready'] },
            ].map((result, index) => (
              <RevealOnScroll key={result.title} delay={index * 0.1}>
                <div className="glass glass-hover p-8 rounded-xl group cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/10 rounded-full blur-3xl group-hover:bg-cyan/20 transition-colors" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 rounded-lg bg-primary/20 border border-cyan/20">
                        <result.icon className="w-6 h-6 text-cyan" />
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan transition-colors" />
                    </div>
                    <h4 className="text-2xl font-bold mb-3 text-foreground group-hover:text-cyan transition-colors">{result.title}</h4>
                    <p className="text-muted-foreground mb-6 leading-relaxed">{result.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {result.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 text-xs rounded-full glass border border-cyan/20 text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>

        {/* Industries We Serve */}
        <div className="mt-24">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Industries We <span className="text-cyan glow-text">Serve</span>
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                AI solutions tailored for playground safety, interior design, and home building
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industriesList.map((industry, index) => (
              <RevealOnScroll key={industry.title} delay={index * 0.1}>
                <div className="glass glass-hover rounded-xl overflow-hidden group h-full flex flex-col p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 backdrop-blur-sm border border-cyan/30 flex items-center justify-center flex-shrink-0">
                      <industry.icon className="w-6 h-6 text-cyan" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-foreground group-hover:text-cyan transition-colors">{industry.title}</h4>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4 flex-1">{industry.description}</p>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground w-fit">
                    {industryTabs.find(t => t.id === industry.category)?.label}
                  </span>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

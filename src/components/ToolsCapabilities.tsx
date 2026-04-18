import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import {
  Brain, BarChart3, Users, Megaphone, Workflow, TrendingUp,
  Globe, Target, LineChart, Layers, LayoutDashboard, Rocket,
  Bot, Sparkles, Share2, Palette, Code, Database,
  Settings, PieChart, Briefcase, Zap, Monitor, FileText
} from 'lucide-react';

interface SkillCategory {
  title: string;
  icon: React.ElementType;
  skills: string[];
}

const CATEGORIES: SkillCategory[] = [
  {
    title: 'AI & Automation',
    icon: Brain,
    skills: ['AI Systems Architecture', 'LLM Integration', 'Machine Learning', 'AI Workflow Systems', 'n8n', 'Zapier', 'Smart Contracts', 'Ethereum'],
  },
  {
    title: 'Revenue & Sales',
    icon: TrendingUp,
    skills: ['Revenue Operations', 'Sales Pipeline Engineering', 'Lead Generation Systems', 'Quoting Processes', 'Conversion Optimization', 'A/B Testing'],
  },
  {
    title: 'CRM & Data',
    icon: Database,
    skills: ['CRM Infrastructure', 'HubSpot CRM', 'Salesforce', 'Databricks', 'Segment', 'Firebase', 'SAS', 'Data Analysis'],
  },
  {
    title: 'Marketing & Growth',
    icon: Megaphone,
    skills: ['Marketing Technology Strategy', 'Digital Growth Systems', 'Marketing Automation', 'MailChimp', 'Facebook Ads', 'Google AdWords', 'Hootsuite', 'SEO'],
  },
  {
    title: 'Analytics & Intelligence',
    icon: LineChart,
    skills: ['Marketing Analytics', 'Attribution Modeling', 'Google Analytics', 'Campaign Performance Analysis', 'Performance Tracking Systems', 'Business Analytics', 'Quantitative Research'],
  },
  {
    title: 'Operations & Strategy',
    icon: Settings,
    skills: ['Business Process Automation', 'Operational Systems Design', 'Digital Transformation Strategy', 'Logistics Planning', 'Risk Management', 'Operations Research', 'Business Strategy', 'Management'],
  },
  {
    title: 'Executive Tools',
    icon: LayoutDashboard,
    skills: ['Executive Decision Support Dashboards', 'Executive Analytics', 'Automation Frameworks', 'Team Readiness', 'Excel / Numbers / Sheets', 'QuickBooks', 'SharePoint'],
  },
  {
    title: 'Design & Development',
    icon: Code,
    skills: ['Web Development', 'UI/UX Design', 'Figma', 'Adobe Illustrator', 'Canva', '3D Modeling', 'Video Editing', 'WordPress', 'GitHub Actions', 'Netlify', 'Google Cloud Platform', 'Java'],
  },
  {
    title: 'Engagement & Outreach',
    icon: Share2,
    skills: ['Social Media Analytics', 'Engagement Systems', 'Public Speaking', 'Reverse Engineering', 'Attribution Tracking'],
  },
];

export const ToolsCapabilities: React.FC = () => {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-secondary/20 to-background">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-3 block">
              Full-Stack Business Intelligence
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-4">
              Tools & <span className="text-primary glow-text">Capabilities</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              End-to-end expertise across AI, revenue systems, marketing technology, and operational strategy
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((cat, i) => (
            <RevealOnScroll key={cat.title} delay={i * 0.08}>
              <div className="glass rounded-xl p-6 h-full border border-border/30 hover:border-primary/30 transition-colors duration-300 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <cat.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground font-display text-sm uppercase tracking-wide">
                    {cat.title}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cat.skills.map(skill => (
                    <span
                      key={skill}
                      className="text-xs px-2.5 py-1 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

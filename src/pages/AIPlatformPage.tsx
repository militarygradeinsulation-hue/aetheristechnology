import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Sparkles, Megaphone, Brain, Camera, Wand2, Shield, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Button } from '@/components/ui/button';
import { PlaygroundImageGenerator } from '@/components/PlaygroundImageGenerator';
import { Link } from 'react-router-dom';

const AIPlatformPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const sections = [
    {
      id: 'sees',
      icon: Eye,
      title: 'AI That Sees',
      subtitle: 'Computer Vision & Analysis',
      description: 'Our AI analyzes photos in seconds—playground hazards, interior design flaws, and construction defects that human eyes miss.',
      gradient: 'from-cyan to-blue-500',
      capabilities: [
        { title: 'Playground Hazard Detection', desc: 'Upload any playground photo, get instant safety analysis with actionable recommendations' },
        { title: 'Interior Space Analysis', desc: 'Analyze room dimensions, lighting, traffic flow, and spatial optimization opportunities' },
        { title: 'Construction Inspection', desc: 'Identify structural issues, code violations, and workmanship defects from site photos' },
        { title: 'Accessibility Audits', desc: 'Identify ADA compliance issues and accessibility barriers automatically across all industries' },
      ],
    },
    {
      id: 'creates',
      icon: Sparkles,
      title: 'AI That Creates',
      subtitle: 'Image Generation & Design Automation',
      description: 'Generate stunning renderings, visualizations, and marketing materials for any industry in seconds.',
      gradient: 'from-orange-500 to-pink-500',
      capabilities: [
        { title: 'Playground Renderings', desc: 'Describe your vision, get photorealistic playground designs instantly' },
        { title: 'Interior Design Visualizations', desc: 'Generate room mockups showing proposed designs before any work begins' },
        { title: 'Home Building Concept Art', desc: 'Create photorealistic home concepts for client presentations and proposals' },
        { title: 'Marketing Collateral', desc: 'Generate brochures, social graphics, and proposal visuals for any industry' },
      ],
    },
    {
      id: 'grows',
      icon: Megaphone,
      title: 'AI That Grows Your Business',
      subtitle: 'Marketing Automation & Lead Generation',
      description: 'Automated content creation, lead scoring, and personalized outreach that drives revenue across all three industries.',
      gradient: 'from-primary to-purple-500',
      capabilities: [
        { title: 'Social Media Automation', desc: 'AI-generated posts tailored to playground, design, or building audiences' },
        { title: 'Blog Content Generation', desc: 'Industry insights, safety bulletins, and SEO-optimized articles for your vertical' },
        { title: 'Lead Scoring', desc: 'AI identifies your hottest prospects so you focus on deals that close' },
        { title: 'Personalized Outreach', desc: 'Custom email sequences that speak to each prospect\'s specific industry needs' },
      ],
    },
    {
      id: 'learns',
      icon: Brain,
      title: 'AI That Learns',
      subtitle: 'Predictive Analytics & Pattern Recognition',
      description: 'The more data it sees, the smarter it gets. Predict failures, trends, and delays before they happen.',
      gradient: 'from-green-500 to-cyan',
      capabilities: [
        { title: 'Predictive Maintenance', desc: 'Know when playground surfaces will fail or building components need attention' },
        { title: 'Trend Forecasting', desc: 'Predict design trends, seasonal impacts, and market shifts across industries' },
        { title: 'Pattern Recognition', desc: 'Learn from thousands of projects to identify high-risk configurations and opportunities' },
        { title: 'Industry Benchmarking', desc: 'Compare your metrics against industry standards in playground, design, or building' },
      ],
    },
  ];

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        
        {/* Hero */}
        <section className="pt-32 pb-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan/20 via-primary/20 to-orange-500/20 border border-cyan/40 px-5 py-2.5 rounded-full mb-6">
                <Zap className="w-5 h-5 text-cyan animate-pulse" />
                <span className="text-sm font-semibold bg-gradient-to-r from-cyan via-primary to-orange-500 bg-clip-text text-transparent">
                  Triple-AI Platform
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
                The Most Advanced AI
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan via-primary to-orange-500">
                  For Design, Safety & Construction
                </span>
              </h1>

              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Three AI engines powering playground safety, interior design, and home building—from photo to proposal in 48 hours.
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {[
                  { label: 'Industries', value: '3' },
                  { label: 'Detection Accuracy', value: '95%+' },
                  { label: 'Report Time', value: '48hrs' },
                  { label: 'AI Layers', value: '3' },
                ].map((stat) => (
                  <div key={stat.label} className="glass px-6 py-3 rounded-full">
                    <span className="text-xl font-bold text-cyan">{stat.value}</span>
                    <span className="text-sm text-muted-foreground ml-2">{stat.label}</span>
                  </div>
                ))}
              </div>

              <Link to="/contact">
                <Button size="lg" className="bg-gradient-to-r from-cyan to-primary hover:opacity-90 text-lg px-8 py-6">
                  <Camera className="mr-2 w-5 h-5" />
                  Get Free AI Assessment
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* AI Sections */}
        {sections.map((section, idx) => (
          <section key={section.id} id={section.id} className={`py-24 px-4 ${idx % 2 === 1 ? 'bg-secondary/20' : ''}`}>
            <div className="max-w-7xl mx-auto">
              <RevealOnScroll>
                <div className="text-center mb-16">
                  <div className={`inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br ${section.gradient} items-center justify-center mb-6 shadow-lg`}>
                    <section.icon className="w-10 h-10 text-white" />
                  </div>
                  <h2 className={`text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r ${section.gradient} bg-clip-text text-transparent`}>
                    {section.title}
                  </h2>
                  <p className="text-lg text-cyan mb-2">{section.subtitle}</p>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{section.description}</p>
                </div>
              </RevealOnScroll>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.capabilities.map((cap, capIdx) => (
                  <RevealOnScroll key={cap.title} delay={capIdx * 0.1}>
                    <motion.div whileHover={{ y: -4 }} className="glass glass-hover p-6 rounded-xl border border-border/50">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${section.gradient} flex items-center justify-center flex-shrink-0`}>
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-2">{cap.title}</h3>
                          <p className="text-muted-foreground">{cap.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  </RevealOnScroll>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Image Generator Demo */}
        <section className="py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
          <div className="max-w-4xl mx-auto">
            <RevealOnScroll>
              <div className="text-center mb-12">
                <div className="inline-flex w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 items-center justify-center mb-6 shadow-lg">
                  <Wand2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-4xl font-bold mb-4 text-foreground">
                  Try the <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">AI Image Generator</span>
                </h2>
                <p className="text-xl text-muted-foreground">
                  Describe your vision—playground, interior, or home—and watch AI bring it to life
                </p>
              </div>
            </RevealOnScroll>
            <PlaygroundImageGenerator />
          </div>
        </section>

        {/* Competitive Advantage */}
        <section className="py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <RevealOnScroll>
              <div className="glass p-12 rounded-2xl border-2 border-cyan/30 text-center">
                <Shield className="w-16 h-16 text-cyan mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Your Unfair Advantage</h2>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  No other company has this level of AI integration across playground safety, interior design, and home building. 
                  Your competitors are using spreadsheets. You'll have three AI engines working 24/7.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="glass px-6 py-3 rounded-full border border-cyan/30">
                    <span className="text-cyan font-semibold">Analysis + Marketing + Design</span>
                  </div>
                  <div className="glass px-6 py-3 rounded-full border border-cyan/30">
                    <span className="text-cyan font-semibold">Three Industries</span>
                  </div>
                  <div className="glass px-6 py-3 rounded-full border border-cyan/30">
                    <span className="text-cyan font-semibold">One Unified Platform</span>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        <Footer />
      </div>

      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default AIPlatformPage;

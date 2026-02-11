import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Sparkles, Megaphone, Brain, Zap, ArrowRight } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

const layers = [
  {
    id: 'analysis',
    icon: Eye,
    title: 'Analysis AI',
    subtitle: 'Computer Vision & Predictive Analytics',
    description: 'Photo analysis that detects issues humans miss—playground hazards, interior design flaws, and construction defects.',
    features: [
      'Playground hazard detection',
      'Interior space analysis',
      'Construction inspection',
      'Predictive maintenance',
    ],
    gradient: 'from-cyan to-blue-500',
    glowColor: 'cyan',
  },
  {
    id: 'marketing',
    icon: Megaphone,
    title: 'Marketing AI',
    subtitle: 'Content & Lead Generation',
    description: 'Automated content creation, lead scoring, and personalized outreach for playground, design, and building companies.',
    features: [
      'Social media automation',
      'AI-written blog posts',
      'Lead scoring & qualification',
      'Personalized outreach',
    ],
    gradient: 'from-primary to-purple-500',
    glowColor: 'primary',
  },
  {
    id: 'creative',
    icon: Sparkles,
    title: 'Creative AI',
    subtitle: 'Image Generation & Design',
    description: 'Generate playground renderings, interior room visualizations, home concept art, and marketing collateral instantly.',
    features: [
      'Playground renderings',
      'Interior design visualizations',
      'Home building concept art',
      'Marketing collateral',
    ],
    gradient: 'from-orange-500 to-pink-500',
    glowColor: 'orange',
  },
];

export const AILayers: React.FC = () => {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 10, repeat: Infinity, delay: 4 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan/20 via-primary/20 to-orange-500/20 border border-cyan/40 px-5 py-2.5 rounded-full mb-6"
            >
              <Brain className="w-5 h-5 text-cyan animate-pulse" />
              <span className="text-sm font-semibold bg-gradient-to-r from-cyan via-primary to-orange-500 bg-clip-text text-transparent">
                Triple-AI Architecture
              </span>
              <Zap className="w-5 h-5 text-orange-500 animate-pulse" />
            </motion.div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-foreground">
              The First{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan via-primary to-orange-500">
                Triple-AI Platform
              </span>
              <br />
              Built for Design, Safety & Construction
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Three interconnected AI engines powering playground safety, interior design, 
              and home building. No other company has this.
            </p>
          </div>
        </RevealOnScroll>

        {/* AI Layer Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {layers.map((layer, index) => (
            <RevealOnScroll key={layer.id} delay={index * 0.15}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative group"
              >
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${layer.gradient} rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
                
                <div className="relative glass p-8 rounded-2xl border border-border/50 h-full">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${layer.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                    <layer.icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className={`text-2xl font-bold mb-1 bg-gradient-to-r ${layer.gradient} bg-clip-text text-transparent`}>
                    {layer.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{layer.subtitle}</p>
                  <p className="text-muted-foreground mb-6 leading-relaxed">{layer.description}</p>

                  <ul className="space-y-3">
                    {layer.features.map((feature, idx) => (
                      <motion.li
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="flex items-center gap-3 text-sm"
                      >
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${layer.gradient}`} />
                        <span className="text-foreground">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>

                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
                    className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-px h-6 bg-gradient-to-b ${layer.gradient} hidden lg:block`}
                  />
                </div>
              </motion.div>
            </RevealOnScroll>
          ))}
        </div>

        {/* Central connection visualization */}
        <RevealOnScroll delay={0.5}>
          <div className="relative">
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(0, 255, 255, 0.3)',
                  '0 0 40px rgba(0, 255, 255, 0.5)',
                  '0 0 20px rgba(0, 255, 255, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mx-auto w-fit glass p-8 rounded-2xl border border-cyan/30 text-center"
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <Eye className="w-6 h-6 text-cyan" />
                <motion.div
                  animate={{ scaleX: [1, 1.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-8 h-0.5 bg-gradient-to-r from-cyan to-primary"
                />
                <Megaphone className="w-6 h-6 text-primary" />
                <motion.div
                  animate={{ scaleX: [1, 1.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  className="w-8 h-0.5 bg-gradient-to-r from-primary to-orange-500"
                />
                <Sparkles className="w-6 h-6 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-foreground mb-2">
                All Three Working Together
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                Your competitors are still using spreadsheets. You'll have AI.
              </p>
            </motion.div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.6}>
          <div className="text-center mt-12">
            <Link to="/ai-platform">
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan via-primary to-orange-500 hover:opacity-90 text-white text-lg px-8 py-6 group shadow-lg"
              >
                <Sparkles className="mr-2 w-5 h-5" />
                Explore AI Capabilities
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

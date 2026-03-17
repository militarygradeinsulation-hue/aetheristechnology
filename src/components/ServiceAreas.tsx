import React from 'react';
import { MapPin, Building2, Users, Briefcase, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { RevealOnScroll } from './RevealOnScroll';

interface CityData {
  name: string;
  region: string;
  industries: string[];
  description: string;
  isHeadquarters?: boolean;
}

const indianaCities: CityData[] = [
  {
    name: 'Indianapolis',
    region: 'Central Indiana',
    industries: ['Healthcare', 'Manufacturing', 'Technology', 'Logistics'],
    description: 'Our headquarters. Serving the Circle City with comprehensive AI solutions for the capital\'s diverse business landscape.',
    isHeadquarters: true,
  },
  {
    name: 'Fort Wayne',
    region: 'Northeast Indiana',
    industries: ['Manufacturing', 'Healthcare', 'Defense', 'Insurance'],
    description: 'Supporting Fort Wayne\'s strong manufacturing heritage with AI-powered automation and predictive analytics.',
  },
  {
    name: 'Carmel',
    region: 'Hamilton County',
    industries: ['Technology', 'Healthcare', 'Finance', 'Professional Services'],
    description: 'Partnering with Carmel\'s thriving business community to implement cutting-edge AI solutions.',
  },
  {
    name: 'Fishers',
    region: 'Hamilton County',
    industries: ['Technology', 'Startups', 'Healthcare', 'Retail'],
    description: 'Empowering Fishers\' entrepreneurial spirit with AI tools that scale from startup to enterprise.',
  },
  {
    name: 'Bloomington',
    region: 'South Central Indiana',
    industries: ['Education', 'Technology', 'Healthcare', 'Research'],
    description: 'Collaborating with IU and Bloomington businesses on innovative AI research and applications.',
  },
  {
    name: 'Evansville',
    region: 'Southwest Indiana',
    industries: ['Manufacturing', 'Healthcare', 'Logistics', 'Energy'],
    description: 'Bringing AI transformation to Evansville\'s industrial base and healthcare networks.',
  },
  {
    name: 'South Bend',
    region: 'North Central Indiana',
    industries: ['Manufacturing', 'Education', 'Healthcare', 'Technology'],
    description: 'Supporting South Bend\'s renaissance with AI solutions for modern manufacturing and healthcare.',
  },
  {
    name: 'Lafayette',
    region: 'West Central Indiana',
    industries: ['Manufacturing', 'Education', 'Agriculture', 'Technology'],
    description: 'Partnering with Purdue-adjacent businesses and Lafayette\'s growing tech ecosystem.',
  },
  {
    name: 'Noblesville',
    region: 'Hamilton County',
    industries: ['Manufacturing', 'Retail', 'Professional Services', 'Healthcare'],
    description: 'Helping Noblesville businesses compete with AI-powered efficiency and automation.',
  },
  {
    name: 'Greenwood',
    region: 'Johnson County',
    industries: ['Retail', 'Healthcare', 'Logistics', 'Manufacturing'],
    description: 'Serving Greenwood\'s diverse business community with tailored AI solutions.',
  },
];

export const ServiceAreas: React.FC = () => {
  return (
    <section className="pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <RevealOnScroll>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-amber text-sm font-medium mb-6">
              <MapPin className="w-4 h-4" />
              Based in Indianapolis, Serving All of Indiana
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-display">
              AI Solutions for{' '}
              <span className="text-gradient-amber">
                Indiana Businesses
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From Indianapolis to Fort Wayne, Carmel to Evansville, we're proud to serve 
              Hoosier businesses with cutting-edge AI automation and consulting services.
            </p>
          </div>
        </RevealOnScroll>

        {/* Stats Bar */}
        <RevealOnScroll>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { icon: Building2, value: '10+', label: 'Cities Served' },
              { icon: Users, value: '50+', label: 'Indiana Clients' },
              { icon: Briefcase, value: '6+', label: 'Industries' },
              { icon: MapPin, value: '100%', label: 'Remote Capable' },
            ].map((stat, index) => (
              <div key={index} className="glass rounded-xl p-6 text-center">
                <stat.icon className="w-8 h-8 text-amber mx-auto mb-3" />
                <div className="text-3xl font-bold text-foreground mb-1 font-display">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {/* Cities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {indianaCities.map((city, index) => (
            <RevealOnScroll key={city.name} delay={index * 0.05}>
              <div className={`glass rounded-xl p-6 h-full transition-all duration-300 hover:scale-[1.02] ${
                city.isHeadquarters ? 'ring-2 ring-amber' : ''
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2 font-display">
                      {city.name}
                      {city.isHeadquarters && (
                        <span className="text-xs bg-amber/20 text-amber px-2 py-1 rounded-full">
                          HQ
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{city.region}</p>
                  </div>
                  <MapPin className="w-5 h-5 text-amber flex-shrink-0" />
                </div>
                
                <p className="text-muted-foreground text-sm mb-4">
                  {city.description}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {city.industries.map((industry) => (
                    <span 
                      key={industry}
                      className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground"
                    >
                      {industry}
                    </span>
                  ))}
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        {/* Beyond Indiana Section */}
        <RevealOnScroll>
          <div className="glass rounded-2xl p-8 md:p-12 text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 font-display">
              Don't See Your City?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              While we're headquartered in Indianapolis, we serve clients across all of Indiana 
              and beyond. Our AI solutions work remotely, and we're happy to travel for on-site 
              consultations throughout the Midwest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button className="bg-primary hover:bg-primary/90 gap-2">
                  Contact Us <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" className="gap-2">
                  View Our Services
                </Button>
              </Link>
            </div>
          </div>
        </RevealOnScroll>

        {/* Why Local Matters */}
        <RevealOnScroll>
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 font-display">
              Why Choose a Local AI Partner?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'We Understand Indiana Business',
                  description: 'From manufacturing in Fort Wayne to healthcare in Indianapolis, we know the unique challenges Hoosier businesses face.',
                },
                {
                  title: 'Same Timezone, Fast Response',
                  description: 'When you need support, we\'re here during your business hours. No waiting for responses from distant time zones.',
                },
                {
                  title: 'On-Site When Needed',
                  description: 'Sometimes AI implementation requires hands-on work. We can be at your Indiana location quickly for training and deployment.',
                },
              ].map((benefit, index) => (
                <div key={index} className="text-left">
                  <h3 className="text-lg font-semibold mb-2 text-foreground font-display">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

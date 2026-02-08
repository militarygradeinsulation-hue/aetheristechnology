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
    industries: ['Parks Dept', 'Schools', 'Rec Centers', 'Childcare'],
    description: 'Our headquarters. Serving Indy Parks, IPS schools, and hundreds of recreation facilities across the Circle City.',
    isHeadquarters: true,
  },
  {
    name: 'Fort Wayne',
    region: 'Northeast Indiana',
    industries: ['Parks', 'FWCS Schools', 'YMCAs', 'Churches'],
    description: 'Supporting Fort Wayne Parks and Community Schools with comprehensive playground safety monitoring.',
  },
  {
    name: 'Carmel',
    region: 'Hamilton County',
    industries: ['Clay Parks', 'Schools', 'HOAs', 'Private Clubs'],
    description: 'Partnering with Carmel Clay Parks and top-rated school districts for premium safety standards.',
  },
  {
    name: 'Fishers',
    region: 'Hamilton County',
    industries: ['Parks', 'HSE Schools', 'Daycares', 'HOAs'],
    description: 'Protecting Fishers\' growing community with AI-powered safety for parks, schools, and neighborhoods.',
  },
  {
    name: 'Bloomington',
    region: 'South Central Indiana',
    industries: ['B-Town Parks', 'MCCSC', 'IU Facilities', 'Childcare'],
    description: 'Collaborating with Bloomington Parks and Monroe County schools on playground safety excellence.',
  },
  {
    name: 'Evansville',
    region: 'Southwest Indiana',
    industries: ['Parks Dept', 'EVSC', 'Rec Centers', 'Churches'],
    description: 'Bringing AI safety technology to Evansville\'s extensive parks and school playground network.',
  },
  {
    name: 'South Bend',
    region: 'North Central Indiana',
    industries: ['Parks', 'SBCSC', 'Notre Dame', 'YMCAs'],
    description: 'Supporting South Bend\'s renaissance with modern playground safety for schools and community spaces.',
  },
  {
    name: 'Lafayette',
    region: 'West Central Indiana',
    industries: ['Parks', 'LSSC', 'Tippecanoe Co', 'Daycares'],
    description: 'Partnering with Lafayette and West Lafayette facilities for comprehensive safety coverage.',
  },
  {
    name: 'Noblesville',
    region: 'Hamilton County',
    industries: ['Parks', 'Schools', 'HOAs', 'Churches'],
    description: 'Helping Noblesville\'s growing community maintain safe play environments for all children.',
  },
  {
    name: 'Greenwood',
    region: 'Johnson County',
    industries: ['Parks', 'Schools', 'Daycares', 'Churches'],
    description: 'Serving Greenwood\'s diverse playground facilities with AI-powered safety assessments.',
  },
];

export const ServiceAreas: React.FC = () => {
  return (
    <section className="pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <RevealOnScroll>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-cyan text-sm font-medium mb-6">
              <MapPin className="w-4 h-4" />
              Based in Indianapolis, Serving All of Indiana
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Playground Safety for{' '}
              <span className="bg-gradient-to-r from-cyan to-primary bg-clip-text text-transparent">
                Indiana Communities
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From Indianapolis to Fort Wayne, Carmel to Evansville—protecting children at 
              500+ playgrounds across the Hoosier State with AI-powered safety technology.
            </p>
          </div>
        </RevealOnScroll>

        {/* Stats Bar */}
        <RevealOnScroll>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { icon: Building2, value: '500+', label: 'Playgrounds Protected' },
              { icon: Users, value: '50+', label: 'Organizations Served' },
              { icon: Briefcase, value: '6+', label: 'Facility Types' },
              { icon: MapPin, value: '100%', label: 'Remote Assessment Ready' },
            ].map((stat, index) => (
              <div key={index} className="glass rounded-xl p-6 text-center">
                <stat.icon className="w-8 h-8 text-cyan mx-auto mb-3" />
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
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
                city.isHeadquarters ? 'ring-2 ring-cyan' : ''
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                      {city.name}
                      {city.isHeadquarters && (
                        <span className="text-xs bg-cyan/20 text-cyan px-2 py-1 rounded-full">
                          HQ
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{city.region}</p>
                  </div>
                  <MapPin className="w-5 h-5 text-cyan flex-shrink-0" />
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
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Don't See Your Community?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              While we're headquartered in Indianapolis, our AI-powered assessments work remotely—
              just upload photos from anywhere. We also travel for on-site Triax testing and 
              training throughout the Midwest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button className="bg-primary hover:bg-primary/90 gap-2">
                  Request Assessment <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" className="gap-2">
                  View Platform
                </Button>
              </Link>
            </div>
          </div>
        </RevealOnScroll>

        {/* Why Local Matters */}
        <RevealOnScroll>
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Why Choose a Local Safety Partner?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'We Know Indiana Weather',
                  description: 'From summer heat to winter freezes, we understand the "Winter Paradox" and how Hoosier weather affects playground surfaces.',
                },
                {
                  title: 'Same Timezone, Fast Response',
                  description: 'When you need emergency assessments or urgent support, we\'re here during your business hours—no waiting for distant time zones.',
                },
                {
                  title: 'On-Site When Needed',
                  description: 'For Triax testing, training, or complex assessments, we can be at your Indiana location quickly.',
                },
              ].map((benefit, index) => (
                <div key={index} className="text-left">
                  <h3 className="text-lg font-semibold mb-2 text-foreground">{benefit.title}</h3>
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

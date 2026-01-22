import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Quote, MapPin, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Testimonial {
  id: string;
  client_name: string;
  company: string;
  role: string;
  quote: string;
  rating: number;
  industry: string | null;
  location: string | null;
  avatar_url: string | null;
  is_featured: boolean;
}

const TestimonialsPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ['all-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  // Get unique industries for filter
  const industries = useMemo(() => {
    if (!testimonials) return [];
    const uniqueIndustries = new Set(
      testimonials
        .map((t) => t.industry)
        .filter((i): i is string => i !== null)
    );
    return Array.from(uniqueIndustries).sort();
  }, [testimonials]);

  // Filter testimonials by selected industry
  const filteredTestimonials = useMemo(() => {
    if (!testimonials) return [];
    if (selectedIndustry === 'all') return testimonials;
    return testimonials.filter((t) => t.industry === selectedIndustry);
  }, [testimonials, selectedIndustry]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        
        <main className="pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <RevealOnScroll>
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  Client{' '}
                  <span className="bg-gradient-to-r from-cyan to-primary bg-clip-text text-transparent">
                    Testimonials
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Hear from Indiana businesses that have transformed their operations 
                  with our AI solutions. Real results from real clients.
                </p>
              </div>
            </RevealOnScroll>

            {/* Filter */}
            <RevealOnScroll>
              <div className="flex items-center justify-center gap-4 mb-12">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  <span>Filter by Industry:</span>
                </div>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger className="w-[200px] bg-background/50 border-muted">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedIndustry !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIndustry('all')}
                    className="text-cyan hover:text-cyan/80"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            </RevealOnScroll>

            {/* Results Count */}
            {!isLoading && filteredTestimonials.length > 0 && (
              <RevealOnScroll>
                <p className="text-center text-muted-foreground mb-8">
                  Showing {filteredTestimonials.length} testimonial
                  {filteredTestimonials.length !== 1 ? 's' : ''}
                  {selectedIndustry !== 'all' && ` in ${selectedIndustry}`}
                </p>
              </RevealOnScroll>
            )}

            {/* Testimonials Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="glass rounded-xl p-6">
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-24 w-full mb-4" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredTestimonials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredTestimonials.map((testimonial, index) => (
                  <RevealOnScroll key={testimonial.id} delay={index * 0.05}>
                    <div className="glass rounded-xl p-8 h-full flex flex-col hover:border-cyan/30 transition-colors">
                      {/* Rating */}
                      <div className="flex gap-1 mb-4">
                        {renderStars(testimonial.rating)}
                      </div>

                      {/* Quote */}
                      <div className="relative flex-1 mb-6">
                        <Quote className="absolute -top-2 -left-2 w-8 h-8 text-cyan/20" />
                        <p className="text-muted-foreground italic pl-6">
                          "{testimonial.quote}"
                        </p>
                      </div>

                      {/* Author */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan to-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
                          {testimonial.client_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">
                            {testimonial.client_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {testimonial.role}, {testimonial.company}
                          </div>
                          {testimonial.location && (
                            <div className="flex items-center gap-1 text-xs text-cyan mt-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span>{testimonial.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Industry Badge */}
                      {testimonial.industry && (
                        <div className="mt-4 pt-4 border-t border-muted">
                          <span className="text-xs bg-cyan/10 text-cyan px-3 py-1 rounded-full">
                            {testimonial.industry}
                          </span>
                        </div>
                      )}
                    </div>
                  </RevealOnScroll>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">
                  No testimonials found for this industry.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 border-cyan text-cyan hover:bg-cyan/10"
                  onClick={() => setSelectedIndustry('all')}
                >
                  View All Testimonials
                </Button>
              </div>
            )}

            {/* CTA Section */}
            <RevealOnScroll>
              <div className="mt-20 glass rounded-2xl p-10 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Ready to Join Our Success Stories?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Let us help transform your business with AI solutions tailored to your needs. 
                  Schedule a free consultation today.
                </p>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setIsContactModalOpen(true)}
                >
                  Get Started Today
                </Button>
              </div>
            </RevealOnScroll>
          </div>
        </main>

        <Footer />
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default TestimonialsPage;

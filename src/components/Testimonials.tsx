import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Quote, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RevealOnScroll } from './RevealOnScroll';
import { Skeleton } from './ui/skeleton';

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

export const Testimonials: React.FC = () => {
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data as Testimonial[];
    },
  });

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
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              What Our{' '}
              <span className="bg-gradient-to-r from-cyan to-primary bg-clip-text text-transparent">
                Clients Say
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Trusted by Indiana businesses to deliver AI solutions that drive real results
            </p>
          </div>
        </RevealOnScroll>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-xl p-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        ) : testimonials && testimonials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <RevealOnScroll key={testimonial.id} delay={index * 0.1}>
                <div className="glass rounded-xl p-8 h-full flex flex-col">
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
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan to-primary flex items-center justify-center text-white font-bold text-lg">
                      {testimonial.client_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {testimonial.client_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}, {testimonial.company}
                      </div>
                      {testimonial.location && (
                        <div className="flex items-center gap-1 text-xs text-cyan mt-1">
                          <MapPin className="w-3 h-3" />
                          {testimonial.location}
                        </div>
                      )}
                    </div>
                    {testimonial.industry && (
                      <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                        {testimonial.industry}
                      </span>
                    )}
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Testimonials coming soon!
            </p>
          </div>
        )}

        {/* Stats Bar */}
        <RevealOnScroll>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '50+', label: 'Happy Clients' },
              { value: '4.9', label: 'Average Rating' },
              { value: '95%', label: 'Success Rate' },
              { value: '100%', label: 'Indiana Owned' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-cyan mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

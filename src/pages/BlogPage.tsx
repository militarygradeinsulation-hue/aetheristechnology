import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { BlogList } from '@/components/BlogList';
import { SEOHead } from '@/components/SEOHead';

const BlogPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="AI & Business Strategy Blog"
        description="Expert insights on AI automation, operational efficiency, CRM optimization, digital marketing failures, and business consulting strategies. Updated daily with actionable intelligence."
        path="/blog"
        type="blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "Aetheris AI Blog",
          "description": "Daily AI and business strategy insights for leaders who want to stop wasting money on broken systems.",
          "url": "https://aetheristechnology.lovable.app/blog",
          "publisher": {
            "@type": "Organization",
            "name": "Aetheris AI",
            "logo": { "@type": "ImageObject", "url": "https://aetheristechnology.lovable.app/aetheris-logo.png" }
          }
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <BlogList />
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default BlogPage;

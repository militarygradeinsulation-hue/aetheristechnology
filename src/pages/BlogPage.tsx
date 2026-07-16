import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { BlogList } from '@/components/BlogList';
import { SEOHead } from '@/components/SEOHead';
import { Background } from '@/components/Background';

const BlogPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-background">
      <SEOHead
        title="AI & Business Strategy Blog | Aetheris AI"
        description="Insights on AI automation, operational efficiency, CRM, and digital marketing failures. Updated daily with actionable intelligence."
        path="/blog"
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "Aetheris AI Blog",
          "description": "Daily AI and business strategy insights for leaders who want to stop wasting money on broken systems.",
          "url": "https://aetheris.technology/blog",
          "publisher": {
            "@type": "Organization",
            "name": "Aetheris AI",
            "logo": { "@type": "ImageObject", "url": "https://aetheris.technology/aetheris-logo.png" }
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

import React, { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import PillarArticleLayout from '@/components/seo/PillarArticleLayout';
import { ALL_AUTHORITY_ARTICLES } from '@/content/aiAuthorityContent';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';

/**
 * Single dynamic route that resolves any AI Authority Playbook article from
 * src/content/aiAuthorityContent.tsx. Adding a new article requires only
 * pushing a record to that file and a Route entry in App.tsx.
 */
const AuthorityArticlePage: React.FC = () => {
  const { pathname } = useLocation();
  const [contactOpen, setContactOpen] = useState(false);
  const path = pathname.replace(/\/+$/, '') || '/';
  const article = ALL_AUTHORITY_ARTICLES.find(a => a.path === path);

  if (!article) return <Navigate to="/" replace />;

  const { body, ...props } = article;
  return (
    <>
      <Navbar onContactClick={() => setContactOpen(true)} />
      <PillarArticleLayout {...props}>{body}</PillarArticleLayout>
      <Footer />
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
};

export default AuthorityArticlePage;


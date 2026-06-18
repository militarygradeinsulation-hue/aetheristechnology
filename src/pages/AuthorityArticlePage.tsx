import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import PillarArticleLayout from '@/components/seo/PillarArticleLayout';
import { ALL_AUTHORITY_ARTICLES } from '@/content/aiAuthorityContent';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

/**
 * Single dynamic route that resolves any AI Authority Playbook article from
 * src/content/aiAuthorityContent.tsx. Adding a new article requires only
 * pushing a record to that file — no new route, no new page component.
 */
const AuthorityArticlePage: React.FC = () => {
  const { '*': rest } = useParams();
  const path = `/${rest ?? ''}`.replace(/\/+$/, '') || '/';
  const article = ALL_AUTHORITY_ARTICLES.find(a => a.path === path);

  if (!article) return <Navigate to="/" replace />;

  const { body, ...props } = article;
  return (
    <>
      <Navbar />
      <PillarArticleLayout {...props}>{body}</PillarArticleLayout>
      <Footer />
    </>
  );
};

export default AuthorityArticlePage;

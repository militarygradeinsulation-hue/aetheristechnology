import React from 'react';
import { Link } from 'react-router-dom';

interface Props {
  /** Date string for the post (ISO or human). */
  date?: string;
  className?: string;
}

/**
 * Author byline for blog posts and playbooks.
 * Adds visible E-E-A-T signal: named operator, role, location, link to about.
 * Pairs with Article schema author field for AI engine extraction.
 */
export const AuthorByline: React.FC<Props> = ({ date, className = '' }) => {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 text-xs text-muted-foreground ${className}`}
      itemScope
      itemType="https://schema.org/Person"
    >
      <span className="font-case text-[10px] uppercase tracking-widest text-amber">
        Author
      </span>
      <Link
        to="/about"
        className="font-semibold text-foreground hover:text-amber transition-colors"
        itemProp="url"
      >
        <span itemProp="name">Joseph Toney</span>
      </Link>
      <span className="text-muted-foreground/70">·</span>
      <span itemProp="jobTitle">Business Forensics Operator</span>
      <span className="text-muted-foreground/70">·</span>
      <span itemProp="address">Indianapolis, IN</span>
      {date && (
        <>
          <span className="text-muted-foreground/70">·</span>
          <time dateTime={date}>{date}</time>
        </>
      )}
    </div>
  );
};

export default AuthorByline;

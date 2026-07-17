import React, { useEffect } from 'react';
import { HUBSPOT_MEETING_URL } from '@/lib/links';

const BookRedirect: React.FC = () => {
  useEffect(() => {
    window.location.replace(HUBSPOT_MEETING_URL);
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center px-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-amber mb-3">
          // Aetheris · Case Intake //
        </p>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">Opening the operator's calendar…</h1>
        <p className="text-sm text-muted-foreground">
          If nothing loads,{' '}
          <a href={HUBSPOT_MEETING_URL} className="text-amber underline">
            click here to book a 30-minute case intake
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default BookRedirect;

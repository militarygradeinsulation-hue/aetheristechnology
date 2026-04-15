import React from 'react';

export const ConsentBanner: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground text-center max-w-5xl mx-auto">
        <span className="font-semibold text-foreground">Terms & Conditions:</span>{' '}
        By clicking "Call," "Talk," or "Agree," and each time I interact with this AI agent, I consent to the recording, storage, and sharing of my communications with third-party service providers, as described in the{' '}
        <a href="/terms" className="text-amber underline hover:text-amber/80 transition-colors">Privacy Policy</a>.
        {' '}If you do not wish to have your conversations recorded, please refrain from using this service.
      </p>
    </div>
  );
};

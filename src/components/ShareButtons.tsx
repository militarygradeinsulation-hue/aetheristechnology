import React from 'react';
import { Linkedin, Twitter, Link2, Check } from 'lucide-react';
import { useTrackEvent } from '@/hooks/useTrackEvent';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({ url, title }) => {
  const [copied, setCopied] = React.useState(false);
  const { trackEvent } = useTrackEvent();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    trackEvent('share', { platform: 'copy_link', url });
    setTimeout(() => setCopied(false), 2000);
  };

  const btnClass = "inline-flex items-center gap-2 px-3 py-2 rounded-lg glass border border-border text-sm text-muted-foreground hover:text-amber hover:border-amber/40 transition-colors";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium">Share:</span>
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
        onClick={() => trackEvent('share', { platform: 'linkedin', url })}
      >
        <Linkedin className="w-4 h-4" />
        <span className="hidden sm:inline">LinkedIn</span>
      </a>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
        onClick={() => trackEvent('share', { platform: 'twitter', url })}
      >
        <Twitter className="w-4 h-4" />
        <span className="hidden sm:inline">X</span>
      </a>
      <button onClick={handleCopy} className={btnClass}>
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
        <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
      </button>
    </div>
  );
};

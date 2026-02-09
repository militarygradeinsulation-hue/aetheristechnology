import { useEffect } from 'react';

export const ElevenLabsWidget = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div 
      dangerouslySetInnerHTML={{ 
        __html: '<elevenlabs-convai agent-id="agent_7701k5xv4272ekwaw1d0nx7cwf3m"></elevenlabs-convai>' 
      }} 
    />
  );
};

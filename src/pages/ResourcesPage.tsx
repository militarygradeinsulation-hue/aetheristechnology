import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Download, FileText, BookOpen, TrendingUp, Shield, BarChart3, Video, Phone, Mail, ArrowRight, Loader2, Play, Pause, Lock, ShoppingCart, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlaybookTopicBrowser } from '@/components/PlaybookTopicBrowser';
import { StripeEmbeddedCheckout } from '@/components/StripeEmbeddedCheckout';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Player from '@vimeo/player';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  TrendingUp,
  BookOpen,
  Video,
  FileText,
  Shield,
  BarChart3,
};

const FREE_PLAYBOOK_COUNT = 3;

const ResourcesPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [checkoutPlaybookId, setCheckoutPlaybookId] = useState<string | null>(null);
  const [checkoutPlaybookTitle, setCheckoutPlaybookTitle] = useState<string>('');
  const [previewPlaybook, setPreviewPlaybook] = useState<any | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (iframeRef.current) {
      const p = new Player(iframeRef.current);
      playerRef.current = p;
      // Ensure the player starts muted so autoplay works reliably
      p.setVolume(0).catch(() => {});
      p.on('play', () => setIsPlaying(true));
      p.on('pause', () => setIsPlaying(false));
      p.on('volumechange', ({ volume }: { volume: number }) => setIsMuted(volume === 0));
      return () => { p.off('play'); p.off('pause'); p.off('volumechange'); };
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) { playerRef.current.pause(); } else { playerRef.current.play(); }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    playerRef.current.setVolume(isMuted ? 1 : 0).catch(() => {});
  }, [isMuted]);

  const { data: playbooks, isLoading } = useQuery({
    queryKey: ['playbooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playbooks')
        .select('id, title, subtitle, description, tags, file_url, icon_name, published_at')
        .order('published_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Check which playbooks the user has purchased
  const { data: purchasedPlaybookIds } = useQuery({
    queryKey: ['purchased-playbooks', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data, error } = await supabase
        .from('purchases')
        .select('metadata')
        .eq('user_id', user.id);
      if (error) return new Set<string>();
      const ids = new Set<string>();
      (data || []).forEach((p: any) => {
        if (p.metadata?.playbook_id) ids.add(p.metadata.playbook_id);
      });
      return ids;
    },
    enabled: !!user,
  });

  const existingTitles = (playbooks || []).map(p => p.title);

  const handlePlaybookAction = (playbook: any, index: number) => {
    const isFree = index < FREE_PLAYBOOK_COUNT;
    const isPurchased = purchasedPlaybookIds?.has(playbook.id);

    if (isFree || isPurchased) {
      // Direct download
      window.open(playbook.file_url, '_blank');
      return;
    }

    // Need to purchase
    if (!user) {
      navigate('/login?redirect=/resources');
      return;
    }

    setCheckoutPlaybookId(playbook.id);
    setCheckoutPlaybookTitle(playbook.title);
  };

  if (checkoutPlaybookId) {
    return (
      <div className="relative min-h-screen">
        <Background />
        <div className="relative z-10">
          <Navbar onContactClick={() => setIsContactModalOpen(true)} />
          <div className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm flex items-center justify-center" onClick={() => setCheckoutPlaybookId(null)}>
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Unlock Playbook</p>
                  <p className="text-xs text-muted-foreground">{checkoutPlaybookTitle}</p>
                </div>
                <button onClick={() => setCheckoutPlaybookId(null)} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" /> Cancel
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <StripeEmbeddedCheckout
                  priceId="playbook_unlock_once"
                  customerEmail={user?.email || undefined}
                  returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=playbook_unlock&playbook_id=${checkoutPlaybookId}`}
                  metadata={{
                    userId: user?.id || '',
                    playbook_id: checkoutPlaybookId,
                    playbook_title: checkoutPlaybookTitle,
                    priceId: 'playbook_unlock_once',
                  }}
                />
              </div>
            </div>
          </div>
          <Footer />
        </div>
        <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Strategic Playbooks, AI & Marketing | Aetheris"
        description="Free playbooks on AI search, digital influence, short-form video, and leadership. Built from real consulting engagements."
        path="/resources"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Aetheris AI Strategic Playbooks",
          "description": "Free downloadable strategic frameworks for business leaders navigating AI-powered markets.",
          "url": "https://aetheris.technology/resources",
          "numberOfItems": playbooks?.length || 0,
          "itemListElement": (playbooks || []).map((r, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": r.title,
            "description": r.description
          }))
        }}
      />
      <Background />

      {/* Heartbeat line */}
      <div className="fixed top-0 left-0 w-full z-50 pointer-events-none overflow-hidden" style={{ height: '4px' }}>
        <svg
          viewBox="0 0 1200 40"
          preserveAspectRatio="none"
          className="w-[200%] h-full"
          style={{ animation: 'heartbeat-scroll 3s linear infinite' }}
        >
          <polyline
            points="0,20 180,20 200,20 220,5 240,35 260,10 280,30 300,20 320,20 600,20 780,20 800,20 820,5 840,35 860,10 880,30 900,20 920,20 1200,20"
            fill="none"
            stroke="hsl(var(--crimson))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <section className="pt-32 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <RevealOnScroll>
              <div className="relative w-72 h-72 md:w-96 md:h-96 mx-auto mb-8 group">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <iframe
                    ref={iframeRef}
                    src="https://player.vimeo.com/video/1185171761?autoplay=1&loop=1&muted=1&title=0&byline=0&portrait=0"
                    className="w-[200%] h-[200%] -ml-[50%] -mt-[25%]"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    title="Aetheris Playbooks"
                  />
                </div>
                <button
                  onClick={toggleMute}
                  className="absolute bottom-3 left-3 md:bottom-4 md:left-4 z-10 w-10 h-10 rounded-full bg-amber/90 hover:bg-amber flex items-center justify-center text-background shadow-lg transition-all opacity-70 group-hover:opacity-100"
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={togglePlay}
                  className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10 w-10 h-10 rounded-full bg-amber/90 hover:bg-amber flex items-center justify-center text-background shadow-lg transition-all opacity-70 group-hover:opacity-100"
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
              </div>
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                Field Manuals
              </div>
              <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground mb-4">
                Playbooks from the field.
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
                The frameworks behind The Leak Audit™, the patterns we see bleeding revenue across operations, 
                marketing, and sales. Built from real engagements. No fluff, no fake case studies.
              </p>
              <p className="text-sm text-muted-foreground">
                First {FREE_PLAYBOOK_COUNT} free. Premium playbooks, $29 each. <span className="text-amber font-medium">Buy any service and pick one free.</span>
              </p>
            </RevealOnScroll>
          </div>
        </section>

        {/* Playbooks Grid */}
        <section className="pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(playbooks || []).map((resource, index) => {
                  const IconComp = ICON_MAP[resource.icon_name || 'FileText'] || FileText;
                  const isFree = index < FREE_PLAYBOOK_COUNT;
                  const isPurchased = purchasedPlaybookIds?.has(resource.id);
                  const isUnlocked = isFree || isPurchased;

                  return (
                    <RevealOnScroll key={resource.id} delay={index * 0.1}>
                      <div className={`forensic-tile rounded-2xl p-8 border transition-all group h-full flex flex-col ${
                        isUnlocked
                          ? 'border-border hover:border-amber/30'
                          : 'border-border/50 hover:border-primary/30'
                      }`}>
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            isUnlocked
                              ? 'bg-primary/20 group-hover:bg-primary/30'
                              : 'bg-secondary/50 group-hover:bg-secondary/70'
                          }`}>
                            {isUnlocked ? (
                              <IconComp className="w-6 h-6 text-amber" />
                            ) : (
                              <Lock className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h2 className="text-xl font-bold text-foreground font-display">{resource.title}</h2>
                              {isFree && (
                                <span className="text-[10px] font-bold bg-amber/15 text-amber border border-amber/40 px-2 py-0.5 rounded-full uppercase tracking-wider">Free</span>
                              )}
                              {!isFree && isPurchased && (
                                <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/40 px-2 py-0.5 rounded-full uppercase tracking-wider">Unlocked</span>
                              )}
                              {!isUnlocked && (
                                <span className="text-[10px] font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">$25</span>
                              )}
                            </div>
                            <p className="text-sm text-amber font-medium">{resource.subtitle}</p>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm mb-4 flex-grow">{resource.description}</p>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {(resource.tags || []).map((tag: string) => (
                            <span key={tag} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{tag}</span>
                          ))}
                        </div>
                        <Button
                          onClick={() => handlePlaybookAction(resource, index)}
                          className={`w-full gap-2 ${
                            isUnlocked
                              ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                              : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'
                          }`}
                        >
                          {isUnlocked ? (
                            <><Download className="w-4 h-4" /> Download PDF</>
                          ) : (
                            <><ShoppingCart className="w-4 h-4" /> Unlock, $25</>
                          )}
                        </Button>
                      </div>
                    </RevealOnScroll>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* On-Demand Playbook Generator */}
        <PlaybookTopicBrowser existingTitles={existingTitles} />

        <section className="pb-24 px-4">
          <div className="max-w-4xl mx-auto">
            <RevealOnScroll>
              <div className="glass p-10 md:p-14 rounded-sm border-2 border-amber/30 text-center relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                    Reading ≠ Sealing
                  </div>
                  <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Playbooks show the pattern. The <span className="text-crimson">Forensic Diagnostic</span> shows your wound.
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                    Free playbooks teach the patterns we see across businesses. The Forensic Diagnostic ($2,500 flat) 
                    names the leaks bleeding <em>your</em> revenue right now, and credits in full toward the rebuild.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a href="/leak-audit">
                      <Button size="lg" className="bg-amber hover:bg-amber/90 text-background font-semibold">
                        Run the Free Leak Audit™ <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </a>
                    <a href="tel:+13173762110">
                      <Button size="lg" variant="outline" className="glass-hover border-border">
                        <Phone className="mr-2 w-5 h-5" /> (317) 376-2110
                      </Button>
                    </a>
                    <a href="mailto:aetheris.technology@outlook.com?subject=Forensic%20Diagnostic%20Inquiry">
                      <Button size="lg" variant="outline" className="glass-hover border-border">
                        <Mail className="mr-2 w-5 h-5" /> Email to Start
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ResourcesPage;

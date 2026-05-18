import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, ShoppingCart, Phone, Mail, Linkedin, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { BOOK_MEETING_URL } from '@/lib/links';

type Msg = { role: 'user' | 'assistant'; content: string; suggestions?: string[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-chat`;

const INITIAL_MESSAGE: Msg = {
  role: 'assistant',
  content: "Hey, I'm the Aetheris Sales Advisor. I help business owners figure out exactly what's broken in their digital presence and what to do about it.\n\nWhat's going on in your business? What's the biggest headache right now?",
};

const STARTER_PROBLEMS = [
  "My website isn't generating leads",
  "I'm losing bids and don't know why",
  "My CRM is a graveyard",
  "Marketing spend, no ROI",
  "My follow-up is broken",
  "I don't know what's actually broken",
];

const SUGGESTIONS_RE = /<suggestions>\s*(\[[\s\S]*?\])\s*<\/suggestions>\s*$/i;
const STREAMING_STRIP_RE = /\s*<suggestions>[\s\S]*$/i;

const stripSuggestionsForDisplay = (text: string) => text.replace(STREAMING_STRIP_RE, '').trim();

const parseSuggestions = (text: string): { clean: string; suggestions?: string[] } => {
  const m = text.match(SUGGESTIONS_RE);
  if (!m) return { clean: text };
  try {
    const arr = JSON.parse(m[1]);
    if (Array.isArray(arr) && arr.every((s) => typeof s === 'string')) {
      return { clean: text.replace(SUGGESTIONS_RE, '').trim(), suggestions: arr.slice(0, 3) };
    }
  } catch {
    // ignore
  }
  return { clean: text.replace(SUGGESTIONS_RE, '').trim() };
};

const CONTACT_LINKS = [
  { href: 'tel:+13173762110', icon: Phone, label: 'Call', eventLabel: 'phone' },
  { href: 'mailto:aetheris.technology@outlook.com?subject=I%20Need%20Help%20With%20My%20Business', icon: Mail, label: 'Email', eventLabel: 'email' },
  { href: 'https://www.linkedin.com/in/thejosephtoney', icon: Linkedin, label: 'LinkedIn', eventLabel: 'linkedin', external: true },
  { href: BOOK_MEETING_URL, icon: Calendar, label: 'Book', eventLabel: 'book_meeting', external: true, highlight: true },
];

export const SalesChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [showPulse, setShowPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { trackEvent } = useTrackEvent();

  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const runChat = useCallback(async (text: string) => {
    if (!text || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) throw new Error('Failed to start stream');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        const display = stripSuggestionsForDisplay(assistantSoFar);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && prev.length > 1 && prev[prev.length - 2]?.role === 'user') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: display } : m));
          }
          return [...prev, { role: 'assistant', content: display }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final pass: extract suggestions and clean content on the last assistant message
      const { clean, suggestions } = parseSuggestions(assistantSoFar);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role !== 'assistant') return prev;
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: clean, suggestions } : m));
      });
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again or call us at (317) 376-2110.' }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const sendMessage = useCallback(() => {
    runChat(input.trim());
  }, [input, runChat]);

  const sendPreset = useCallback((text: string, position: 'starter' | 'followup') => {
    trackEvent('chat_quickpick', { label: text, position });
    runChat(text);
  }, [runChat, trackEvent]);

  const handleCheckoutClick = (priceId: string) => {
    setCheckoutPriceId(priceId);
  };

  if (checkoutPriceId) {
    return (
      <div className="fixed inset-0 z-[9998] bg-background/95 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Complete Your Purchase</h2>
          <button onClick={() => setCheckoutPriceId(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-2xl mx-auto">
            <StripeEmbeddedCheckout
              priceId={checkoutPriceId}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          </div>
        </div>
      </div>
    );
  }

  const renderContent = (content: string) => {
    const parts = content.split(/\[([^\]]+)\]\(checkout:([^)]+)\)/g);
    if (parts.length === 1) {
      return <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2"><ReactMarkdown>{content}</ReactMarkdown></div>;
    }

    const elements: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i += 3) {
      if (parts[i]) {
        elements.push(
          <div key={`md-${i}`} className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2">
            <ReactMarkdown>{parts[i]}</ReactMarkdown>
          </div>
        );
      }
      if (i + 1 < parts.length && i + 2 < parts.length) {
        const label = parts[i + 1];
        const priceId = parts[i + 2];
        elements.push(
          <button
            key={`btn-${i}`}
            onClick={() => handleCheckoutClick(priceId)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold transition-colors my-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {label}
          </button>
        );
      }
    }
    return <>{elements}</>;
  };

  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  return (
    <>
      {/* Single floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-primary shadow-xl flex items-center justify-center hover:scale-105 transition-all active:scale-95 ${
            showPulse ? 'animate-pulse' : ''
          }`}
          aria-label="Chat with us"
        >
          {showPulse && (
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
          )}
          <MessageCircle className="w-7 h-7 text-primary-foreground relative z-10" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[560px] max-h-[calc(100vh-48px)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-foreground text-sm">Aetheris Sales Advisor</h3>
                <p className="text-[10px] text-muted-foreground">Ask me anything or reach out directly</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Quick contact links */}
            <div className="flex items-center gap-1">
              {CONTACT_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.eventLabel}
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    onClick={() => trackEvent('click', { label: link.eventLabel, location: 'chat_header' })}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      link.highlight
                        ? 'bg-amber text-background hover:bg-amber/90'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => {
              const isLastAssistant = i === lastAssistantIdx;
              const showStarters = i === 0 && messages.length === 1 && !isLoading;
              const showFollowups =
                isLastAssistant &&
                i > 0 &&
                !isLoading &&
                msg.suggestions &&
                msg.suggestions.length > 0;
              return (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
                  </div>

                  {showStarters && (
                    <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                      {STARTER_PROBLEMS.map((p) => (
                        <button
                          key={p}
                          onClick={() => sendPreset(p, 'starter')}
                          className="text-[11px] px-3 py-1.5 rounded-full bg-muted hover:bg-amber/20 hover:border-amber border border-border text-foreground transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}

                  {showFollowups && (
                    <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                      {msg.suggestions!.map((s) => (
                        <button
                          key={s}
                          onClick={() => sendPreset(s, 'followup')}
                          className="text-[11px] px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 text-foreground transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Tell me what's broken..."
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky bar */}
      <StickyContactBar />
    </>
  );
};

const StickyContactBar: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const { trackEvent } = useTrackEvent();

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t border-border py-2 px-4 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        <a href="tel:+13173762110" className="flex flex-col items-center gap-1 p-2" onClick={() => trackEvent('click', { label: 'phone', location: 'sticky_bar' })}>
          <Phone className="w-5 h-5 text-amber" />
          <span className="text-[10px] text-muted-foreground">Call</span>
        </a>
        <a href="mailto:aetheris.technology@outlook.com?subject=I%20Need%20Help%20With%20My%20Business" className="flex flex-col items-center gap-1 p-2" onClick={() => trackEvent('click', { label: 'email', location: 'sticky_bar' })}>
          <Mail className="w-5 h-5 text-amber" />
          <span className="text-[10px] text-muted-foreground">Email</span>
        </a>
        <a href="https://www.linkedin.com/in/thejosephtoney" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 p-2" onClick={() => trackEvent('linkedin_click', { location: 'sticky_bar' })}>
          <Linkedin className="w-5 h-5 text-amber" />
          <span className="text-[10px] text-muted-foreground">LinkedIn</span>
        </a>
        <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 bg-primary rounded-lg px-4 py-2" onClick={() => trackEvent('book_meeting_click', { location: 'sticky_bar' })}>
          <Calendar className="w-5 h-5 text-primary-foreground" />
          <span className="text-[10px] font-bold text-primary-foreground">Book</span>
        </a>
      </div>
    </div>
  );
};

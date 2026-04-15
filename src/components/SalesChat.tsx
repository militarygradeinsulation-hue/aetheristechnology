import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, ShoppingCart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-chat`;

const INITIAL_MESSAGE: Msg = {
  role: 'assistant',
  content: "Hey — I'm the Aetheris Sales Advisor. I help business owners figure out exactly what's broken in their digital presence and what to do about it.\n\nWhat's going on in your business? What's the biggest headache right now?",
};

export const SalesChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
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
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && prev.length > 1 && prev[prev.length - 2]?.role === 'user') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
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
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again or call us at (317) 376-2110.' }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

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

  // Custom renderer for checkout links
  const renderContent = (content: string) => {
    // Replace checkout links with buttons
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

  return (
    <>
      {/* Chat toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-xl flex items-center justify-center hover:scale-105 transition-all"
          aria-label="Open sales chat"
        >
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-120px)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div>
              <h3 className="font-bold text-foreground text-sm">Aetheris Sales Advisor</h3>
              <p className="text-[10px] text-muted-foreground">Ask me anything about our services</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
                </div>
              </div>
            ))}
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
    </>
  );
};

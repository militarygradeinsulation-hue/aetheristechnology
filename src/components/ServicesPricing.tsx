import React, { useState, useMemo } from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { Image, Globe, Eye, Search, Wrench, TrendingUp, ShoppingCart, MessageCircle, BarChart3, X, Share2, Phone, Calendar, Mail, Check, Percent } from 'lucide-react';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { Link } from 'react-router-dom';

interface ServiceTile {
  icon: React.ElementType;
  title: string;
  pricing: string;
  priceRaw: number; // cents for bundle calc
  pricingDetail: string;
  priceId?: string;
  badge?: string;
  bundleable?: boolean;
  description: string;
}

const services: ServiceTile[] = [
  { icon: Search, title: 'Full Website Report', pricing: '$49', priceRaw: 4900, pricingDetail: 'one-time', priceId: 'scan_full_report_once', bundleable: true, description: 'Complete AI diagnostic — all gaps, revenue leaks, ROI projections.' },
  { icon: Search, title: 'Digital Snapshot', pricing: '$125', priceRaw: 12500, pricingDetail: 'one-time', priceId: 'digital_snapshot_once', bundleable: true, description: 'Automated report showing where you\'re bleeding revenue online.' },
  { icon: BarChart3, title: 'Strategy Blueprint', pricing: '$299', priceRaw: 29900, pricingDetail: 'one-time', priceId: 'scan_strategy_blueprint_once', badge: 'POPULAR', bundleable: true, description: 'Full report + CRM plan + implementation specs + content calendar.' },
  { icon: Share2, title: 'Social Content Pack', pricing: '$29', priceRaw: 2900, pricingDetail: 'one-time', priceId: 'social_content_pack_once', bundleable: true, description: '10 LinkedIn + 10 Facebook posts + 5 ad hooks from your site.' },
  { icon: Phone, title: 'Sales Script Pack', pricing: '$49', priceRaw: 4900, pricingDetail: 'one-time', priceId: 'sales_script_pack_once', bundleable: true, description: 'Call scripts, objection handlers & follow-up templates.' },
  { icon: Calendar, title: 'Content Calendar', pricing: '$29', priceRaw: 2900, pricingDetail: 'one-time', priceId: 'content_calendar_once', bundleable: true, description: '30 days of topics, hooks, captions & posting times.' },
  { icon: Mail, title: 'Follow-Up Plan', pricing: '$49', priceRaw: 4900, pricingDetail: 'one-time', priceId: 'follow_up_plan_once', bundleable: true, description: '14-day multi-channel sales cadence with templates.' },
  { icon: Image, title: 'Visual Rendering', pricing: '$50–$400', priceRaw: 0, pricingDetail: 'per image', description: 'AI renders with realistic human interaction for your products.' },
  { icon: Globe, title: 'Website Evaluation', pricing: '$500', priceRaw: 50000, pricingDetail: 'one-time', priceId: 'website_evaluation_once', bundleable: true, description: 'Detailed tear-down + strategy call. Delivered in 3–5 days.' },
  { icon: BarChart3, title: 'Full Analytics Package', pricing: '$500', priceRaw: 50000, pricingDetail: 'one-time · was $1,200+', priceId: 'full_analytics_package_once', badge: 'LIMITED', bundleable: true, description: 'Website + social + CRM — the complete picture.' },
  { icon: Eye, title: '14-Day Diagnostic', pricing: '$2,500', priceRaw: 250000, pricingDetail: 'flat', priceId: 'fourteen_day_diagnostic_once', description: 'Find exactly where money is leaking in your operation.' },
  { icon: TrendingUp, title: 'Fractional CTO/CMO', pricing: '$5,000/mo', priceRaw: 500000, pricingDetail: 'monthly', priceId: 'fractional_cto_cmo_monthly', description: 'Ongoing strategic leadership + execution.' },
  { icon: Wrench, title: 'Custom Implementation', pricing: '$25,000+', priceRaw: 0, pricingDetail: 'scoped', description: 'Build the systems that scale you.' },
];

function getDiscount(count: number): number {
  if (count >= 5) return 0.20;
  if (count >= 3) return 0.15;
  if (count >= 2) return 0.10;
  return 0;
}

export const ServicesPricing: React.FC = () => {
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const bundleableServices = useMemo(() => services.map((s, i) => ({ ...s, idx: i })).filter(s => s.bundleable), []);

  const toggleSelect = (idx: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const selectedItems = useMemo(() => bundleableServices.filter(s => selectedIds.has(s.idx)), [selectedIds, bundleableServices]);
  const subtotal = useMemo(() => selectedItems.reduce((sum, s) => sum + s.priceRaw, 0), [selectedItems]);
  const discount = getDiscount(selectedItems.length);
  const discountedTotal = Math.round(subtotal * (1 - discount));

  if (checkoutPriceId) {
    return (
      <div className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm flex items-center justify-center" onClick={() => setCheckoutPriceId(null)}>
        <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={() => setCheckoutPriceId(null)} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" /> Cancel
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <StripeEmbeddedCheckout priceId={checkoutPriceId} returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="relative py-24 px-4 bg-gradient-to-b from-secondary/20 to-background">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-display">
              Services & <span className="text-gradient-amber">Investment</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every service increases conversion or reduces waste. Mix & match for up to 20% off.
            </p>
          </div>
        </RevealOnScroll>

        {/* Tile Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {services.map((service, index) => {
            const isSelected = selectedIds.has(index);
            return (
              <RevealOnScroll key={service.title} delay={0.03 + index * 0.04}>
                <div
                  className={`glass rounded-xl p-4 flex flex-col h-full transition-all duration-200 group relative ${
                    isSelected ? 'border-2 border-primary ring-2 ring-primary/20' : 'border border-border hover:border-primary/40'
                  }`}
                >
                  {service.badge && (
                    <span className="absolute -top-2 right-3 text-[9px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {service.badge}
                    </span>
                  )}

                  {/* Icon + Title */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <service.icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground font-display leading-tight">{service.title}</h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground mb-3 flex-1 leading-relaxed">{service.description}</p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-lg font-bold text-primary font-display">{service.pricing}</span>
                    <span className="text-[10px] text-muted-foreground">{service.pricingDetail}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {service.priceId && (
                      <button
                        onClick={() => setCheckoutPriceId(service.priceId!)}
                        className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-md text-xs font-semibold transition-colors active:scale-[0.97]"
                      >
                        <ShoppingCart className="w-3 h-3" /> Buy
                      </button>
                    )}
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-1.5 glass-hover border border-border px-3 py-1.5 rounded-md text-xs font-medium text-foreground transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" /> Talk
                    </Link>
                    {service.bundleable && (
                      <button
                        onClick={() => toggleSelect(index)}
                        className={`ml-auto w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border hover:border-primary/60'
                        }`}
                        title="Add to bundle"
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>

        {/* Mix & Match Bundle Bar */}
        {selectedItems.length > 0 && (
          <div className="sticky bottom-4 z-50 mt-6">
            <div className="glass border border-primary/30 rounded-xl p-4 md:p-5 max-w-3xl mx-auto shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Percent className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground font-display">
                      Mix & Match Bundle
                      {discount > 0 && (
                        <span className="ml-2 text-xs font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {Math.round(discount * 100)}% OFF
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedItems.length} service{selectedItems.length !== 1 ? 's' : ''} selected
                      {selectedItems.length < 2 && ' · add 1 more for 10% off'}
                      {selectedItems.length === 2 && ' · add 1 more for 15% off'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:ml-auto">
                  <div className="text-right">
                    {discount > 0 && (
                      <div className="text-xs text-muted-foreground line-through">${(subtotal / 100).toFixed(0)}</div>
                    )}
                    <div className="text-xl font-bold text-primary font-display">${(discountedTotal / 100).toFixed(0)}</div>
                  </div>
                  <Link
                    to={`/contact?bundle=${selectedItems.map(s => s.title).join(',')}&total=${discountedTotal}`}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors active:scale-[0.97]"
                  >
                    <ShoppingCart className="w-4 h-4" /> Get Bundle
                  </Link>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Selected items pills */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedItems.map(s => (
                  <span
                    key={s.idx}
                    onClick={() => toggleSelect(s.idx)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-1 rounded-md cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    {s.title} <X className="w-2.5 h-2.5" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <RevealOnScroll delay={0.3}>
          <div className="mt-12 glass p-8 rounded-xl border border-primary/20 text-center">
            <p className="text-xl font-bold text-foreground mb-2 font-display">The Real Question</p>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              It's not "Do I spend $2,500?" — it's "How much is inefficiency already costing me every month?"
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="tel:+13173762110">
                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors active:scale-[0.97]">
                  📞 Call (317) 376-2110
                </button>
              </a>
              <a href="mailto:aetheris.technology@outlook.com?subject=Service%20Inquiry">
                <button className="glass-hover border border-border px-6 py-3 rounded-lg font-semibold text-foreground transition-colors active:scale-[0.97]">
                  ✉️ Email Us
                </button>
              </a>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { type StripeEnv, createStripeClient } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const envParam = url.searchParams.get('env');
    const env: StripeEnv = envParam === 'live' ? 'live' : 'sandbox';
    const stripe = createStripeClient(env);

    // pull active prices, expand product
    const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });

    const catalog = prices.data
      .filter((p: any) => p.product && !p.product.deleted && p.product.active)
      .map((p: any) => {
        const prod = p.product;
        return {
          stripe_price_id: p.id,
          lookup_key: p.lookup_key || p.metadata?.lovable_external_id || null,
          product_id: prod.id,
          product_lookup: prod.metadata?.lovable_external_id || null,
          name: prod.name,
          description: prod.description || null,
          currency: p.currency,
          unit_amount: p.unit_amount ?? 0,
          recurring_interval: p.recurring?.interval || null,
          tax_code: prod.tax_code || null,
          metadata: { ...(prod.metadata || {}), price: p.metadata || {} },
        };
      })
      .sort((a: any, b: any) => (a.unit_amount || 0) - (b.unit_amount || 0));

    return new Response(JSON.stringify({ environment: env, catalog }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('stripe-catalog error', e);
    return new Response(JSON.stringify({ error: (e as Error).message, catalog: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});

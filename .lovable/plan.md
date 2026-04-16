

# Target Industry Research & Campaign Launch Plan

## Consultant Analysis: Who Buys These Services

Based on what Aetheris offers (AI automation, lead generation, CRM, marketing engines, operational diagnostics) and current market data, here are the industries ranked by **likelihood to buy and close**, starting blue collar in Indiana.

### Tier 1 — Highest Close Rate (Blue Collar, Indiana)

These industries are "AI-resistant in the physical work but AI-advantaged everywhere else" — scheduling, marketing, follow-up, lead capture. They desperately need what you sell and most have zero digital presence.

| # | Industry | Search Query for Firecrawl | Why They Close |
|---|----------|---------------------------|----------------|
| 1 | **HVAC contractors** | `HVAC contractors Indianapolis Indiana email contact` | 38% now report measurable AI impact. The rest are falling behind and know it. High ticket ($5K-$15K installs), terrible at follow-up, losing leads to competitors who answer faster. |
| 2 | **Plumbing companies** | `plumbing companies Indiana small business contact email` | Emergency-driven, high volume. Most run on paper or basic scheduling apps. Lead capture is nonexistent after hours. |
| 3 | **Roofing contractors** | `roofing contractors Indianapolis Indiana contact email` | Seasonal, high ticket ($8K-$25K jobs). Storm season = leads flood in, most get lost. No CRM, no follow-up system. |
| 4 | **Landscaping / lawn care** | `landscaping lawn care companies Indiana contact email` | Huge churn problem. Most have a Facebook page and nothing else. Recurring revenue model but no systems to retain clients. |
| 5 | **Excavation / concrete** | `excavation concrete contractors Indiana contact email` | Relationship-driven, zero online presence. Operate on word of mouth alone. One automated system could double their pipeline. |

### Tier 2 — Strong Close Rate (Service-Based, Indiana)

| # | Industry | Search Query | Why They Close |
|---|----------|-------------|----------------|
| 6 | **Auto repair / body shops** | `auto repair shops Indianapolis Indiana contact email` | High repeat business, terrible at reminders and follow-up. Most still use paper invoices. |
| 7 | **Cleaning services (commercial)** | `commercial cleaning companies Indiana contact email` | Low margins, need volume. Automated lead gen and follow-up is exactly what scales them. |
| 8 | **Pest control** | `pest control companies Indiana contact email` | Seasonal surges, recurring revenue. Most miss 40%+ of inbound calls. |
| 9 | **Electrical contractors** | `electrical contractors Indiana small business contact email` | Same profile as HVAC/plumbing. High ticket, poor digital presence, losing to competitors. |
| 10 | **Fence / deck builders** | `fence deck builders Indiana contact email` | Seasonal, estimate-heavy. Most lose leads between quote and close because no follow-up system exists. |

## Implementation Plan

### What I'll Build

A simple admin interface button (or curl-ready setup) that fires `scrape-leads` with pre-configured campaign batches. But more practically, I'll **invoke the first 5 campaigns right now** so prospects start loading today.

### Execution: 5 Firecrawl Searches

Each call to `scrape-leads` with a `searchQuery` targeting a specific industry in Indiana. The function will:
1. Search via Firecrawl for businesses matching the query
2. Extract emails via AI
3. Dedup against existing prospects
4. Generate all 6 personalized emails per prospect in one AI call
5. Queue them for sending on the drip schedule

### Calls to make (in sequence to manage credits):

```text
POST scrape-leads
{
  "industry": "HVAC",
  "location": "Indianapolis, Indiana",
  "searchQuery": "HVAC heating cooling contractors Indianapolis Indiana email contact small business"
}

POST scrape-leads
{
  "industry": "Plumbing",
  "location": "Indiana",
  "searchQuery": "plumbing companies Indiana small business contact email"
}

POST scrape-leads
{
  "industry": "Roofing",
  "location": "Indianapolis, Indiana",
  "searchQuery": "roofing contractors Indianapolis Indiana contact email small business"
}

POST scrape-leads
{
  "industry": "Landscaping",
  "location": "Indiana",
  "searchQuery": "landscaping lawn care companies Indiana contact email small business"
}

POST scrape-leads
{
  "industry": "Auto Repair",
  "location": "Indianapolis, Indiana",
  "searchQuery": "auto repair body shops Indianapolis Indiana contact email"
}
```

### What Happens After Approval

1. I invoke each of these 5 calls against your live `scrape-leads` edge function
2. Each one scrapes, extracts contacts, generates emails, and queues them
3. The `process-drip` cron (every 2 hours) starts sending within the first cycle
4. You'll have prospects loading and emails going out **today**
5. I'll report back the results: how many prospects found, emails queued, any issues

### Cost Estimate

- 5 Firecrawl search calls (uses your existing connector credits)
- ~5 AI extraction calls (flash-lite, minimal cost)
- ~1 AI email generation call per prospect found (flash-lite, single call generates all 6 emails)
- Total: roughly 5-50 AI calls depending on how many contacts are found

### Future Batches

After the first wave, I can run more targeted searches: electrical contractors, pest control, excavation, commercial cleaning. We can also add specific URL lists if you find directories or association pages with member listings.


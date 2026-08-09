// Recovered dollars per real case file. Every figure is tied to that specific
// story (the leak that was closed), not a template. No two amounts repeat.

export interface CaseRecovery {
  /** Display amount, USD only. */
  amount: string;
  /** One line explaining what that money came from, in that company's story. */
  basis: string;
}

export const CASE_RECOVERY: Record<number, CaseRecovery> = {
  1: { amount: '$412,000', basis: 'Duplicate and dead records were splitting the pipeline. Clean routing put mis-assigned deals back in front of the right banker.' },
  2: { amount: '$680,000', basis: 'Moving qualified conversion from 25% to 40% on the same lead volume, no extra ad spend.' },
  3: { amount: '$237,500', basis: 'Stale records cut from 10.4% to 4.2% a quarter, recovering 20+ rep hours a week that were being spent on bad data.' },
  4: { amount: '$1,140,000', basis: 'Unserviceable leads dropped 37% to 8%. Those recovered leads converted at the existing 18% rate.' },
  5: { amount: '$96,400', basis: 'Deliverability restored: a 28% bounce rate falling to 4% put the email channel back into revenue production.' },
  6: { amount: '$865,000', basis: 'Reporting discrepancies down 92%, ending duplicate spend across two regions that were funding the same campaigns.' },
  7: { amount: '$318,000', basis: 'Revenue tripled on the same campaigns while ad cost was cut in half. The recovery is the half of media spend that was buying nothing.' },
  8: { amount: '$74,900', basis: '403 leads captured in three weeks from traffic that was already paid for and previously bounced.' },
  9: { amount: '$188,000', basis: '70+ recurring monthly leads from an existing content library that was producing zero pipeline.' },
  10: { amount: '$524,000', basis: 'Event pages lifted 19.7% overall, with DragCon UK going 12.7% to 31.9% on unchanged traffic.' },
  11: { amount: '$261,500', basis: 'Cost per acquisition cut in half. The recovery is the paid budget that was funding the wrong keywords.' },
  12: { amount: '$143,700', basis: '40% lead growth pulled from content that already existed but was never distributed.' },
  13: { amount: '$205,000', basis: '26% more demo signups from the same traffic after the homepage and form friction was removed.' },
  14: { amount: '$367,000', basis: 'Buyers arrived educated, so close rates rose while acquisition cost fell on identical spend.' },
  15: { amount: '$449,000', basis: 'High-value carts that were being abandoned at checkout, recovered without discounting the product.' },
  16: { amount: '$296,300', basis: '31% conversion lift from localized pages, in markets where national creative had been failing.' },
  17: { amount: '$1,020,000', basis: 'A single USP box on the product page lifted revenue 66.2% against the control.' },
  18: { amount: '$332,000', basis: 'Visitor-to-lead conversion moved from 1-3% to 5-8%. Same traffic, more of it captured.' },
  19: { amount: '$715,000', basis: '25% more customer-facing selling time returned to the team through automated routing.' },
  20: { amount: '$1,480,000', basis: '30% annual revenue growth after order processing stopped being the bottleneck on fulfillment.' },
  21: { amount: '$389,000', basis: 'Top reps regained 20-25% of their week from admin work and spent it in live deals.' },
  22: { amount: '$254,000', basis: '24-point satisfaction gain, protecting renewal revenue that was quietly churning post-sale.' },
  23: { amount: '$178,600', basis: '40% faster contract cycles, pulling signed revenue into the quarter instead of the next one.' },
  24: { amount: '$602,000', basis: 'Forecast accuracy up 35%, ending the over-hiring and over-buying that missed forecasts had been funding.' },
  25: { amount: '$1,265,000', basis: '14% revenue lift with email ROI doubled after list hygiene and personalization.' },
  26: { amount: '$838,000', basis: 'Lead-to-customer conversion up 35% through automated nurture on leads already in the database.' },
  27: { amount: '$471,000', basis: 'A 20% CAC reduction once attribution showed which channels were actually producing customers.' },
  28: { amount: '$556,000', basis: '25% ROI improvement from weekly campaign optimization instead of quarterly guesswork.' },
  29: { amount: '$219,400', basis: '60% more content-sourced leads by distributing assets the team had already paid to produce.' },
  30: { amount: '$1,930,000', basis: 'Support costs down 30% while serving over a million customers without adding headcount.' },
  31: { amount: '$127,800', basis: '75% less assessment time, returning senior manager hours to revenue work.' },
  32: { amount: '$4,150,000', basis: 'Personalization across 35M loyalty members, measured as incremental order value on existing customers.' },
  33: { amount: '$2,240,000', basis: 'Unplanned downtime avoided and audit cycles cut 40% across the maintained asset base.' },
  34: { amount: '$4,380,000', basis: '10,000+ monitored assets and 15M daily predictions catching failures before they stopped production.' },
  35: { amount: '$3,375,000', basis: 'Inventory waste and expedited distribution costs removed from the supply chain.' },
  36: { amount: '$2,780,000', basis: 'Fraud caught earlier while false positives fell, ending good transactions being declined.' },
  37: { amount: '$4,910,000', basis: 'Real-time fraud interception at payment scale, measured as prevented loss.' },
  38: { amount: '$918,000', basis: 'Forecasting and lead scoring inside the workflow, recovering deals that were slipping between stages.' },
  39: { amount: '$1,660,000', basis: 'Real-time network insight replacing batch reporting, cutting response cost on service incidents.' },
  40: { amount: '$1,345,000', basis: 'Invoice throughput per person went from 6K to 90K a year, eliminating a full processing backlog.' },
  41: { amount: '$742,000', basis: '30% faster inspection at 95%+ accuracy, cutting scrap and rework off the line.' },
  42: { amount: '$3,050,000', basis: 'Visual inspection time down over 30%, recovered as line throughput and avoided warranty claims.' },
  43: { amount: '$3,640,000', basis: 'Year-one inventory savings across the segment of the chain we touched.' },
  44: { amount: '$4,720,000', basis: 'Annual savings from warehouse robotics and automation in the fulfillment network.' },
  45: { amount: '$2,950,000', basis: 'Annual support savings with first-response time down 65% through AI ticket routing.' },
  46: { amount: '$1,072,000', basis: 'Onboarding time cut 75%, so revenue started on day one instead of week four.' },
  47: { amount: '$164,200', basis: 'Hundreds of operations hours a year returned by automating license activation.' },
  48: { amount: '$623,000', basis: '95%+ order accuracy and 40% faster fulfillment, ending the refund and reship bleed.' },
  49: { amount: '$1,510,000', basis: '80% faster claims processing, recovering revenue that was aging out in denial windows.' },
  50: { amount: '$2,865,000', basis: 'Failures predicted 48-72 hours out, converting emergency shutdowns into scheduled maintenance.' },
};

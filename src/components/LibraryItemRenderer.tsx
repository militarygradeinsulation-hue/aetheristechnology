import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Copy, Check, Linkedin, Facebook, Megaphone, Phone, Mail, Calendar,
  MessageCircle, AlertTriangle, Search, Globe, TrendingDown, TrendingUp,
  Stethoscope, Sparkles, Target, Users, DollarSign, Briefcase, Lightbulb,
  ChevronRight, Zap,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { AdminLibraryItem } from '@/lib/adminLibrary';

const copyText = (text: string, setCopiedId: (id: string | null) => void, id: string) => {
  navigator.clipboard.writeText(text);
  setCopiedId(id);
  setTimeout(() => setCopiedId(null), 1800);
  toast({ title: 'Copied!' });
};

const CopyBtn = ({ text, id, copiedId, setCopiedId }: any) => (
  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 absolute top-2 right-2"
    onClick={() => copyText(text, setCopiedId, id)}>
    {copiedId === id ? <Check className="w-3.5 h-3.5 text-amber" /> : <Copy className="w-3.5 h-3.5" />}
  </Button>
);

const SectionTitle = ({ icon: Icon, label, count, color = 'text-amber' }: any) => (
  <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
    <Icon className={`w-5 h-5 ${color}`} />
    <h4 className="text-lg font-bold text-foreground font-display">{label}</h4>
    {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
  </div>
);

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/20',
  high: 'text-amber bg-amber/20',
  moderate: 'text-primary bg-primary/20',
  medium: 'text-primary bg-primary/20',
  low: 'text-muted-foreground bg-muted/30',
};

const URGENCY_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/20',
  high: 'text-amber bg-amber/20',
  medium: 'text-primary bg-primary/20',
  low: 'text-muted-foreground bg-muted/30',
};

const ScoreGauge = ({ score, max = 100, label, invert = false }: { score: number; max?: number; label: string; invert?: boolean }) => {
  // invert=true means LOWER scores are better (e.g. friction)
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const good = invert ? pct < 40 : pct >= 70;
  const mid = invert ? pct < 70 : pct >= 40;
  const color = good ? 'text-green-400' : mid ? 'text-amber' : 'text-red-400';
  return (
    <div className="glass rounded-xl p-6 border border-border text-center">
      <h3 className="text-lg font-bold text-foreground font-display mb-2">{label}</h3>
      <div className={`text-5xl font-bold font-display ${color}`}>
        {score}<span className="text-xl text-muted-foreground">/{max}</span>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// SOCIAL CONTENT
// ────────────────────────────────────────────────────────────────────────────
const PostCard = ({ post, id, copiedId, setCopiedId }: any) => {
  const text = `${post.hook || ''}\n\n${post.body || ''}\n\n${post.cta || ''}`.trim();
  return (
    <div className="relative glass rounded-lg p-4 border border-border">
      <CopyBtn text={text} id={id} copiedId={copiedId} setCopiedId={setCopiedId} />
      {post.hook && <p className="text-sm font-bold text-amber mb-2 pr-8">{post.hook}</p>}
      {post.body && <p className="text-sm text-muted-foreground whitespace-pre-line mb-2">{post.body}</p>}
      {post.cta && <p className="text-xs text-primary font-semibold">{post.cta}</p>}
    </div>
  );
};

const SoftFrontDoor = ({ s }: { s: any }) => {
  if (!s) return null;
  return (
    <div className="mt-3 pt-3 border-t border-border/60 space-y-1">
      {s.publicCta && <p className="text-xs text-primary font-semibold">CTA: {s.publicCta}</p>}
      {s.keyword && <p className="text-[11px] text-muted-foreground"><span className="text-amber font-bold">Keyword:</span> {s.keyword}</p>}
      {s.assetName && <p className="text-[11px] text-muted-foreground"><span className="text-amber font-bold">Asset:</span> {s.assetName}</p>}
      {s.dmScript && <p className="text-[11px] text-muted-foreground"><span className="text-amber font-bold">DM:</span> {s.dmScript}</p>}
      {s.followUpQuestion && <p className="text-[11px] text-muted-foreground"><span className="text-amber font-bold">Follow-up:</span> {s.followUpQuestion}</p>}
    </div>
  );
};

const ForensicCard = ({ children, copyText, id, copiedId, setCopiedId }: any) => (
  <div className="relative glass rounded-lg p-4 border border-border">
    <CopyBtn text={copyText} id={id} copiedId={copiedId} setCopiedId={setCopiedId} />
    {children}
  </div>
);

const SocialContentView = ({ data, copiedId, setCopiedId }: any) => {
  const hasForensic =
    data.caseFiles?.length || data.leakOfTheWeek?.length || data.deadSimpleDiagnostics?.length ||
    data.operatorsJournal?.length || data.contrarians?.length || data.weeklySchedule?.length;

  return (
    <div>
      {data.businessName && <p className="text-sm text-muted-foreground mb-4">For <span className="text-amber font-semibold">{data.businessName}</span></p>}

      {hasForensic ? (
        <>
          {data.weeklySchedule?.length > 0 && (
            <>
              <SectionTitle icon={Calendar} label="Weekly Schedule" count={data.weeklySchedule.length} />
              <div className="grid md:grid-cols-2 gap-2">
                {data.weeklySchedule.map((s: any, i: number) => (
                  <div key={`ws-${i}`} className="glass rounded-lg p-3 border border-border">
                    <p className="text-sm font-bold text-amber">{s.day} · <span className="text-primary">{s.format}</span></p>
                    {s.goal && <p className="text-xs text-muted-foreground mt-1">{s.goal}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          {data.caseFiles?.length > 0 && (
            <>
              <SectionTitle icon={Search} label="Case Files" count={data.caseFiles.length} color="text-amber" />
              <div className="space-y-3">
                {data.caseFiles.map((c: any, i: number) => (
                  <ForensicCard key={`cf-${i}`} id={`cf-${i}`} copiedId={copiedId} setCopiedId={setCopiedId}
                    copyText={`${c.hook || ''}\n\nFinding: ${c.finding || ''}\nEvidence: ${c.evidence || ''}\nMath: ${c.math || ''}\nFix: ${c.fixTease || ''}\nLesson: ${c.lesson || ''}\n\n${c.softFrontDoor?.publicCta || ''}`}>
                    <p className="text-[10px] uppercase font-mono text-primary mb-2 pr-8">
                      {[c.caseId, c.status, c.isAutopsy && 'AUTOPSY'].filter(Boolean).join(' · ')}
                    </p>
                    {c.hook && <p className="text-sm font-bold text-amber mb-2 pr-8">{c.hook}</p>}
                    {c.finding && <p className="text-xs text-muted-foreground"><span className="text-amber font-bold">Finding:</span> {c.finding}</p>}
                    {c.evidence && <p className="text-xs text-muted-foreground mt-1"><span className="text-amber font-bold">Evidence:</span> {c.evidence}</p>}
                    {c.math && <p className="text-xs text-red-400 mt-1"><span className="font-bold">Math:</span> {c.math}</p>}
                    {c.fixTease && <p className="text-xs text-muted-foreground mt-1"><span className="text-amber font-bold">Fix:</span> {c.fixTease}</p>}
                    {c.lesson && <p className="text-xs text-muted-foreground mt-1"><span className="text-amber font-bold">Lesson:</span> {c.lesson}</p>}
                    {Array.isArray(c.carouselSlides) && c.carouselSlides.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-primary cursor-pointer">Carousel — {c.carouselSlides.length} slides</summary>
                        <div className="mt-2 space-y-1 pl-2 border-l border-border">
                          {c.carouselSlides.map((sl: any, idx: number) => (
                            <div key={idx} className="text-xs">
                              <p className="font-bold text-foreground">Slide {sl.slideNumber} — {sl.headline}</p>
                              {sl.body && <p className="text-muted-foreground">{sl.body}</p>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    <SoftFrontDoor s={c.softFrontDoor} />
                  </ForensicCard>
                ))}
              </div>
            </>
          )}

          {data.leakOfTheWeek?.length > 0 && (
            <>
              <SectionTitle icon={AlertTriangle} label="Leak of the Week" count={data.leakOfTheWeek.length} />
              <div className="space-y-3">
                {data.leakOfTheWeek.map((l: any, i: number) => (
                  <ForensicCard key={`lw-${i}`} id={`lw-${i}`} copiedId={copiedId} setCopiedId={setCopiedId}
                    copyText={`${l.leakName || ''}\n${l.definition || ''}\n\nSigns:\n${(l.signs || []).map((s: string) => `- ${s}`).join('\n')}\n\nSpot it: ${l.spotIt || ''}`}>
                    {l.leakName && <p className="text-sm font-bold text-amber mb-1 pr-8">{l.leakName}</p>}
                    {l.definition && <p className="text-xs text-muted-foreground mb-2">{l.definition}</p>}
                    {Array.isArray(l.signs) && l.signs.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-0.5 mb-2 list-disc pl-4">
                        {l.signs.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                      </ul>
                    )}
                    {l.spotIt && <p className="text-xs text-muted-foreground"><span className="text-amber font-bold">How to spot it:</span> {l.spotIt}</p>}
                    <SoftFrontDoor s={l.softFrontDoor} />
                  </ForensicCard>
                ))}
              </div>
            </>
          )}

          {data.deadSimpleDiagnostics?.length > 0 && (
            <>
              <SectionTitle icon={Stethoscope} label="Dead Simple Diagnostics" count={data.deadSimpleDiagnostics.length} />
              <div className="space-y-3">
                {data.deadSimpleDiagnostics.map((t: any, i: number) => (
                  <ForensicCard key={`ds-${i}`} id={`ds-${i}`} copiedId={copiedId} setCopiedId={setCopiedId}
                    copyText={`${t.testName || ''}\n${Array.isArray(t.test) ? t.test.map((s: string, idx: number) => `${idx + 1}. ${s}`).join('\n') : (t.test || '')}\n\nThreshold: ${t.threshold || ''}\nMeans: ${t.whatItMeans || ''}`}>
                    {t.testName && <p className="text-sm font-bold text-amber mb-2 pr-8">{t.testName}</p>}
                    {Array.isArray(t.test) ? (
                      <ol className="text-xs text-muted-foreground space-y-0.5 mb-2 list-decimal pl-4">
                        {t.test.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                      </ol>
                    ) : t.test ? <p className="text-xs text-muted-foreground mb-2">{t.test}</p> : null}
                    {t.threshold && <p className="text-xs text-muted-foreground"><span className="text-amber font-bold">Threshold:</span> {t.threshold}</p>}
                    {t.whatItMeans && <p className="text-xs text-muted-foreground mt-1"><span className="text-amber font-bold">What it means:</span> {t.whatItMeans}</p>}
                    <SoftFrontDoor s={t.softFrontDoor} />
                  </ForensicCard>
                ))}
              </div>
            </>
          )}

          {data.operatorsJournal?.length > 0 && (
            <>
              <SectionTitle icon={Lightbulb} label="Operator's Journal" count={data.operatorsJournal.length} />
              <div className="grid md:grid-cols-2 gap-3">
                {data.operatorsJournal.map((j: any, i: number) => (
                  <ForensicCard key={`oj-${i}`} id={`oj-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} copyText={j.body || ''}>
                    <p className="text-[10px] uppercase font-mono text-primary mb-2 pr-8">Field Note {i + 1}</p>
                    {j.body && <p className="text-sm text-foreground whitespace-pre-line">{j.body}</p>}
                  </ForensicCard>
                ))}
              </div>
            </>
          )}

          {data.contrarians?.length > 0 && (
            <>
              <SectionTitle icon={Zap} label="Contrarian" count={data.contrarians.length} />
              <div className="space-y-3">
                {data.contrarians.map((c: any, i: number) => (
                  <ForensicCard key={`co-${i}`} id={`co-${i}`} copiedId={copiedId} setCopiedId={setCopiedId}
                    copyText={`Claim: ${c.claim || ''}\nEvidence: ${c.evidence || ''}\nCounter: ${c.counter || ''}\nPosition: ${c.position || ''}`}>
                    {c.claim && <p className="text-sm text-muted-foreground pr-8"><span className="text-amber font-bold">Claim:</span> {c.claim}</p>}
                    {c.evidence && <p className="text-sm text-muted-foreground mt-1"><span className="text-amber font-bold">Evidence:</span> {c.evidence}</p>}
                    {c.counter && <p className="text-sm text-muted-foreground mt-1"><span className="text-amber font-bold">Counter:</span> {c.counter}</p>}
                    {c.position && <p className="text-sm font-bold text-foreground mt-1"><span className="text-amber font-bold">Position:</span> {c.position}</p>}
                    <SoftFrontDoor s={c.softFrontDoor} />
                  </ForensicCard>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {data.linkedinPosts?.length > 0 && (
            <>
              <SectionTitle icon={Linkedin} label="LinkedIn Posts" count={data.linkedinPosts.length} color="text-blue-400" />
              <div className="grid md:grid-cols-2 gap-3">
                {data.linkedinPosts.map((p: any, i: number) => <PostCard key={`li-${i}`} post={p} id={`li-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />)}
              </div>
            </>
          )}
          {data.facebookPosts?.length > 0 && (
            <>
              <SectionTitle icon={Facebook} label="Facebook Posts" count={data.facebookPosts.length} color="text-blue-500" />
              <div className="grid md:grid-cols-2 gap-3">
                {data.facebookPosts.map((p: any, i: number) => <PostCard key={`fb-${i}`} post={p} id={`fb-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />)}
              </div>
            </>
          )}
          {data.adHooks?.length > 0 && (
            <>
              <SectionTitle icon={Megaphone} label="Ad Hooks" count={data.adHooks.length} />
              <div className="grid md:grid-cols-2 gap-3">
                {data.adHooks.map((h: any, i: number) => {
                  const text = `${h.headline}\n${h.subheadline}\n${h.cta}`;
                  return (
                    <div key={`ad-${i}`} className="relative glass rounded-lg p-4 border border-border">
                      <CopyBtn text={text} id={`ad-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
                      <p className="text-base font-bold text-foreground mb-1 pr-8">{h.headline}</p>
                      <p className="text-sm text-muted-foreground mb-2">{h.subheadline}</p>
                      <p className="text-xs text-primary font-semibold">{h.cta}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};


// ────────────────────────────────────────────────────────────────────────────
// CONTENT CALENDAR
// ────────────────────────────────────────────────────────────────────────────
const ContentCalendarView = ({ data, copiedId, setCopiedId }: any) => {
  const days = data.days || [];
  return (
    <div>
      <SectionTitle icon={Calendar} label="30-Day Calendar" count={days.length} />
      <div className="space-y-2">
        {days.map((day: any, i: number) => {
          const text = `Day ${day.day}: ${day.topic}\nHook: ${day.hook}\n${day.caption}\n${(day.hashtags || []).map((h: string) => `#${h.replace('#', '')}`).join(' ')}`;
          return (
            <div key={i} className="relative glass rounded-lg p-4 border border-border">
              <CopyBtn text={text} id={`d-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
              <div className="flex items-center gap-2 mb-2 flex-wrap pr-8">
                <span className="text-xs font-bold text-background bg-amber rounded-full w-6 h-6 flex items-center justify-center">{day.day}</span>
                {day.platform && <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{day.platform}</span>}
                {day.contentType && <span className="text-xs text-muted-foreground">{day.contentType}</span>}
                {day.bestTime && <span className="text-xs text-muted-foreground">· {day.bestTime}</span>}
              </div>
              {day.topic && <h5 className="text-sm font-bold text-foreground mb-1">{day.topic}</h5>}
              {day.hook && <p className="text-sm text-amber font-semibold mb-1">"{day.hook}"</p>}
              {day.caption && <p className="text-xs text-muted-foreground">{day.caption}</p>}
              {day.hashtags?.length > 0 && (
                <p className="text-xs text-primary mt-1">{day.hashtags.map((h: string) => `#${h.replace('#', '')}`).join(' ')}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// SALES SCRIPTS
// ────────────────────────────────────────────────────────────────────────────
const SalesScriptsView = ({ data, copiedId, setCopiedId }: any) => {
  const sections = [
    { key: 'coldCalls', label: 'Cold Call Scripts', icon: Phone },
    { key: 'emailScripts', label: 'Email Scripts', icon: Mail },
    { key: 'objectionHandlers', label: 'Objection Handlers', icon: MessageCircle },
    { key: 'closingScripts', label: 'Closing Scripts', icon: Check },
  ];
  return (
    <div>
      {sections.map(({ key, label, icon }) => {
        const arr = data[key];
        if (!arr?.length) return null;
        return (
          <React.Fragment key={key}>
            <SectionTitle icon={icon} label={label} count={arr.length} />
            <div className="space-y-3">
              {arr.map((item: any, i: number) => {
                const text = typeof item === 'string' ? item : (item.script || item.body || JSON.stringify(item, null, 2));
                const id = `${key}-${i}`;
                return (
                  <div key={id} className="relative glass rounded-lg p-4 border border-border">
                    <CopyBtn text={text} id={id} copiedId={copiedId} setCopiedId={setCopiedId} />
                    {item.title && <p className="text-sm font-bold text-amber mb-2 pr-8">{item.title}</p>}
                    {item.scenario && <p className="text-xs uppercase text-primary mb-2">{item.scenario}</p>}
                    {item.objection && <p className="text-sm font-bold text-foreground mb-1 pr-8">"{item.objection}"</p>}
                    {item.subject && <p className="text-sm font-bold text-foreground mb-1 pr-8">Subject: {item.subject}</p>}
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{text}</p>
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// FOLLOW-UP PLAN
// ────────────────────────────────────────────────────────────────────────────
const FollowUpPlanView = ({ data, copiedId, setCopiedId }: any) => {
  const days = data.days || data.steps || data.touches || data.plan || [];
  const objections = data.objectionResponses || [];
  return (
    <div className="space-y-6">
      {data.overview && (
        <div className="glass rounded-xl p-5 border border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
        </div>
      )}

      <div>
        <SectionTitle icon={Calendar} label="Follow-Up Sequence" count={days.length} />
        <div className="space-y-3">
          {days.map((s: any, i: number) => {
            const dayNum = s.day || s.dayNumber || i + 1;
            const body = s.template || s.message || s.body || s.script || '';
            const text = `Day ${dayNum} — ${s.channel || ''} (${s.timing || ''})\n${s.action ? `Action: ${s.action}\n` : ''}${s.subject ? `Subject: ${s.subject}\n` : ''}${body}\n${s.tips ? `\nTips: ${s.tips}` : ''}`;
            return (
              <div key={i} className="relative glass rounded-lg p-4 border border-border">
                <CopyBtn text={text} id={`fu-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
                <div className="flex items-center gap-2 mb-2 flex-wrap pr-8">
                  <span className="text-xs font-bold text-background bg-amber rounded-full px-2 py-0.5">Day {dayNum}</span>
                  {s.channel && <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{s.channel}</span>}
                  {s.timing && <span className="text-xs text-muted-foreground">{s.timing}</span>}
                </div>
                {s.action && <p className="text-sm font-bold text-amber mb-2">{s.action}</p>}
                {s.goal && <p className="text-xs text-muted-foreground mb-2"><span className="text-amber font-semibold">Goal: </span>{s.goal}</p>}
                {s.subject && <p className="text-sm font-bold text-foreground mb-1">Subject: {s.subject}</p>}
                {body && <p className="text-sm text-muted-foreground whitespace-pre-line">{body}</p>}
                {s.tips && (
                  <div className="mt-3 bg-primary/5 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Tips</p>
                    <p className="text-xs text-muted-foreground">{s.tips}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {objections.length > 0 && (
        <div>
          <SectionTitle icon={MessageCircle} label="Objection Responses" count={objections.length} />
          <div className="space-y-3">
            {objections.map((o: any, i: number) => {
              const text = `Objection: ${o.trigger || o.objection || ''}\nResponse: ${o.response || ''}`;
              return (
                <div key={i} className="relative glass rounded-lg p-4 border border-border">
                  <CopyBtn text={text} id={`obj-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
                  <p className="text-sm font-bold text-red-400 mb-2 pr-8">"{o.trigger || o.objection}"</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{o.response}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// STRATEGIC QUESTIONS
// ────────────────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, { label: string; icon: any }> = {
  leadership: { label: 'Leadership', icon: Users },
  sales: { label: 'Sales', icon: TrendingUp },
  marketing: { label: 'Marketing', icon: Megaphone },
  operations: { label: 'Operations', icon: Briefcase },
  hiringAndPeople: { label: 'Hiring & People', icon: Users },
  pricingAndOffer: { label: 'Pricing & Offer', icon: DollarSign },
  customerJourney: { label: 'Customer Journey', icon: Target },
  growthAndExpansion: { label: 'Growth & Expansion', icon: TrendingUp },
};

const StrategicQuestionsView = ({ data, copiedId, setCopiedId }: any) => {
  const top10 = data.top10CriticalQuestions || data.questions || data.strategicQuestions || [];
  const categories = data.categories || {};
  const probably = data.questionsYouProbablyArentAsking || [];
  const team = data.leadershipTeamDiscussion || [];
  const workshop = data.workshopPrompts || [];

  return (
    <div className="space-y-6">
      {data.companySnapshot && (
        <div className="glass rounded-xl p-5 border border-border">
          <h4 className="text-xs font-bold text-amber uppercase tracking-wide mb-2">Company Snapshot</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.companySnapshot}</p>
        </div>
      )}

      {top10.length > 0 && (
        <div>
          <SectionTitle icon={Search} label="Top 10 Critical Questions" count={top10.length} />
          <div className="space-y-3">
            {top10.map((q: any, i: number) => {
              const qText = typeof q === 'string' ? q : (q.question || q.text || '');
              const text = `${i + 1}. ${qText}${q.whyItMatters ? `\n\nWhy it matters: ${q.whyItMatters}` : ''}`;
              return (
                <div key={i} className="relative glass rounded-lg p-4 border border-border">
                  <CopyBtn text={text} id={`q-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
                  <div className="flex items-start justify-between gap-2 mb-2 pr-8">
                    <p className="text-sm font-bold text-foreground">{i + 1}. {qText}</p>
                    {q.urgency && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${URGENCY_COLORS[q.urgency] || URGENCY_COLORS.medium}`}>
                        {q.urgency}
                      </span>
                    )}
                  </div>
                  {q.category && <p className="text-[10px] uppercase text-primary font-bold mb-2">{q.category}</p>}
                  {q.whyItMatters && (
                    <p className="text-xs text-muted-foreground"><span className="text-amber font-semibold">Why it matters: </span>{q.whyItMatters}</p>
                  )}
                  {q.purpose && !q.whyItMatters && (
                    <p className="text-xs text-muted-foreground"><span className="text-amber font-semibold">Why: </span>{q.purpose}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Object.keys(categories).length > 0 && (
        <div>
          <SectionTitle icon={Briefcase} label="Questions by Category" />
          <div className="space-y-4">
            {Object.entries(categories).map(([key, qs]: [string, any]) => {
              const meta = CATEGORY_LABELS[key] || { label: key, icon: Briefcase };
              const Icon = meta.icon;
              const arr: any[] = Array.isArray(qs) ? qs : [];
              if (arr.length === 0) return null;
              return (
                <div key={key} className="glass rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-amber" />
                    <h5 className="text-sm font-bold text-foreground uppercase tracking-wide">{meta.label}</h5>
                    <span className="text-xs text-muted-foreground">({arr.length})</span>
                  </div>
                  <ul className="space-y-2">
                    {arr.map((q: any, i: number) => {
                      const qText = typeof q === 'string' ? q : (q.question || q.text || '');
                      return (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{qText}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {probably.length > 0 && (
        <div>
          <SectionTitle icon={Lightbulb} label="Questions You Probably Aren't Asking" count={probably.length} color="text-amber" />
          <div className="space-y-2">
            {probably.map((q: any, i: number) => {
              const qText = typeof q === 'string' ? q : (q.question || q.text || '');
              return (
                <div key={i} className="glass rounded-lg p-3 border border-amber/30 bg-amber/5">
                  <p className="text-sm text-foreground">{qText}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {team.length > 0 && (
        <div>
          <SectionTitle icon={Users} label="Leadership Team Discussion" count={team.length} />
          <ul className="space-y-2">
            {team.map((q: any, i: number) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2 glass rounded-lg p-3 border border-border">
                <span className="text-amber font-bold flex-shrink-0">{i + 1}.</span>
                <span>{typeof q === 'string' ? q : (q.question || q.text || '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {workshop.length > 0 && (
        <div>
          <SectionTitle icon={Sparkles} label="Workshop Prompts" count={workshop.length} />
          <ul className="space-y-2">
            {workshop.map((q: any, i: number) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2 glass rounded-lg p-3 border border-border">
                <span className="text-primary font-bold flex-shrink-0">→</span>
                <span>{typeof q === 'string' ? q : (q.question || q.text || q.prompt || '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// BRAND CONTRADICTIONS
// ────────────────────────────────────────────────────────────────────────────
const BrandContradictionsView = ({ data, copiedId, setCopiedId }: any) => {
  const items = data.contradictions || data.findings || [];
  const score = data.contradictionScore;
  return (
    <div className="space-y-6">
      {(score !== undefined || data.overallAssessment) && (
        <div className="glass rounded-xl p-6 border border-border text-center">
          <h3 className="text-lg font-bold text-foreground font-display mb-2">Brand Alignment Score</h3>
          {score !== undefined && (
            <div className={`text-5xl font-bold font-display mb-2 ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber' : 'text-red-400'}`}>
              {score}<span className="text-xl text-muted-foreground">/100</span>
            </div>
          )}
          {data.businessName && <p className="text-xs text-muted-foreground mb-2">{data.businessName}</p>}
          {data.overallAssessment && <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{data.overallAssessment}</p>}
        </div>
      )}

      <div>
        <SectionTitle icon={AlertTriangle} label="Brand Contradictions" count={items.length} color="text-red-400" />
        <div className="space-y-4">
          {items.map((c: any, i: number) => {
            const title = c.title || c.contradiction;
            const fix = c.fix || c.recommendedFix || c.recommendation;
            const text = `${title}\n${c.description || ''}\nEmotional Impact: ${c.emotionalImpact || ''}\nBuyer Perception: ${c.buyerPerception || ''}\nFix: ${fix || ''}\nBefore: ${c.beforeAfter?.before || ''}\nAfter: ${c.beforeAfter?.after || ''}`;
            return (
              <div key={i} className="relative glass rounded-lg p-5 border border-border">
                <CopyBtn text={text} id={`bc-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
                <div className="flex items-start justify-between mb-2 pr-8 gap-2">
                  {title && <p className="text-sm font-bold text-red-400">{title}</p>}
                  {c.severity && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.moderate}`}>
                      {c.severity}
                    </span>
                  )}
                </div>
                {c.description && <p className="text-sm text-muted-foreground mb-3">{c.description}</p>}
                {c.claim && <p className="text-xs text-muted-foreground mb-1"><span className="text-amber font-semibold">Claim: </span>{c.claim}</p>}
                {c.reality && <p className="text-xs text-muted-foreground mb-1"><span className="text-amber font-semibold">Reality: </span>{c.reality}</p>}
                {(c.emotionalImpact || c.buyerPerception) && (
                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    {c.emotionalImpact && (
                      <div className="bg-red-500/5 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Emotional Impact</p>
                        <p className="text-xs text-muted-foreground">{c.emotionalImpact}</p>
                      </div>
                    )}
                    {c.buyerPerception && (
                      <div className="bg-amber/5 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-amber uppercase mb-1">Buyer Perception</p>
                        <p className="text-xs text-muted-foreground">{c.buyerPerception}</p>
                      </div>
                    )}
                  </div>
                )}
                {fix && (
                  <div className="bg-primary/5 rounded-lg p-3 mb-3">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Recommended Fix</p>
                    <p className="text-xs text-muted-foreground">{fix}</p>
                  </div>
                )}
                {c.beforeAfter && (c.beforeAfter.before || c.beforeAfter.after) && (
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    {c.beforeAfter.before && (
                      <div className="bg-red-500/5 rounded-lg p-2">
                        <span className="font-bold text-red-400">Before: </span>
                        <span className="text-muted-foreground">{c.beforeAfter.before}</span>
                      </div>
                    )}
                    {c.beforeAfter.after && (
                      <div className="bg-green-500/5 rounded-lg p-2">
                        <span className="font-bold text-green-400">After: </span>
                        <span className="text-muted-foreground">{c.beforeAfter.after}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {Array.isArray(data.priorityFixes) && data.priorityFixes.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground font-display mb-3 uppercase tracking-wide">Priority Fixes</h4>
          <div className="space-y-2">
            {data.priorityFixes.map((f: string, i: number) => (
              <div key={i} className="glass rounded-lg p-3 border border-border flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <p className="text-sm text-muted-foreground">{f}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(data.hiddenStrengths) && data.hiddenStrengths.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground font-display mb-3 uppercase tracking-wide">Hidden Strengths</h4>
          <div className="space-y-2">
            {data.hiddenStrengths.map((s: string, i: number) => (
              <div key={i} className="glass rounded-lg p-3 border border-green-500/20">
                <p className="text-sm text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// FRICTION AUDIT
// ────────────────────────────────────────────────────────────────────────────
const FrictionAuditView = ({ data, copiedId, setCopiedId }: any) => {
  const flagged = data.flaggedPhrases || data.findings || data.frictionPoints || data.audit || [];
  const tone = data.toneAlignment;
  const ctas = data.strongerCTAs || [];
  const priorityFixes = data.topPriorityFixes || data.priorityFixes || [];
  const strengths = data.copyStrengths || [];
  const score = data.frictionScore;

  return (
    <div className="space-y-6">
      {(score !== undefined || data.overallAssessment) && (
        <div className="glass rounded-xl p-6 border border-border text-center">
          <h3 className="text-lg font-bold text-foreground font-display mb-2">Friction Score</h3>
          {score !== undefined && (
            <div className={`text-5xl font-bold font-display mb-2 ${score < 40 ? 'text-green-400' : score < 70 ? 'text-amber' : 'text-red-400'}`}>
              {score}<span className="text-xl text-muted-foreground">/100</span>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground uppercase mb-2">(lower is better)</p>
          {data.overallAssessment && <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{data.overallAssessment}</p>}
        </div>
      )}

      {flagged.length > 0 && (
        <div>
          <SectionTitle icon={AlertTriangle} label="Flagged Phrases" count={flagged.length} color="text-amber" />
          <div className="space-y-3">
            {flagged.map((f: any, i: number) => {
              const phrase = f.originalPhrase || f.phrase || f.term || f.title;
              const replacement = f.suggestedReplacement || f.suggestion || f.replacement;
              const issue = f.issue || f.problem;
              const text = `"${phrase}"\nIssue: ${issue}\nReplace with: "${replacement}"\n${f.context ? `Context: ${f.context}` : ''}`;
              return (
                <div key={i} className="relative glass rounded-lg p-4 border border-border">
                  <CopyBtn text={text} id={`fr-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
                  <div className="flex items-start justify-between gap-2 mb-2 pr-8">
                    {phrase && <p className="text-sm font-bold text-amber">"{phrase}"</p>}
                    {f.severity && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.moderate}`}>
                        {f.severity}
                      </span>
                    )}
                  </div>
                  {f.category && <p className="text-[10px] uppercase text-primary font-bold mb-2">{f.category}</p>}
                  {issue && <p className="text-xs text-muted-foreground mb-2"><span className="text-red-400 font-semibold">Issue: </span>{issue}</p>}
                  {replacement && (
                    <div className="bg-green-500/5 rounded-lg p-3 mb-2">
                      <p className="text-[10px] font-bold text-green-400 uppercase mb-1">Replace With</p>
                      <p className="text-xs text-foreground">"{replacement}"</p>
                    </div>
                  )}
                  {f.context && <p className="text-xs text-muted-foreground italic">Context: {f.context}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tone && (
        <div>
          <SectionTitle icon={MessageCircle} label="Tone Alignment" />
          <div className="glass rounded-lg p-5 border border-border space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              {tone.currentTone && (
                <div className="bg-red-500/5 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Current Tone</p>
                  <p className="text-xs text-muted-foreground">{tone.currentTone}</p>
                </div>
              )}
              {tone.desiredTone && (
                <div className="bg-green-500/5 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-green-400 uppercase mb-1">Desired Tone</p>
                  <p className="text-xs text-muted-foreground">{tone.desiredTone}</p>
                </div>
              )}
            </div>
            {tone.gap && <p className="text-xs text-muted-foreground"><span className="text-amber font-semibold">Gap: </span>{tone.gap}</p>}
            {Array.isArray(tone.recommendations) && tone.recommendations.length > 0 && (
              <ul className="space-y-1">
                {tone.recommendations.map((r: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {ctas.length > 0 && (
        <div>
          <SectionTitle icon={Zap} label="Stronger CTAs" count={ctas.length} />
          <div className="grid md:grid-cols-2 gap-3">
            {ctas.map((c: any, i: number) => (
              <div key={i} className="glass rounded-lg p-4 border border-border">
                <div className="bg-red-500/5 rounded-lg p-2 mb-2">
                  <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Current</p>
                  <p className="text-xs text-muted-foreground">"{c.current}"</p>
                </div>
                <div className="bg-green-500/5 rounded-lg p-2 mb-2">
                  <p className="text-[10px] font-bold text-green-400 uppercase mb-1">Replace With</p>
                  <p className="text-xs text-foreground font-semibold">"{c.replacement}"</p>
                </div>
                {c.whyBetter && <p className="text-xs text-muted-foreground"><span className="text-amber font-semibold">Why: </span>{c.whyBetter}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {priorityFixes.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground font-display mb-3 uppercase tracking-wide">Top Priority Fixes</h4>
          <div className="space-y-2">
            {priorityFixes.map((f: string, i: number) => (
              <div key={i} className="glass rounded-lg p-3 border border-border flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <p className="text-sm text-muted-foreground">{f}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {strengths.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground font-display mb-3 uppercase tracking-wide">Copy Strengths</h4>
          <div className="space-y-2">
            {strengths.map((s: string, i: number) => (
              <div key={i} className="glass rounded-lg p-3 border border-green-500/20">
                <p className="text-sm text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// WEBSITE SCAN
// ────────────────────────────────────────────────────────────────────────────
const WebsiteScanView = ({ data, copiedId, setCopiedId }: any) => {
  const score = data.score;
  const grade = data.grade;
  const gaps = data.gaps || [];
  const roadmap = data.roadmap || [];
  const roiTable = data.roiTable || [];
  const nextSteps = data.nextSteps || [];

  return (
    <div className="space-y-6">
      {/* Score header */}
      <div className="glass rounded-xl p-6 border border-border text-center">
        {data.companyName && <p className="text-xs text-muted-foreground uppercase mb-2">{data.companyName}</p>}
        <h3 className="text-lg font-bold text-foreground font-display mb-2">Website Health Score</h3>
        {score !== undefined && (
          <div className={`text-6xl font-bold font-display mb-1 ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber' : 'text-red-400'}`}>
            {score}<span className="text-2xl text-muted-foreground">/100</span>
          </div>
        )}
        {grade && <p className="text-2xl font-bold text-amber mb-3">Grade: {grade}</p>}
        {data.executiveSummary && <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{data.executiveSummary}</p>}
      </div>

      {/* Gaps */}
      {gaps.length > 0 && (
        <div>
          <SectionTitle icon={TrendingDown} label="Revenue Leaks & Gaps" count={gaps.length} color="text-red-400" />
          <div className="space-y-4">
            {gaps.map((g: any, i: number) => {
              const text = `${g.title}\nCategory: ${g.category}\nSeverity: ${g.severity}\n${g.description}\nAnnual Cost: ${g.annualCost}\nFix: ${g.recommendedFix}\nROI: ${g.projectedROI}`;
              return (
                <div key={i} className="relative glass rounded-lg p-5 border border-border">
                  <CopyBtn text={text} id={`gap-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
                  <div className="flex items-start justify-between gap-2 mb-2 pr-8">
                    <div>
                      {g.category && <p className="text-[10px] uppercase text-primary font-bold mb-1">{g.category}</p>}
                      {g.title && <p className="text-base font-bold text-foreground">{g.title}</p>}
                    </div>
                    {g.severity && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${SEVERITY_COLORS[g.severity] || SEVERITY_COLORS.moderate}`}>
                        {g.severity}
                      </span>
                    )}
                  </div>
                  {g.description && <p className="text-sm text-muted-foreground mb-3">{g.description}</p>}
                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    {g.annualCost && (
                      <div className="bg-red-500/5 rounded-lg p-3 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-red-400 uppercase">Annual Cost</p>
                          <p className="text-sm text-foreground font-semibold">{g.annualCost}</p>
                        </div>
                      </div>
                    )}
                    {g.projectedROI && (
                      <div className="bg-green-500/5 rounded-lg p-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-green-400 uppercase">Projected ROI</p>
                          <p className="text-sm text-foreground font-semibold">{g.projectedROI}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {g.recommendedFix && (
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-primary uppercase mb-1">Recommended Fix</p>
                      <p className="text-xs text-muted-foreground">{g.recommendedFix}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Roadmap */}
      {roadmap.length > 0 && (
        <div>
          <SectionTitle icon={Calendar} label="Implementation Roadmap" count={roadmap.length} />
          <div className="space-y-2">
            {roadmap.map((r: any, i: number) => (
              <div key={i} className="glass rounded-lg p-4 border border-border flex items-start gap-3">
                <span className="text-xs font-bold text-background bg-amber rounded-full px-3 py-1 flex-shrink-0">{r.month || `M${i + 1}`}</span>
                <div className="flex-1">
                  {r.action && <p className="text-sm font-semibold text-foreground mb-1">{r.action}</p>}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {r.estimatedCost && <span><span className="text-amber font-semibold">Cost: </span>{r.estimatedCost}</span>}
                    {r.projectedRecovery && <span><span className="text-green-400 font-semibold">Recovery: </span>{r.projectedRecovery}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROI Table */}
      {roiTable.length > 0 && (
        <div>
          <SectionTitle icon={DollarSign} label="ROI Summary" />
          <div className="glass rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/20">
                <tr>
                  {Object.keys(roiTable[0]).map((k) => (
                    <th key={k} className="px-4 py-2 text-left text-[10px] uppercase text-amber font-bold">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roiTable.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {Object.values(row).map((v: any, j: number) => (
                      <td key={j} className="px-4 py-2 text-muted-foreground">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground font-display mb-3 uppercase tracking-wide">Next Steps</h4>
          <div className="space-y-2">
            {nextSteps.map((s: string, i: number) => (
              <div key={i} className="glass rounded-lg p-3 border border-border flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <p className="text-sm text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive brief */}
      {data.competitiveBrief && (
        <div>
          <SectionTitle icon={Target} label="Competitive Brief" />
          <div className="glass rounded-lg p-5 border border-border">
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{data.competitiveBrief}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// WHAT'S WRONG
// ────────────────────────────────────────────────────────────────────────────
const WhatsWrongView = ({ data, copiedId, setCopiedId }: any) => {
  const pkg = data.recommendedPackage;
  const additional = data.additionalServices || [];

  return (
    <div className="space-y-5">
      {/* Diagnosis */}
      {data.diagnosis && (
        <div className="glass rounded-xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="w-5 h-5 text-amber" />
            <h4 className="text-sm font-bold text-amber uppercase tracking-wide">Diagnosis</h4>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{data.diagnosis}</p>
        </div>
      )}

      {/* Urgent Fix */}
      {data.urgentFix && (
        <div className="rounded-xl p-5 border border-red-500/40 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h4 className="text-sm font-bold text-red-400 uppercase tracking-wide">Fix This First</h4>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{data.urgentFix}</p>
        </div>
      )}

      {/* Revenue Leak */}
      {data.estimatedRevenueLeak && (
        <div className="rounded-xl p-5 border border-amber/40 bg-amber/5 flex items-center gap-3">
          <TrendingDown className="w-6 h-6 text-amber flex-shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-amber uppercase mb-1">Estimated Revenue Leak</p>
            <p className="text-base font-bold text-foreground">{data.estimatedRevenueLeak}</p>
          </div>
        </div>
      )}

      {/* Recommended Package */}
      {pkg && (
        <div className="rounded-xl p-5 border border-amber/40 bg-amber/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber" />
            <h4 className="text-sm font-bold text-amber uppercase tracking-wide">Recommended For You</h4>
          </div>
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            {pkg.name && <p className="text-lg font-bold text-foreground font-display">{pkg.name}</p>}
            {pkg.price && <span className="text-base font-bold text-amber">{pkg.price}</span>}
          </div>
          {pkg.description && <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>}
          {pkg.whyThisFits && (
            <div className="bg-background/40 rounded-lg p-3">
              <p className="text-[10px] font-bold text-primary uppercase mb-1">Why This Fits</p>
              <p className="text-xs text-muted-foreground">{pkg.whyThisFits}</p>
            </div>
          )}
        </div>
      )}

      {/* Also Consider */}
      {additional.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-foreground font-display mb-3 uppercase tracking-wide">Also Consider</h4>
          <div className="space-y-2">
            {additional.map((s: any, i: number) => (
              <div key={i} className="glass rounded-lg p-4 border border-border">
                <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
                  {s.name && <p className="text-sm font-bold text-foreground">{s.name}</p>}
                  {s.price && <span className="text-sm font-bold text-amber">{s.price}</span>}
                </div>
                {s.reason && <p className="text-xs text-muted-foreground">{s.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Step */}
      {data.nextStep && (
        <div className="glass rounded-xl p-5 border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <ChevronRight className="w-5 h-5 text-primary" />
            <h4 className="text-sm font-bold text-primary uppercase tracking-wide">Next Step</h4>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{data.nextStep}</p>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// PLAYBOOK
// ────────────────────────────────────────────────────────────────────────────
const PlaybookView = ({ data, fileUrl }: any) => (
  <div className="text-center py-8">
    <div className="glass rounded-xl p-8 border border-border">
      <p className="text-sm text-muted-foreground mb-4">{data.description || data.subtitle || 'Custom playbook generated'}</p>
      {fileUrl ? (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
          <Button className="bg-amber hover:bg-amber/90 text-background font-bold">Download PDF</Button>
        </a>
      ) : (
        <p className="text-xs text-muted-foreground">PDF still generating or unavailable.</p>
      )}
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// SWITCH
// ────────────────────────────────────────────────────────────────────────────
export const LibraryItemRenderer: React.FC<{ item: AdminLibraryItem }> = ({ item }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const data = item.output_data as any;
  const props = { data, copiedId, setCopiedId };

  if (!data || typeof data !== 'object') {
    return <p className="text-sm text-muted-foreground">No content to display.</p>;
  }

  switch (item.tool_type) {
    case 'social_content': return <SocialContentView {...props} />;
    case 'content_calendar': return <ContentCalendarView {...props} />;
    case 'sales_scripts': return <SalesScriptsView {...props} />;
    case 'follow_up_plan': return <FollowUpPlanView {...props} />;
    case 'strategic_questions': return <StrategicQuestionsView {...props} />;
    case 'brand_contradictions': return <BrandContradictionsView {...props} />;
    case 'friction_audit': return <FrictionAuditView {...props} />;
    case 'website_scan': return <WebsiteScanView {...props} />;
    case 'whats_wrong': return <WhatsWrongView {...props} />;
    case 'playbook': return <PlaybookView data={data} fileUrl={item.file_url} />;
    case 'video': return (
      <div className="space-y-3">
        {item.file_url ? (
          <video src={item.file_url} controls className="w-full max-h-[70vh] rounded-lg bg-black" />
        ) : (
          <p className="text-sm text-muted-foreground">Video file missing.</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {data.aspect && <span>Aspect: {String(data.aspect)}</span>}
          {data.ext && <span>Format: .{String(data.ext)}</span>}
          {data.size_mb != null && <span>Size: {String(data.size_mb)} MB</span>}
          {Array.isArray(data.scenes) && <span>Scenes: {data.scenes.length}</span>}
        </div>
        {item.file_url && (
          <a href={item.file_url} download target="_blank" rel="noopener noreferrer" className="text-amber text-sm underline">
            Download original
          </a>
        )}
      </div>
    );
    case 'day_post': return (
      <div className="space-y-4">
        {data.format && (
          <span className="inline-block text-[10px] font-mono uppercase tracking-widest text-amber bg-amber/10 border border-amber/30 rounded px-2 py-0.5">
            {String(data.format).replace(/_/g, ' ')}
          </span>
        )}
        {data.hook && (
          <p className="text-lg font-display font-bold text-foreground border-l-2 border-amber pl-3">{data.hook}</p>
        )}
        {data.body && (
          <div className="prose prose-invert max-w-none text-sm">
            <pre className="whitespace-pre-wrap font-sans text-foreground bg-transparent p-0 m-0 border-0 text-sm leading-relaxed">{data.body}</pre>
          </div>
        )}
        {data.cta && (
          <div className="rounded-lg bg-amber/10 border border-amber/30 p-3 text-sm text-foreground">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber block mb-1">CTA</span>
            {data.cta}
          </div>
        )}
        {Array.isArray(data.hashtags) && data.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.hashtags.map((h: string, i: number) => (
              <span key={i} className="text-[11px] font-mono text-amber/80">#{String(h).replace(/^#/, '')}</span>
            ))}
          </div>
        )}
      </div>
    );
    case 'linkedin_post': return (
      <div className="space-y-3">
        {data.scheduledFor && (
          <span className="inline-block text-[10px] font-mono uppercase tracking-widest text-amber bg-amber/10 border border-amber/30 rounded px-2 py-0.5">
            Scheduled {new Date(`${data.scheduledFor}T12:00:00`).toLocaleDateString()}
          </span>
        )}
        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed bg-transparent p-0 m-0 border-0">
          {String(data.body || '')}
        </pre>
      </div>
    );
    default:
      return (
        <pre className="bg-muted/30 rounded-lg p-4 text-xs text-foreground whitespace-pre-wrap font-mono overflow-x-auto max-h-[60vh]">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
};

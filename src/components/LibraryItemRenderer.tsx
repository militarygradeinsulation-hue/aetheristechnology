import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Linkedin, Facebook, Megaphone, Phone, Mail, Calendar, MessageCircle, AlertTriangle, Search } from 'lucide-react';
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

const SocialContentView = ({ data, copiedId, setCopiedId }: any) => (
  <div>
    {data.businessName && <p className="text-sm text-muted-foreground mb-4">For <span className="text-amber font-semibold">{data.businessName}</span></p>}
    {data.linkedinPosts?.length > 0 && <>
      <SectionTitle icon={Linkedin} label="LinkedIn Posts" count={data.linkedinPosts.length} color="text-blue-400" />
      <div className="grid md:grid-cols-2 gap-3">
        {data.linkedinPosts.map((p: any, i: number) => <PostCard key={`li-${i}`} post={p} id={`li-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />)}
      </div>
    </>}
    {data.facebookPosts?.length > 0 && <>
      <SectionTitle icon={Facebook} label="Facebook Posts" count={data.facebookPosts.length} color="text-blue-500" />
      <div className="grid md:grid-cols-2 gap-3">
        {data.facebookPosts.map((p: any, i: number) => <PostCard key={`fb-${i}`} post={p} id={`fb-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />)}
      </div>
    </>}
    {data.adHooks?.length > 0 && <>
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
    </>}
  </div>
);

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

const FollowUpPlanView = ({ data, copiedId, setCopiedId }: any) => {
  const steps = data.steps || data.touches || data.plan || [];
  return (
    <div>
      <SectionTitle icon={Calendar} label="Follow-Up Sequence" count={steps.length} />
      <div className="space-y-3">
        {steps.map((s: any, i: number) => {
          const text = `Day ${s.day || s.dayNumber || i + 1} — ${s.channel || ''}\n${s.subject ? `Subject: ${s.subject}\n` : ''}${s.message || s.body || s.script || ''}`;
          return (
            <div key={i} className="relative glass rounded-lg p-4 border border-border">
              <CopyBtn text={text} id={`fu-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
              <div className="flex items-center gap-2 mb-2 flex-wrap pr-8">
                <span className="text-xs font-bold text-background bg-amber rounded-full px-2 py-0.5">Day {s.day || s.dayNumber || i + 1}</span>
                {s.channel && <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{s.channel}</span>}
                {s.goal && <span className="text-xs text-muted-foreground">{s.goal}</span>}
              </div>
              {s.subject && <p className="text-sm font-bold text-foreground mb-1">Subject: {s.subject}</p>}
              {(s.message || s.body || s.script) && <p className="text-sm text-muted-foreground whitespace-pre-line">{s.message || s.body || s.script}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StrategicQuestionsView = ({ data, copiedId, setCopiedId }: any) => {
  const questions = data.questions || data.strategicQuestions || [];
  return (
    <div>
      <SectionTitle icon={Search} label="Strategic Questions" count={questions.length} />
      <div className="space-y-3">
        {questions.map((q: any, i: number) => {
          const qText = typeof q === 'string' ? q : (q.question || q.text || '');
          return (
            <div key={i} className="relative glass rounded-lg p-4 border border-border">
              <CopyBtn text={qText} id={`q-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
              <p className="text-sm font-bold text-foreground pr-8">{i + 1}. {qText}</p>
              {q.purpose && <p className="text-xs text-muted-foreground mt-2"><span className="text-amber font-semibold">Why: </span>{q.purpose}</p>}
              {q.followUp && <p className="text-xs text-muted-foreground mt-1"><span className="text-amber font-semibold">Follow-up: </span>{q.followUp}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BrandContradictionsView = ({ data, copiedId, setCopiedId }: any) => {
  const items = data.contradictions || data.findings || [];
  return (
    <div>
      <SectionTitle icon={AlertTriangle} label="Brand Contradictions" count={items.length} color="text-red-400" />
      <div className="space-y-3">
        {items.map((c: any, i: number) => {
          const text = `${c.title || c.contradiction}\nClaim: ${c.claim}\nReality: ${c.reality}\nFix: ${c.fix || c.recommendation}`;
          return (
            <div key={i} className="relative glass rounded-lg p-4 border border-border">
              <CopyBtn text={text} id={`bc-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
              {(c.title || c.contradiction) && <p className="text-sm font-bold text-red-400 mb-2 pr-8">{c.title || c.contradiction}</p>}
              {c.claim && <p className="text-xs text-muted-foreground mb-1"><span className="text-amber font-semibold">Claim: </span>{c.claim}</p>}
              {c.reality && <p className="text-xs text-muted-foreground mb-1"><span className="text-amber font-semibold">Reality: </span>{c.reality}</p>}
              {(c.fix || c.recommendation) && <p className="text-xs text-primary mt-2"><span className="font-semibold">Fix: </span>{c.fix || c.recommendation}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FrictionAuditView = ({ data, copiedId, setCopiedId }: any) => {
  const items = data.findings || data.frictionPoints || data.audit || [];
  return (
    <div>
      <SectionTitle icon={AlertTriangle} label="Friction Points" count={items.length} color="text-amber" />
      <div className="space-y-3">
        {items.map((f: any, i: number) => {
          const text = `${f.phrase || f.term || f.title}\nWhy it hurts: ${f.problem || f.issue}\nReplace with: ${f.suggestion || f.replacement}`;
          return (
            <div key={i} className="relative glass rounded-lg p-4 border border-border">
              <CopyBtn text={text} id={`fr-${i}`} copiedId={copiedId} setCopiedId={setCopiedId} />
              {(f.phrase || f.term || f.title) && <p className="text-sm font-bold text-amber mb-2 pr-8">"{f.phrase || f.term || f.title}"</p>}
              {(f.problem || f.issue) && <p className="text-xs text-muted-foreground mb-1"><span className="text-red-400 font-semibold">Problem: </span>{f.problem || f.issue}</p>}
              {(f.suggestion || f.replacement) && <p className="text-xs text-primary"><span className="font-semibold">Replace with: </span>{f.suggestion || f.replacement}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
    case 'playbook': return <PlaybookView data={data} fileUrl={item.file_url} />;
    default:
      return (
        <pre className="bg-muted/30 rounded-lg p-4 text-xs text-foreground whitespace-pre-wrap font-mono overflow-x-auto max-h-[60vh]">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
};

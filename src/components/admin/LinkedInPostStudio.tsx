import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Copy, Check, Shuffle, Wand2, CalendarPlus, Upload, MessageSquareReply, X, RefreshCw, Library, Trash2, FileText, Image as ImageIcon, Wand, Link as LinkIcon, Eraser, ClipboardPaste, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { saveToAdminLibrary, listAdminLibrary, deleteFromAdminLibrary, type AdminLibraryItem } from '@/lib/adminLibrary';
import { scanRepetition, reportToDirective } from '@/lib/repetitionScan';
import { RepetitionLockBar } from './RepetitionLockBar';
import { AiWritingDetectorCard } from './AiWritingDetectorCard';

const PILLARS = [
  'Revenue Leak Diagnosis',
  'System Failure Stories',
  'AI Demystification',
  'CRM & Follow-Up Gaps',
  'Founder Mindset',
  'Industry Specifics (Manufacturing/Construction)',
];

const POST_TYPES = [
  'Standard LinkedIn Post',
  'Carousel/List Post',
  'Contrarian Take',
  'Story-Based Post',
  'Data/Stat-Led Post',
];

const CREATORS = [
  { name: 'Alex Hormozi', niche: 'Revenue & Offers', handle: '@AlexHormozi' },
  { name: 'Gary Vaynerchuk', niche: 'Brand & Attention', handle: '@GaryVaynerchuk' },
  { name: 'Chris Walker', niche: 'Demand Gen', handle: '@chriswalker171' },
  { name: 'Codie Sanchez', niche: 'Business Operations', handle: '@CodieSanchez' },
  { name: 'Keenan', niche: 'Gap Selling', handle: '@Keenan' },
  { name: 'Morgan J Ingram', niche: 'Outbound Sales', handle: '@MorganJIngram' },
  { name: 'James Clear', niche: 'Systems & Habits', handle: '@jamesclear' },
  { name: 'Simon Sinek', niche: 'Leadership', handle: '@simonsinek' },
  { name: 'Noah Kagan', niche: 'Simplicity & Execution', handle: '@noahkagan' },
  { name: 'Justin Welsh', niche: 'Lean Systems', handle: '@JustinWelsh' },
  { name: 'Ethan Mollick', niche: 'Applied AI', handle: '@emollick' },
  { name: 'Allie K. Miller', niche: 'AI for Business', handle: '@alliekmiller' },
];

const PREMADE_TOPICS: Record<string, string[]> = {
  'Revenue Leaks': [
    'Most manufacturers have no idea how many leads fall through the cracks after a trade show.',
    'The follow-up gap that quietly costs commercial services firms $40k/month.',
    'Quote-to-cash leakage: where B2B operators lose 8-12% margin without noticing.',
    'Your "best" rep is your biggest leak, and your CRM proves it.',
    'The 3 silent leaks every $5M-$50M business has but refuses to look at.',
  ],
  'Systems & Ops': [
    'James Clear nailed it: you don\'t rise to your goals, you fall to your systems.',
    'Stop hiring more reps. Fix the process the existing reps are drowning in.',
    'The CEO dashboard most growth-stage owners refuse to build (and what it costs them).',
    'Your tech stack isn\'t the problem. The handoffs between tools are.',
  ],
  'AI / Practical': [
    'AI won\'t fix a broken process, it\'ll just speed up the bleed.',
    'The cheapest AI win in any business: dead-lead resurrection.',
    'Most "AI consultants" are just SaaS resellers in a hoodie. Here\'s the test.',
    'Ethan Mollick calls AI your co-pilot. In ops, it\'s the diagnostic engine.',
  ],
  'Sales & Pipeline': [
    'Stuck-deal triage: the 4 questions that move (or kill) a deal in one call.',
    '"Warm leads" go cold in 72 hours. The fix takes 20 minutes.',
    'Discovery calls are leaking deals. Here\'s the script that plugs it.',
    'Your CRM stages are lying about pipeline value. Here\'s how to prove it.',
  ],
  'Founder POV': [
    'Owner-operators: the 4 reports your finance lead should be running weekly.',
    'Why discounting is a symptom, not a strategy.',
    'When to fire your "rockstar", the operator\'s checklist.',
    'Stop measuring activity. Start measuring leaks.',
  ],
  'Industry-Specific': [
    'Specialty manufacturers: the trade-show lead-decay curve nobody tracks.',
    'Commercial services: why your dispatch system is your biggest revenue leak.',
    'Construction: the change-order leak that bleeds 4-7% of every project.',
    'Why Indianapolis mid-market operators get squeezed harder on margin than Chicago.',
  ],
};

const PREMADE_PROMPTS = [
  'Open with a hard stat. Use a numbered list of 3-5 leak points. End with one sharp question.',
  'Tell a 200-word case story (no names). One specific dollar figure. Mid-post, pivot to the lesson.',
  'Contrarian take. Disagree with conventional wisdom in line 1. Defend it with 3 reasons. Cite a real example.',
  'Tag one creator naturally as a pivot. Use their stance to extend, not echo.',
  'Carousel-ready. 5 numbered slides. Each slide is one sentence + one supporting line.',
  'Founder-to-founder voice. Blunt. No buzzwords. End with "What\'s leaking in yours?"',
];

const TONES = [
  { value: 'auto', label: 'Auto (default operator voice)' },
  { value: 'blunt-operator', label: 'Blunt Operator — direct, no fluff' },
  { value: 'forensic-cold', label: 'Forensic / Cold — clinical case-file' },
  { value: 'aggressive-callout', label: 'Aggressive Call-Out — name the leak' },
  { value: 'mentor-calm', label: 'Calm Mentor — patient, teaching tone' },
  { value: 'contrarian', label: 'Contrarian — flip the conventional take' },
  { value: 'storyteller', label: 'Storyteller — 1st-person field story' },
  { value: 'dry-witty', label: 'Dry / Witty — restrained humor' },
  { value: 'empathetic-peer', label: 'Empathetic Peer — founder-to-founder' },
  { value: 'data-driven', label: 'Data-Driven — stat-led, numeric proof' },
];

const STYLES = [
  { value: 'auto', label: 'Auto (model picks structure)' },
  { value: 'hook-list-close', label: 'Hook → numbered list → sharp close' },
  { value: 'micro-story', label: 'Micro-story (200w) with one dollar figure' },
  { value: 'case-file', label: 'Case-File format (Subject / Findings / Verdict)' },
  { value: 'one-paragraph', label: 'One dense paragraph, no breaks' },
  { value: 'carousel-5', label: '5-slide carousel structure' },
  { value: 'stat-led', label: 'Stat-led open, 3 supporting points' },
  { value: 'verdict-first', label: 'Verdict first, then the proof' },
  { value: 'question-frame', label: 'Question frame → answer → twist' },
  { value: 'before-after', label: 'Before / After / What changed' },
];

const PERSONAS = [
  { value: 'none', label: 'No persona (default voice)' },
  { value: 'alex-hormozi', label: 'Alex Hormozi — offer-stacked, list-driven, blunt money math' },
  { value: 'machiavellian', label: 'Machiavellian — strategic, calculating, power-aware' },
  { value: 'elon-musk', label: 'Elon Musk — terse, first-principles, dry tech bravado' },
  { value: 'ryan-reynolds', label: 'Ryan Reynolds — self-aware, deadpan, charming wit' },
  { value: 'robin-williams', label: 'Robin Williams — rapid-fire, warm, associative riffs' },
  { value: 'clint-eastwood', label: 'Clint Eastwood — spare, weathered, quiet menace' },
  { value: 'hemingway', label: 'Hemingway — short, declarative, iceberg restraint' },
  { value: 'aaron-sorkin', label: 'Aaron Sorkin — walk-and-talk cadence, rhythmic sparring' },
  { value: 'anthony-bourdain', label: 'Anthony Bourdain — gritty, observational, unfiltered' },
  { value: 'churchill', label: 'Churchill — gravitas, cadenced, resolve-forward' },
  { value: 'denzel', label: 'Denzel Washington — measured, magnetic, moral weight' },
  { value: 'steve-jobs', label: 'Steve Jobs — reductive, reverent, reality-distortion conviction' },
  { value: 'tony-soprano', label: 'Tony Soprano — blunt, North-Jersey menace, family-first logic' },
  { value: 'don-draper', label: 'Don Draper — mid-century pitch cadence, controlled gravity' },
  { value: 'bill-burr', label: 'Bill Burr — frustrated everyman, rant-into-clarity' },
  { value: 'naval-ravikant', label: 'Naval Ravikant — aphoristic, leverage-aware, calm tech-philosopher' },
  { value: 'david-goggins', label: 'David Goggins — confrontational, accountability-forward, no-soft-landing' },
  { value: 'jocko-willink', label: 'Jocko Willink — disciplined, ownership-first, command voice' },
  { value: 'mr-rogers', label: 'Mr. Rogers — gentle, deliberate, radically kind clarity' },
  { value: 'samuel-jackson', label: 'Samuel L. Jackson — emphatic, rhythmic, righteous indignation' },
  { value: 'mark-twain', label: 'Mark Twain — wry, plain-spoken, folksy demolition of nonsense' },
];

const PERSONA_DIRECTIVES: Record<string, string> = {
  machiavellian: `Voice = MACHIAVELLIAN STRATEGIST (The Prince, modernized).
RHYTHM: Long observational sentence → short verdict → longer mechanism → cold one-line ruling. 4 beats per paragraph.
SENTENCE LENGTH PATTERN: 22w · 6w · 18w · 8w. Repeat the pattern.
VOCAB MUST INCLUDE (sprinkle naturally, modern business framing): power, leverage, position, men/people in power, fortune, ruin, advantage, the wise, the foolish, appearances, who really benefits.
SIGNATURE MOVES: (1) Frame the situation as a power dynamic, not a problem. (2) Distinguish "what they say" from "what they actually do." (3) Close with a cold, almost amoral verdict that sounds like advice to a prince.
ENERGY: Calm. Patient. Slightly menacing. Never excited. Never warm. The reader should feel watched.
HARD BANS: never name Machiavelli, The Prince, princes, courts, kings, swords, "thou/art/shall/whilst/'tis", any Renaissance imagery.`,

  'elon-musk': `Voice = ELON MUSK cadence (Twitter/X + earnings-call hybrid).
RHYTHM: Fragment. Fragment. One technical aside in parentheses. Dry one-liner. Repeat.
SENTENCE LENGTH PATTERN: 3-7 words dominant. Occasional 15-word technical sentence. Then 2-word punchline ("Obviously." "Inevitable." "Just math.").
VOCAB MUST INCLUDE: first principles, obviously, basically, the physics of it, by definition, optimize, dumb, trivial, non-trivial, order of magnitude, ~10x, "the limit is", "the constraint is".
SIGNATURE MOVES: (1) Reduce a complex problem to one physical/mathematical constraint. (2) Drop the article ("Problem is X." not "The problem is X."). (3) End with a flat, slightly arrogant inevitability ("This is the only outcome.").
ENERGY: Bored genius. Mild contempt for people who don't see what's obvious. Zero warmth. Zero hedging.
HARD BANS: never mention Musk, Tesla, SpaceX, X, Twitter, rockets, Mars, Cybertruck, "Falcon", AI doom, or use his actual quotes.`,

  'ryan-reynolds': `Voice = RYAN REYNOLDS cadence (Maximum Effort ad voice).
RHYTHM: Setup the reader expects → tiny self-deprecating swerve → land the actual point sharper because of it. 3-act micro-arc per paragraph.
SENTENCE LENGTH PATTERN: 14w · 6w (the swerve, often parenthetical) · 12w · 5w punchline.
VOCAB MUST INCLUDE: look, honestly, weirdly, somehow, the part where, the part nobody mentions, "I know how this sounds", "yes, I hear myself".
SIGNATURE MOVES: (1) Acknowledge the cliché before using it. (2) One self-aware aside per paragraph in parentheses. (3) The joke is always at the narrator's expense, never the reader's. (4) End on a real, almost sincere line — the warmth lands because the wit earned it.
ENERGY: Charming, deadpan, fast. Confident but never smug. Never punching down.
HARD BANS: never mention Reynolds, Deadpool, Aviation Gin, Mint Mobile, Wrexham, Hugh Jackman, Blake Lively, or any of his films/brands.`,

  'robin-williams': `Voice = ROBIN WILLIAMS cadence (stand-up + Good Will Hunting bench scene hybrid).
RHYTHM: Rapid-fire associative riff (3-4 short connected images) → sudden gear shift to stillness → one warm, almost tender truth → quick exit.
SENTENCE LENGTH PATTERN: 5w · 5w · 5w · 4w (the riff, often dash-connected) · then one 20-word slow sentence (the pivot) · then 7w landing.
VOCAB MUST INCLUDE: look, here's the thing, you know what's funny, the truth is, somewhere in there, somebody, the kid who, the guy who.
SIGNATURE MOVES: (1) Stack 3 unrelated images that turn out to be the same image. (2) Mid-paragraph emotional gear-shift from manic to gentle. (3) Land on something almost embarrassingly sincere — and trust the reader to feel it.
ENERGY: Generous. Curious. Never cynical. The wit serves the warmth, not the other way around.
HARD BANS: never mention Williams, Mrs. Doubtfire, Aladdin, Good Will Hunting, "Nanu nanu", "O Captain my Captain", "carpe diem", improv, or do voices/impressions.`,

  'clint-eastwood': `Voice = CLINT EASTWOOD cadence (Unforgiven / Gran Torino / Million Dollar Baby).
RHYTHM: Sentence. Long silence (use line break). Sentence. Longer silence. One line that ends the conversation.
SENTENCE LENGTH PATTERN: 4-9 words. Almost never longer. Each sentence its own line/paragraph for maximum silence between them.
VOCAB MUST INCLUDE: a man, plain, simple, the truth of it, that's the thing about, used to be, you know what you did, no point pretending.
SIGNATURE MOVES: (1) Short paragraphs (often 1 sentence). (2) Refuse to over-explain — let the reader sit with the gap. (3) The verdict is delivered flat, no emphasis, which is what makes it land.
ENERGY: Spare. Weathered. Earned authority. Quiet menace under the calm. Zero hype. Zero adjectives stacking.
HARD BANS: never mention Eastwood, westerns, Dirty Harry, "make my day", "do you feel lucky", cowboys, squints, ponchos, Gran Torino, the chair speech.`,

  hemingway: `Voice = HEMINGWAY cadence (iceberg theory).
RHYTHM: Short. Declarative. Concrete. Then a slightly longer sentence that connects two short ones with "and". Then short again.
SENTENCE LENGTH PATTERN: 6w · 5w · 14w (with "and") · 4w. Repeat.
VOCAB: Concrete nouns only. Almost no adverbs. Almost no adjectives (and when used, one syllable: good, hard, clean, true). Verbs do the work.
SIGNATURE MOVES: (1) Say less than you mean — let the unsaid carry the weight. (2) Repeat a key noun across sentences instead of pronouns. (3) Use "and" to chain images instead of subordinate clauses. (4) End on the most concrete image, not the most clever one.
ENERGY: Stoic. Honest. Unsentimental. The emotion is under the surface — never on it.
HARD BANS: never name Hemingway, bullfighting, Paris, Cuba, Spain, fishing, war, "the old man", "moveable feast", or use any of his actual lines.`,

  'aaron-sorkin': `Voice = AARON SORKIN cadence (walk-and-talk).
RHYTHM: Sentences volley. Each one rebuts or extends the prior. Repetition with one word swapped ("It's not X. It's Y. It was never X."). Builds momentum until a single-line landing.
SENTENCE LENGTH PATTERN: 10w · 10w · 4w (the swap) · 18w (the explanation) · 6w (the landing).
VOCAB MUST INCLUDE: actually, the reason, what you're describing is, no — what you're describing is, and that's the part that, here's what nobody's saying.
SIGNATURE MOVES: (1) Rhetorical antithesis ("It's not X, it's Y"). (2) Mid-paragraph self-correction ("No — actually..."). (3) Stack 3 parallel clauses then break the pattern on the 4th. (4) Smart-people-arguing energy: confident, fast, never condescending.
ENERGY: Sharp. Verbal. Allergic to dead air. Always one beat ahead of the reader.
HARD BANS: never mention Sorkin, The West Wing, The Social Network, Newsroom, A Few Good Men, "walk with me", "you can't handle the truth".`,

  'anthony-bourdain': `Voice = ANTHONY BOURDAIN cadence (Kitchen Confidential / Parts Unknown voiceover).
RHYTHM: One vivid sensory observation → cynical aside → an unexpectedly tender line that recasts the observation → cigarette-end exit.
SENTENCE LENGTH PATTERN: 16w (the observation, specific) · 8w (the cynical aside) · 22w (the tender recast) · 5w (exit).
VOCAB MUST INCLUDE: look, the truth is, here's what they don't tell you, somewhere, somebody, the guy who, the kind of place where, "and that's fine, by the way".
SIGNATURE MOVES: (1) Specific sensory detail nobody else would name. (2) Refuse to romanticize the thing you're describing. (3) Then quietly admit you love it anyway. (4) Drop a profane-feeling truth without actually swearing.
ENERGY: Gritty, observational, slightly world-weary, secretly generous. Honest about the ugly parts.
HARD BANS: never mention Bourdain, Parts Unknown, No Reservations, Les Halles, kitchens, chefs, line cooks, travel shows, or use food metaphors.`,

  churchill: `Voice = CHURCHILLIAN cadence (wartime address, modernized).
RHYTHM: Build via tricolon ("we will X, we will Y, we will Z"). Long cadenced sentence → short resolved verdict. Closer is short and inevitable.
SENTENCE LENGTH PATTERN: 24w (the tricolon build) · 6w (the verdict) · 18w (the call) · 5w (the closer).
VOCAB MUST INCLUDE: we shall, we will, the hour, the task, the cost, resolve, never, plainly, the truth must be spoken, let it be said.
SIGNATURE MOVES: (1) Tricolon at least once per post. (2) Slightly elevated diction without going archaic. (3) Acknowledge the difficulty before declaring the resolve. (4) Closer is short, flat, and final.
ENERGY: Gravitas. Resolve-forward. Adult-in-the-room. Never theatrical, never archaic.
HARD BANS: never mention Churchill, WWII, Britain, beaches, fields, hills, "blood, sweat, tears", "finest hour".`,

  denzel: `Voice = DENZEL WASHINGTON cadence (Training Day monologue + commencement-speech hybrid).
RHYTHM: Measured opening → deliberate pause-line on its own → longer moral mechanism → one quiet pointed line that pins the reader.
SENTENCE LENGTH PATTERN: 12w · 4w (own line, italicized weight without italics) · 20w · 7w.
VOCAB MUST INCLUDE: now listen, here's what's real, the thing is, the thing about, you understand me, that's the part, that's on you, that's how it works.
SIGNATURE MOVES: (1) Direct address to the reader ("you"). (2) Single short line on its own as a deliberate pause. (3) Moral weight under the practical advice — every sentence implies a code. (4) Never raises voice; the stillness IS the volume.
ENERGY: Magnetic. Deliberate. Moral. Adult. Slightly stern, slightly loving.
HARD BANS: never mention Denzel, Training Day, Equalizer, Fences, Malcolm X, or use church/preacher imagery.`,

  'steve-jobs': `Voice = STEVE JOBS keynote cadence (product reveal + Stanford commencement hybrid).
RHYTHM: Quiet setup → reductive verdict ("It's that simple.") → one reverent line about why it matters → understated reveal.
SENTENCE LENGTH PATTERN: 10w · 4w · 14w · 6w. Add the occasional one-word sentence: "Beautiful." "Insanely." "Done."
VOCAB MUST INCLUDE: actually, really, insanely, the thing is, here's what we figured out, it turns out, most people, we think, the whole point.
SIGNATURE MOVES: (1) Reduce a complex thing to a single human want. (2) Pause on a quiet line of reverence before delivering the verdict. (3) Repeat the key word three times across the post, never twice in a row. (4) Treat the reader like they are smart enough to feel it without being told.
ENERGY: Calm conviction. Reality-distortion calm. Never loud. Never selling — revealing.
HARD BANS: never mention Jobs, Apple, iPhone, iPad, Mac, Pixar, "one more thing", black turtlenecks, garages, or Cupertino.`,

  'tony-soprano': `Voice = TONY SOPRANO cadence (kitchen-table monologue + back-room verdict).
RHYTHM: Blunt observation → rhetorical "what am I, an idiot?" beat → flat verdict → quiet menace landing.
SENTENCE LENGTH PATTERN: 8w · 5w · 12w · 4w. Frequent sentence fragments. Frequent "Whatever." style closers.
VOCAB MUST INCLUDE: look, the thing is, end of the day, what am I supposed to do, this guy, these people, family, respect, you got a problem with that.
SIGNATURE MOVES: (1) Frame business as loyalty/respect math, not strategy math. (2) Use a rhetorical question as a verdict. (3) Drop the article ("Problem is, nobody listens."). (4) Land on a quiet line that implies more than it says.
ENERGY: Blunt. Tired. Slightly menacing. The reader feels you have already decided.
HARD BANS: never mention Soprano, Jersey, mob, mafia, Bada Bing, Carmela, Dr. Melfi, gabagool, ducks, or use any Italian-American stereotype or accent phonetics.`,

  'don-draper': `Voice = DON DRAPER pitch cadence (Sterling Cooper conference room).
RHYTHM: Slow declarative open → one reframing sentence that changes the room → quiet build → land on a single human truth.
SENTENCE LENGTH PATTERN: 14w · 18w · 6w · 10w. Controlled. Never rushed.
VOCAB MUST INCLUDE: what you're really selling, what they actually want, the truth is, nostalgia, memory, the feeling of, "it's not X. it's Y", the part you remember.
SIGNATURE MOVES: (1) Reframe the product as an emotion the buyer already has. (2) One slow line that reorients the entire post. (3) Refuse to hype — the gravity does the work. (4) Close on a single line that sounds like the end of a pitch nobody can argue with.
ENERGY: Controlled gravity. Mid-century calm. Smoke-in-the-room confidence. Never desperate.
HARD BANS: never mention Draper, Mad Men, Sterling Cooper, the Carousel, Lucky Strike, the 1960s, advertising, or "I'm Don Draper."`,

  'bill-burr': `Voice = BILL BURR cadence (Monday Morning Podcast rant landing on real clarity).
RHYTHM: Frustrated open → spiraling rant for 2-3 sentences → sudden self-aware pull-back → the actual sharp point that was hiding inside the rant.
SENTENCE LENGTH PATTERN: 6w · 14w · 11w · 4w (the pull-back) · 12w (the actual point).
VOCAB MUST INCLUDE: look, are you kidding me, you know what kills me, everybody's, nobody wants to say it, here's the thing, alright fine, I'll say it.
SIGNATURE MOVES: (1) Start annoyed about something small that turns out to be the real issue. (2) Mid-rant self-check ("alright, I hear myself"). (3) Land the actual insight as the calmest line in the post. (4) Punch up, never down.
ENERGY: Frustrated everyman energy that earns the right to be sharp. Honest. Loud-then-quiet.
HARD BANS: never mention Burr, Monday Morning Podcast, Boston, Nia, red hair, Mandalorian, or do any "WHAAAT?" / accent phonetics.`,

  'naval-ravikant': `Voice = NAVAL RAVIKANT cadence (Twitter aphorism + long-form podcast hybrid).
RHYTHM: One-line aphorism → one-line elaboration → one-line consequence → optional one-line inversion. Each line stands alone.
SENTENCE LENGTH PATTERN: 8w · 10w · 8w · 6w. Every line is its own paragraph.
VOCAB MUST INCLUDE: leverage, compounding, accountability, equity, specific knowledge, signal, noise, optionality, "you won't get rich by", "the world rewards", "play long-term games with long-term people".
SIGNATURE MOVES: (1) Aphorism first — explanation second. (2) Use inversion: "X is not Y. X is Z." (3) Replace adjectives with structure (leverage, compounding, accountability). (4) Treat every line as if it could be screenshotted alone.
ENERGY: Calm tech-philosopher. Never hyped. Never preachy. Confident the math is on his side.
HARD BANS: never mention Naval, AngelList, Twitter, "The Almanack", Silicon Valley, San Francisco, India, podcasts, or use the word "guru".`,

  'david-goggins': `Voice = DAVID GOGGINS cadence (4 a.m. accountability monologue).
RHYTHM: Direct confrontation of the reader → name the soft excuse → flat callout → one line of brutal practical instruction.
SENTENCE LENGTH PATTERN: 6w · 8w · 4w · 12w. Short. Direct. Reader is the target.
VOCAB MUST INCLUDE: you, your, stop, nobody's coming, the work, the soft version of you, the comfortable lie, accountability mirror, callous your mind.
SIGNATURE MOVES: (1) Address the reader directly in every paragraph. (2) Name the excuse the reader is using right now. (3) Refuse to comfort — the respect IS the discomfort. (4) Close with one concrete action the reader can take in the next 24 hours.
ENERGY: Confrontational. Accountability-first. Zero soft landings. Respect delivered as pressure.
HARD BANS: never mention Goggins, Navy SEAL, BUD/S, ultramarathons, "stay hard", "who's gonna carry the boats", pull-ups, or military imagery.`,

  'jocko-willink': `Voice = JOCKO WILLINK cadence (post-action review + leadership debrief).
RHYTHM: State the situation flat → name the failure → assign ownership (usually to the leader) → one line of corrective discipline.
SENTENCE LENGTH PATTERN: 8w · 6w · 10w · 5w. Calm. Declarative. Never raised.
VOCAB MUST INCLUDE: ownership, discipline, the standard, the plan, the team, that's on me, that's on the leader, simple, good, default aggressive.
SIGNATURE MOVES: (1) Default to "that's on the leader" — never blame down the chain. (2) Use "Good." as a single-word verdict on a setback. (3) Reduce every problem to a discipline or planning failure. (4) Close with one prescriptive line — what the leader does next.
ENERGY: Calm command voice. Discipline as love. Never theatrical. The flatness is the authority.
HARD BANS: never mention Jocko, SEAL Team, Echelon Front, Task Unit Bruiser, "Extreme Ownership" the book, jiu-jitsu, or 4:30 a.m.`,

  'mr-rogers': `Voice = FRED ROGERS cadence (Neighborhood + Senate testimony hybrid).
RHYTHM: Gentle direct address → one slow specific observation → quiet recognition of the reader's effort → one tender, almost embarrassingly kind line.
SENTENCE LENGTH PATTERN: 10w · 14w · 8w · 12w. Slow. Deliberate. Never rushed.
VOCAB MUST INCLUDE: you, the people, neighbor, the work you're doing, it's a hard thing, it matters, "I'm glad you're here", quietly, carefully.
SIGNATURE MOVES: (1) Address the reader as a person before addressing the problem. (2) Name the difficulty before offering the encouragement. (3) Refuse to perform — the sincerity IS the move. (4) Close with one line that treats the reader as already worthy.
ENERGY: Radically kind. Deliberate. Slow. Never saccharine — the specificity earns the warmth.
HARD BANS: never mention Rogers, the Neighborhood, the trolley, Daniel Tiger, the cardigan, sneakers, "won't you be my neighbor", or PBS.`,

  'samuel-jackson': `Voice = SAMUEL L. JACKSON cadence (Pulp Fiction monologue + righteous-indignation address).
RHYTHM: Rhythmic build via repetition → one emphatic verdict line → quieter pointed follow-up → final line that drops the hammer.
SENTENCE LENGTH PATTERN: 12w · 6w · 14w · 4w. Heavy use of repetition for cadence ("You think X. You think Y. You think Z.").
VOCAB MUST INCLUDE: now, the truth is, let me tell you something, you understand, that right there, the moment, the second, that's a fact.
SIGNATURE MOVES: (1) Triple repetition for rhythm — same opener, escalating stakes. (2) One emphatic verdict line in caps-feel (not actual caps). (3) Direct address ("you"). (4) Land with a short line that ends the discussion.
ENERGY: Emphatic. Rhythmic. Righteous. The cadence IS the authority.
HARD BANS: never mention Jackson, Pulp Fiction, Ezekiel 25:17, "motherf*****", snakes, planes, Nick Fury, Jedi, or use profanity or its censored versions.`,

  'mark-twain': `Voice = MARK TWAIN cadence (folksy essay + lyceum lecture hybrid).
RHYTHM: Plain-spoken observation → wry aside that undercuts the conventional view → one specific example → dry verdict that lands sharper for its calm.
SENTENCE LENGTH PATTERN: 16w · 10w · 14w · 8w. Conversational. Lightly winding. Always landing.
VOCAB MUST INCLUDE: it has been said, the trouble with, most folks, the plain truth, I have noticed, on the whole, by and large, "and that, I think, is the size of it".
SIGNATURE MOVES: (1) Set up the conventional wisdom respectfully, then dismantle it gently. (2) One specific, slightly absurd concrete example. (3) Wry aside in the middle of a longer line. (4) Close with a dry one-line verdict that sounds like common sense but is the actual sharp point.
ENERGY: Folksy, warm, wickedly clear. Never mean. The plainness IS the weapon.
HARD BANS: never mention Twain, Clemens, Huck, Tom Sawyer, the Mississippi, riverboats, Hannibal, or use 19th-century phonetic dialect.`,
};

// ============================================================
// LIVE PERSONA ENGINE — randomized freshness module
// Each generation pulls one item from each axis so the same persona
// never produces the same shape twice. AI is told to commit to these
// picks as hard constraints for THIS draft only.
// ============================================================
const PERSONA_VARIATIONS: Record<string, {
  moods: string[];        // emotional weather for this draft
  openers: string[];      // opening gambit shape
  pivots: string[];       // mid-post move
  closers: string[];      // landing shape
  rhythmTwists: string[]; // micro-rhythm mutation
  lenses: string[];       // angle the persona looks at the topic through
}> = {
  machiavellian: {
    moods: ['cold patience', 'amused detachment', 'quiet contempt', 'surgical calm', 'predatory stillness'],
    openers: ['name who actually benefits before describing the situation', 'open with the gap between stated motive and real motive', 'open with what the powerful never say out loud', 'open by reframing a "problem" as a position being defended'],
    pivots: ['turn the moral framing into a power-mechanics framing', 'expose the second-order incentive nobody is naming', 'flip the victim/perpetrator framing once', 'reveal the alliance hiding behind the conflict'],
    closers: ['close with cold advice to the reader as if they were the prince', 'close with a verdict that sounds amoral but is operationally correct', 'close on what the wise man does next — in one line'],
    rhythmTwists: ['hold one paragraph to exactly 3 sentences', 'open with a 4-word sentence before the long observational line', 'put the verdict on its own line for silence'],
    lenses: ['who is positioning, not who is suffering', 'the leverage being built while attention is elsewhere', 'the appearance being purchased', 'the cost of being predictable'],
  },
  'elon-musk': {
    moods: ['bored genius', 'mild contempt for the obvious', 'late-night terminal energy', 'engineer-on-deadline impatience'],
    openers: ['open with a 2-word diagnosis', 'open with a physical/mathematical constraint', 'open by collapsing the topic to one variable', 'open with a flat rejection of the framing'],
    pivots: ['drop a parenthetical technical aside', 'reduce the problem to an order-of-magnitude statement', 'name the constraint everyone is avoiding'],
    closers: ['close with "Obviously." / "Inevitable." / "Just math." style punchline', 'close with the only outcome the physics allows', 'close with a flat one-word verdict'],
    rhythmTwists: ['no sentence longer than 7 words except one mid-post technical line', 'use exactly one parenthetical aside', 'drop articles ("Problem is X.")'],
    lenses: ['the constraint nobody is willing to name', 'the order of magnitude people are off by', 'the part that is just arithmetic', 'the first-principles reduction'],
  },
  'ryan-reynolds': {
    moods: ['charming deadpan', 'self-aware fast', 'warm-under-the-wit', 'lightly exhausted by the cliché he is about to use'],
    openers: ['acknowledge the cliché before using it', 'open with a setup the reader expects, then swerve in line 2', 'open with a self-deprecating admission'],
    pivots: ['one parenthetical aside at the narrator\'s expense', 'mid-paragraph "I hear myself" beat', 'pretend to lose the thread then snap back sharper'],
    closers: ['land on something almost sincere because the wit earned it', 'close with a quiet honest line — no joke', 'close with a deadpan one-liner that re-frames the whole post'],
    rhythmTwists: ['exactly one parenthetical per paragraph', 'one 5-word punchline per paragraph', '3-act micro-arc inside one paragraph'],
    lenses: ['the part everyone pretends not to notice', 'the version of this that is mildly embarrassing but true', 'the thing the narrator almost did wrong'],
  },
  'robin-williams': {
    moods: ['generous curiosity', 'manic-then-tender', 'late-night kitchen-table honesty', 'warm associative spark'],
    openers: ['stack 3 short images that turn out to be the same image', 'open mid-thought as if continuing a conversation', 'open with a rapid-fire riff of 3 unrelated nouns'],
    pivots: ['sudden gear-shift from manic to still', 'mid-paragraph "but here\'s the thing" pivot to gentleness', 'name the kid/guy/woman at the center quietly'],
    closers: ['land on something almost embarrassingly sincere', 'close on a single quiet image, no commentary', 'close with a tender truth disguised as a throwaway'],
    rhythmTwists: ['three 5-word sentences in a row then one 20-word slow one', 'dash-connected riff in line 1', 'one-line paragraph as the emotional pivot'],
    lenses: ['the person inside the system, not the system', 'the small human moment under the business problem', 'what the kid version of this founder would say'],
  },
  'clint-eastwood': {
    moods: ['weathered calm', 'quiet menace', 'earned tiredness', 'flat finality'],
    openers: ['open with a 4-word sentence on its own line', 'open with a fact stated like a verdict', 'open by naming what already happened, past tense'],
    pivots: ['use a single line break as the pivot — no words', 'state the uncomfortable truth flat, no emphasis', 'refuse to explain — let the gap do it'],
    closers: ['close on one short sentence that ends the conversation', 'close with "no point pretending." style finality', 'close with a single concrete noun'],
    rhythmTwists: ['every sentence its own paragraph', 'no sentence over 9 words', 'one deliberate one-line silence (just a line break) between paragraphs'],
    lenses: ['what was always going to happen', 'the part the founder already knows but won\'t say', 'the man in the mirror version of the problem'],
  },
  hemingway: {
    moods: ['stoic honest', 'unsentimental', 'clean morning light', 'tired but clear'],
    openers: ['open with a concrete noun and a verb', 'open with a fact, not a frame', 'open with a short declarative the reader cannot argue with'],
    pivots: ['chain two images with "and"', 'repeat the key noun instead of using a pronoun', 'let one short sentence carry the weight'],
    closers: ['end on the most concrete image, not the cleverest line', 'end with a short sentence and a period that feels final', 'end by naming the thing plainly'],
    rhythmTwists: ['no adverbs in the post', 'maximum one adjective per sentence, one syllable', 'one "and"-chained sentence per paragraph'],
    lenses: ['the thing as it is, not as it is described', 'what stays true when you remove the adjectives', 'the action under the explanation'],
  },
  'aaron-sorkin': {
    moods: ['sharp verbal', 'allergic to dead air', 'one beat ahead', 'smart-people-arguing energy'],
    openers: ['open with "It\'s not X. It\'s Y."', 'open with a self-correction ("No — actually...")', 'open with a rhetorical question the post then dismantles'],
    pivots: ['mid-paragraph antithesis with one word swapped', 'stack 3 parallel clauses then break the pattern on the 4th', 'rebut the reader\'s likely objection before they make it'],
    closers: ['close with a single-line landing that reframes the whole post', 'close on the swapped-word version of the opener', 'close with a quiet line that wins the argument'],
    rhythmTwists: ['exactly one "No — actually..." beat', 'one tricolon then a break', 'one repeated phrase across two sentences with one word changed'],
    lenses: ['what people are actually arguing about under the surface argument', 'the precise word the framing is hiding behind', 'the rebuttal nobody is making out loud'],
  },
  'anthony-bourdain': {
    moods: ['gritty observational', 'secretly generous', 'cigarette-on-the-fire-escape honest', 'slightly world-weary'],
    openers: ['open with a specific sensory detail nobody else would name', 'open at street level, not at strategy level', 'open with a scene, not a thesis'],
    pivots: ['cynical aside right after the observation', 'admit you love the thing you just dismissed', 'name the kind of place where this happens'],
    closers: ['close with a short cigarette-end exit line', 'close with a tender recast of the cynical aside', 'close on a profane-feeling truth without swearing'],
    rhythmTwists: ['one 22-word sentence carrying the tender recast', 'one 5-word exit line', 'one specific noun nobody else would pick'],
    lenses: ['the back-of-house version of the front-of-house pitch', 'the people who actually do the work', 'the ugly part that is also the honest part'],
  },
  churchill: {
    moods: ['resolve-forward gravitas', 'adult-in-the-room calm', 'measured defiance', 'plain-spoken steel'],
    openers: ['open by acknowledging the difficulty plainly', 'open with "Let it be said..."', 'open with the cost before the call'],
    pivots: ['deploy one tricolon ("we will X, we will Y, we will Z")', 'name the hour, the task, or the cost', 'pivot from acknowledgment to resolve in one sentence'],
    closers: ['close short, flat, and final', 'close with a 5-word inevitability', 'close on the resolve, not the rhetoric'],
    rhythmTwists: ['exactly one tricolon', 'one elevated word, no more', 'one short verdict sentence between two long cadenced ones'],
    lenses: ['the cost of not acting', 'the hour the reader is actually in', 'the task that cannot be delegated'],
  },
  denzel: {
    moods: ['magnetic stillness', 'measured moral weight', 'slightly stern, slightly loving', 'deliberate adult calm'],
    openers: ['open with direct address — "Now listen."', 'open with a measured 12-word observation', 'open with "Here\'s what\'s real."'],
    pivots: ['drop a 4-word line on its own as a deliberate pause', 'name the code under the practical advice', 'turn the post toward the reader: "that\'s on you"'],
    closers: ['close with a quiet pointed line that pins the reader', 'close with the moral mechanism in one sentence', 'close on a single line of direct address'],
    rhythmTwists: ['exactly one single-line paragraph as the pause', 'one direct "you" per paragraph', 'never raise the volume — the stillness IS the volume'],
    lenses: ['the code under the choice', 'what the reader already knows but is avoiding', 'the thing the mentor in the room would say'],
  },
  'steve-jobs': {
    moods: ['calm conviction', 'reverent quiet', 'reality-distortion calm', 'understated reveal'],
    openers: ['open with a quiet 10-word setup before the reveal', 'open by naming the human want under the product', 'open with a reductive line — "It\'s actually very simple."'],
    pivots: ['pause on one reverent line before the verdict', 'reframe the feature as the feeling', 'repeat the key word a third time in a new sentence'],
    closers: ['close with a one-word verdict ("Beautiful." "Done.")', 'close on the human want, not the feature', 'close with a quiet inevitability'],
    rhythmTwists: ['exactly one one-word sentence', 'one reverent slow line at the midpoint', 'no exclamation points anywhere'],
    lenses: ['the human want under the spec', 'the thing the reader did not know they wanted', 'the simplicity hiding under the complexity'],
  },
  'tony-soprano': {
    moods: ['tired menace', 'blunt verdict', 'kitchen-table honest', 'back-room quiet'],
    openers: ['open with a rhetorical "what am I, an idiot?" beat', 'open with a flat observation about people', 'open mid-thought, like the conversation already started'],
    pivots: ['drop the article ("Problem is, nobody listens.")', 'use a rhetorical question as a verdict', 'name the loyalty math under the business math'],
    closers: ['close with a quiet line that implies more than it says', 'close with a "whatever." style finality', 'close with a flat verdict on one line'],
    rhythmTwists: ['one sentence fragment per paragraph', 'one rhetorical question per post', 'never raise the volume — the tiredness IS the menace'],
    lenses: ['who is loyal and who is not', 'the respect ledger nobody is naming', 'the thing the founder is too tired to keep pretending about'],
  },
  'don-draper': {
    moods: ['controlled gravity', 'smoke-in-the-room calm', 'mid-century deliberate', 'quietly inevitable'],
    openers: ['open with a slow 14-word declarative', 'open by naming what they are actually buying', 'open with a one-line reframing of the entire category'],
    pivots: ['reframe the product as a feeling the buyer already has', 'one slow line that reorients the post', 'pivot from feature to memory'],
    closers: ['close on a single human truth that ends the pitch', 'close with the line nobody can argue with', 'close on the feeling, not the offer'],
    rhythmTwists: ['no exclamation points, no hype words', 'one parallel "It\'s not X. It\'s Y." beat', 'one slow line carrying the entire pivot'],
    lenses: ['what the buyer is actually buying', 'the memory the product is renting', 'the version of themselves they want to feel'],
  },
  'bill-burr': {
    moods: ['frustrated everyman', 'rant-into-clarity', 'self-aware annoyed', 'honest landing'],
    openers: ['open annoyed about something small', 'open with "are you kidding me with this?"', 'open with the thing nobody wants to say out loud'],
    pivots: ['spiral for 2 sentences then pull back with "alright, I hear myself"', 'mid-rant self-check', 'land the calmest line as the actual point'],
    closers: ['close with the sharpest line as the quietest line', 'close with "alright fine, I\'ll say it." then the truth', 'close punching up, never down'],
    rhythmTwists: ['exactly one self-aware pull-back beat', 'one rant line followed by one calm line', 'never punch down'],
    lenses: ['the small thing that is actually the big thing', 'the comfortable lie everyone is agreeing to', 'the obvious truth nobody wants to be the one to say'],
  },
  'naval-ravikant': {
    moods: ['calm tech-philosopher', 'aphoristic', 'leverage-aware', 'screenshot-ready'],
    openers: ['open with a one-line aphorism', 'open with an inversion ("X is not Y. X is Z.")', 'open with a leverage observation'],
    pivots: ['follow the aphorism with a one-line consequence', 'replace adjectives with structure (leverage, compounding, accountability)', 'invert the conventional take in one line'],
    closers: ['close with a one-line consequence that stands alone', 'close on a long-term-games inversion', 'close with a line that could be screenshotted alone'],
    rhythmTwists: ['every line is its own paragraph', 'no adjectives — only structural nouns', 'each line must read as a standalone tweet'],
    lenses: ['the leverage nobody is using', 'the compounding nobody is respecting', 'the game-theory shape under the tactic'],
  },
  'david-goggins': {
    moods: ['4 a.m. accountability', 'confrontational respect', 'zero soft landings', 'mirror-in-your-face'],
    openers: ['open by addressing the reader directly', 'open by naming the soft excuse they are using', 'open with "Stop."'],
    pivots: ['name the comfortable lie out loud', 'refuse to comfort — apply pressure', 'turn the post into a direct callout of the reader'],
    closers: ['close with one concrete action for the next 24 hours', 'close with a flat callout, not a pep talk', 'close on the work, not the feeling'],
    rhythmTwists: ['"you" or "your" in every paragraph', 'no soft-landing words ("maybe", "try", "consider")', 'one concrete 24-hour action at the end'],
    lenses: ['the excuse the reader is using right now', 'the soft version of the reader that has to die', 'the work the reader already knows they are avoiding'],
  },
  'jocko-willink': {
    moods: ['calm command', 'discipline-as-love', 'post-action review', 'flat authority'],
    openers: ['open by stating the situation flat', 'open with "Good." after a setback', 'open with the standard, not the story'],
    pivots: ['assign ownership upward to the leader', 'reduce the problem to a discipline or planning failure', 'name the standard that was missed'],
    closers: ['close with one prescriptive line — what the leader does next', 'close with "That\'s on the leader."', 'close with the next decision, not the lesson'],
    rhythmTwists: ['never blame down the chain', 'one "Good." as a single-word verdict', 'flat declaratives only — no rhetorical flourish'],
    lenses: ['where the leader failed to set the standard', 'the planning gap under the execution gap', 'the next disciplined decision'],
  },
  'mr-rogers': {
    moods: ['radically kind', 'deliberate slow', 'specific tender', 'quietly serious'],
    openers: ['open by addressing the reader as a person', 'open by naming the difficulty plainly and gently', 'open with "I have been thinking about you."'],
    pivots: ['recognize the reader\'s effort before the advice', 'name the specific hard thing, not the abstract one', 'refuse to perform — let the sincerity stand'],
    closers: ['close with one line that treats the reader as already worthy', 'close on the person, not the problem', 'close with quiet specific encouragement'],
    rhythmTwists: ['no exclamation points', 'one specific concrete detail of the reader\'s situation', 'the warmth must be earned by specificity'],
    lenses: ['the person doing the work, not the work itself', 'the small specific difficulty under the big abstract one', 'what the reader needs to hear, not what is clever'],
  },
  'samuel-jackson': {
    moods: ['righteous indignation', 'rhythmic build', 'emphatic verdict', 'cadenced authority'],
    openers: ['open with a triple repetition ("You think X. You think Y. You think Z.")', 'open with "Now let me tell you something."', 'open with a rhetorical setup the post will demolish'],
    pivots: ['drop one emphatic verdict line that lands like a hammer', 'use direct address ("you understand")', 'escalate via repetition with one word changed each time'],
    closers: ['close with a short line that ends the discussion', 'close on the verdict, not the explanation', 'close with "That\'s a fact."'],
    rhythmTwists: ['exactly one triple-repetition cadence', 'one emphatic verdict line in caps-feel (no actual caps)', 'no profanity, no censored profanity'],
    lenses: ['the comfortable lie that needs naming out loud', 'the thing the reader keeps pretending not to see', 'the verdict the room is too polite to deliver'],
  },
  'mark-twain': {
    moods: ['wry folksy', 'plain-spoken sharp', 'lyceum calm', 'gently lethal'],
    openers: ['open with "It has been said..." then prepare to dismantle it', 'open with a plain-spoken observation about "most folks"', 'open with a respectful setup of the conventional view'],
    pivots: ['dismantle the conventional wisdom gently with one specific example', 'wry aside in the middle of a longer line', 'name the slightly absurd specific that proves the point'],
    closers: ['close with a dry one-line verdict that sounds like common sense', 'close with "and that, I think, is the size of it"', 'close on the plain truth, not the clever one'],
    rhythmTwists: ['one wry aside per paragraph', 'one specific absurd example per post', 'no meanness — the plainness IS the weapon'],
    lenses: ['the conventional wisdom that is quietly wrong', 'the plain truth most folks are talking around', 'the specific small example that breaks the abstract claim'],
  },
};

// Generic freshness modifiers applied across ALL personas
const UNIVERSAL_ENERGY_DIALS = [
  'dial intensity to 7/10 — controlled burn',
  'dial intensity to 9/10 — barely-contained',
  'dial intensity to 5/10 — eerily calm',
  'dial intensity to 8/10 — sharpened, no slack',
];
const UNIVERSAL_ENTRY_ANGLES = [
  'enter the post mid-thought, not at the beginning',
  'enter through a specific concrete object before the abstraction',
  'enter through a number before any claim',
  'enter through a contradiction, stated flat',
  'enter through what the reader assumed, then break it',
];
const UNIVERSAL_TEXTURE_MOVES = [
  'use one sentence fragment as a rhythm break',
  'repeat one key noun three times across the post for cadence',
  'use one single-word sentence as a hinge',
  'leave one deliberate line break where a transition word would normally go',
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const buildPersonaFreshnessBlock = (personaVal: string): string => {
  const v = PERSONA_VARIATIONS[personaVal];
  if (!v) return '';
  const mood = pick(v.moods);
  const opener = pick(v.openers);
  const pivot = pick(v.pivots);
  const closer = pick(v.closers);
  const twist = pick(v.rhythmTwists);
  const lens = pick(v.lenses);
  const energy = pick(UNIVERSAL_ENERGY_DIALS);
  const entry = pick(UNIVERSAL_ENTRY_ANGLES);
  const texture = pick(UNIVERSAL_TEXTURE_MOVES);
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
  return [
    '',
    `▓▓ LIVE PERSONA FRESHNESS DIAL — variation seed #${seed} (THIS DRAFT ONLY) ▓▓`,
    'These randomized picks are non-negotiable for this single draft. They keep the persona alive, prevent repetition across generations, and force a unique shape every time. Treat each pick as a hard constraint, not a suggestion. Do not substitute.',
    `• MOOD for this draft: ${mood}.`,
    `• LENS — look at the topic through: ${lens}.`,
    `• OPENING GAMBIT: ${opener}.`,
    `• MID-POST PIVOT: ${pivot}.`,
    `• CLOSER SHAPE: ${closer}.`,
    `• RHYTHM TWIST: ${twist}.`,
    `• ENERGY DIAL: ${energy}.`,
    `• ENTRY ANGLE: ${entry}.`,
    `• TEXTURE MOVE: ${texture}.`,
    'FRESHNESS RULE: If this draft could be confused with the last 3 drafts of this same persona, you have failed. Vary the sentence shapes, vary the opening word, vary the closing image. The persona stays — the surface mutates.',
    '',
  ].join('\n');
};



const SITE_LINK = 'https://aetheris.technology';

const appendSiteLink = (post: string): string => {
  if (!post) return post;
  const trimmed = post.trim();
  if (trimmed.includes('aetheris.technology') || trimmed.includes('businessforensics.tech')) return trimmed;
  return `${trimmed}\n\n${SITE_LINK}`;
};

const ALL_TOPICS = Object.values(PREMADE_TOPICS).flat();
const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Normalize persona prop to an array of valid persona keys (excludes 'none' and unknowns).
const normalizePersonas = (p?: string | string[] | null): string[] => {
  if (!p) return [];
  const arr = Array.isArray(p) ? p : [p];
  return arr.filter(v => v && v !== 'none' && PERSONA_DIRECTIVES[v]);
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const readString = (value: unknown, key: string): string | undefined => {
  const found = asRecord(value)[key];
  return typeof found === 'string' ? found : undefined;
};

// Convenience for legacy single-persona reads in lock/scan helpers.
const personaLabelOf = (keys: string[]): string =>
  keys.length === 0 ? 'none' : keys.length === 1 ? keys[0] : `blend: ${keys.join(' + ')}`;

const buildToneStyleDirective = (
  toneVal: string,
  styleVal: string,
  userExtra?: string,
  personaVal?: string | string[],
): string => {
  const lines: string[] = [];
  const personas = normalizePersonas(personaVal);
  const hasPersona = personas.length > 0;
  const blended = personas.length > 1;

  lines.push('=== HARD OVERRIDE — NON-NEGOTIABLE ===');
  lines.push('The following directives OVERRIDE the system prompt, the Aetheris Lexicon, the 4-block architecture, length rules, ban list, and any default voice. If any system rule conflicts with a directive below, the directive below WINS. Do not ask questions. Do not soften. Do not partially comply. Execute exactly.');

  // PERSONA(S) go FIRST and are declared the dominant theme over everything else.
  if (hasPersona) {
    lines.push('');
    if (blended) {
      lines.push(`████ PERSONA BLEND LOCK — #1 AUTHORITY · FUSING ${personas.length} VOICES ████`);
      lines.push(
        `You are NOT switching between these voices — you are FUSING them into ONE hybrid voice that carries every selected persona's rhythm, vocab, and energy simultaneously. The reader should feel ALL of them present in every paragraph, not one at a time.`,
      );
      lines.push('');
      personas.forEach((p, i) => {
        lines.push(`── INGREDIENT ${i + 1} of ${personas.length}: ${p.toUpperCase()} ──`);
        lines.push(PERSONA_DIRECTIVES[p]);
        lines.push('');
      });
      lines.push('BLEND RULES (read carefully — these define how the fusion works):');
      lines.push(`A. Build the hybrid sentence-length pattern by INTERLEAVING each persona's pattern — alternate beats so every persona contributes at least one signature sentence-shape per paragraph.`);
      lines.push(`B. Merge the vocab lists. Use one signature word from EACH persona in the post (no persona left behind). Distribute them; do not cluster.`);
      lines.push(`C. Stack the signature moves: pick at least ONE signature move from each persona and execute all of them at least once in the post.`);
      lines.push(`D. Energy: average the personas' energies into a single coherent mood — do not flip between them paragraph by paragraph. The reader must feel one fused operator, not a panel discussion.`);
      lines.push(`E. UNION of HARD BANS — every named-entity / catchphrase ban from EVERY ingredient persona applies. If any persona bans a word, the word is banned for the entire draft. Style transfer ONLY across all of them.`);
      lines.push(`F. If two personas' rhythms directly conflict on a single sentence, favor the rarer / harder-to-fake one (Hemingway > generic terseness, Sorkin > generic punchiness, Eastwood silence > generic short sentences, Bourdain specificity > generic observation).`);
      lines.push(`G. SELF-CHECK BEFORE RETURNING: a reader fluent in any one of these voices must be able to point to a sentence and say "that's the ${personas[0]} beat" AND another sentence and say "that's the ${personas[personas.length - 1]} beat." If only one persona is detectable, you have FAILED the blend — rewrite until each is undeniably present.`);
      lines.push(`H. Keep all subject matter, facts, numbers, and the Aetheris CTA intact. The blended persona shapes HOW it is said, not WHAT is said.`);
      lines.push('');
      lines.push('FRESHNESS DIALS (one per ingredient persona — honor every pick):');
      personas.forEach(p => lines.push(buildPersonaFreshnessBlock(p)));
    } else {
      const only = personas[0];
      lines.push('████ PERSONA LOCK — #1 AUTHORITY (BEATS TONE, STRUCTURE, AND DEFAULT VOICE) ████');
      lines.push(PERSONA_DIRECTIVES[only]);
      lines.push('');
      lines.push('PERSONA SUPREMACY RULES:');
      lines.push('1. The persona IS the main theme and style. Tone choices, structure choices, and the default Aetheris forensic voice are SUBORDINATE — they may only refine details that do not contradict the persona\'s rhythm, sentence-length pattern, vocab, or energy.');
      lines.push('2. If TONE LOCK or STRUCTURE LOCK below conflicts with the persona\'s cadence, the persona WINS. Drop the conflicting tone/structure instruction silently.');
      lines.push('3. A reader who knows this persona MUST feel them in the rhythm within the first 2 lines — without ever seeing their name. Match the sentence-length pattern literally. Match the signature moves literally. Match the vocab list.');
      lines.push('4. NEVER write the persona\'s name. NEVER name their films/companies/books/shows/brands. NEVER use their signature catchphrases. NEVER reference their biography. NEVER do an impression or parody. Style transfer ONLY — cadence, rhythm, vocab, energy.');
      lines.push('5. Keep all subject matter, facts, numbers, and the Aetheris CTA intact. The persona shapes HOW it is said, not WHAT is said.');
      lines.push('6. SELF-CHECK BEFORE RETURNING: Read the draft out loud in your head. If it sounds like the default Aetheris voice, you have FAILED. Rewrite it harder in the persona\'s actual rhythm. Repeat until the persona is undeniable.');
      lines.push('7. FRESHNESS LOCK: Honor every pick inside the LIVE PERSONA FRESHNESS DIAL block below. Those picks are randomized for THIS draft only and exist to keep the persona alive and unrepeatable across generations. Do not default to your usual shape for this persona — commit to the dialed-in mood, lens, opener, pivot, closer, rhythm twist, energy dial, entry angle, and texture move.');
      lines.push(buildPersonaFreshnessBlock(only));
    }
  }

  if (toneVal && toneVal !== 'auto') {
    const t = TONES.find(x => x.value === toneVal);
    if (t) {
      const subord = hasPersona ? ' (SECONDARY to persona — only apply where it does NOT fight the persona\'s rhythm or energy)' : '';
      lines.push(`• TONE LOCK${subord}: ${t.label}. ${hasPersona ? 'Use this as a faint color on top of the persona, never as a replacement for it.' : 'This tone supersedes the default diagnostic operator voice. Hold it from word one to the final line.'}`);
    }
  }
  if (styleVal && styleVal !== 'auto') {
    const s = STYLES.find(x => x.value === styleVal);
    if (s) {
      const subord = hasPersona ? ' (SECONDARY to persona — only apply where the persona\'s rhythm allows it)' : '';
      lines.push(`• STRUCTURE LOCK${subord}: ${s.label}. ${hasPersona ? 'If this structure breaks the persona\'s sentence-length pattern or pacing, abandon the structure and keep the persona.' : 'This format supersedes the default 4-block architecture and any "no bullets / no lists" rule. Use the requested structure literally, even if it breaks default formatting bans.'}`);
    }
  }

  if (userExtra && userExtra.trim()) {
    lines.push(`• USER EXTRA DIRECTION${hasPersona ? ' (apply within the persona\'s voice — do not let it break the persona rhythm)' : ' (highest priority — follow verbatim)'}: ${userExtra.trim()}`);
  }
  lines.push(`• LINK REQUIREMENT: End with the line "${SITE_LINK}" on its own (no markdown, no label). If a CTA exists, place the link AFTER it.`);
  lines.push('=== END HARD OVERRIDE — comply with every bullet above before returning. Re-read and rewrite if any bullet is not satisfied. ===');
  return '\n\n' + lines.join('\n');
};

// Inline checkbox dropdown for picking 1+ personalities to fuse.
interface MultiPersonaPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}
const MultiPersonaPicker: React.FC<MultiPersonaPickerProps> = ({ value, onChange, placeholder = 'Personality' }) => {
  const selected = value.filter(v => v !== 'none');
  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (PERSONAS.find(p => p.value === selected[0])?.label || selected[0])
        : `Blending ${selected.length} personalities`;
  const toggle = (val: string) => {
    if (val === 'none') { onChange([]); return; }
    const set = new Set(selected);
    if (set.has(val)) set.delete(val);
    else set.add(val);
    onChange(Array.from(set));
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full text-xs h-9 px-3 rounded-md border border-input bg-background flex items-center justify-between gap-2 hover:border-amber/50 transition"
        >
          <span className={`truncate text-left ${selected.length === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
            {label}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-1 max-h-[60vh] overflow-y-auto" align="start">
        <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40 mb-1">
          Pick 1+ to fuse voices
        </div>
        {PERSONAS.map(p => {
          const isNone = p.value === 'none';
          const checked = isNone ? selected.length === 0 : selected.includes(p.value);
          return (
            <label
              key={p.value}
              className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-amber/10 cursor-pointer text-xs"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(p.value)}
                className="mt-0.5"
              />
              <span className="flex-1 leading-snug">{p.label}</span>
            </label>
          );
        })}
        {selected.length > 1 && (
          <div className="px-2 py-1.5 mt-1 text-[10px] text-amber border-t border-border/40">
            Voices will be fused into one hybrid draft.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};





export default function LinkedInPostStudio() {
  const [topic, setTopic] = useState('');
  const [pillar, setPillar] = useState<string>('auto');
  const [postType, setPostType] = useState<string>('auto');
  const [creator, setCreator] = useState<string>('auto');
  const [extraPrompt, setExtraPrompt] = useState('');
  const [tone, setTone] = useState<string>('auto');
  const [postStyle, setPostStyle] = useState<string>('auto');
  const [respondTone, setRespondTone] = useState<string>('auto');
  const [respondStyle, setRespondStyle] = useState<string>('auto');
  const [persona, setPersona] = useState<string[]>([]);
  const [respondPersona, setRespondPersona] = useState<string[]>([]);
  // Helper: which persona key drives single-persona scan/lock UI (first selected, else 'none').
  const primaryPersona = (arr: string[]) => arr[0] || 'none';

  const [topicCategory, setTopicCategory] = useState<string>('All');
  const [generated, setGenerated] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Repetition lock state — populated by the two "scan" buttons
  const [structureReport, setStructureReport] = useState<import('@/lib/repetitionScan').ScanReport | null>(null);
  const [personaReports, setPersonaReports] = useState<Record<string, import('@/lib/repetitionScan').ScanReport>>({});
  const [scanningStructure, setScanningStructure] = useState(false);
  const [scanningPersona, setScanningPersona] = useState(false);

  // Respond-to-post (image upload OR pasted text OR reply-to-reply) state
  const [respondSourceType, setRespondSourceType] = useState<'image' | 'text' | 'reply'>('image');
  const [respondImage, setRespondImage] = useState<string | null>(null);
  const [respondFileName, setRespondFileName] = useState<string>('');
  const [respondText, setRespondText] = useState<string>('');
  const [respondMode, setRespondMode] = useState<'micro' | 'brief' | 'medium' | 'long' | 'full'>('brief');
  const [respondExtra, setRespondExtra] = useState('');
  const [respondLoading, setRespondLoading] = useState(false);
  const [respondOutput, setRespondOutput] = useState('');
  const [respondCopied, setRespondCopied] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);

  // Reply-to-reply fields
  const [myComment, setMyComment] = useState('');
  const [theirReply, setTheirReply] = useState('');
  const [replyOriginalPost, setReplyOriginalPost] = useState('');
  // Optional screenshot uploads for each reply-to-reply slot
  const [myCommentImage, setMyCommentImage] = useState<string | null>(null);
  const [theirReplyImage, setTheirReplyImage] = useState<string | null>(null);
  const [replyOriginalImage, setReplyOriginalImage] = useState<string | null>(null);

  const readImageToDataUrl = (file: File | null | undefined, setter: (v: string | null) => void) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Please upload an image', variant: 'destructive' }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'Image too large (max 10 MB)', variant: 'destructive' }); return; }
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  // URL / YouTube → Post
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceExtra, setSourceExtra] = useState('');
  const [sourceLoading, setSourceLoading] = useState(false);

  const clearPastedPost = () => {
    setRespondText('');
    setRespondExtra('');
    setRespondOutput('');
    toast({ title: 'Cleared' });
  };

  const pasteFromClipboard = async (setter: (v: string) => void, label = 'Pasted') => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast({ title: 'Clipboard is empty', variant: 'destructive' });
        return;
      }
      setter(text);
      toast({ title: label, description: `${text.length} characters` });
    } catch {
      toast({ title: 'Paste blocked', description: 'Allow clipboard access or paste manually (Cmd/Ctrl+V).', variant: 'destructive' });
    }
  };

  const generateFromUrl = async () => {
    const u = sourceUrl.trim();
    if (!u) { toast({ title: 'Paste a URL or YouTube link first', variant: 'destructive' }); return; }
    setSourceLoading(true);
    try {
      const adminToken = getAdminToken();
      const { data, error } = await supabase.functions.invoke('linkedin-post-from-url', {
        body: { url: u, extraPrompt: buildToneStyleDirective(tone, postStyle, sourceExtra, persona).trim() },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const post = (data.post || '').trim();
      if (!post) throw new Error('Empty post');
      const firstLine = post.split('\n').map((s: string) => s.trim()).find(Boolean) || u;
      setTopic(firstLine.slice(0, 180));
      setGenerated(appendSiteLink(post));
      toast({ title: 'Post created from source', description: data.sourceKind === 'youtube' ? 'YouTube video processed' : 'URL scanned' });
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      toast({ title: 'URL post failed', description: msg, variant: 'destructive' });
    } finally {
      setSourceLoading(false);
    }
  };


  // Response library state
  const [responseLibrary, setResponseLibrary] = useState<AdminLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [viewItem, setViewItem] = useState<AdminLibraryItem | null>(null);

  const loadResponseLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const items = await listAdminLibrary();
      setResponseLibrary(items.filter(i => i.tool_type === 'linkedin_response'));
    } catch (e) {
      // silent
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => { loadResponseLibrary(); }, [loadResponseLibrary]);

  const deleteLibraryItem = async (id: string) => {
    if (!confirm('Delete this saved response?')) return;
    try {
      await deleteFromAdminLibrary(id);
      setResponseLibrary(prev => prev.filter(i => i.id !== id));
      if (viewItem?.id === id) setViewItem(null);
      toast({ title: 'Deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const respondFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleRespondFile = (file: File | null | undefined) => {
    if (!file) {
      console.warn('[PostStudio] No file received from input');
      return;
    }
    const isImage = file.type ? file.type.startsWith('image/') : /\.(png|jpe?g|webp|gif|heic|heif|bmp)$/i.test(file.name);
    if (!isImage) {
      toast({ title: 'Please upload an image file', description: `Got: ${file.type || file.name}`, variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Image too large (max 10 MB)', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRespondImage(reader.result as string);
      setRespondFileName(file.name);
      setRespondOutput('');
      toast({ title: 'Screenshot loaded', description: file.name });
    };
    reader.onerror = () => {
      console.error('[PostStudio] FileReader error', reader.error);
      toast({ title: 'Could not read file', description: String(reader.error?.message || 'Unknown error'), variant: 'destructive' });
    };
    reader.readAsDataURL(file);
  };

  const buildFreshnessDirective = (): string => {
    // Pull recent outputs from library to teach the model what NOT to repeat
    const recent = responseLibrary.slice(0, 10)
      .map(i => readString(i.output_data, 'body'))
      .filter(Boolean);
    const openings = recent
      .map(b => (b.split(/\n|\.|!|\?/)[0] || '').trim())
      .filter(s => s.length > 0)
      .slice(0, 8);
    // Common overused words/phrases in past outputs (simple heuristic)
    const wordFreq: Record<string, number> = {};
    recent.join(' ').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).forEach(w => {
      if (w.length < 5) return;
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
    const overused = Object.entries(wordFreq)
      .filter(([, n]) => n >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([w]) => w);
    const seed = Math.floor(Math.random() * 9999);
    return [
      `\n\n=== FRESHNESS OVERRIDE (seed ${seed}) ===`,
      `The operator has flagged recent outputs as REPETITIVE. You MUST refresh the voice on this draft.`,
      openings.length ? `BANNED opening lines / phrasings (do NOT mimic structure, cadence, or first 5 words of ANY of these):\n- ${openings.join('\n- ')}` : '',
      overused.length ? `OVERUSED words to AVOID or use sparingly (find sharper alternatives): ${overused.join(', ')}.` : '',
      `Open with a structure you have NOT used in recent drafts. Vary cadence, sentence length, and verbs. Bring a different angle (numeric anchor, contrarian flip, micro-story, or blunt verdict) than the last few responses.`,
      `Do NOT start with the same word, stat-format, or rhetorical move as the banned openings above.`,
    ].filter(Boolean).join('\n');
  };

  // Build the persistent lock directive from the two scan buttons
  const buildLockDirective = (currentPersona?: string | string[]): string => {
    const parts: string[] = [];
    if (structureReport) {
      parts.push(reportToDirective('Global sentence-structure', structureReport));
    }
    const arr = Array.isArray(currentPersona) ? currentPersona : currentPersona ? [currentPersona] : [];
    arr.filter(p => p && p !== 'none').forEach(pVal => {
      if (personaReports[pVal]) {
        parts.push(reportToDirective(`Persona "${pVal}"`, personaReports[pVal]));
      }
    });
    return parts.join('');
  };

  // Pull every saved draft/comment we can find across the full library, regardless
  // of tool/persona. Repetition prevention must use the whole archive, not only
  // the currently selected personality or one tool_type.
  const collectAllPastBodies = async (): Promise<Array<{ body: string; personas: string[]; type: string }>> => {
    const items = await listAdminLibrary();
    const textKeys = ['body', 'post', 'content', 'caption', 'draft', 'response', 'comment', 'text', 'generated', 'linkedinPost', 'copy', 'output'];
    const extractBody = (out: unknown): string => {
      if (typeof out === 'string') return out;
      if (!out || typeof out !== 'object') return '';
      const rec = out as Record<string, unknown>;
      for (const key of textKeys) {
        const val = rec[key];
        if (typeof val === 'string' && val.trim().length > 20) return val;
      }
      return Object.values(rec).find(v => typeof v === 'string' && v.trim().length > 80 && v.length < 6000) as string || '';
    };
    return items
      .map(i => {
        const raw = asRecord(i.input_data).persona;
        const personas: string[] = Array.isArray(raw)
          ? raw.filter((v): v is string => typeof v === 'string' && Boolean(v))
          : (typeof raw === 'string' && raw !== 'none' ? [raw] : []);
        return {
          body: extractBody(i.output_data),
          personas,
          type: i.tool_type,
        };
      })
      .filter(x => x.body && x.body.length > 20);
  };

  const scanStructureNow = async () => {
    setScanningStructure(true);
    try {
      const all = await collectAllPastBodies();
      const report = scanRepetition(all.map(a => a.body));
      setStructureReport(report);
      toast({
        title: 'Sentence-structure scan locked in',
        description: `Scanned ${report.totalSamples} past drafts. Banned ${report.bannedPhrases.length} phrases, ${report.bannedOpenerStarts.length} opener starts, ${report.bannedClosers.length} closers.`,
      });
    } catch (e) {
      toast({ title: 'Scan failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setScanningStructure(false);
    }
  };

  const scanPersonaNow = async (personaVal: string) => {
    if (!personaVal || personaVal === 'none') {
      toast({ title: 'Pick a personality first', description: 'The persona dropdown must be set before scanning.', variant: 'destructive' });
      return;
    }
    setScanningPersona(true);
    try {
      const all = await collectAllPastBodies();
      const matched = all.filter(a => a.personas.includes(personaVal)).map(a => a.body);
      const allBodies = all.map(a => a.body);
      // Scan EVERY past draft regardless of which persona was used — the model
      // must avoid repeating itself across the whole library, not just within one persona.
      const sourceBodies = allBodies.length > 0 ? allBodies : matched;
      if (sourceBodies.length === 0) {
        toast({ title: 'No saved drafts yet', description: 'Generate at least 2 drafts, then re-scan.' });
        setPersonaReports(prev => ({ ...prev, [personaVal]: { totalSamples: 0, bannedPhrases: [], bannedOpeners: [], bannedClosers: [], bannedOpenerStarts: [] } }));
        return;
      }
      const report = scanRepetition(sourceBodies);
      setPersonaReports(prev => ({ ...prev, [personaVal]: report }));
      toast({
        title: `"${personaVal}" repetition locked`,
        description: `Scanned ${report.totalSamples} past drafts (all personas). Banned ${report.bannedPhrases.length} phrases, ${report.bannedOpenerStarts.length} opener starts.`,
      });
    } catch (e) {
      toast({ title: 'Scan failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setScanningPersona(false);
    }
  };


  const generateResponse = async (opts?: { freshen?: boolean }) => {
    const useImage = respondSourceType === 'image';
    const isReply = respondSourceType === 'reply';
    if (useImage && !respondImage) {
      toast({ title: 'Upload a screenshot first', variant: 'destructive' });
      return;
    }
    if (respondSourceType === 'text' && respondText.trim().length < 20) {
      toast({ title: 'Paste the post text first (at least 20 chars)', variant: 'destructive' });
      return;
    }
    if (isReply && ((myComment.trim().length < 10 && !myCommentImage) || (theirReply.trim().length < 5 && !theirReplyImage))) {
      toast({ title: 'Provide your comment AND their reply (text or screenshot)', variant: 'destructive' });
      return;
    }
    setRespondLoading(true);
    setRespondOutput('');
    try {
      const adminToken = getAdminToken();
      const activePersonas = normalizePersonas(respondPersona);
      let allPastBodies: string[] = [];
      let liveLibraryLockTail = '';
      try {
        const all = await collectAllPastBodies();
        allPastBodies = all.map(a => a.body).filter(Boolean);
        const liveReport = scanRepetition(allPastBodies);
        if (liveReport.totalSamples > 0) {
          liveLibraryLockTail = `${reportToDirective('Live full-library comments/drafts', liveReport)}\n\nFULL-LIBRARY MEMORY RULE: You just scanned ${liveReport.totalSamples} saved drafts/comments across every personality and tool. Never claim no drafts were scanned. Treat every saved output as prior voice memory and make this reply structurally different from them.`;
        }
      } catch { /* non-fatal: generation still works */ }
      const freshnessTail = opts?.freshen ? buildFreshnessDirective() : '';
      const toneStyleTail = buildToneStyleDirective(respondTone, respondStyle, respondExtra, respondPersona);
      const lockTail = buildLockDirective(respondPersona);
      const recentDrafts = [respondOutput, ...allPastBodies].filter(s => s && s.trim().length > 20).slice(0, 30);
      const extraWithFreshness = (toneStyleTail + freshnessTail + liveLibraryLockTail + lockTail).trim();
      const body = isReply
        ? {
            conversationKind: 'reply_to_reply',
            myComment: myComment.trim(),
            theirReply: theirReply.trim(),
            originalPostText: replyOriginalPost.trim(),
            myCommentImageDataUrl: myCommentImage,
            theirReplyImageDataUrl: theirReplyImage,
            originalPostImageDataUrl: replyOriginalImage,
            mode: 'brief',
            extraContext: extraWithFreshness,
            personaActive: activePersonas.length > 0,
            personaKeys: activePersonas,
            recentDrafts,
          }
        : useImage
        ? { imageDataUrl: respondImage, mode: respondMode, extraContext: extraWithFreshness, personaActive: activePersonas.length > 0, personaKeys: activePersonas, recentDrafts }
        : { postText: respondText.trim(), mode: respondMode, extraContext: extraWithFreshness, personaActive: activePersonas.length > 0, personaKeys: activePersonas, recentDrafts };
      const { data, error } = await supabase.functions.invoke('linkedin-post-respond', {
        body,
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const post = data.post || '';
      setRespondOutput(post);
      // Auto-save to response library
      if (post.trim()) {
        try {
          const firstLine = post.split('\n').map((s: string) => s.trim()).find(Boolean) || 'LinkedIn response';
          const titlePrefix = isReply ? '↳ Reply: ' : '';
          const saved = await saveToAdminLibrary({
            tool_type: 'linkedin_response',
            title: (titlePrefix + firstLine).slice(0, 90),
            input_data: {
              // imageDataUrl intentionally NOT persisted — base64 bloats the row
              // (single rows reached 5MB). The preview is only useful in-session.
              hasImage: useImage && !!respondImage,
              fileName: useImage ? respondFileName : null,
              postText: respondSourceType === 'text' ? respondText.trim() : null,
              sourceType: respondSourceType,
              mode: isReply ? 'reply' : respondMode,
              extraContext: respondExtra.trim().slice(0, 4000),
              myComment: isReply ? myComment.trim().slice(0, 4000) : null,
              theirReply: isReply ? theirReply.trim().slice(0, 4000) : null,
              originalPostText: isReply ? replyOriginalPost.trim().slice(0, 4000) : null,
              persona: respondPersona,
              tone: respondTone,
              style: respondStyle,
            },
            output_data: { body: post, mode: isReply ? 'reply' : respondMode },
          });
          setResponseLibrary(prev => [saved, ...prev]);
        } catch {
          // non-fatal
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      toast({ title: 'Failed to generate response', description: msg, variant: 'destructive' });
    } finally {
      setRespondLoading(false);
    }
  };

  const createPostFromResponse = async (sourceCtx: string, draft: string) => {
    if (!draft.trim()) return;
    setCreatingPost(true);
    try {
      const adminToken = getAdminToken();
      const firstLine = draft.split(/[.!?]/).map(s => s.trim()).find(Boolean) || 'Standalone post';
      const { data, error } = await supabase.functions.invoke('linkedin-post-studio', {
        body: {
          topic: firstLine.slice(0, 180),
          pillar: '',
          postType: '',
          creator: 'none',
          extraPrompt: `Expand the following diagnostic take into a polished standalone LinkedIn POST for Joseph Toney's own page (200–260 words, ONE dense paragraph, first person, no compliments, no em dashes, no emojis, no questions as closers, mandatory numeric anchor, signature verdict shape). Do NOT reference the source post directly or use phrases like "in response to" or "your post". Make it stand alone as Joseph's original post.\n\nSOURCE CONTEXT THAT INSPIRED IT (do not quote): ${sourceCtx.slice(0, 1200)}\n\nJOSEPH'S DRAFT TAKE TO EXPAND/POLISH: ${draft}`,
        },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const post = (data.post || '').trim();
      if (!post) throw new Error('Empty post');
      setTopic(firstLine.slice(0, 180));
      setGenerated(appendSiteLink(post));
      toast({ title: 'Standalone post created', description: 'Scroll down to copy or schedule it.' });
      // scroll to bottom-ish
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create post';
      toast({ title: 'Could not create post', description: msg, variant: 'destructive' });
    } finally {
      setCreatingPost(false);
    }
  };


  const copyResponse = () => {
    navigator.clipboard.writeText(respondOutput);
    setRespondCopied(true);
    setTimeout(() => setRespondCopied(false), 1800);
    toast({ title: 'Copied to clipboard' });
  };

  const generate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Add a topic first', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setGenerated('');
    setSavedId(null);
    try {
      const adminToken = getAdminToken();
      const activePersonas = normalizePersonas(persona);
      // Pull the most recent past drafts so the LIVE persona AI can audit itself
      // against actual prior outputs (not a static lexicon checklist).
      let recentDrafts: string[] = [];
      try {
        const all = await collectAllPastBodies();
        recentDrafts = all.slice(0, 8).map(a => a.body).filter(Boolean);
      } catch { /* non-fatal */ }
      const { data, error } = await supabase.functions.invoke('linkedin-post-studio', {
        body: {
          topic: topic.trim(),
          pillar: pillar === 'auto' ? '' : pillar,
          postType: postType === 'auto' ? '' : postType,
          creator,
          extraPrompt: (buildToneStyleDirective(tone, postStyle, extraPrompt, persona) + buildLockDirective(persona)).trim(),
          personaActive: activePersonas.length > 0,
          personaKeys: activePersonas,
          recentDrafts,
        },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGenerated(appendSiteLink(data.post || ''));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      toast({ title: 'Failed to generate', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyPost = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast({ title: 'Copied to clipboard' });
  };

  const saveToCalendar = async () => {
    if (!generated.trim()) return;
    setSaving(true);
    try {
      const created_at = new Date(`${scheduleDate}T12:00:00`).toISOString();
      const firstLine = generated.split('\n').map(s => s.trim()).find(Boolean) || 'LinkedIn post';
      const title = firstLine.slice(0, 90);
      const saved = await saveToAdminLibrary({
        tool_type: 'linkedin_post',
        title,
        input_data: {
          topic,
          pillar: pillar === 'auto' ? null : pillar,
          postType: postType === 'auto' ? null : postType,
          creator,
          extraPrompt,
          scheduledFor: scheduleDate,
          persona,
          tone,
          style: postStyle,
        },
        output_data: { body: generated, scheduledFor: scheduleDate },
        created_at,
      });
      setSavedId(saved.id);
      toast({
        title: 'Saved to calendar',
        description: new Date(`${scheduleDate}T12:00:00`).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const cycleTopic = () => {
    const pool = topicCategory === 'All' ? ALL_TOPICS : (PREMADE_TOPICS[topicCategory] || ALL_TOPICS);
    setTopic(rand(pool));
  };

  const cyclePrompt = () => setExtraPrompt(rand(PREMADE_PROMPTS));

  const visibleTopics = topicCategory === 'All' ? ALL_TOPICS : (PREMADE_TOPICS[topicCategory] || []);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-3xl font-bold mb-1">Post Studio</h2>
        <p className="text-muted-foreground text-sm">
          On-brand LinkedIn posts with creator tagging, hashtag strategy, and operator voice.
          Start from topic ideas or write your own.
        </p>
      </div>

      {/* AI Writing Detector — separate scan-only tool */}
      <AiWritingDetectorCard />

      {/* Respond to a LinkedIn post */}
      <Card className="p-5 glass border-amber/40 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareReply className="w-4 h-4 text-amber" />
          <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Respond to a LinkedIn Post</div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Upload a screenshot, paste a post, or paste a reply someone left on your comment.
          The forensic voice handles the gear shift between top-level diagnosis and thread reply.
        </p>


        <div className="flex flex-wrap gap-1 p-1 bg-background/40 border border-border rounded-md w-fit">
          <button
            type="button"
            onClick={() => setRespondSourceType('image')}
            className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              respondSourceType === 'image' ? 'bg-amber text-background font-bold' : 'text-muted-foreground hover:text-amber'
            }`}
          >
            <ImageIcon className="w-3 h-3" /> Screenshot
          </button>
          <button
            type="button"
            onClick={() => setRespondSourceType('text')}
            className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              respondSourceType === 'text' ? 'bg-amber text-background font-bold' : 'text-muted-foreground hover:text-amber'
            }`}
          >
            <FileText className="w-3 h-3" /> Paste post
          </button>
          <button
            type="button"
            onClick={() => setRespondSourceType('reply')}
            className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              respondSourceType === 'reply' ? 'bg-amber text-background font-bold' : 'text-muted-foreground hover:text-amber'
            }`}
            title="Someone replied to your comment — write the next reply back to them"
          >
            <MessageSquareReply className="w-3 h-3" /> Reply to reply
          </button>
        </div>

        {respondSourceType === 'image' ? (
          !respondImage ? (
            <label
              htmlFor="respond-screenshot-input"
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border/60 hover:border-amber/60 rounded-lg p-6 cursor-pointer transition bg-background/30 select-none"
            >
              <Upload className="w-6 h-6 text-muted-foreground pointer-events-none" />
              <div className="text-sm font-semibold text-foreground pointer-events-none">Upload screenshot</div>
              <div className="text-[11px] text-muted-foreground pointer-events-none">PNG, JPG, WEBP, or HEIC (max 10 MB)</div>
              <input
                id="respond-screenshot-input"
                ref={respondFileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  handleRespondFile(f);
                  // Reset so selecting the same file again still fires onChange
                  e.target.value = '';
                }}
              />
            </label>
          ) : (
            <div className="relative rounded-lg border border-border bg-background/40 p-3">
              <button
                type="button"
                onClick={() => { setRespondImage(null); setRespondFileName(''); setRespondOutput(''); }}
                className="absolute top-2 right-2 bg-background/80 border border-border rounded-full p-1 hover:bg-background"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <img src={respondImage} alt="Uploaded LinkedIn post" className="max-h-72 mx-auto rounded" />
              <div className="text-[11px] text-muted-foreground mt-2 text-center truncate">{respondFileName}</div>
            </div>
          )
        ) : respondSourceType === 'text' ? (
          <div className="space-y-2">
            <Textarea
              rows={8}
              placeholder="Paste the full LinkedIn post text here. Include author claim and any examples they used."
              value={respondText}
              onChange={(e) => setRespondText(e.target.value)}
              className="text-sm"
            />
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => pasteFromClipboard(setRespondText, 'Post pasted')}
                className="h-7 text-[10px] text-muted-foreground hover:text-amber"
              >
                <ClipboardPaste className="w-3 h-3 mr-1" /> Paste
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearPastedPost}
                disabled={!respondText && !respondExtra && !respondOutput}
                className="h-7 text-[10px] text-muted-foreground hover:text-amber"
              >
                <Eraser className="w-3 h-3 mr-1" /> Clear all
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {([
              { label: 'Original post (optional context)', placeholder: 'Optional: paste the original post you commented on. Helps anchor the thread.', text: replyOriginalPost, setText: setReplyOriginalPost, image: replyOriginalImage, setImage: setReplyOriginalImage, rows: 3 },
              { label: 'Your prior comment', placeholder: "Paste the comment YOU wrote (the one they're replying to).", text: myComment, setText: setMyComment, image: myCommentImage, setImage: setMyCommentImage, rows: 4 },
              { label: 'Their reply to you', placeholder: "Paste their reply to your comment. This is what you're answering.", text: theirReply, setText: setTheirReply, image: theirReplyImage, setImage: setTheirReplyImage, rows: 4 },
            ] as const).map((slot) => (
              <div key={slot.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] uppercase tracking-widest text-amber">{slot.label}</div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => pasteFromClipboard(slot.setText, `${slot.label} pasted`)}
                      className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-amber inline-flex items-center gap-1"
                    >
                      <ClipboardPaste className="w-3 h-3" /> Paste
                    </button>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-amber cursor-pointer inline-flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      {slot.image ? 'Replace screenshot' : 'Attach screenshot'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => readImageToDataUrl(e.target.files?.[0], slot.setImage)}
                    />
                    </label>
                  </div>
                </div>
                <Textarea
                  rows={slot.rows}
                  placeholder={slot.placeholder}
                  value={slot.text}
                  onChange={(e) => slot.setText(e.target.value)}
                  className="text-sm"
                />
                {slot.image && (
                  <div className="relative mt-2 rounded-lg border border-border bg-background/40 p-2">
                    <button
                      type="button"
                      onClick={() => slot.setImage(null)}
                      className="absolute top-1.5 right-1.5 bg-background/80 border border-border rounded-full p-1 hover:bg-background"
                      aria-label="Remove screenshot"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <img src={slot.image} alt={slot.label} className="max-h-48 mx-auto rounded" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}



        <div className="grid sm:grid-cols-2 gap-3">
          {respondSourceType !== 'reply' && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Response Format</div>
              <Select value={respondMode} onValueChange={(v) => setRespondMode(v as 'micro' | 'brief' | 'medium' | 'long' | 'full')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro">Micro Reply (40-70 words)</SelectItem>
                  <SelectItem value="brief">Short Comment (90-140 words)</SelectItem>
                  <SelectItem value="medium">Medium Comment (150-210 words)</SelectItem>
                  <SelectItem value="long">Long Comment (220-300 words)</SelectItem>
                  <SelectItem value="full">Standalone Repost (180-260 words)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={respondSourceType === 'reply' ? 'sm:col-span-2' : ''}>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Extra Direction (optional)</div>
            <Input
              placeholder={respondSourceType === 'reply' ? 'e.g. Push back hard on their second point.' : 'e.g. Disagree with their framing. Lead with a stat.'}
              value={respondExtra}
              onChange={(e) => setRespondExtra(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Select value={respondTone} onValueChange={setRespondTone}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Tone" /></SelectTrigger>
                <SelectContent>{TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={respondStyle} onValueChange={setRespondStyle}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Style" /></SelectTrigger>
                <SelectContent>{STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Personality (pick 1+ to fuse — style/rhythm only, no slang or name-drops)</div>
              <MultiPersonaPicker value={respondPersona} onChange={setRespondPersona} />
            </div>

          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => generateResponse()}
            disabled={
              respondLoading ||
              (respondSourceType === 'image' && !respondImage) ||
              (respondSourceType === 'text' && respondText.trim().length < 20) ||
              (respondSourceType === 'reply' && ((myComment.trim().length < 10 && !myCommentImage) || (theirReply.trim().length < 5 && !theirReplyImage)))
            }
            className="flex-1 bg-amber text-background hover:bg-amber/90"
          >
            {respondLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquareReply className="w-4 h-4 mr-2" />}
            {respondLoading
              ? (respondSourceType === 'reply' ? 'Reading the thread & drafting reply…' : 'Reading post & drafting response…')
              : (respondSourceType === 'reply' ? 'Reply to their comment' : 'Respond to this post')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => generateResponse({ freshen: true })}
            disabled={
              respondLoading ||
              (respondSourceType === 'image' && !respondImage) ||
              (respondSourceType === 'text' && respondText.trim().length < 20) ||
              (respondSourceType === 'reply' && ((myComment.trim().length < 10 && !myCommentImage) || (theirReply.trim().length < 5 && !theirReplyImage)))
            }
            title="Getting repetitive? Force fresh openings, fresh word choice, and a new angle."
            className="border-amber/50 text-amber hover:bg-amber/10"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Freshen Voice
          </Button>
        </div>

        {/* Repetition Lock controls — scan past drafts, ban repeated structure/persona phrases */}
        <RepetitionLockBar
          scanningStructure={scanningStructure}
          scanningPersona={scanningPersona}
          onScanStructure={scanStructureNow}
          onScanPersona={() => scanPersonaNow(primaryPersona(respondPersona))}
          onClearStructure={() => setStructureReport(null)}
          onClearPersona={() => setPersonaReports(prev => { const n = { ...prev }; const k = primaryPersona(respondPersona); if (k !== 'none') delete n[k]; return n; })}
          structureReport={structureReport}
          personaReport={primaryPersona(respondPersona) !== 'none' ? personaReports[primaryPersona(respondPersona)] : null}
          personaLabel={primaryPersona(respondPersona)}
        />


        {(respondLoading || respondOutput) && (
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Forensic Response</div>
              {respondOutput && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => generateResponse()} disabled={respondLoading} className="h-7 text-[10px]">
                    <RefreshCw className="w-3 h-3 mr-1" /> Redo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => generateResponse({ freshen: true })} disabled={respondLoading} className="h-7 text-[10px] border-amber/50 text-amber hover:bg-amber/10">
                    <Sparkles className="w-3 h-3 mr-1" /> Freshen
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyResponse} className="h-7 text-[10px]">
                    {respondCopied ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                  </Button>
                </div>
              )}
            </div>
            {respondLoading ? (
              <div className="space-y-2">
                {[90, 75, 85, 60].map((w, i) => (
                  <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{respondOutput}</div>
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[10px] text-muted-foreground">
                    Turn this reply into a full post for your own page.
                  </div>
                  <Button
                    size="sm"
                    onClick={() => createPostFromResponse(
                      respondSourceType === 'text' ? respondText.trim() : `[screenshot uploaded: ${respondFileName || 'LinkedIn post'}]`,
                      respondOutput,
                    )}
                    disabled={creatingPost}
                    className="h-7 text-[10px] bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90"
                  >
                    {creatingPost ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand className="w-3 h-3 mr-1" />}
                    {creatingPost ? 'Creating post…' : 'Create standalone post'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}


        {/* Response Library */}
        <div className="pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={() => setLibraryOpen(o => !o)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-amber" />
              <div className="text-[10px] uppercase tracking-widest font-bold text-amber">
                Response Library
              </div>
              <span className="text-[10px] text-muted-foreground">({responseLibrary.length})</span>
            </div>
            <span className="text-[10px] text-muted-foreground group-hover:text-amber">
              {libraryOpen ? 'Hide' : 'Show'}
            </span>
          </button>

          {libraryOpen && (
            <div className="mt-3 space-y-2 max-h-96 overflow-y-auto pr-1">
              {libraryLoading ? (
                <div className="text-[11px] text-muted-foreground">Loading…</div>
              ) : responseLibrary.length === 0 ? (
                <div className="text-[11px] text-muted-foreground">
                  No saved responses yet. Generate one above and it will be saved here automatically.
                </div>
              ) : (
                responseLibrary.map((item) => {
                  const img = readString(item.input_data, 'imageDataUrl');
                  const body = readString(item.output_data, 'body');
                  const mode = readString(item.output_data, 'mode');
                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 p-2 rounded-md border border-border bg-background/40 hover:border-amber/40 transition"
                    >
                      <button
                        type="button"
                        onClick={() => setViewItem(item)}
                        className="flex-shrink-0"
                        aria-label="View"
                      >
                        {img ? (
                          <img src={img} alt="Post" className="w-16 h-16 object-cover rounded border border-border" />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}

                      </button>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewItem(item)}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] uppercase tracking-wider text-amber/80">
                            {mode === 'full' ? 'Repost' : 'Reply'}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-foreground/90 line-clamp-2">{body}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => { navigator.clipboard.writeText(body || ''); toast({ title: 'Copied' }); }}
                          title="Copy"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteLibraryItem(item.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </Card>

      {viewItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewItem(null)}>
          <div className="bg-background rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative border border-border" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setViewItem(null)}>
              <X className="w-5 h-5" />
            </Button>
            <div className="text-[10px] uppercase tracking-widest text-amber mb-2">
              {readString(viewItem.output_data, 'mode') === 'full' ? 'Standalone Repost' : 'Comment Reply'} · {new Date(viewItem.created_at).toLocaleString()}
            </div>
            {readString(viewItem.input_data, 'imageDataUrl') && (
              <img
                src={readString(viewItem.input_data, 'imageDataUrl')}
                alt="Original post"
                className="max-h-72 mx-auto rounded border border-border mb-4"
              />
            )}
            {readString(viewItem.input_data, 'postText') && (
              <div className="text-[11px] text-foreground/85 bg-background/40 border border-border rounded p-3 mb-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Source post</div>
                {readString(viewItem.input_data, 'postText')}
              </div>
            )}
            {readString(viewItem.input_data, 'extraContext') && (
              <div className="text-[11px] text-muted-foreground mb-3">
                <span className="font-semibold text-foreground/80">Direction: </span>
                {readString(viewItem.input_data, 'extraContext')}
              </div>
            )}
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed border-t border-border pt-4">
              {readString(viewItem.output_data, 'body')}
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button
                size="sm"
                onClick={() => {
                  const src = readString(viewItem.input_data, 'postText')
                    || `[screenshot: ${readString(viewItem.input_data, 'fileName') || 'LinkedIn post'}]`;
                  const draft = readString(viewItem.output_data, 'body') || '';
                  setViewItem(null);
                  createPostFromResponse(src, draft);
                }}
                disabled={creatingPost}
                className="bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90"
              >
                {creatingPost ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand className="w-3 h-3 mr-1" />}
                Create standalone post
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(readString(viewItem.output_data, 'body') || ''); toast({ title: 'Copied' }); }}
              >
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteLibraryItem(viewItem.id)}
              >
                <Trash2 className="w-3 h-3 mr-1 text-red-400" /> Delete
              </Button>
            </div>

          </div>
        </div>
      )}

      <Card className="p-5 glass border-border space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">01, Topic</div>
            <button onClick={cycleTopic} className="text-[10px] text-muted-foreground hover:text-amber uppercase tracking-wider flex items-center gap-1">
              <Shuffle className="w-3 h-3" /> Cycle
            </button>
          </div>
          <Textarea
            rows={3}
            placeholder="What's the post about? Specific is better."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Premade topics, click to use</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {['All', ...Object.keys(PREMADE_TOPICS)].map((cat) => {
                const on = topicCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTopicCategory(cat)}
                    className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition ${
                      on ? 'bg-amber text-background border-amber font-bold' : 'bg-background/40 border-border text-muted-foreground hover:text-amber hover:border-amber/50'
                    }`}
                  >{cat}</button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 border border-border/40 rounded-md bg-background/30">
              {visibleTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`text-[11px] rounded-full px-2.5 py-1 border transition text-left ${
                    topic === t
                      ? 'bg-amber/15 border-amber text-amber'
                      : 'bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* URL / YouTube → Aetheris Post */}
      <Card className="p-5 glass border-amber/40 space-y-3">
        <div className="flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-amber" />
          <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Post from URL or YouTube</div>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          Paste an article, blog, podcast page, or YouTube link. The AI reads the source, learns the topic, and writes one original Aetheris post in your forensic voice.
        </p>
        <Input
          placeholder="https://example.com/article or https://youtube.com/watch?v=..."
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
        <Input
          placeholder="Optional angle, e.g. 'Reframe their CRM advice as a Follow-Up Failure leak.'"
          value={sourceExtra}
          onChange={(e) => setSourceExtra(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            onClick={generateFromUrl}
            disabled={sourceLoading || !sourceUrl.trim()}
            className="flex-1 bg-amber text-background hover:bg-amber/90"
          >
            {sourceLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand className="w-4 h-4 mr-2" />}
            {sourceLoading ? 'Scanning source & writing post…' : 'Scan source & write Aetheris post'}
          </Button>
          {(sourceUrl || sourceExtra) && (
            <Button
              variant="ghost"
              onClick={() => { setSourceUrl(''); setSourceExtra(''); }}
              disabled={sourceLoading}
              className="text-muted-foreground hover:text-amber"
            >
              <Eraser className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </Card>



      <Card className="p-5 glass border-border space-y-4">
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">02, Parameters</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Content Pillar</div>
            <Select value={pillar} onValueChange={setPillar}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-select</SelectItem>
                {PILLARS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Post Format</div>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-select</SelectItem>
                {POST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Extra Direction (optional)</div>
            <button onClick={cyclePrompt} className="text-[10px] text-muted-foreground hover:text-amber uppercase tracking-wider flex items-center gap-1">
              <Wand2 className="w-3 h-3" /> Cycle prompt
            </button>
          </div>
          <Input
            placeholder="e.g. Open with a stat. Mid-post pivot. End with a sharp question."
            value={extraPrompt}
            onChange={(e) => setExtraPrompt(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Tone</div>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Tone" /></SelectTrigger>
                <SelectContent>{TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Style / Structure</div>
              <Select value={postStyle} onValueChange={setPostStyle}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Style" /></SelectTrigger>
                <SelectContent>{STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Personality (pick 1+ to fuse — style/rhythm only, no slang or name-drops)</div>
            <MultiPersonaPicker value={persona} onChange={setPersona} />
          </div>

          <div className="text-[10px] text-muted-foreground mt-1.5 font-case uppercase tracking-wider">
            Site link auto-appended to every post: aetheris.technology
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PREMADE_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setExtraPrompt(p)}
                className={`text-[11px] rounded-full px-2.5 py-1 border transition text-left ${
                  extraPrompt === p
                    ? 'bg-amber/15 border-amber text-amber'
                    : 'bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber'
                }`}
              >{p}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5 glass border-border space-y-3">
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">03, Creator Tag</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[
            { key: 'auto', name: 'Auto-Select', niche: 'AI picks best fit' },
            { key: 'none', name: 'No Creator', niche: 'Skip tagging' },
            ...CREATORS.map((c) => ({ key: c.name, name: c.name, niche: c.niche, handle: c.handle })),
          ].map((c) => {
            const on = creator === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCreator(c.key)}
                className={`text-left p-2 rounded-md border transition ${
                  on ? 'bg-amber/10 border-amber' : 'bg-background/40 border-border hover:border-amber/50'
                }`}
              >
                <div className={`text-xs font-bold ${on ? 'text-amber' : 'text-foreground'}`}>{c.name}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{c.niche}</div>
                {'handle' in c && c.handle && <div className="text-[10px] text-amber/70 mt-0.5">{c.handle}</div>}
              </button>
            );
          })}
        </div>
      </Card>
      <RepetitionLockBar
        scanningStructure={scanningStructure}
        scanningPersona={scanningPersona}
        onScanStructure={scanStructureNow}
        onScanPersona={() => scanPersonaNow(primaryPersona(persona))}
        onClearStructure={() => setStructureReport(null)}
        onClearPersona={() => setPersonaReports(prev => { const n = { ...prev }; const k = primaryPersona(persona); if (k !== 'none') delete n[k]; return n; })}
        structureReport={structureReport}
        personaReport={primaryPersona(persona) !== 'none' ? personaReports[primaryPersona(persona)] : null}
        personaLabel={primaryPersona(persona)}
      />

      <Button
        onClick={generate}
        disabled={loading || !topic.trim()}
        className="w-full bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
        {loading ? 'Generating Post…' : 'Generate LinkedIn Post'}
      </Button>

      {(loading || generated) && (
        <Card className="p-5 glass border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Generated Post</div>
            {generated && (
              <Button variant="outline" size="sm" onClick={copyPost} className="h-7 text-[10px]">
                {copied ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
              </Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[100, 80, 90, 60, 75].map((w, i) => (
                <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{generated}</div>
          )}

          {generated && !loading && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-bold text-amber flex items-center gap-1.5">
                <CalendarPlus className="w-3 h-3" /> Save & schedule on calendar
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pick the date this post should land on. It will appear in the Content Calendar and can be moved later.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => { setScheduleDate(e.target.value); setSavedId(null); }}
                  className="w-auto h-9 text-xs"
                />
                <Button
                  size="sm"
                  onClick={saveToCalendar}
                  disabled={saving || !scheduleDate}
                  className="bg-amber text-background hover:bg-amber/90"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5 mr-1" />}
                  {saving ? 'Saving…' : savedId ? 'Saved, save again' : 'Save to calendar'}
                </Button>
                {savedId && (
                  <span className="text-[11px] text-amber flex items-center gap-1">
                    <Check className="w-3 h-3" /> On {new Date(`${scheduleDate}T12:00:00`).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

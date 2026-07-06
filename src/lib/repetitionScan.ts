// Repetition scanner: detects overused phrases, openings, and closings
// across past generated posts so the model can ban them going forward.

const STOP = new Set([
  'the','a','an','and','or','but','if','then','of','to','in','on','for','at','by',
  'with','from','as','is','are','was','were','be','been','being','it','its','this',
  'that','these','those','i','you','we','they','he','she','them','their','our',
  'your','my','me','us','so','not','no','do','does','did','have','has','had',
  'will','would','can','could','should','may','might','just','than','then','also',
  'about','into','out','up','down','over','under','one','two','more','most','some',
  'any','all','what','which','who','when','where','why','how',
]);

function clean(s: string): string {
  return s.replace(/https?:\/\/\S+/g, ' ')
          .replace(/[^\p{L}\p{N}\s'.!?]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();
}

function words(s: string): string[] {
  return clean(s).toLowerCase().split(/\s+/).filter(Boolean);
}

function isJunkPhrase(toks: string[]): boolean {
  const nonStop = toks.filter(t => !STOP.has(t)).length;
  return nonStop < Math.max(2, Math.floor(toks.length / 2));
}

function ngramCounts(texts: string[], n: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of texts) {
    const w = words(t);
    for (let i = 0; i <= w.length - n; i++) {
      const slice = w.slice(i, i + n);
      if (isJunkPhrase(slice)) continue;
      const key = slice.join(' ');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

function topN(counts: Map<string, number>, minCount: number, limit: number): Array<[string, number]> {
  return Array.from(counts.entries())
    .filter(([, c]) => c >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function sentenceList(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 4);
}

function firstSentence(text: string): string {
  return sentenceList(text)[0] || '';
}

function lastSentence(text: string): string {
  const s = sentenceList(text);
  return s[s.length - 1] || '';
}

export interface ScanReport {
  totalSamples: number;
  bannedPhrases: string[];     // overused 4-7 word phrases
  bannedOpeners: string[];     // first sentences seen ≥2 times (or paraphrased)
  bannedClosers: string[];     // closing lines repeated
  bannedOpenerStarts: string[];// first 4-word starters
}

export function scanRepetition(texts: string[]): ScanReport {
  const clean = texts.map(t => (t || '').trim()).filter(Boolean);
  if (clean.length === 0) {
    return { totalSamples: 0, bannedPhrases: [], bannedOpeners: [], bannedClosers: [], bannedOpenerStarts: [] };
  }
  const minPhrase = clean.length >= 6 ? 3 : 2;

  // Repeated n-gram phrases (4-7 words)
  const merged = new Map<string, number>();
  for (const n of [4, 5, 6, 7]) {
    for (const [k, v] of ngramCounts(clean, n)) {
      if (v >= minPhrase) merged.set(k, Math.max(merged.get(k) || 0, v));
    }
  }
  const bannedPhrases = topN(merged, minPhrase, 30).map(([p]) => p);

  // Repeated opening sentences (any duplicate)
  const opens = clean.map(firstSentence).filter(Boolean);
  const openCounts = new Map<string, number>();
  opens.forEach(o => openCounts.set(o, (openCounts.get(o) || 0) + 1));
  const bannedOpeners = Array.from(openCounts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([s]) => s);

  // First 4-word opener "starters" (catches paraphrased repetition)
  const starterCounts = new Map<string, number>();
  for (const o of opens) {
    const w = words(o).slice(0, 4);
    if (w.length < 3) continue;
    const k = w.join(' ');
    starterCounts.set(k, (starterCounts.get(k) || 0) + 1);
  }
  const bannedOpenerStarts = Array.from(starterCounts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([s]) => s);

  // Repeated closing sentences
  const closes = clean.map(lastSentence).filter(Boolean);
  const closeCounts = new Map<string, number>();
  closes.forEach(o => closeCounts.set(o, (closeCounts.get(o) || 0) + 1));
  const bannedClosers = Array.from(closeCounts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([s]) => s);

  return {
    totalSamples: clean.length,
    bannedPhrases,
    bannedOpeners,
    bannedClosers,
    bannedOpenerStarts,
  };
}

export function reportToDirective(label: string, r: ScanReport): string {
  if (r.totalSamples === 0) return '';
  const lines: string[] = [];
  lines.push(`\n\n=== ${label.toUpperCase()} REPETITION LOCK (scanned ${r.totalSamples} past drafts) ===`);
  lines.push(`The operator has scanned past outputs and identified repeated patterns. These are NON-NEGOTIABLE bans for this draft. Violating ANY of them is a failed draft.`);
  if (r.bannedPhrases.length) {
    lines.push(`\nBANNED EXACT PHRASES (do not use any of these word sequences, even reworded with one synonym swap):`);
    r.bannedPhrases.forEach(p => lines.push(`  · "${p}"`));
  }
  if (r.bannedOpenerStarts.length) {
    lines.push(`\nBANNED OPENING STARTERS (do NOT begin the draft with any of these first words or close paraphrases):`);
    r.bannedOpenerStarts.forEach(p => lines.push(`  · "${p}…"`));
  }
  if (r.bannedOpeners.length) {
    lines.push(`\nBANNED FIRST SENTENCES (never reuse, never paraphrase):`);
    r.bannedOpeners.forEach(p => lines.push(`  · ${p}`));
  }
  if (r.bannedClosers.length) {
    lines.push(`\nBANNED CLOSING SENTENCES (find a new landing):`);
    r.bannedClosers.forEach(p => lines.push(`  · ${p}`));
  }
  lines.push(`\nRULE: Build the opener and closer from a DIFFERENT structural move than anything above. New verb. New rhythm. New image. If you feel yourself reaching for one of the banned shapes, pick a different angle entirely.`);
  return lines.join('\n');
}

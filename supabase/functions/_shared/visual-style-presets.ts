// Canonical visual style preset definitions shared by every image pipeline.
// Both the Media Studio (admin-image-studio) and the post image pipeline
// (generate-content-image) build their prompts from here so the same preset id
// always produces the same visual language. Keep ids stable.

export const AETHERIS_VINTAGE_DETECTIVE = "aetheris-vintage-detective";

export interface AspectSize {
  width: number;
  height: number;
  label: string;
  ratioKey: string;
}

/** Aspect ratios supported by the preset aware pipelines. */
export const ASPECT_SIZES: Record<string, AspectSize> = {
  "1:1": { width: 1024, height: 1024, label: "Square 1:1", ratioKey: "1:1" },
  "4:5": { width: 832, height: 1040, label: "Portrait 4:5", ratioKey: "4:5" },
  "3:4": { width: 880, height: 1168, label: "Portrait 3:4", ratioKey: "3:4" },
  "16:9": { width: 1216, height: 688, label: "Landscape 16:9", ratioKey: "16:9" },
  "4:1": { width: 1584, height: 396, label: "Banner 4:1", ratioKey: "4:1" },
};

export function resolveAspect(ratio: unknown, fallback = "1:1"): AspectSize {
  const key = typeof ratio === "string" && ASPECT_SIZES[ratio] ? ratio : fallback;
  return ASPECT_SIZES[key] ?? ASPECT_SIZES["1:1"];
}


const PALETTE = `PALETTE (independent editorial print, no deviation):
  • Warm uncoated paper #EFE8D5 as the page ground, warm white #F7F3E8 for lighter panels
  • Flat ink black #111317 for type, rules and photographic blacks
  • Restrained mustard gold #F4A125 as the single accent, optional bronze #C78522
  • Subtle natural paper grain and a real photographic halftone dot in the image areas, never a repeating embossed texture
  • No neon, no glowing eyes, no circuitry wallpaper, no blue technology light, no metallic gold sheen, no glassmorphism, no glossy SaaS interface, no floating icons, no radial diagrams, no fake dashboards, no decorative charts, no mystical eyes, no generic stock office photography`;

const CHARACTER = `SIGNATURE CHARACTER (when a figure appears):
  A sophisticated vintage humanoid private detective. Ceramic humanlike face with visibly mechanical neck joints and mechanical hands, felt fedora and a tailored 1940s trench coat over shirt and tie. Observant, skeptical, composed expression. Realistic anatomy and realistic scale, photographic rendering, never cartoon, never a toy robot.
  Cinematic noir depth built from clear foreground, midground and background layers. Dramatic slatted window shadows, old office, corridor or workshop settings, simple blank props only such as a folder, telephone, desk lamp or loose papers. Props carry no printed text.
  Vary the scene, pose, camera angle, crop and layout on every generation. Do not repeat a face on desk photograph.`;

const LAYOUT = `LAYOUT AND TYPOGRAPHY:
  Asymmetric editorial grid in the spirit of a Swiss modernist annual report crossed with a 1970s industrial systems manual and film noir advertising. Thin ledger rules, strong margins, deliberate negative space and one obvious reading order.
  Headline set in a huge condensed grotesk with the character of Bebas Neue or Impact, flat ink black, tight leading, uppercase.
  Body copy in a neutral grotesk with the character of Inter or Space Grotesk, small and readable.
  Any caption or footer line is a restrained monospace, uppercase, widely tracked.`;

const TEXT_HYGIENE = `TEXT HYGIENE:
  Render only the text supplied below, spelled exactly, with no additions. No case numbers, no note numbers, no filler microtext, no extra slogans on walls or props, no invented pricing, no invented statistics, no extra taglines. Typography must stay large enough to read on a phone. If a line will not fit, set it smaller rather than paraphrasing it.`;

export interface DetectiveCopy {
  /** Big condensed headline. */
  headline?: string;
  /** One or two supporting sentences. */
  body?: string;
  /** Short closing line or call to action. */
  kicker?: string;
  /** Footer brand line. Defaults to the Aetheris footer. */
  footer?: string;
  /** Eyebrow / brand lockup at the top. */
  brand?: string;
}

function copyBlock(copy: DetectiveCopy): string {
  const lines: string[] = [];
  if (copy.brand) lines.push(`BRAND LOCKUP (top of the page, small, widely tracked): "${copy.brand}"`);
  if (copy.headline) lines.push(`HEADLINE (huge condensed grotesk, dominant element): "${copy.headline}"`);
  if (copy.body) lines.push(`BODY (small neutral grotesk, one short block): "${copy.body}"`);
  if (copy.kicker) lines.push(`CLOSING LINE (condensed grotesk, smaller than the headline): "${copy.kicker}"`);
  if (copy.footer) lines.push(`FOOTER (monospace, uppercase, bottom edge): "${copy.footer}"`);
  if (!lines.length) return "";
  return `\nEXACT TEXT TO RENDER — reproduce verbatim, nothing else:\n${lines.map((l) => `  • ${l}`).join("\n")}\n`;
}

/**
 * Build the full image prompt for the Aetheris Vintage Detective preset.
 * `subject` describes the scene. `copy` is optional: image only use in the
 * Media Studio renders the visual direction with no advertising text.
 */
export function vintageDetectivePrompt(subject: string, opts: { copy?: DetectiveCopy; aspect?: string } = {}): string {
  const copy = opts.copy ?? {};
  const hasCopy = Boolean(copy.headline || copy.body || copy.kicker || copy.footer || copy.brand);
  const aspect = typeof opts.aspect === "string" && ASPECT_SIZES[opts.aspect] ? opts.aspect : "4:5";

  return `Independent editorial print advertisement, ${aspect} aspect ratio. Designed, not decorated.

PRIMARY SUBJECT — render this literally, it is the content of the image:
>>> ${subject.trim()} <<<

${PALETTE}

${CHARACTER}

${LAYOUT}
${hasCopy
    ? `${copyBlock(copy)}\n${TEXT_HYGIENE}`
    : `TEXT POLICY — no advertising copy was supplied:
  Render only the text the PRIMARY SUBJECT above explicitly asks for, spelled exactly as it is written there, and nothing else. Never invent headlines, captions, taglines, slogans, logos, case numbers or microtext of your own.
  If the subject asks for no text, the page carries no legible text at all: compose it as a full bleed editorial photograph in the palette and character above, leaving deliberate negative space where type could later sit.`}

Overall: looks like a commissioned print page from an independent design annual. Photographic halftone realism, cinematic noir lighting, restrained ink and one gold accent. No cigarettes, no weapons.`;
}

export const VINTAGE_DETECTIVE_NEGATIVE =
  "neon, glowing eyes, circuit board wallpaper, blue technology light, metallic gold, glassmorphism, glossy saas interface, floating icons, radial diagram, fake dashboard, decorative chart, mystical eye, stock office photo, cartoon, anime, chibi, 3d toy robot, pixar, cgi plastic, rainbow gradient, airbrush, cigarette, cigar, gun, weapon, gibberish text, duplicated letters, watermark clutter, deformed hands, extra limbs";

/**
 * Copy direction handed to the text model when this preset drives a written
 * post. Punchy, concrete and honest: no invented numbers, no auto pricing.
 */
export const VINTAGE_DETECTIVE_COPY_DIRECTION = `WRITING STYLE: Aetheris Vintage Detective campaign voice.
- Open on one specific tension a business owner already feels, stated flat, in plain words.
- Name the real business consequence of that tension. Concrete, operational, no drama.
- Give the concrete Aetheris approach, grounded only in the company knowledge and evidence supplied here.
- Close with a useful line or a single clear call to action.
- Challenge familiar software and AI cliches, but never claim every competitor is identical and never attribute a quote to a named vendor.
- No invented customer results, no invented financial figures, no feature parity claims, no guarantees.
- Include pricing only if the request explicitly supplies it, and keep the offer scope exactly as supplied. Never insert a price on your own.
- No case numbers, no filler microtext, no generic AI jargon, no internal terminology a customer would not understand.
- Short declarative sentences. A business owner must understand it cold on first read.
- Structure it so the strongest line could be set as a huge condensed headline.`;

/** One line style hint stored with generated content metadata. */
export const VISUAL_STYLE_IDS = [AETHERIS_VINTAGE_DETECTIVE] as const;

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, X, Sparkles, Move3d, RotateCcw, Volume2, VolumeX, SlidersHorizontal, KeyRound, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Background } from '@/components/Background';
import aetherisLogoAsset from '@/assets/aetheris-a-logo.png.asset.json';
const aetherisLogo = aetherisLogoAsset.url;
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { SHOP_TOOLS } from '@/lib/tool-shop-catalog';
import { readAccess } from '@/components/TechSolutionsAccessBar';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Pull every tool asset json in one glob
const assetModules = import.meta.glob('/src/assets/tools/*.asset.json', {
  eager: true,
}) as Record<string, { default: { url: string; original_filename: string } }>;

const IMG_BY_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const path in assetModules) {
    const file = path.split('/').pop() ?? '';
    const id = file.replace(/\.(png|jpg|jpeg|webp)\.asset\.json$/, '');
    map[id] = assetModules[path].default.url;
  }
  return map;
})();

type PlacedTool = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  route: string;
  img: string | null;
  priceCents: number | null;
  // initial spawn position
  x: number;
  y: number;
  z: number;
};

const formatPrice = (cents: number | null): string => {
  if (cents == null) return 'Included';
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const UNIVERSE_ACCESS_KEY = 'aetheris_universe_access_v1';

type UniverseAccess = {
  unlocked: boolean;
  code: string | null;
  plan: string | null;
  email: string | null;
  unlockedAt: string | null;
};

const EMPTY_UNIVERSE_ACCESS: UniverseAccess = {
  unlocked: false,
  code: null,
  plan: null,
  email: null,
  unlockedAt: null,
};

function readUniverseAccess(): UniverseAccess {
  try {
    const raw = localStorage.getItem(UNIVERSE_ACCESS_KEY);
    if (!raw) return EMPTY_UNIVERSE_ACCESS;
    const parsed = JSON.parse(raw);
    return {
      unlocked: parsed?.unlocked === true,
      code: typeof parsed?.code === 'string' ? parsed.code : null,
      plan: typeof parsed?.plan === 'string' ? parsed.plan : null,
      email: typeof parsed?.email === 'string' ? parsed.email : null,
      unlockedAt: typeof parsed?.unlockedAt === 'string' ? parsed.unlockedAt : null,
    };
  } catch {
    return EMPTY_UNIVERSE_ACCESS;
  }
}

function writeUniverseAccess(access: UniverseAccess) {
  try {
    localStorage.setItem(UNIVERSE_ACCESS_KEY, JSON.stringify(access));
  } catch { /* storage unavailable */ }
  try {
    window.dispatchEvent(new Event('universe-access-changed'));
  } catch { /* noop */ }
}

function useUniverseAccess(): [UniverseAccess, (access: UniverseAccess) => void] {
  const [state, setState] = useState<UniverseAccess>(() => readUniverseAccess());

  useEffect(() => {
    const refresh = () => setState(readUniverseAccess());
    const onStorage = (event: StorageEvent) => {
      if (event.key === UNIVERSE_ACCESS_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('universe-access-changed', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('universe-access-changed', refresh);
    };
  }, []);

  const set = (next: UniverseAccess) => {
    writeUniverseAccess(next);
    setState(next);
  };

  return [state, set];
}


// physics bounds (cube half-extents) and node collision radius
const BOUND_X = 520;
const BOUND_Y = 300;
const BOUND_Z = 520;
const NODE_RADIUS = 96;

type PhysicsParams = {
  restitution: number; // bounciness 0..1.2
  damping: number;     // 0..3 (v decays as exp(-damping*dt))
  drift: number;       // 0..80 px/s^2 random jitter to keep motion alive
  soundOn: boolean;
  soundVolume: number; // 0..1
};

const DEFAULT_PARAMS: PhysicsParams = {
  restitution: 0.92,
  damping: 0.35,
  drift: 22,
  soundOn: true,
  soundVolume: 0.5,
};

// Deterministic pseudo-random so layout is stable between renders
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 9301 + salt * 49297) * 233280;
  return x - Math.floor(x);
}

const categoryColor: Record<string, string> = {
  diagnostics: '#e63946',
  content: '#d9a93a',
  reports: '#7fd1ff',
  sales: '#9be37f',
};

// ---------- Lazy thumbnail (IntersectionObserver-backed) ----------
const LazyThumb = memo(function LazyThumb({
  src,
  alt,
  fallback,
}: { src: string | null; alt: string; fallback: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src || !ref.current || visible) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { root: null, rootMargin: '300px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src, visible]);

  return (
    <div ref={ref} className="w-full h-full">
      {src && visible ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          // @ts-expect-error non-standard but honored by Chromium
          fetchpriority="low"
          onLoad={() => setLoaded(true)}
          draggable={false}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-amber font-forensic italic text-lg bg-black/40">
          {fallback}
        </div>
      )}
    </div>
  );
});

// ---------- Single tool node (ref-driven animation, no re-render on tick) ----------
type NodeProps = {
  tool: PlacedTool;
  index: number;
  color: string;
  registerAnimator: (id: string, el: HTMLButtonElement) => void;
  unregisterAnimator: (id: string) => void;
  onOpen: (t: PlacedTool) => void;
  onDragDown: (index: number, e: React.PointerEvent) => void;
  onDragMove: (index: number, e: React.PointerEvent) => void;
  onDragUp: (index: number, e: React.PointerEvent) => boolean; // returns true if it was a drag (suppress click)
};

const ToolNode = memo(function ToolNode({
  tool, index, color, registerAnimator, unregisterAnimator, onOpen,
  onDragDown, onDragMove, onDragUp,
}: NodeProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);
  const draggedRef = useRef(false);

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    registerAnimator(tool.id, el);
    return () => unregisterAnimator(tool.id);
  }, [tool.id, registerAnimator, unregisterAnimator]);

  return (
    <button
      ref={btnRef}
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onPointerDown={(e) => { draggedRef.current = false; onDragDown(index, e); }}
      onPointerMove={(e) => onDragMove(index, e)}
      onPointerUp={(e) => { draggedRef.current = onDragUp(index, e); }}
      onPointerCancel={(e) => { draggedRef.current = onDragUp(index, e); }}
      onClick={(e) => {
        e.stopPropagation();
        if (draggedRef.current) { draggedRef.current = false; return; }
        onOpen(tool);
      }}
      className="absolute left-1/2 top-1/2 w-[168px] -ml-[84px] -mt-[110px] cursor-grab active:cursor-grabbing"
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        contain: 'layout paint style',
        transform: `translate3d(${tool.x}px, ${tool.y}px, ${tool.z}px)`,
        zIndex: Math.round(1000 + tool.z),
        touchAction: 'none',
      }}
    >
      <div
        className="rounded-md overflow-hidden border bg-[#0b0d14]/85 pointer-events-none"
        style={{
          borderColor: hover ? color : 'rgba(217,169,58,0.25)',
          boxShadow: hover
            ? `0 0 40px ${color}80, 0 0 8px ${color}`
            : `0 8px 24px rgba(0,0,0,0.55)`,
          transform: hover ? 'scale(1.12)' : 'scale(1)',
          transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s',
        }}
      >
        <div className="relative aspect-square bg-black/50 overflow-hidden">
          <LazyThumb src={tool.img} alt={tool.name} fallback={tool.name.slice(0, 2)} />
          <div
            className="absolute top-1.5 left-1.5 font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border"
            style={{ color, borderColor: `${color}80`, background: `${color}18` }}
          >
            {tool.category}
          </div>
        </div>
        <div className="px-2.5 py-2 border-t border-amber/15">
          <div className="font-forensic text-[13px] leading-tight font-semibold truncate" title={tool.name}>
            {tool.name}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-foreground/50">
              #{String(index + 1).padStart(2, '0')} · signal
            </div>
            <div
              className="font-mono text-[10px] font-bold tracking-tight"
              style={{ color }}
            >
              {formatPrice(tool.priceCents)}
            </div>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-24 h-2 rounded-full blur-[3px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${color}90 0%, transparent 70%)` }}
      />
    </button>
  );
});

// ---------- Access gate overlay (Golden Report → email code, or rep/staff code) ----------
const UniverseAccessGate: React.FC<{ unlocked: boolean; onUnlocked: () => void }> = ({ unlocked, onUnlocked }) => {
  const [access, setAccess] = useUniverseAccess();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState(() => access.email ?? readAccess().email ?? '');
  const [busyCode, setBusyCode] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);

  // Only a Universe-specific unlock opens the page. General Tech Solutions,
  // purchased tool, or email/free-run unlocks do not bypass this gate.
  if (unlocked || access.unlocked) return null;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) { toast.error('Enter a valid email.'); return; }
    setBusyEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('universe-access', {
        body: { action: 'issue', email: email.trim().toLowerCase() },
      });
      if (error || !data?.ok) {
        toast.error(data?.message || "We couldn't find a completed Golden Report for that email. Run it first.");
        return;
      }
      setAccess({ ...access, email: email.trim().toLowerCase() });
      toast.success(data.message || 'Access code sent — check your inbox.');
    } finally {
      setBusyEmail(false);
    }
  };

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    setBusyCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('universe-access', {
        body: { action: 'redeem', code: c },
      });
      if (error || !data?.ok) { toast.error(data?.message || "That code isn't valid."); return; }
      const nextAccess: UniverseAccess = {
        unlocked: true,
        code: String(data.code || c).toUpperCase(),
        plan: String(data.plan || 'universe'),
        email: access.email ?? data.email ?? null,
        unlockedAt: new Date().toISOString(),
      };
      setAccess(nextAccess);
      onUnlocked();
      const label = data.plan === 'staff' ? 'Staff' : data.plan === 'rep' ? `Rep ${data.code}` : 'Access';
      toast.success(`${label} unlocked — Universe open.`);
    } finally {
      setBusyCode(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-6"
      style={{
        backdropFilter: 'blur(6px) saturate(120%)',
        WebkitBackdropFilter: 'blur(6px) saturate(120%)',
        background: 'rgba(5,6,10,0.25)',
      }}
    >
      <div className="max-w-lg w-full text-center rounded-2xl border border-amber/30 bg-black/50 backdrop-blur-xl p-8 md:p-10 shadow-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber mb-3 inline-flex items-center gap-2">
          <Sparkles className="w-3 h-3" /> Access Locked
        </p>
        <h2 className="font-forensic text-2xl md:text-3xl font-bold leading-tight tracking-tight text-foreground">
          You can access <span className="text-amber italic">The Aetheris Universe</span> after you've run the Golden Report.
        </h2>
        <p className="mt-4 text-sm text-foreground/70">
          Run your free forensic scan first. The moment it finishes, we email you a
          Universe access code. Enter it below and the gate opens.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/golden"
            className="inline-flex items-center gap-2 rounded-lg bg-amber px-6 py-3 font-mono text-xs uppercase tracking-widest text-black hover:bg-amber/90 transition"
          >
            Run the Golden Report <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-amber/40 px-6 py-3 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber/10 transition"
          >
            Back to Home
          </Link>
        </div>

        {/* Email → resend Universe access code (after Golden Report) */}
        <div className="mt-8 pt-6 border-t border-amber/20 text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80 mb-3 inline-flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Already ran the report? Email me my code
          </p>
          <form onSubmit={requestCode} className="flex gap-2">
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-background/70 border-amber/25 font-mono text-sm"
              maxLength={255}
            />
            <button
              type="submit"
              disabled={busyEmail || !emailValid}
              className="inline-flex items-center gap-2 rounded-lg bg-amber px-4 py-2 font-mono text-xs uppercase tracking-widest text-black hover:bg-amber/90 transition disabled:opacity-50"
            >
              {busyEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send code'}
            </button>
          </form>
          <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Same email you used on the Golden Report.
          </p>
        </div>

        {/* Code redemption — access, rep, or staff code */}
        <div className="mt-6 pt-6 border-t border-amber/20 text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80 mb-3 inline-flex items-center gap-2">
            <KeyRound className="w-3 h-3" /> Access · Rep · Employee code
          </p>
          <form onSubmit={redeem} className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter Universe code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="flex-1 bg-background/70 border-amber/25 font-mono text-sm tracking-widest text-center"
              maxLength={32}
            />
            <button
              type="submit"
              disabled={busyCode || !code.trim()}
              className="inline-flex items-center gap-2 rounded-lg border border-amber/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-amber hover:bg-amber/10 transition disabled:opacity-50"
            >
              {busyCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Unlock'}
            </button>
          </form>
          <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Aetheris reps & employees — enter your code to bypass the gate.
          </p>
        </div>
      </div>
    </div>
  );
};


const AetherisUniversePage: React.FC = () => {
  const navigate = useNavigate();
  const [universeAccess] = useUniverseAccess();
  const [universeUnlocked, setUniverseUnlocked] = useState(() => readUniverseAccess().unlocked);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null); // rotating "camera" stage
  const [selected, setSelected] = useState<PlacedTool | null>(null);
  const [hudRot, setHudRot] = useState({ x: -8, y: 0 }); // display-only

  // Mutable state (avoids re-renders during animation / drag)
  const rotRef = useRef({ x: -8, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const nodesRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const inViewRef = useRef(true);
  const visibleRef = useRef(true);

  // Physics parameters (live-tunable, ref = no re-render on slider drag)
  const [paramsUI, setParamsUI] = useState<PhysicsParams>(DEFAULT_PARAMS);
  const paramsRef = useRef<PhysicsParams>(DEFAULT_PARAMS);
  paramsRef.current = paramsUI;
  const [showControls, setShowControls] = useState(false);

  // Spark container + audio context
  const sparkLayerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBlipRef = useRef(0);

  // Drag-throw state
  const dragNodeRef = useRef<{
    i: number; pointerId: number;
    lastX: number; lastY: number; lastT: number;
    vx: number; vy: number; vz: number;
    moved: number;
  } | null>(null);

  const tools: PlacedTool[] = useMemo(() => {
    return SHOP_TOOLS.map((t, i) => {
      const angle = seeded(i, 1) * Math.PI * 2;
      const radius = 260 + seeded(i, 2) * 220;
      const y = (seeded(i, 3) - 0.5) * 400;
      return {
        id: t.id, name: t.name, tagline: t.tagline, category: t.category, route: t.route,
        img: IMG_BY_ID[t.id] ?? null,
        priceCents: t.priceCents,
        x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius,
      };
    });
  }, []);

  useEffect(() => {
    setUniverseUnlocked(universeAccess.unlocked);
  }, [universeAccess.unlocked]);

  // Physics state — position + velocity per tool. Mutated in the rAF loop.
  const physicsRef = useRef<{ x: number; y: number; z: number; vx: number; vy: number; vz: number }[]>([]);
  if (physicsRef.current.length !== tools.length) {
    physicsRef.current = tools.map((t, i) => ({
      x: t.x, y: t.y, z: t.z,
      vx: (seeded(i, 21) - 0.5) * 160,
      vy: (seeded(i, 22) - 0.5) * 110,
      vz: (seeded(i, 23) - 0.5) * 160,
    }));
  }

  const registerAnimator = React.useCallback((id: string, el: HTMLButtonElement) => {
    nodesRef.current.set(id, el);
  }, []);
  const unregisterAnimator = React.useCallback((id: string) => {
    nodesRef.current.delete(id);
  }, []);

  // ----- Audio: short click blip on collision (throttled) -----
  const playImpact = React.useCallback((impactSpeed: number) => {
    const P = paramsRef.current;
    if (!P.soundOn) return;
    const now = performance.now();
    if (now - lastBlipRef.current < 35) return;
    lastBlipRef.current = now;
    try {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const strength = Math.min(1, impactSpeed / 500);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 240 + Math.random() * 260 + strength * 200;
      const vol = Math.max(0.02, Math.min(0.22, strength * 0.22)) * P.soundVolume;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.15);
    } catch { /* audio unavailable */ }
  }, []);

  // ----- Spark VFX: append a short-lived DOM element at world position -----
  const spawnSpark = React.useCallback((x: number, y: number, z: number, impactSpeed: number, color: string) => {
    const layer = sparkLayerRef.current;
    if (!layer) return;
    const strength = Math.min(1, impactSpeed / 500);
    const size = 24 + strength * 60;
    // outer wrapper positions in world; inner element does the scale/fade animation
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position:absolute;left:50%;top:50%;
      width:${size}px;height:${size}px;margin-left:${-size / 2}px;margin-top:${-size / 2}px;
      transform:translate3d(${x}px, ${y}px, ${z}px);
      pointer-events:none;transform-style:preserve-3d;
    `;
    const inner = document.createElement('div');
    inner.style.cssText = `
      width:100%;height:100%;
      border-radius:9999px;
      background:radial-gradient(circle, #ffffff 0%, ${color} 25%, ${color}80 45%, rgba(255,255,255,0) 75%);
      mix-blend-mode:screen;
      box-shadow: 0 0 24px ${color}, 0 0 48px ${color}80;
      animation:aetherSpark 520ms ease-out forwards;
      will-change:transform,opacity;
    `;
    wrap.appendChild(inner);
    layer.appendChild(wrap);
    setTimeout(() => { wrap.remove(); }, 560);
  }, []);


  // Pause work when page hidden or scene off-screen
  useEffect(() => {
    const onVis = () => { visibleRef.current = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    const io = new IntersectionObserver(
      ([e]) => { inViewRef.current = e.isIntersecting; },
      { threshold: 0.05 },
    );
    io.observe(sceneRef.current);
    return () => io.disconnect();
  }, []);

  // Single rAF loop drives EVERY node + stage via DOM writes
  useEffect(() => {
    const toolList = tools;
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let hudCounter = 0;

    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000; // sec
      last = now;

      if (visibleRef.current && inViewRef.current) {
        t += dt;

        // Auto-rotate when not dragging
        if (!dragRef.current) {
          rotRef.current.y += dt * 6; // deg/sec
        }

        const rx = rotRef.current.x;
        const ry = rotRef.current.y;

        // Stage transform (single write per frame)
        if (stageRef.current) {
          stageRef.current.style.transform =
            `translateZ(-200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        }

        // ----- Physics: integrate + wall bounce + pairwise elastic collisions -----
        const P = paramsRef.current;
        const R = P.restitution;
        const dragI = dragNodeRef.current?.i ?? -1;
        const dampMul = Math.exp(-P.damping * dt);
        const phys = physicsRef.current;
        const N = phys.length;
        // Dynamic bounds — bounce off the actual scene edges (viewport-scale)
        const sceneRect = sceneRef.current?.getBoundingClientRect();
        const bx = sceneRect ? Math.max(160, sceneRect.width / 2 - NODE_RADIUS) : BOUND_X;
        const by = sceneRect ? Math.max(160, sceneRect.height / 2 - NODE_RADIUS) : BOUND_Y;
        const bz = BOUND_Z;
        // integrate + damping + drift + walls
        for (let i = 0; i < N; i++) {
          if (i === dragI) continue; // node is being held by the user
          const p = phys[i];
          // small random drift acceleration keeps things alive
          if (P.drift > 0) {
            p.vx += (Math.random() - 0.5) * P.drift * dt * 2;
            p.vy += (Math.random() - 0.5) * P.drift * dt * 2;
            p.vz += (Math.random() - 0.5) * P.drift * dt * 2;
          }
          p.vx *= dampMul; p.vy *= dampMul; p.vz *= dampMul;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          if (p.x >  bx) { p.x =  bx; p.vx = -Math.abs(p.vx) * R; }
          if (p.x < -bx) { p.x = -bx; p.vx =  Math.abs(p.vx) * R; }
          if (p.y >  by) { p.y =  by; p.vy = -Math.abs(p.vy) * R; }
          if (p.y < -by) { p.y = -by; p.vy =  Math.abs(p.vy) * R; }
          if (p.z >  bz) { p.z =  bz; p.vz = -Math.abs(p.vz) * R; }
          if (p.z < -bz) { p.z = -bz; p.vz =  Math.abs(p.vz) * R; }
        }
        // pairwise collisions (equal mass elastic; dragged node treated as immovable)
        const minDist = NODE_RADIUS * 2;
        const minDistSq = minDist * minDist;
        for (let i = 0; i < N; i++) {
          const a = phys[i];
          for (let j = i + 1; j < N; j++) {
            const b = phys[j];
            const dxp = b.x - a.x;
            const dyp = b.y - a.y;
            const dzp = b.z - a.z;
            const d2 = dxp * dxp + dyp * dyp + dzp * dzp;
            if (d2 >= minDistSq || d2 === 0) continue;
            const d = Math.sqrt(d2) || 0.0001;
            const nx = dxp / d, ny = dyp / d, nz = dzp / d;
            const aHeld = i === dragI;
            const bHeld = j === dragI;
            const overlap = minDist - d;
            if (aHeld && !bHeld) {
              b.x += nx * overlap; b.y += ny * overlap; b.z += nz * overlap;
            } else if (bHeld && !aHeld) {
              a.x -= nx * overlap; a.y -= ny * overlap; a.z -= nz * overlap;
            } else {
              const half = overlap * 0.5;
              a.x -= nx * half; a.y -= ny * half; a.z -= nz * half;
              b.x += nx * half; b.y += ny * half; b.z += nz * half;
            }
            const rvx = b.vx - a.vx, rvy = b.vy - a.vy, rvz = b.vz - a.vz;
            const relN = rvx * nx + rvy * ny + rvz * nz;
            if (relN >= 0) continue; // moving apart
            const impactSpeed = -relN;
            if (aHeld && !bHeld) {
              const jimp = -(1 + R) * relN;
              b.vx += jimp * nx; b.vy += jimp * ny; b.vz += jimp * nz;
            } else if (bHeld && !aHeld) {
              const jimp = -(1 + R) * relN;
              a.vx -= jimp * nx; a.vy -= jimp * ny; a.vz -= jimp * nz;
            } else {
              const jimp = -(1 + R) * relN * 0.5;
              a.vx -= jimp * nx; a.vy -= jimp * ny; a.vz -= jimp * nz;
              b.vx += jimp * nx; b.vy += jimp * ny; b.vz += jimp * nz;
            }
            // VFX + sound only for reasonably firm impacts
            if (impactSpeed > 40) {
              const midX = (a.x + b.x) * 0.5;
              const midY = (a.y + b.y) * 0.5;
              const midZ = (a.z + b.z) * 0.5;
              const catA = toolList[i]?.category ?? 'diagnostics';
              const catB = toolList[j]?.category ?? 'diagnostics';
              const col = categoryColor[catA] || categoryColor[catB] || '#ffd58a';
              spawnSpark(midX, midY, midZ, impactSpeed, col);
              playImpact(impactSpeed);
            }
          }
        }

        // Counter-rotate so cards face camera + write physics transform
        const cardCounter = `rotateY(${-ry}deg) rotateX(${-rx}deg)`;
        for (let i = 0; i < toolList.length; i++) {
          const tool = toolList[i];
          const el = nodesRef.current.get(tool.id);
          if (!el) continue;
          const p = phys[i];
          el.style.transform =
            `translate3d(${p.x}px, ${p.y}px, ${p.z}px) ${cardCounter}`;
          el.style.zIndex = String(Math.round(1000 + p.z));
        }

        // Update HUD ~4× per second (React state) instead of every frame
        hudCounter += dt;
        if (hudCounter > 0.25) {
          hudCounter = 0;
          setHudRot({ x: rx, y: ry });
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tools]);

  // Drag to orbit — mutates refs, no re-render
  const onDown = (e: React.PointerEvent) => {
    if (dragNodeRef.current) return; // a card is being thrown; let it handle events
    dragRef.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    rotRef.current.x = Math.max(-40, Math.min(40, rotRef.current.x - dy * 0.3));
    rotRef.current.y += dx * 0.3;
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => { dragRef.current = null; };

  // ----- Drag-throw a single card -----
  const onNodeDown = React.useCallback((i: number, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = physicsRef.current[i];
    if (!p) return;
    p.vx = 0; p.vy = 0; p.vz = 0;
    dragNodeRef.current = {
      i, pointerId: e.pointerId,
      lastX: e.clientX, lastY: e.clientY, lastT: performance.now(),
      vx: 0, vy: 0, vz: 0, moved: 0,
    };
    // resume audio on the first gesture
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume().catch(() => {});
  }, []);

  const onNodeMove = React.useCallback((i: number, e: React.PointerEvent) => {
    const d = dragNodeRef.current;
    if (!d || d.i !== i) return;
    const dxPix = e.clientX - d.lastX;
    const dyPix = e.clientY - d.lastY;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT) / 1000;
    // convert screen delta into stage-local delta using stage rotation about Y
    const ry = (rotRef.current.y * Math.PI) / 180;
    const worldDX = dxPix * Math.cos(ry);
    const worldDZ = -dxPix * Math.sin(ry);
    const worldDY = dyPix;
    const p = physicsRef.current[i];
    p.x += worldDX; p.y += worldDY; p.z += worldDZ;
    // clamp to bounds so we can't drag off-scene (use live scene size)
    const sr = sceneRef.current?.getBoundingClientRect();
    const bxD = sr ? Math.max(160, sr.width / 2 - NODE_RADIUS) : BOUND_X;
    const byD = sr ? Math.max(160, sr.height / 2 - NODE_RADIUS) : BOUND_Y;
    p.x = Math.max(-bxD, Math.min(bxD, p.x));
    p.y = Math.max(-byD, Math.min(byD, p.y));
    p.z = Math.max(-BOUND_Z, Math.min(BOUND_Z, p.z));
    d.vx = worldDX / dt; d.vy = worldDY / dt; d.vz = worldDZ / dt;
    d.lastX = e.clientX; d.lastY = e.clientY; d.lastT = now;
    d.moved += Math.hypot(dxPix, dyPix);
  }, []);

  const onNodeUp = React.useCallback((i: number, _e: React.PointerEvent) => {
    const d = dragNodeRef.current;
    if (!d || d.i !== i) return false;
    const p = physicsRef.current[i];
    // apply throw velocity, clamped
    const cap = 1600;
    const sp = Math.hypot(d.vx, d.vy, d.vz);
    const scale = sp > cap ? cap / sp : 1;
    p.vx = d.vx * scale; p.vy = d.vy * scale; p.vz = d.vz * scale;
    const wasDrag = d.moved > 6;
    dragNodeRef.current = null;
    return wasDrag;
  }, []);

  const recenter = () => {
    rotRef.current = { x: -8, y: 0 };
    setHudRot({ x: -8, y: 0 });
  };

  const resetPhysics = () => {
    physicsRef.current = tools.map((t, i) => ({
      x: t.x, y: t.y, z: t.z,
      vx: (seeded(i, 21) - 0.5) * 160,
      vy: (seeded(i, 22) - 0.5) * 110,
      vz: (seeded(i, 23) - 0.5) * 160,
    }));
  };

  const shake = () => {
    for (const p of physicsRef.current) {
      p.vx += (Math.random() - 0.5) * 900;
      p.vy += (Math.random() - 0.5) * 700;
      p.vz += (Math.random() - 0.5) * 900;
    }
  };


  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060a] text-foreground">
      <style>{`
        @keyframes aetherSpark {
          0%   { opacity: 0; transform: scale(0.3); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: scale(2.6); }
        }
      `}</style>
      <SEOHead
        title="Aetheris Universe — Every Forensic Tool, Floating in 3D"
        description="A living 3D map of every Aetheris tool and technology. Fly through the universe, open any tool, try it live."
        path="/aetheris-universe"
      />

      <Background />

      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(217,169,58,0.10) 0%, rgba(5,6,10,0) 55%),' +
            'radial-gradient(ellipse at 20% 80%, rgba(230,57,70,0.08) 0%, rgba(5,6,10,0) 60%),' +
            'radial-gradient(1px 1px at 20% 30%, #fff 40%, transparent 60%),' +
            'radial-gradient(1px 1px at 70% 65%, #fff 40%, transparent 60%),' +
            'radial-gradient(1px 1px at 80% 20%, #fff 40%, transparent 60%),' +
            'radial-gradient(1px 1px at 30% 80%, #fff 40%, transparent 60%),' +
            'radial-gradient(1px 1px at 55% 45%, #fff 40%, transparent 60%),' +
            'radial-gradient(1px 1px at 10% 55%, #fff 40%, transparent 60%),' +
            'radial-gradient(1px 1px at 90% 85%, #fff 40%, transparent 60%),' +
            '#05060a',
          backgroundSize:
            '100% 100%, 100% 100%, 240px 240px, 320px 320px, 400px 400px, 260px 260px, 300px 300px, 380px 380px, 220px 220px',
        }}
      />

      <div className="relative z-30">
        <Navbar onContactClick={() => {}} />
      </div>

      {/* Frosted-glass access gate — Golden Report code, rep code, or employee code only */}
      <UniverseAccessGate unlocked={universeUnlocked} onUnlocked={() => setUniverseUnlocked(true)} />


      <main
        className={`relative z-10 transition duration-500 ${universeUnlocked ? '' : 'pointer-events-none select-none blur-md opacity-70'}`}
        aria-hidden={!universeUnlocked}
      >
        <header className="pt-28 md:pt-32 pb-4 px-4 max-w-6xl mx-auto text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber mb-3 inline-flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Aetheris Universe · v1
          </p>
          <h1 className="font-forensic text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            Every tool we own. <span className="text-amber italic">Floating in space.</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base text-foreground/70">
            Drag to fly through the cluster. Hover to reveal a signal. Click any tool to open it and try it live.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] font-mono uppercase tracking-widest text-foreground/50">
            <span className="inline-flex items-center gap-1.5"><Move3d className="w-3.5 h-3.5 text-amber" /> Drag to orbit</span>
            <span className="inline-flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-amber" /> Auto-drift on release</span>
          </div>
        </header>

        <div
          ref={sceneRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="relative w-screen left-1/2 -translate-x-1/2 h-[92vh] min-h-[640px] select-none touch-none cursor-grab active:cursor-grabbing overflow-hidden"
          style={{
            perspective: '1400px',
            perspectiveOrigin: '50% 45%',
            contain: 'layout paint style',
            contentVisibility: 'auto',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background:
                'linear-gradient(rgba(217,169,58,0.15) 1px, transparent 1px) 0 0 / 60px 60px,' +
                'linear-gradient(90deg, rgba(217,169,58,0.15) 1px, transparent 1px) 0 0 / 60px 60px',
              transform: 'rotateX(70deg) translateY(240px)',
              transformOrigin: 'center',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            }}
          />

          <div
            ref={stageRef}
            className="absolute inset-0"
            style={{
              transformStyle: 'preserve-3d',
              transform: `translateZ(-200px) rotateX(-8deg) rotateY(0deg)`,
              willChange: 'transform',
            }}
          >
            {tools.map((tool, i) => (
              <ToolNode
                key={tool.id}
                tool={tool}
                index={i}
                color={categoryColor[tool.category] || '#d9a93a'}
                registerAnimator={registerAnimator}
                unregisterAnimator={unregisterAnimator}
                onOpen={setSelected}
                onDragDown={onNodeDown}
                onDragMove={onNodeMove}
                onDragUp={onNodeUp}
              />
            ))}

            {/* Spark VFX layer (children injected imperatively during collisions) */}
            <div
              ref={sparkLayerRef}
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{ transformStyle: 'preserve-3d' }}
            />


            <img
              src={aetherisLogo}
              alt="Aetheris"
              aria-hidden
              className="absolute left-1/2 top-1/2 w-48 h-48 md:w-64 md:h-64 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none select-none"
              draggable={false}
              style={{
                transformStyle: 'preserve-3d',
                filter: 'drop-shadow(0 0 40px rgba(217,169,58,0.55)) drop-shadow(0 0 120px rgba(230,57,70,0.25))',
                opacity: 0.95,
              }}
            />
          </div>

          <div className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-widest text-foreground/60 flex gap-3 pointer-events-none">
            <span>rot.x {hudRot.x.toFixed(0)}°</span>
            <span>rot.y {(hudRot.y % 360).toFixed(0)}°</span>
            <span>nodes {tools.length}</span>
          </div>
          <div className="absolute bottom-3 right-3 hidden" />

          <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[70%]">
            {Object.entries(categoryColor).map(([k, c]) => (
              <span
                key={k}
                className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border"
                style={{ color: c, borderColor: `${c}70`, background: `${c}12` }}
              >
                {k}
              </span>
            ))}
          </div>

          {showControls && (
            <div
              className="absolute top-3 right-3 w-64 bg-[#0b0d14]/95 border border-amber/40 rounded-md p-3 pointer-events-auto"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber">Physics Console</span>
                <button onClick={() => setShowControls(false)} className="text-foreground/60 hover:text-amber">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <label className="block mb-2">
                <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-foreground/60 mb-1">
                  <span>Bounce</span><span>{paramsUI.restitution.toFixed(2)}</span>
                </div>
                <input
                  type="range" min={0} max={1.2} step={0.01}
                  value={paramsUI.restitution}
                  onChange={(e) => setParamsUI(p => ({ ...p, restitution: parseFloat(e.target.value) }))}
                  className="w-full accent-amber"
                />
              </label>

              <label className="block mb-2">
                <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-foreground/60 mb-1">
                  <span>Damping</span><span>{paramsUI.damping.toFixed(2)}</span>
                </div>
                <input
                  type="range" min={0} max={3} step={0.01}
                  value={paramsUI.damping}
                  onChange={(e) => setParamsUI(p => ({ ...p, damping: parseFloat(e.target.value) }))}
                  className="w-full accent-amber"
                />
              </label>

              <label className="block mb-2">
                <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-foreground/60 mb-1">
                  <span>Drift</span><span>{paramsUI.drift.toFixed(0)}</span>
                </div>
                <input
                  type="range" min={0} max={80} step={1}
                  value={paramsUI.drift}
                  onChange={(e) => setParamsUI(p => ({ ...p, drift: parseFloat(e.target.value) }))}
                  className="w-full accent-amber"
                />
              </label>

              <label className="block mb-3">
                <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-foreground/60 mb-1">
                  <span>Volume</span><span>{Math.round(paramsUI.soundVolume * 100)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={paramsUI.soundVolume}
                  onChange={(e) => setParamsUI(p => ({ ...p, soundVolume: parseFloat(e.target.value) }))}
                  className="w-full accent-amber"
                />
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => setParamsUI(DEFAULT_PARAMS)}
                  className="flex-1 font-mono text-[10px] uppercase tracking-widest text-amber border border-amber/40 px-2 py-1 rounded-sm hover:bg-amber/10"
                >
                  Defaults
                </button>
                <button
                  onClick={resetPhysics}
                  className="flex-1 font-mono text-[10px] uppercase tracking-widest text-foreground/70 border border-foreground/20 px-2 py-1 rounded-sm hover:bg-foreground/10"
                >
                  Reset Positions
                </button>
              </div>
            </div>
          )}
        </div>


        <section className="max-w-7xl mx-auto px-4 pb-24">
          <h2 className="font-forensic text-3xl md:text-5xl font-bold mb-4">
            All signals · <span className="text-amber italic">indexed</span>
          </h2>
          <p className="text-base md:text-lg text-foreground/70 mb-8">
            Prefer a list? Every tool in the Universe, sorted. Click to open.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelected(tool)}
                className="text-left forensic-tile rounded-md border border-amber/25 hover:border-amber/70 transition-colors p-4 flex gap-4 items-center"
              >
                <div className="w-20 h-20 rounded-sm bg-black/50 overflow-hidden flex-shrink-0">
                  {tool.img && (
                    <img
                      src={tool.img}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg md:text-xl font-forensic font-semibold truncate">{tool.name}</div>
                  <div className="text-xs font-mono uppercase tracking-widest text-foreground/60 truncate mt-1">
                    {tool.category}
                  </div>
                </div>
                <div className="flex-shrink-0 font-mono text-base md:text-lg font-bold text-amber">
                  {formatPrice(tool.priceCents)}
                </div>
              </button>
            ))}
          </div>
        </section>

        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <div
              className="relative w-full max-w-lg forensic-tile rounded-md border border-amber/40 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{ boxShadow: '0 0 60px rgba(217,169,58,0.35)' }}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-2 right-2 text-foreground/60 hover:text-amber"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              {selected.img && (
                <div className="aspect-video bg-black overflow-hidden border-b border-amber/20">
                  <img src={selected.img} alt={selected.name} className="w-full h-full object-cover" decoding="async" />
                </div>
              )}
              <div className="p-5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">
                  {selected.category} · signal
                </div>
                <h3 className="font-forensic text-2xl font-bold leading-tight mb-2">{selected.name}</h3>
                <p className="text-sm text-foreground/80 mb-5">{selected.tagline}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelected(null); navigate(selected.route); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber text-background hover:bg-amber/90 font-bold py-2 rounded-sm text-sm"
                  >
                    Open {selected.name} <ArrowRight className="w-4 h-4" />
                  </button>
                  <Link
                    to="/ecosystem"
                    onClick={() => setSelected(null)}
                    className="inline-flex items-center justify-center border border-amber/40 text-amber hover:bg-amber/10 px-3 py-2 rounded-sm text-sm"
                  >
                    Full toolset
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default AetherisUniversePage;

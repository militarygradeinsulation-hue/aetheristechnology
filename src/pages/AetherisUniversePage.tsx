import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, X, Sparkles, Move3d, RotateCcw } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { SHOP_TOOLS } from '@/lib/tool-shop-catalog';

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
  // initial spawn position
  x: number;
  y: number;
  z: number;
};

// physics bounds (cube half-extents) and node collision radius
const BOUND_X = 520;
const BOUND_Y = 300;
const BOUND_Z = 520;
const NODE_RADIUS = 96;
const RESTITUTION = 0.92;

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
};

const ToolNode = memo(function ToolNode({
  tool, index, color, registerAnimator, unregisterAnimator, onOpen,
}: NodeProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);

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
      onClick={(e) => { e.stopPropagation(); onOpen(tool); }}
      className="absolute left-1/2 top-1/2 w-[168px] -ml-[84px] -mt-[110px]"
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        // GPU compositing + isolation for cheap redraws
        contain: 'layout paint style',
        // initial pos — animator will overwrite immediately
        transform: `translate3d(${tool.x}px, ${tool.y}px, ${tool.z}px)`,
        zIndex: Math.round(1000 + tool.z),
      }}
    >
      <div
        className="rounded-md overflow-hidden border bg-[#0b0d14]/85"
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
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-foreground/50">
            #{String(index + 1).padStart(2, '0')} · signal
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

// ---------- Page ----------
const AetherisUniversePage: React.FC = () => {
  const navigate = useNavigate();
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

  const tools: PlacedTool[] = useMemo(() => {
    return SHOP_TOOLS.map((t, i) => {
      const angle = seeded(i, 1) * Math.PI * 2;
      const radius = 260 + seeded(i, 2) * 220;
      const y = (seeded(i, 3) - 0.5) * 400;
      return {
        id: t.id, name: t.name, tagline: t.tagline, category: t.category, route: t.route,
        img: IMG_BY_ID[t.id] ?? null,
        x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius,
      };
    });
  }, []);

  // Physics state — position + velocity per tool. Mutated in the rAF loop.
  const physicsRef = useRef<{ x: number; y: number; z: number; vx: number; vy: number; vz: number }[]>([]);
  if (physicsRef.current.length !== tools.length) {
    physicsRef.current = tools.map((t, i) => ({
      x: t.x, y: t.y, z: t.z,
      // seeded initial drift, ~40..110 px/s per axis, signed
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
        const phys = physicsRef.current;
        const N = phys.length;
        // integrate + walls
        for (let i = 0; i < N; i++) {
          const p = phys[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          if (p.x >  BOUND_X) { p.x =  BOUND_X; p.vx = -Math.abs(p.vx) * RESTITUTION; }
          if (p.x < -BOUND_X) { p.x = -BOUND_X; p.vx =  Math.abs(p.vx) * RESTITUTION; }
          if (p.y >  BOUND_Y) { p.y =  BOUND_Y; p.vy = -Math.abs(p.vy) * RESTITUTION; }
          if (p.y < -BOUND_Y) { p.y = -BOUND_Y; p.vy =  Math.abs(p.vy) * RESTITUTION; }
          if (p.z >  BOUND_Z) { p.z =  BOUND_Z; p.vz = -Math.abs(p.vz) * RESTITUTION; }
          if (p.z < -BOUND_Z) { p.z = -BOUND_Z; p.vz =  Math.abs(p.vz) * RESTITUTION; }
        }
        // pairwise collisions (equal mass elastic: swap normal-component velocities)
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
            // positional correction — push each half the overlap out
            const overlap = (minDist - d) * 0.5;
            a.x -= nx * overlap; a.y -= ny * overlap; a.z -= nz * overlap;
            b.x += nx * overlap; b.y += ny * overlap; b.z += nz * overlap;
            // relative velocity along normal
            const rvx = b.vx - a.vx, rvy = b.vy - a.vy, rvz = b.vz - a.vz;
            const relN = rvx * nx + rvy * ny + rvz * nz;
            if (relN >= 0) continue; // moving apart
            const jimp = -(1 + RESTITUTION) * relN * 0.5; // equal mass
            a.vx -= jimp * nx; a.vy -= jimp * ny; a.vz -= jimp * nz;
            b.vx += jimp * nx; b.vy += jimp * ny; b.vz += jimp * nz;
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

  const recenter = () => {
    rotRef.current = { x: -8, y: 0 };
    setHudRot({ x: -8, y: 0 });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060a] text-foreground">
      <SEOHead
        title="AetherisUniverse — Every Forensic Tool, Floating in 3D"
        description="A living 3D map of every Aetheris tool and technology. Fly through the universe, open any tool, try it live."
        path="/aetheris-universe"
      />

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

      <main className="relative z-10">
        <header className="pt-28 md:pt-32 pb-4 px-4 max-w-6xl mx-auto text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber mb-3 inline-flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> AetherisUniverse · v1
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
          className="relative mx-auto my-6 h-[70vh] min-h-[520px] max-w-6xl select-none touch-none cursor-grab active:cursor-grabbing rounded-lg border border-amber/20 overflow-hidden"
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
              />
            ))}

            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 w-24 h-24 -ml-12 -mt-12 rounded-full pointer-events-none"
              style={{
                transformStyle: 'preserve-3d',
                background:
                  'radial-gradient(circle at 30% 30%, rgba(217,169,58,0.95), rgba(230,57,70,0.35) 55%, rgba(0,0,0,0) 75%)',
                boxShadow: '0 0 80px rgba(217,169,58,0.55), 0 0 200px rgba(230,57,70,0.25)',
              }}
            />
          </div>

          <div className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-widest text-foreground/60 flex gap-3 pointer-events-none">
            <span>rot.x {hudRot.x.toFixed(0)}°</span>
            <span>rot.y {(hudRot.y % 360).toFixed(0)}°</span>
            <span>nodes {tools.length}</span>
          </div>
          <button
            type="button"
            onClick={recenter}
            className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-widest text-amber border border-amber/40 px-2 py-1 rounded-sm hover:bg-amber/10"
          >
            Recenter
          </button>
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
        </div>

        <section className="max-w-5xl mx-auto px-4 pb-16">
          <h2 className="font-forensic text-xl md:text-2xl font-bold mb-3">
            All signals · <span className="text-amber italic">indexed</span>
          </h2>
          <p className="text-sm text-foreground/60 mb-5">
            Prefer a list? Every tool in the Universe, sorted. Click to open.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelected(tool)}
                className="text-left forensic-tile rounded-sm border border-amber/20 hover:border-amber/60 transition-colors p-2 flex gap-2 items-center"
              >
                <div className="w-10 h-10 rounded-sm bg-black/50 overflow-hidden flex-shrink-0">
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
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{tool.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 truncate">
                    {tool.category}
                  </div>
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

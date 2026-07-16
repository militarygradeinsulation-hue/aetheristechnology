import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, X, Sparkles, Move3d, RotateCcw, Volume2, VolumeX, SlidersHorizontal } from 'lucide-react';
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
        x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius,
      };
    });
  }, []);

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
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute;left:50%;top:50%;
      width:${size}px;height:${size}px;margin-left:${-size / 2}px;margin-top:${-size / 2}px;
      transform:translate3d(${x}px, ${y}px, ${z}px);
      border-radius:9999px;pointer-events:none;
      background:radial-gradient(circle, ${color} 0%, ${color}80 30%, rgba(255,255,255,0) 70%);
      mix-blend-mode:screen;
      animation:aetherSpark 520ms ease-out forwards;
      will-change:transform,opacity;
    `;
    layer.appendChild(el);
    setTimeout(() => { el.remove(); }, 560);
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
          if (p.x >  BOUND_X) { p.x =  BOUND_X; p.vx = -Math.abs(p.vx) * R; }
          if (p.x < -BOUND_X) { p.x = -BOUND_X; p.vx =  Math.abs(p.vx) * R; }
          if (p.y >  BOUND_Y) { p.y =  BOUND_Y; p.vy = -Math.abs(p.vy) * R; }
          if (p.y < -BOUND_Y) { p.y = -BOUND_Y; p.vy =  Math.abs(p.vy) * R; }
          if (p.z >  BOUND_Z) { p.z =  BOUND_Z; p.vz = -Math.abs(p.vz) * R; }
          if (p.z < -BOUND_Z) { p.z = -BOUND_Z; p.vz =  Math.abs(p.vz) * R; }
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
    // clamp to bounds so we can't drag off-scene
    p.x = Math.max(-BOUND_X, Math.min(BOUND_X, p.x));
    p.y = Math.max(-BOUND_Y, Math.min(BOUND_Y, p.y));
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
          0%   { opacity: 0.9; transform: translate3d(var(--sx,0), var(--sy,0), var(--sz,0)) scale(0.4); }
          40%  { opacity: 1;   }
          100% { opacity: 0;   transform: translate3d(var(--sx,0), var(--sy,0), var(--sz,0)) scale(2.4); }
        }
      `}</style>
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
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setParamsUI(p => ({ ...p, soundOn: !p.soundOn }))}
              title={paramsUI.soundOn ? 'Mute impacts' : 'Enable impact sound'}
              className="font-mono text-[10px] uppercase tracking-widest text-amber border border-amber/40 px-2 py-1 rounded-sm hover:bg-amber/10 inline-flex items-center gap-1"
            >
              {paramsUI.soundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => setShowControls(s => !s)}
              className="font-mono text-[10px] uppercase tracking-widest text-amber border border-amber/40 px-2 py-1 rounded-sm hover:bg-amber/10 inline-flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" /> Physics
            </button>
            <button
              type="button"
              onClick={shake}
              className="font-mono text-[10px] uppercase tracking-widest text-amber border border-amber/40 px-2 py-1 rounded-sm hover:bg-amber/10"
            >
              Shake
            </button>
            <button
              type="button"
              onClick={recenter}
              className="font-mono text-[10px] uppercase tracking-widest text-amber border border-amber/40 px-2 py-1 rounded-sm hover:bg-amber/10"
            >
              Recenter
            </button>
          </div>
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

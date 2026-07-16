import React, { useEffect, useMemo, useRef, useState } from 'react';
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

function getToolImage(id: string): string | null {
  for (const path in assetModules) {
    const file = path.split('/').pop() ?? '';
    if (file.startsWith(`${id}.`)) return assetModules[path].default.url;
  }
  return null;
}

type PlacedTool = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  route: string;
  img: string | null;
  x: number; // px
  y: number; // px
  z: number; // px (depth)
  spin: number;
};

// Deterministic pseudo-random so layout is stable between renders
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 9301 + salt * 49297) * 233280;
  return x - Math.floor(x);
}

const AetherisUniversePage: React.FC = () => {
  const navigate = useNavigate();
  const sceneRef = useRef<HTMLDivElement>(null);
  const [rot, setRot] = useState({ x: -8, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<PlacedTool | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [t, setT] = useState(0);

  // gentle time tick for float animation
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setT((v) => v + 0.008);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-rotate slowly when not dragging
  useEffect(() => {
    if (drag) return;
    const id = setInterval(() => {
      setRot((r) => ({ ...r, y: r.y + 0.08 }));
    }, 40);
    return () => clearInterval(id);
  }, [drag]);

  const tools: PlacedTool[] = useMemo(() => {
    return SHOP_TOOLS.map((t, i) => {
      // Distribute across a shell / cloud
      const angle = seeded(i, 1) * Math.PI * 2;
      const radius = 340 + seeded(i, 2) * 260;
      const y = (seeded(i, 3) - 0.5) * 520;
      return {
        id: t.id,
        name: t.name,
        tagline: t.tagline,
        category: t.category,
        route: t.route,
        img: getToolImage(t.id),
        x: Math.cos(angle) * radius,
        y,
        z: Math.sin(angle) * radius,
        spin: seeded(i, 4) * Math.PI * 2,
      };
    });
  }, []);

  // Mouse drag to rotate the "camera"
  const onDown = (e: React.PointerEvent) => {
    setDrag({ x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    setRot((r) => ({ x: Math.max(-40, Math.min(40, r.x - dy * 0.3)), y: r.y + dx * 0.3 }));
    setDrag({ x: e.clientX, y: e.clientY });
  };
  const onUp = () => setDrag(null);

  const categoryColor: Record<string, string> = {
    diagnostics: '#e63946',
    content: '#d9a93a',
    reports: '#7fd1ff',
    sales: '#9be37f',
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060a] text-foreground">
      <SEOHead
        title="AetherisUniverse — Every Forensic Tool, Floating in 3D"
        description="A living 3D map of every Aetheris tool and technology. Fly through the universe, open any tool, try it live."
        path="/aetheris-universe"
      />

      {/* Starfield backdrop */}
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
          backgroundSize: '100% 100%, 100% 100%, 240px 240px, 320px 320px, 400px 400px, 260px 260px, 300px 300px, 380px 380px, 220px 220px',
        }}
      />

      <div className="relative z-30">
        <Navbar />
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

        {/* 3D scene */}
        <div
          ref={sceneRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="relative mx-auto my-6 h-[70vh] min-h-[520px] max-w-6xl select-none touch-none cursor-grab active:cursor-grabbing rounded-lg border border-amber/20 overflow-hidden"
          style={{ perspective: '1400px', perspectiveOrigin: '50% 45%' }}
        >
          {/* subtle grid floor */}
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
            className="absolute inset-0"
            style={{
              transformStyle: 'preserve-3d',
              transform: `translateZ(-200px) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
              transition: drag ? 'none' : 'transform 0.4s ease-out',
            }}
          >
            {tools.map((tool, i) => {
              const floatY = Math.sin(t + tool.spin) * 14;
              const isHover = hoverId === tool.id;
              const color = categoryColor[tool.category] || '#d9a93a';
              return (
                <button
                  key={tool.id}
                  type="button"
                  onMouseEnter={() => setHoverId(tool.id)}
                  onMouseLeave={() => setHoverId((h) => (h === tool.id ? null : h))}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(tool);
                  }}
                  className="absolute left-1/2 top-1/2 w-[168px] -ml-[84px] -mt-[110px] group"
                  style={{
                    transform: `translate3d(${tool.x}px, ${tool.y + floatY}px, ${tool.z}px) rotateY(${-rot.y}deg) rotateX(${-rot.x}deg) scale(${isHover ? 1.12 : 1})`,
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.25s ease-out',
                    zIndex: Math.round(1000 + tool.z),
                  }}
                >
                  <div
                    className="rounded-md overflow-hidden border backdrop-blur-sm bg-[#0b0d14]/85"
                    style={{
                      borderColor: isHover ? color : 'rgba(217,169,58,0.25)',
                      boxShadow: isHover
                        ? `0 0 40px ${color}80, 0 0 8px ${color}`
                        : `0 8px 24px rgba(0,0,0,0.55)`,
                    }}
                  >
                    <div className="relative aspect-square bg-black/50 overflow-hidden">
                      {tool.img ? (
                        <img
                          src={tool.img}
                          alt={tool.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber font-forensic italic text-lg">
                          {tool.name.slice(0, 2)}
                        </div>
                      )}
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
                        #{String(i + 1).padStart(2, '0')} · signal
                      </div>
                    </div>
                  </div>
                  {/* holo base ring */}
                  <div
                    aria-hidden
                    className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-24 h-2 rounded-full blur-[3px]"
                    style={{ background: `radial-gradient(ellipse, ${color}90 0%, transparent 70%)` }}
                  />
                </button>
              );
            })}

            {/* central core */}
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 w-24 h-24 -ml-12 -mt-12 rounded-full"
              style={{
                transformStyle: 'preserve-3d',
                background:
                  'radial-gradient(circle at 30% 30%, rgba(217,169,58,0.95), rgba(230,57,70,0.35) 55%, rgba(0,0,0,0) 75%)',
                boxShadow: '0 0 80px rgba(217,169,58,0.55), 0 0 200px rgba(230,57,70,0.25)',
              }}
            />
          </div>

          {/* HUD */}
          <div className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-widest text-foreground/60 flex gap-3 pointer-events-none">
            <span>rot.x {rot.x.toFixed(0)}°</span>
            <span>rot.y {(rot.y % 360).toFixed(0)}°</span>
            <span>nodes {tools.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setRot({ x: -8, y: 0 })}
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

        {/* Below-fold list fallback for accessibility / SEO */}
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
                    <img src={tool.img} alt="" className="w-full h-full object-cover" loading="lazy" />
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

        {/* Detail dialog */}
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
                  <img src={selected.img} alt={selected.name} className="w-full h-full object-cover" />
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
                    onClick={() => {
                      setSelected(null);
                      navigate(selected.route);
                    }}
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

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRAIN_TOPICS, BRAIN_RELATIONSHIPS, BRAIN_ZOOM, brainNeighborhood, createBrainPoints } from '@/lib/publicBrainGraph';
import './PublicBrainHero.css';

export default function PublicBrainHero({ onAudit }: { onAudit: () => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const labels = useRef<Array<HTMLButtonElement | null>>([]);
  const active = useRef<number | null>(null);
  const focus = useRef<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [fallback, setFallback] = useState(false);
  const fallbackPositions = [[25, 32], [43, 18], [72, 32], [80, 58], [23, 68], [59, 80]];
  active.current = hovered ?? selected;
  focus.current = selected;

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { setFallback(true); return; }
    const canvas = renderer.domElement;
    host.appendChild(canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    scene.add(group);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
    camera.position.set(0, 0.15, BRAIN_ZOOM.initial);
    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = BRAIN_ZOOM.min;
    controls.maxDistance = BRAIN_ZOOM.max;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.78;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.55;
    const css = getComputedStyle(host);
    const token = (name: string) => new THREE.Color(`hsl(${css.getPropertyValue(name).trim().split(/\s+/).join(', ')})`);
    const amber = token('--primary');
    const light = token('--foreground');
    const dot = document.createElement('canvas');
    dot.width = dot.height = 64;
    const ctx = dot.getContext('2d');
    if (ctx) {
      const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, `#${light.getHexString()}`);
      glow.addColorStop(.16, `#${amber.getHexString()}`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(dot);
    const positions = createBrainPoints().map(p => new THREE.Vector3(...p));
    const topics = BRAIN_TOPICS.map(t => new THREE.Vector3(...t.position));
    const resources: Array<THREE.BufferGeometry | THREE.Material> = [];
    const makePoints = (vectors: THREE.Vector3[], size: number, color: THREE.Color) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(vectors);
      const material = new THREE.PointsMaterial({ color, size, map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      resources.push(geometry, material);
      const points = new THREE.Points(geometry, material); group.add(points); return points;
    };
    const cloud = makePoints(positions, .075, amber);
    makePoints(topics, .24, light);
    const wires: THREE.Vector3[] = [];
    positions.forEach((p, i) => {
      positions.map((q, j) => ({ j, distance: p.distanceToSquared(q) })).filter(v => v.j !== i)
        .sort((a, b) => a.distance - b.distance).slice(0, 3).forEach(({ j }) => {
          if (j > i) wires.push(p, positions[j]);
        });
    });
    const makeLines = (vectors: THREE.Vector3[], opacity: number, color = amber) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(vectors);
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      resources.push(geometry, material);
      const lines = new THREE.LineSegments(geometry, material); group.add(lines); return lines;
    };
    const shell = makeLines(wires, .24);
    const routes = makeLines(BRAIN_RELATIONSHIPS.flatMap(([a, b]) => [topics[a], topics[b]]), .45);
    const highlighted = makeLines([], .95, light);
    const pulses = makePoints(BRAIN_RELATIONSHIPS.map(([a]) => topics[a].clone()), .14, light);
    const pulseAttribute = pulses.geometry.getAttribute('position');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true, disposed = false, dragging = false, lastActive: number | null | undefined;
    let frame = 0, previous = 0, time = 0;
    const target = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(host);
    const start = () => { dragging = true; };
    const end = () => { dragging = false; };
    controls.addEventListener('start', start); controls.addEventListener('end', end);
    const render = (timestamp: number) => {
      if (disposed || !visible || document.hidden) { frame = 0; return; }
      const dt = Math.min((timestamp - previous) / 1000 || 0, .05); previous = timestamp;
      if (!motion.matches) {
        time += dt;
        if (!dragging && active.current === null) group.rotation.y += dt * .035;
        group.rotation.z = Math.sin(time * .35) * .015;
        for (let i = 0; i < BRAIN_RELATIONSHIPS.length; i++) {
          const [a, b] = BRAIN_RELATIONSHIPS[i];
          projected.lerpVectors(topics[a], topics[b], (time * .22 + i * .13) % 1);
          pulseAttribute.setXYZ(i, projected.x, projected.y, projected.z);
        }
        pulseAttribute.needsUpdate = true;
      }
      pulses.visible = !motion.matches;
      if (lastActive !== active.current) {
        lastActive = active.current;
        const connected = lastActive === null ? [] : BRAIN_RELATIONSHIPS.filter(([a, b]) => a === lastActive || b === lastActive);
        const geometry = new THREE.BufferGeometry().setFromPoints(connected.flatMap(([a, b]) => [topics[a], topics[b]]));
        highlighted.geometry.dispose(); highlighted.geometry = geometry; resources.push(geometry);
        shell.material.opacity = lastActive === null ? .24 : .1;
        routes.material.opacity = lastActive === null ? .45 : .1;
        cloud.material.opacity = lastActive === null ? 1 : .6;
      }
      group.updateMatrixWorld();
      target.set(0, 0, 0);
      if (focus.current !== null) target.copy(topics[focus.current]).applyMatrix4(group.matrixWorld).multiplyScalar(.22);
      controls.target.lerp(target, motion.matches ? 1 : 1 - Math.exp(-4 * dt));
      controls.update();
      renderer.render(scene, camera);
      topics.forEach((p, i) => {
        const label = labels.current[i]; if (!label) return;
        projected.copy(p).applyMatrix4(group.matrixWorld).project(camera);
        const x = Math.max(label.offsetWidth / 2, Math.min(host.clientWidth - label.offsetWidth / 2, (projected.x * .5 + .5) * host.clientWidth));
        const y = Math.max(24, Math.min(host.clientHeight - 24, (-projected.y * .5 + .5) * host.clientHeight));
        label.style.transform = `translate(${x - label.offsetWidth / 2}px, ${y - label.offsetHeight / 2}px)`;
      });
      host.dataset.sceneReady = 'true';
      host.dataset.zoom = camera.position.distanceTo(controls.target).toFixed(2);
      host.dataset.rotation = camera.position.x.toFixed(2);
      frame = requestAnimationFrame(render);
    };
    const resume = () => { if (!frame && visible && !document.hidden && !disposed) { previous = performance.now(); frame = requestAnimationFrame(render); } };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); }); observer.observe(host);
    document.addEventListener('visibilitychange', resume);
    const lost = (event: Event) => { event.preventDefault(); setFallback(true); disposed = true; cancelAnimationFrame(frame); };
    canvas.addEventListener('webglcontextlost', lost);
    resume();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', resume);
      canvas.removeEventListener('webglcontextlost', lost);
      controls.dispose(); resources.forEach(resource => resource.dispose()); texture.dispose(); renderer.dispose(); canvas.remove();
    };
  }, []);

  const current = hovered ?? selected;
  const neighborhood = current === null ? null : brainNeighborhood(current);
  return (
    <section className="public-brain-hero text-center" aria-labelledby="public-brain-heading">
      <p className="font-case text-xs uppercase text-amber">People. Patterns. The cost of existing.</p>
      <h1 id="public-brain-heading" className="mt-3 font-forensic text-4xl sm:text-5xl text-foreground">Aetheris</h1>
      <p className="mt-3 px-4 text-base text-muted-foreground">Your business is connected. Its financial leaks are, too.</p>
      <div className="public-brain-stage" data-brain-focus={selected === null ? 'all' : BRAIN_TOPICS[selected].id}>
        <div ref={mount} className="public-brain-canvas" aria-hidden="true" />
        {fallback && <svg className="brain-fallback" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {BRAIN_RELATIONSHIPS.map(([a, b]) => <line key={`${a}-${b}`} x1={fallbackPositions[a][0]} y1={fallbackPositions[a][1]} x2={fallbackPositions[b][0]} y2={fallbackPositions[b][1]} stroke="currentColor" strokeWidth=".2" opacity={current === null || a === current || b === current ? .7 : .15} />)}
        </svg>}
        {BRAIN_TOPICS.map((topic, i) => <Button key={topic.id} ref={el => { labels.current[i] = el; }} variant="ghost"
          className="brain-node" aria-label={topic.label} aria-pressed={selected === i} data-muted={neighborhood ? !neighborhood.has(i) : false}
          style={fallback ? { left: `${fallbackPositions[i][0]}%`, top: `${fallbackPositions[i][1]}%`, transform: 'translate(-50%, -50%)' } : undefined}
          onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(i); }} onPointerLeave={() => setHovered(null)}
          onFocus={() => setHovered(i)} onBlur={() => setHovered(null)}
          onClick={() => { setSelected(value => value === i ? null : i); setHovered(null); }}
        >{topic.label}</Button>)}
      </div>
      <div className="brain-explanation" aria-live="polite">
        {current !== null && <p className="text-sm text-foreground">{BRAIN_TOPICS[current].detail}</p>}
        <p className="mt-2 font-case text-[10px] text-muted-foreground">Illustrative business relationships · Not findings about your company</p>
      </div>
      <Button size="lg" onClick={onAudit} className="mb-3">Start the Leak Audit™ <ArrowRight /></Button>
    </section>
  );
}
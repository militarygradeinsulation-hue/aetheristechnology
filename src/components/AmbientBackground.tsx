import { useEffect, useRef } from "react";

/**
 * Site-wide ambient background: faint grid, corner brackets, drifting motes,
 * a cursor-following glow and a click ripple. Purely decorative.
 */
export function AmbientBackground() {
  const gradientRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const gradient = gradientRef.current;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!gradient) return;
      gradient.style.transform = `translate3d(${e.clientX - 192}px, ${e.clientY - 192}px, 0)`;
      gradient.style.opacity = "1";
    };
    const onMouseLeave = () => {
      if (gradient) gradient.style.opacity = "0";
    };
    const onClick = (e: MouseEvent) => {
      const ripple = document.createElement("div");
      ripple.className = "ambient-ripple";
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      document.body.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 900);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div aria-hidden className="ambient-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Grid */}
      <div className="ambient-grid absolute inset-0" />

      {/* Corner brackets */}
      <div className="ambient-corner absolute left-6 top-6 border-l border-t" />
      <div className="ambient-corner absolute right-6 top-6 border-r border-t" />
      <div className="ambient-corner absolute bottom-6 left-6 border-b border-l" />
      <div className="ambient-corner absolute bottom-6 right-6 border-b border-r" />

      {/* Drifting motes */}
      <div className="ambient-mote" style={{ left: "12%", top: "22%", animationDelay: "0s" }} />
      <div className="ambient-mote" style={{ left: "78%", top: "31%", animationDelay: "1.4s" }} />
      <div className="ambient-mote" style={{ left: "34%", top: "72%", animationDelay: "2.6s" }} />
      <div className="ambient-mote" style={{ left: "66%", top: "82%", animationDelay: "3.8s" }} />

      {/* Cursor glow */}
      <div ref={gradientRef} className="ambient-cursor-glow" />
    </div>
  );
}

export default AmbientBackground;

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type VideoSession = { videoUrl: string; title: string; sessionId: string };
export default function PrivateVideoPage() {
  const { token } = useParams();
  const [video, setVideo] = useState<VideoSession | null>(null);
  const [error, setError] = useState("");
  const sent = useRef(new Set<string>());
  useEffect(() => {
    document.title = "Private Video | Aetheris";
    const robots = document.querySelector('meta[name="robots"]');
    const previous = robots?.getAttribute("content");
    if (robots) robots.setAttribute("content", "noindex, nofollow, noarchive, nosnippet");
    const previousCanonical = document.querySelector('link[rel="canonical"]');
    const oldCanonical = previousCanonical?.getAttribute("href");
    previousCanonical?.removeAttribute("href");
    return () => {
      if (robots && previous !== null && previous !== undefined) robots.setAttribute("content", previous);
      if (previousCanonical && oldCanonical !== null && oldCanonical !== undefined) previousCanonical.setAttribute("href", oldCanonical);
    };
  }, []);
  useEffect(() => {
    if (!token || !/^[a-f0-9-]{36}$/i.test(token)) { setError("This link is not available."); return; }
    let cancelled = false;
    const sessionId = crypto.randomUUID();
    supabase.functions.invoke("private-video", { body: { action: "open", token, sessionId } }).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data?.videoUrl) setError("This video is not available.");
      else setVideo({ videoUrl: data.videoUrl, title: data.title || "Aetheris", sessionId });
    });
    return () => { cancelled = true; };
  }, [token]);
  const report = (eventType: "play" | "progress" | "complete", progressSeconds: number) => {
    if (!video || !token) return;
    const key = eventType === "progress" ? `progress-${Math.floor(progressSeconds / 15)}` : eventType;
    if (sent.current.has(key)) return;
    sent.current.add(key);
    void supabase.functions.invoke("private-video", { body: { action: "event", token, sessionId: video.sessionId, eventType, progressSeconds: Math.floor(progressSeconds) } });
  };
  return <main className="min-h-screen bg-[#080a0e] text-white flex items-center justify-center p-5">
    <section className="w-full max-w-4xl">
      <div className="text-xs tracking-[0.3em] text-orange-400 mb-4">AETHERIS TECHNOLOGY</div>
      {video ? <>
        <h1 className="text-2xl md:text-4xl font-semibold mb-6">{video.title}</h1>
        <video controls playsInline preload="metadata" controlsList="nodownload" className="w-full aspect-video rounded-xl bg-black shadow-2xl"
          src={video.videoUrl} onPlay={e => report("play", e.currentTarget.currentTime)}
          onTimeUpdate={e => { const v=e.currentTarget; if(v.currentTime>=15 && Math.floor(v.currentTime)%15===0) report("progress",v.currentTime); }}
          onEnded={e => report("complete",e.currentTarget.duration)} />
        <p className="mt-5 text-sm text-slate-400">Prepared for your review by Aetheris Technology.</p>
      </> : <p className="text-slate-300">{error || "Loading your video..."}</p>}
    </section>
  </main>;
}

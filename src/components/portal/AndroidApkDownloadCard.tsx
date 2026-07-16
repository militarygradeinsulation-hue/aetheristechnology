import { useEffect, useState } from 'react';
import { Smartphone, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Drop the compiled release APK at public/aetheris-operator.apk.
// Bump APK_VERSION whenever a new build is published so reps see "Update available".
export const APK_VERSION = '2026.06.24';
const APK_PATH = '/aetheris-operator.apk';
const VERSION_KEY = 'aetheris.apkDownloadedVersion';

type Status = 'checking' | 'available' | 'missing';

export function AndroidApkDownloadCard() {
  const [status, setStatus] = useState<Status>('checking');
  const [sizeMb, setSizeMb] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadedVersion, setDownloadedVersion] = useState<string | null>(() => {
    try { return localStorage.getItem(VERSION_KEY); } catch { return null; }
  });

  useEffect(() => {
    let cancelled = false;
    fetch(APK_PATH, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setStatus('missing');
          return;
        }
        const len = res.headers.get('content-length');
        if (len) setSizeMb(Math.round((parseInt(len, 10) / 1024 / 1024) * 10) / 10);
        setStatus('available');
      })
      .catch(() => !cancelled && setStatus('missing'));
    return () => { cancelled = true; };
  }, []);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(APK_PATH);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aetheris-operator-${APK_VERSION}.apk`;
      a.click();
      URL.revokeObjectURL(a.href);
      try { localStorage.setItem(VERSION_KEY, APK_VERSION); } catch { /* ignore */ }
      setDownloadedVersion(APK_VERSION);
      toast.success('APK downloaded', {
        description: 'Transfer it to your Android phone, tap it, allow "Install unknown apps", and tap Install.',
      });
    } catch (err: any) {
      toast.error('APK download failed', { description: err?.message ?? 'Unknown error' });
    } finally {
      setDownloading(false);
    }
  };

  const outdated = status === 'available' && downloadedVersion !== APK_VERSION;

  return (
    <div className={`rounded-lg border p-5 bg-card ${outdated ? 'border-red-500/60 bg-red-500/5' : 'border-amber/30'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${outdated ? 'bg-red-500/20 text-red-400' : 'bg-amber/15 text-amber'}`}>
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-base">Aetheris Operator · Android APK</h3>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">v{APK_VERSION}</span>
            {status === 'available' && downloadedVersion === APK_VERSION && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-amber">
                <CheckCircle2 className="w-3 h-3" /> Installed build
              </span>
            )}
            {outdated && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-red-400">
                <AlertCircle className="w-3 h-3" /> Update available
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Sideload-only. Same forensic cockpit, scanner, AI Operator chat, LinkedIn drafter, and CRM autopsy
            — packaged as a real Android app. No Play Store needed.
          </p>

          {status === 'checking' && (
            <div className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking build…
            </div>
          )}

          {status === 'missing' && (
            <div className="mt-3 rounded border border-amber/30 bg-amber/5 p-3 text-xs">
              <div className="font-mono uppercase tracking-wider text-amber mb-1">Build pending</div>
              <p className="text-muted-foreground">
                The signed APK isn't uploaded yet. Joseph builds it locally with{' '}
                <code className="text-amber">npx cap sync android && cd android && ./gradlew assembleRelease</code>,
                then drops <code className="text-amber">aetheris-operator.apk</code> into{' '}
                <code className="text-amber">public/</code> and republishes. This tile will go live automatically.
              </p>
            </div>
          )}

          {status === 'available' && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={download}
                disabled={downloading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded font-bold uppercase tracking-wider text-xs ${outdated ? 'bg-red-500 hover:bg-red-500/90 text-white animate-pulse' : 'bg-amber hover:bg-amber/90 text-charcoal'}`}
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? 'Downloading…' : outdated ? 'Download update' : 'Download APK'}
              </button>
              {sizeMb !== null && (
                <span className="text-xs text-muted-foreground font-mono">{sizeMb} MB · Android 7+</span>
              )}
            </div>
          )}

          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">Install on Android</summary>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Download the .apk on the Android phone (or transfer it via USB/Drive).</li>
              <li>Open it. Android will warn — tap <strong>Settings</strong> → enable <strong>Install unknown apps</strong> for your browser/files app.</li>
              <li>Tap <strong>Install</strong>, then <strong>Open</strong>. Sign into the portal with your access code.</li>
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}

export default AndroidApkDownloadCard;

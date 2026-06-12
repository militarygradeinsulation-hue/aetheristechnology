import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

/**
 * Lightweight EN/ES language toggle for the Rep / Partner Portal.
 * Uses the Google Website Translator widget, loaded on demand.
 * Selection persists across reloads via the `googtrans` cookie.
 */
const GOOGTRANS_COOKIE = 'googtrans';

function readLang(): 'en' | 'es' {
  try {
    const m = document.cookie.match(/googtrans=\/[a-z]{2}\/(es|en)/i);
    if (m && m[1]) return m[1].toLowerCase() as 'en' | 'es';
    if (localStorage.getItem('aetheris_portal_lang') === 'es') return 'es';
  } catch {}
  return 'en';
}

function writeCookie(value: string) {
  const host = location.hostname;
  // Set on host AND on the parent domain so Google's widget picks it up.
  document.cookie = `${GOOGTRANS_COOKIE}=${value};path=/`;
  document.cookie = `${GOOGTRANS_COOKIE}=${value};path=/;domain=${host}`;
  const root = host.split('.').slice(-2).join('.');
  if (root && root !== host) {
    document.cookie = `${GOOGTRANS_COOKIE}=${value};path=/;domain=.${root}`;
  }
}

function ensureWidgetLoaded() {
  if (document.getElementById('aetheris-gt-host')) return;
  const host = document.createElement('div');
  host.id = 'aetheris-gt-host';
  host.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;';
  host.innerHTML = '<div id="google_translate_element"></div>';
  document.body.appendChild(host);

  // Hide Google's top banner / tooltip if it injects one.
  const style = document.createElement('style');
  style.textContent = `
    .goog-te-banner-frame.skiptranslate, .goog-tooltip, .goog-tooltip:hover { display:none !important; }
    body { top: 0 !important; }
    .skiptranslate > iframe { display:none !important; }
  `;
  document.head.appendChild(style);

  (window as any).googleTranslateElementInit = function () {
    try {
      new (window as any).google.translate.TranslateElement(
        { pageLanguage: 'en', includedLanguages: 'en,es', autoDisplay: false },
        'google_translate_element'
      );
    } catch {}
  };

  const s = document.createElement('script');
  s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.body.appendChild(s);
}

export const LanguageToggle: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'es'>(readLang);

  useEffect(() => {
    if (lang === 'es') ensureWidgetLoaded();
  }, [lang]);

  const apply = (target: 'en' | 'es') => {
    setLang(target);
    try { localStorage.setItem('aetheris_portal_lang', target); } catch {}
    writeCookie(`/en/${target}`);
    if (target === 'es') {
      ensureWidgetLoaded();
      // Reload so the widget renders the page in Spanish from the start.
      setTimeout(() => window.location.reload(), 100);
    } else {
      setTimeout(() => window.location.reload(), 100);
    }
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-amber/40 bg-background/40 p-0.5">
      <Languages className="w-3.5 h-3.5 text-amber mx-1" />
      <Button
        type="button"
        variant={lang === 'en' ? 'default' : 'ghost'}
        size="sm"
        className={`h-7 px-2 text-xs ${lang === 'en' ? 'bg-amber text-background hover:bg-amber/90' : 'text-muted-foreground'}`}
        onClick={() => apply('en')}
        title="English"
      >
        EN
      </Button>
      <Button
        type="button"
        variant={lang === 'es' ? 'default' : 'ghost'}
        size="sm"
        className={`h-7 px-2 text-xs ${lang === 'es' ? 'bg-amber text-background hover:bg-amber/90' : 'text-muted-foreground'}`}
        onClick={() => apply('es')}
        title="Español"
      >
        ES
      </Button>
    </div>
  );
};

export default LanguageToggle;

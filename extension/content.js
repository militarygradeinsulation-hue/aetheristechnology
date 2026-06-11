// Aetheris Operator — content script (v0.3)
// The "eyes and hands" inside the live page:
//   - Pass A deterministic forensic scan (DOM + rendered layout)
//   - X-ray overlay (SVG boxes pointing at each leak)
//   - Funnel Autopsy recorder (clicks/inputs/nav/errors + screenshot frames)
//   - DOM extraction for AI Operator chat
//   - Safe Execute-mode actions (fill/click) with confirm-before-act in panel

(() => {
  if (window.__AETHERIS_CONTENT_LOADED__) return;
  window.__AETHERIS_CONTENT_LOADED__ = true;

  // ---------- DOM extraction (Operator chat) ----------
  function extractPageText(max = 8000) {
    const clone = document.body?.cloneNode(true);
    if (!clone) return "";
    clone.querySelectorAll("script,style,noscript,svg").forEach((n) => n.remove());
    const txt = (clone.innerText || "").replace(/\s+/g, " ").trim();
    return txt.slice(0, max);
  }
  function meta(name) {
    const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return el?.getAttribute("content") || "";
  }

  // ---------- Pass A: deterministic forensic scan ----------
  const CTA_LEXICON = ["book","schedule","get started","start","quote","contact","call","demo","trial","buy","subscribe","sign up","apply"];
  const TRACKERS = {
    "GA4": /gtag\/js|googletagmanager\.com\/gtag|google-analytics\.com/i,
    "Meta Pixel": /connect\.facebook\.net|fbq\(/i,
    "LinkedIn Insight": /snap\.licdn\.com|_linkedin_partner_id/i,
    "GTM": /googletagmanager\.com\/gtm\.js/i,
    "HubSpot": /js\.hs-scripts\.com|hsforms\.net/i,
    "RB2B": /b2bjsstore|rb2b/i,
    "Stripe": /js\.stripe\.com/i,
    "Calendly": /assets\.calendly\.com/i,
  };

  function inViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
  }
  function aboveFold(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.9 && r.bottom > 0;
  }

  function runPassA() {
    const leaks = [];
    const host = location.hostname.replace(/^www\./, "");
    const scripts = Array.from(document.scripts).map((s) => s.src + " " + (s.textContent || "").slice(0, 400)).join("\n");

    // Trackers
    const trackersPresent = Object.entries(TRACKERS).filter(([, rx]) => rx.test(scripts)).map(([n]) => n);
    const trackersMissing = Object.keys(TRACKERS).filter((n) => !trackersPresent.includes(n));
    if (trackersPresent.length < 2) {
      leaks.push({
        id: "tracking_gap", severity: "critical", category: "Tracking",
        title: "Visitor signal is dark",
        why: `Only ${trackersPresent.length} marketing pixel detected. You cannot retarget who you cannot see.`,
        fix: "Install GA4 + Meta Pixel + LinkedIn Insight at minimum.",
        selectors: [], detail: { present: trackersPresent, missing: trackersMissing },
      });
    }

    // CTAs above the fold
    const buttons = Array.from(document.querySelectorAll("a,button,[role='button']"));
    const ctaEls = buttons.filter((b) => {
      const t = (b.innerText || b.value || "").trim().toLowerCase();
      return t && CTA_LEXICON.some((c) => t.includes(c));
    });
    const ctaATF = ctaEls.filter(aboveFold);
    if (ctaATF.length === 0) {
      leaks.push({
        id: "no_atf_cta", severity: "critical", category: "Conversion",
        title: "No primary CTA above the fold",
        why: "Visitors land with no obvious next step. Conversion path is invisible in the first screen.",
        fix: "Install one dominant CTA in the hero, tied to a business outcome.",
        selectors: [],
      });
    } else if (ctaATF.length > 4) {
      leaks.push({
        id: "cta_crowding", severity: "warning", category: "Conversion",
        title: "Too many competing CTAs above the fold",
        why: `${ctaATF.length} CTAs compete for attention. Choice paralysis kills conversion.`,
        fix: "Demote secondary CTAs. Keep one dominant action per screen.",
        selectors: ctaATF.slice(0, 6).map(cssPath),
      });
    }

    // Forms
    const forms = Array.from(document.querySelectorAll("form"));
    if (forms.length === 0) {
      leaks.push({
        id: "no_form", severity: "critical", category: "Capture",
        title: "No lead-capture form on the page",
        why: "Interested-but-not-ready visitors have no low-friction way to raise their hand. They leave anonymous.",
        fix: "Add a short form (name + email) or a calendar embed.",
        selectors: [],
      });
    } else {
      forms.forEach((f) => {
        const fields = f.querySelectorAll("input:not([type=hidden]):not([type=submit]),select,textarea");
        if (fields.length > 6) {
          leaks.push({
            id: `form_too_long_${cssPath(f)}`, severity: "warning", category: "Capture",
            title: "Form is too long for the offer",
            why: `${fields.length} fields. Every extra field drops completion by ~7%.`,
            fix: "Cut to name + email + one qualifier. Capture the rest after the conversation starts.",
            selectors: [cssPath(f)],
          });
        }
      });
    }

    // Calendar / chat / follow-up hooks
    const followupHook = /calendly|hubspot.*meet|cal\.com|drift|intercom|tawk|tidio/i.test(scripts);
    if (!followupHook && forms.length === 0) {
      leaks.push({
        id: "no_followup_hook", severity: "warning", category: "Capture",
        title: "No follow-up mechanism detected",
        why: "No calendar embed, no chat widget, no form. Buyers cannot self-serve a next step.",
        fix: "Install a calendar embed or a chat widget for high-intent traffic.",
        selectors: [],
      });
    }

    // Schema.org
    const ldjson = document.querySelectorAll('script[type="application/ld+json"]');
    if (ldjson.length === 0) {
      leaks.push({
        id: "no_schema", severity: "warning", category: "SEO",
        title: "No structured data on the page",
        why: "Search engines render a generic snippet. You lose rich-result eligibility.",
        fix: "Add JSON-LD for Organization + the primary page type.",
        selectors: [],
      });
    }

    // Meta description
    if (!meta("description")) {
      leaks.push({
        id: "no_meta_desc", severity: "warning", category: "SEO",
        title: "Missing meta description",
        why: "Search engines fabricate a snippet. Click-through rate suffers.",
        fix: "Write a buyer-specific meta description naming offer, audience, and outcome.",
        selectors: [],
      });
    }

    // Performance (best-effort)
    let weightKB = 0;
    try {
      const res = performance.getEntriesByType("resource");
      weightKB = Math.round(res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024);
    } catch {}
    if (weightKB > 4000) {
      leaks.push({
        id: "page_weight", severity: "warning", category: "Speed",
        title: `Page weight is ${weightKB} KB`,
        why: "Heavy pages bleed mobile conversion. Every 1s of load loses ~7% of conversions.",
        fix: "Compress hero media, defer non-critical JS, lazy-load below-the-fold images.",
        selectors: [],
      });
    }

    // Tap targets (mobile)
    const tinyTaps = buttons.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32);
    });
    if (tinyTaps.length > 4) {
      leaks.push({
        id: "tap_targets", severity: "info", category: "Mobile",
        title: "Tap targets are too small",
        why: `${tinyTaps.length} actionable elements are under 32px. Mobile users mis-tap and bounce.`,
        fix: "Increase actionable area to ≥44px per WCAG/Apple HIG.",
        selectors: tinyTaps.slice(0, 6).map(cssPath),
      });
    }

    // Score
    const weights = { critical: 18, warning: 9, info: 4 };
    const penalty = leaks.reduce((s, l) => s + (weights[l.severity] || 0), 0);
    const score = Math.max(8, Math.min(98, 100 - penalty));

    return {
      url: location.href, host, title: document.title,
      metaDescription: meta("description"), weightKB,
      trackersPresent, leaks, score,
      grade: score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F",
      scannedAt: Date.now(),
    };
  }

  function cssPath(el) {
    if (!(el instanceof Element)) return "";
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 5) {
      let part = cur.nodeName.toLowerCase();
      if (cur.id) { part += "#" + cur.id; parts.unshift(part); break; }
      const cls = (cur.className && typeof cur.className === "string") ? cur.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      if (cls) part += "." + cls;
      const sib = cur.parentElement ? Array.from(cur.parentElement.children).filter((n) => n.nodeName === cur.nodeName) : [];
      if (sib.length > 1) part += `:nth-of-type(${sib.indexOf(cur) + 1})`;
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }

  // ---------- X-ray overlay ----------
  let overlayEl = null;
  function clearOverlay() { if (overlayEl) { overlayEl.remove(); overlayEl = null; } }
  function drawOverlay(leaks) {
    clearOverlay();
    overlayEl = document.createElement("div");
    overlayEl.id = "__aetheris_overlay__";
    Object.assign(overlayEl.style, {
      position: "fixed", inset: "0", pointerEvents: "none", zIndex: 2147483646,
    });
    document.documentElement.appendChild(overlayEl);
    leaks.forEach((leak, idx) => {
      (leak.selectors || []).forEach((sel) => {
        let el; try { el = document.querySelector(sel); } catch { return; }
        if (!el) return;
        const r = el.getBoundingClientRect();
        const color = leak.severity === "critical" ? "#dc2626" : leak.severity === "warning" ? "#f59e0b" : "#94a3b8";
        const box = document.createElement("div");
        Object.assign(box.style, {
          position: "fixed", left: r.left + "px", top: r.top + "px",
          width: r.width + "px", height: r.height + "px",
          border: `2px solid ${color}`, boxShadow: `0 0 0 2px rgba(0,0,0,0.4) inset, 0 0 12px ${color}`,
          borderRadius: "4px", pointerEvents: "none",
        });
        const label = document.createElement("div");
        Object.assign(label.style, {
          position: "absolute", top: "-22px", left: "0", padding: "2px 8px",
          background: color, color: "#0a0a0a", font: "600 11px/1 ui-monospace,Menlo,monospace",
          letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "3px",
        });
        label.textContent = `${idx + 1}. ${leak.category}`;
        box.appendChild(label);
        overlayEl.appendChild(box);
      });
    });
  }

  function scrollToLeak(selector) {
    try { const el = document.querySelector(selector); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
  }

  // ---------- Funnel Autopsy recorder ----------
  let rec = null;
  function startRecording() {
    if (rec) return;
    rec = { steps: [], t0: Date.now() };
    const push = (step) => { rec && rec.steps.push({ t: Date.now() - rec.t0, ...step }); };
    rec.onClick = (e) => push({ kind: "click", target: cssPath(e.target), text: (e.target.innerText || "").slice(0, 80) });
    rec.onInput = (e) => push({ kind: "input", target: cssPath(e.target), type: e.target.type || "" });
    rec.onErr = (e) => push({ kind: "error", message: String(e.message || e).slice(0, 200) });
    rec.onNav = () => push({ kind: "nav", url: location.href });
    document.addEventListener("click", rec.onClick, true);
    document.addEventListener("change", rec.onInput, true);
    window.addEventListener("error", rec.onErr);
    window.addEventListener("popstate", rec.onNav);
    push({ kind: "start", url: location.href });
  }
  function stopRecording() {
    if (!rec) return null;
    document.removeEventListener("click", rec.onClick, true);
    document.removeEventListener("change", rec.onInput, true);
    window.removeEventListener("error", rec.onErr);
    window.removeEventListener("popstate", rec.onNav);
    const out = { steps: rec.steps, durationMs: Date.now() - rec.t0, host: location.hostname };
    rec = null;
    // Local heuristic friction analysis (no edge call required).
    const friction = [];
    const clicks = out.steps.filter((s) => s.kind === "click");
    const errors = out.steps.filter((s) => s.kind === "error");
    if (errors.length) friction.push({ severity: "critical", title: `${errors.length} JS error(s) during the journey`, detail: errors.slice(0, 3).map((e) => e.message).join(" · ") });
    if (clicks.length > 6 && out.durationMs < 30000) friction.push({ severity: "warning", title: "Click thrash detected", detail: `${clicks.length} clicks in ${(out.durationMs/1000)|0}s suggests confusion.` });
    if (out.steps.length && !out.steps.some((s) => s.kind === "input")) friction.push({ severity: "warning", title: "No form interaction captured", detail: "Walked the funnel without filling anything. Capture path is invisible." });
    out.friction = friction;
    return out;
  }

  // ---------- Safe Execute actions (allow-list enforced in panel) ----------
  function execAction(action) {
    try {
      const el = document.querySelector(action.selector);
      if (!el) return { ok: false, error: "selector not found" };
      if (action.kind === "click") { el.click(); return { ok: true }; }
      if (action.kind === "fill") {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        setter ? setter.call(el, action.value) : (el.value = action.value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return { ok: true };
      }
      return { ok: false, error: "unknown action" };
    } catch (e) { return { ok: false, error: String(e) }; }
  }

  // ---------- Message router ----------
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case "AETHERIS_PING": sendResponse({ ok: true }); return;
      case "AETHERIS_EXTRACT": sendResponse({ url: location.href, title: document.title, pageText: extractPageText(), metaDescription: meta("description") }); return;
      case "AETHERIS_SCAN": sendResponse(runPassA()); return;
      case "AETHERIS_OVERLAY_DRAW": drawOverlay(msg.leaks || []); sendResponse({ ok: true }); return;
      case "AETHERIS_OVERLAY_CLEAR": clearOverlay(); sendResponse({ ok: true }); return;
      case "AETHERIS_OVERLAY_FOCUS": scrollToLeak(msg.selector); sendResponse({ ok: true }); return;
      case "AETHERIS_RECORD_START": startRecording(); sendResponse({ ok: true }); return;
      case "AETHERIS_RECORD_STOP": sendResponse(stopRecording() || { steps: [] }); return;
      case "AETHERIS_EXEC": sendResponse(execAction(msg.action || {})); return;
      default: return;
    }
  });
})();

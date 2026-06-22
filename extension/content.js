// Aetheris Operator — content script (v0.4)
// "Eyes and hands" inside the live page:
//   - Pass A deterministic forensic scan (DOM + rendered layout) — 20+ checks
//   - X-ray overlay (boxes pointing at each leak)
//   - In-page FIX actions with one-click revert (no external redirects)
//   - Funnel Autopsy recorder (clicks/inputs/nav/errors)
//   - DOM extraction for AI Operator chat
//   - Safe Execute-mode actions (fill/click) with confirm-before-act in panel

(() => {
  if (window.__AETHERIS_CONTENT_LOADED__) return;
  window.__AETHERIS_CONTENT_LOADED__ = true;

  // ============================================================
  // DOM extraction
  // ============================================================
  function extractPageText(max = 9000) {
    const clone = document.body?.cloneNode(true);
    if (!clone) return "";
    clone.querySelectorAll("script,style,noscript,svg").forEach((n) => n.remove());
    return (clone.innerText || "").replace(/\s+/g, " ").trim().slice(0, max);
  }
  function meta(name) {
    const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return el?.getAttribute("content") || "";
  }
  function visibleText(el) {
    if (!el) return "";
    return (el.innerText || el.textContent || "").trim();
  }

  // ============================================================
  // Pass A — deterministic forensic scan
  // ============================================================
  const CTA_LEXICON = [
    "book","schedule","get started","start","quote","contact","call","demo",
    "trial","buy","subscribe","sign up","apply","request","talk to","try free","get a"
  ];
  const TRACKERS = {
    "GA4": /gtag\/js|googletagmanager\.com\/gtag|google-analytics\.com/i,
    "Meta Pixel": /connect\.facebook\.net|fbq\(/i,
    "LinkedIn Insight": /snap\.licdn\.com|_linkedin_partner_id/i,
    "GTM": /googletagmanager\.com\/gtm\.js/i,
    "HubSpot": /js\.hs-scripts\.com|hsforms\.net/i,
    "RB2B": /b2bjsstore|rb2b/i,
    "Stripe": /js\.stripe\.com/i,
    "Calendly": /assets\.calendly\.com/i,
    "Hotjar": /static\.hotjar\.com/i,
    "Segment": /cdn\.segment\.com/i,
  };
  const FOLLOWUP_RX = /calendly|hubspot.*meet|cal\.com|drift|intercom|tawk|tidio|chatwoot|crisp/i;
  // Stricter: require actual proof signals, not the word "results" alone.
  const PROOF_RX = /testimonial|case stud(y|ies)|client logo|trusted by|featured in|as seen in|"[^"]{20,}"\s*[—-]\s*\w+|\d+\s*(\+|plus)\s*(clients|customers|companies)/i;
  // Stricter: require actual currency or explicit pricing copy, not just "plans".
  const PRICE_RX = /\$\s?\d{2,}(?:[.,]\d{2,3})?\b|\bstarts?\s+at\s+\$|\bfrom\s+\$|\bpricing\s+(starts|begins|from)\b|\b\$\d+\s*\/\s*(mo|month|yr|year)\b/i;
  // Stricter: real US/intl phone, not any 10-digit string (zip+4, ids, etc.).
  const PHONE_RX = /(?:\+\d{1,2}[\s.-])?\(\d{3}\)\s?\d{3}[\s.-]?\d{4}|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b|tel:\s*\+?[\d\s().-]{7,}/i;
  const EMAIL_RX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  function aboveFold(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.9 && r.bottom > 0 && r.width > 0 && r.height > 0;
  }

  function runPassA() {
    const leaks = [];
    const host = location.hostname.replace(/^www\./, "");
    const scriptsBlob = Array.from(document.scripts)
      .map((s) => s.src + " " + (s.textContent || "").slice(0, 400))
      .join("\n");
    const fullText = document.body?.innerText || "";
    const lowerText = fullText.toLowerCase();

    // 1) Trackers
    const trackersPresent = Object.entries(TRACKERS).filter(([, rx]) => rx.test(scriptsBlob)).map(([n]) => n);
    const trackersMissing = Object.keys(TRACKERS).filter((n) => !trackersPresent.includes(n));
    if (trackersPresent.length < 2) {
      leaks.push({
        id: "tracking_gap", severity: "critical", category: "Tracking",
        title: "Visitor signal is dark",
        why: `Only ${trackersPresent.length} marketing pixel detected. You cannot retarget who you cannot see.`,
        fix: "Install GA4 + Meta Pixel + LinkedIn Insight at minimum.",
        selectors: [], detail: { present: trackersPresent, missing: trackersMissing.slice(0, 3) },
      });
    }

    // 2/3) CTA presence + crowding above the fold
    const buttons = Array.from(document.querySelectorAll("a,button,[role='button']"));
    const ctaEls = buttons.filter((b) => {
      const t = (visibleText(b) || b.value || "").toLowerCase();
      return t && CTA_LEXICON.some((c) => t.includes(c));
    });
    const ctaATF = ctaEls.filter(aboveFold);
    if (ctaATF.length === 0) {
      leaks.push({
        id: "no_atf_cta", severity: "critical", category: "Conversion",
        title: "No primary CTA above the fold",
        why: "Visitors land with no obvious next step. Conversion path is invisible in the first screen.",
        fix: "Install one dominant CTA in the hero tied to a business outcome.",
        selectors: [],
      });
    } else if (ctaATF.length > 4) {
      leaks.push({
        id: "cta_crowding", severity: "warning", category: "Conversion",
        title: "Too many competing CTAs above the fold",
        why: `${ctaATF.length} CTAs compete for attention. Choice paralysis kills conversion.`,
        fix: "Demote secondary CTAs. Keep one dominant action per screen.",
        selectors: ctaATF.slice(0, 8).map(cssPath),
      });
    }

    // 4) H1 hierarchy
    const h1s = document.querySelectorAll("h1");
    if (h1s.length === 0) {
      leaks.push({
        id: "no_h1", severity: "critical", category: "SEO",
        title: "Page has no H1",
        why: "Search engines and screen readers cannot identify the page's primary topic.",
        fix: "Add exactly one H1 naming the offer, audience, and outcome.",
        selectors: [],
      });
    } else if (h1s.length > 1) {
      leaks.push({
        id: "multi_h1", severity: "warning", category: "SEO",
        title: `${h1s.length} H1 tags on one page`,
        why: "Multiple H1s dilute topical authority and confuse crawlers about what the page is about.",
        fix: "Demote duplicates to H2/H3 and keep one canonical H1.",
        selectors: Array.from(h1s).slice(0, 6).map(cssPath),
      });
    }

    // 5) Heading hierarchy skips
    const headingOrder = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
      .map((h) => parseInt(h.tagName[1], 10));
    let skip = false;
    for (let i = 1; i < headingOrder.length; i++) {
      if (headingOrder[i] > headingOrder[i - 1] + 1) { skip = true; break; }
    }
    if (skip) {
      leaks.push({
        id: "heading_skip", severity: "info", category: "SEO",
        title: "Heading hierarchy skips levels",
        why: "Jumping H2 → H4 breaks document outline and weakens accessibility + SEO signals.",
        fix: "Use sequential heading levels without skipping.",
        selectors: [],
      });
    }

    // 6) Images without alt
    const imgs = Array.from(document.querySelectorAll("img"));
    const noAlt = imgs.filter((i) => !i.getAttribute("alt") || !i.getAttribute("alt").trim());
    if (imgs.length > 0 && noAlt.length / imgs.length > 0.25) {
      leaks.push({
        id: "missing_alt", severity: "warning", category: "SEO",
        title: `${noAlt.length}/${imgs.length} images missing alt text`,
        why: "Search engines cannot index visual content and screen reader users get blanks.",
        fix: "Describe every meaningful image. Mark decoration as alt=\"\".",
        selectors: noAlt.slice(0, 6).map(cssPath),
      });
    }

    // 7) Forms — presence and length
    const forms = Array.from(document.querySelectorAll("form"));
    if (forms.length === 0) {
      leaks.push({
        id: "no_form", severity: "critical", category: "Capture",
        title: "No lead-capture form on the page",
        why: "Interested-but-not-ready visitors have no low-friction way to raise their hand.",
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
            fix: "Cut to name + email + one qualifier.",
            selectors: [cssPath(f)],
          });
        }
        // 8) Inputs missing labels
        const inputs = Array.from(f.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea"));
        const unlabeled = inputs.filter((i) => {
          if (i.getAttribute("aria-label") || i.getAttribute("aria-labelledby") || i.getAttribute("placeholder")) return false;
          const id = i.id;
          if (id && f.querySelector(`label[for="${CSS.escape(id)}"]`)) return false;
          if (i.closest("label")) return false;
          return true;
        });
        if (unlabeled.length) {
          leaks.push({
            id: `form_unlabeled_${cssPath(f)}`, severity: "warning", category: "Accessibility",
            title: `${unlabeled.length} unlabeled form fields`,
            why: "Screen readers and autofill cannot map these inputs. Completion suffers.",
            fix: "Pair every input with a <label for=…> or aria-label.",
            selectors: unlabeled.slice(0, 6).map(cssPath),
          });
        }
      });
    }

    // 9) Follow-up hooks (calendar/chat) when no form
    const followupHook = FOLLOWUP_RX.test(scriptsBlob);
    if (!followupHook && forms.length === 0) {
      leaks.push({
        id: "no_followup_hook", severity: "warning", category: "Capture",
        title: "No follow-up mechanism detected",
        why: "No calendar, no chat, no form. Buyers cannot self-serve a next step.",
        fix: "Install a calendar embed or a chat widget for high-intent traffic.",
        selectors: [],
      });
    }

    // 10) Schema.org
    if (document.querySelectorAll('script[type="application/ld+json"]').length === 0) {
      leaks.push({
        id: "no_schema", severity: "warning", category: "SEO",
        title: "No structured data on the page",
        why: "Search engines render a generic snippet. You lose rich-result eligibility.",
        fix: "Add JSON-LD for Organization + the primary page type.",
        selectors: [],
      });
    }

    // 11) Meta description
    if (!meta("description")) {
      leaks.push({
        id: "no_meta_desc", severity: "warning", category: "SEO",
        title: "Missing meta description",
        why: "Search engines fabricate a snippet. Click-through rate suffers.",
        fix: "Write a buyer-specific meta description naming offer, audience, and outcome.",
        selectors: [],
      });
    }

    // 12) Open Graph tags
    if (!meta("og:title") || !meta("og:image")) {
      leaks.push({
        id: "no_og", severity: "info", category: "SEO",
        title: "Missing or incomplete Open Graph tags",
        why: "Shared links render without a title card or image. Social CTR collapses.",
        fix: "Add og:title, og:description, and an og:image (1200x630).",
        selectors: [],
      });
    }

    // 13) Viewport meta
    if (!meta("viewport")) {
      leaks.push({
        id: "no_viewport", severity: "warning", category: "Mobile",
        title: "Missing viewport meta tag",
        why: "Page renders desktop-width on mobile. Bounce rate spikes.",
        fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
        selectors: [],
      });
    }

    // 14) Canonical
    if (!document.querySelector('link[rel="canonical"]')) {
      leaks.push({
        id: "no_canonical", severity: "info", category: "SEO",
        title: "No canonical URL declared",
        why: "Duplicate-content variants compete for rank instead of consolidating.",
        fix: "Add <link rel=\"canonical\" href=\"…\"> on every page.",
        selectors: [],
      });
    }

    // 15) Favicon
    if (!document.querySelector('link[rel*="icon"]')) {
      leaks.push({
        id: "no_favicon", severity: "info", category: "Trust",
        title: "No favicon declared",
        why: "Tabs render a blank icon. Looks abandoned or unverified.",
        fix: "Add a favicon and apple-touch-icon.",
        selectors: [],
      });
    }

    // 16) Page weight
    let weightKB = 0, slowestResource = null, scriptCount = 0;
    try {
      const res = performance.getEntriesByType("resource");
      weightKB = Math.round(res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024);
      slowestResource = res.slice().sort((a, b) => (b.duration || 0) - (a.duration || 0))[0];
      scriptCount = res.filter((r) => r.initiatorType === "script").length;
    } catch {}
    if (weightKB > 4000) {
      leaks.push({
        id: "page_weight", severity: "warning", category: "Speed",
        title: `Page weight is ${weightKB} KB`,
        why: "Heavy pages bleed mobile conversion. ~7% drop per second of load.",
        fix: "Compress hero media, defer non-critical JS, lazy-load below-the-fold images.",
        selectors: [],
        detail: { slowestUrl: slowestResource?.name, slowestMs: Math.round(slowestResource?.duration || 0) },
      });
    }

    // 17) Third-party script bloat
    if (scriptCount > 25) {
      leaks.push({
        id: "third_party_bloat", severity: "warning", category: "Speed",
        title: `${scriptCount} script requests on this page`,
        why: "Each third-party script adds DNS + handshake + execution cost.",
        fix: "Audit GTM, ad pixels, chat widgets. Defer or remove low-value tags.",
        selectors: [],
      });
    }

    // 18) Tap targets
    const tinyTaps = buttons.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32);
    });
    if (tinyTaps.length > 4) {
      leaks.push({
        id: "tap_targets", severity: "info", category: "Mobile",
        title: "Tap targets are too small",
        why: `${tinyTaps.length} actionable elements under 32px. Mobile users mis-tap and bounce.`,
        fix: "Increase actionable area to ≥44px per WCAG/Apple HIG.",
        selectors: tinyTaps.slice(0, 8).map(cssPath),
      });
    }

    // 19) Mixed content (http on https)
    if (location.protocol === "https:") {
      const mixed = Array.from(document.querySelectorAll('img[src^="http:"],script[src^="http:"],link[href^="http:"]'));
      if (mixed.length) {
        leaks.push({
          id: "mixed_content", severity: "critical", category: "Trust",
          title: `${mixed.length} insecure (http://) resources on an https page`,
          why: "Browsers block or warn on mixed content. Trust signal collapses.",
          fix: "Rewrite every http:// asset URL to https:// or protocol-relative.",
          selectors: mixed.slice(0, 5).map(cssPath),
        });
      }
    }

    // 20) Broken / empty links
    const allLinks = Array.from(document.querySelectorAll("a[href]"));
    const dead = allLinks.filter((a) => {
      const h = (a.getAttribute("href") || "").trim();
      return !h || h === "#" || h.toLowerCase() === "javascript:void(0)" || h.toLowerCase() === "javascript:;";
    });
    if (dead.length > 3) {
      leaks.push({
        id: "dead_links", severity: "warning", category: "Trust",
        title: `${dead.length} links go nowhere`,
        why: "Empty href=\"#\" links break navigation and look unfinished.",
        fix: "Wire every visible link to a real destination or remove the anchor.",
        selectors: dead.slice(0, 6).map(cssPath),
      });
    }

    // 21) Social proof
    if (!PROOF_RX.test(lowerText)) {
      leaks.push({
        id: "no_proof", severity: "warning", category: "Trust",
        title: "No social proof on the page",
        why: "No testimonial, case study, client logo, or results language. Visitors are asked to trust claims with no evidence.",
        fix: "Add 2-3 outcome-specific testimonials with names and a logo bar.",
        selectors: [],
      });
    }

    // 22) Pricing visibility
    if (!PRICE_RX.test(lowerText) && fullText.length > 1500) {
      leaks.push({
        id: "no_pricing", severity: "info", category: "Conversion",
        title: "No pricing or plan language visible",
        why: "Buyers self-disqualify when price is hidden. Demo requests trend low-intent.",
        fix: "Publish a starting-at price, a range, or clear plan tiers.",
        selectors: [],
      });
    }

    // 23) Visible contact (phone OR email)
    const hasPhone = PHONE_RX.test(fullText);
    const hasEmail = EMAIL_RX.test(fullText);
    if (!hasPhone && !hasEmail) {
      leaks.push({
        id: "no_visible_contact", severity: "warning", category: "Trust",
        title: "No phone or email visible on the page",
        why: "High-intent buyers cannot start a conversation without filling a form.",
        fix: "Surface a phone or email in the header or footer.",
        selectors: [],
      });
    }

    // 24) Hero image weight (best-effort)
    const hero = document.querySelector("img");
    if (hero) {
      try {
        const url = hero.currentSrc || hero.src;
        const entry = performance.getEntriesByName(url)[0];
        const kb = entry ? Math.round((entry.transferSize || 0) / 1024) : 0;
        if (kb > 500) {
          leaks.push({
            id: "hero_image_weight", severity: "warning", category: "Speed",
            title: `Hero image is ${kb} KB`,
            why: "Oversized hero blocks LCP and bleeds mobile conversion.",
            fix: "Compress to WebP/AVIF under 200 KB. Use responsive srcset.",
            selectors: [cssPath(hero)],
          });
        }
      } catch {}
    }

    // 25) Autoplay video with sound (uncommon, but kills bounce)
    const autoplayLoud = Array.from(document.querySelectorAll("video[autoplay]")).filter((v) => !v.muted);
    if (autoplayLoud.length) {
      leaks.push({
        id: "autoplay_loud", severity: "critical", category: "UX",
        title: "Autoplaying video with sound",
        why: "Auto-sound video is a top mobile-bounce trigger and a Chrome violation in many cases.",
        fix: "Mute autoplay video or require user click to play sound.",
        selectors: autoplayLoud.slice(0, 3).map(cssPath),
      });
    }

    // ---- Score ----
    const weights = { critical: 18, warning: 9, info: 4 };
    const penalty = leaks.reduce((s, l) => s + (weights[l.severity] || 0), 0);
    const score = Math.max(8, Math.min(98, 100 - penalty));

    return {
      url: location.href, host, title: document.title,
      metaDescription: meta("description"), weightKB,
      trackersPresent, trackersMissing, scriptCount,
      hasPhone, hasEmail, hasProof: PROOF_RX.test(lowerText), hasPricing: PRICE_RX.test(lowerText),
      leaks, score,
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
      if (cur.id) { part += "#" + CSS.escape(cur.id); parts.unshift(part); break; }
      const cls = (cur.className && typeof cur.className === "string") ? cur.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      if (cls) part += "." + cls.split(".").map((c) => CSS.escape(c)).join(".");
      const sib = cur.parentElement ? Array.from(cur.parentElement.children).filter((n) => n.nodeName === cur.nodeName) : [];
      if (sib.length > 1) part += `:nth-of-type(${sib.indexOf(cur) + 1})`;
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }

  // ============================================================
  // X-ray overlay
  // ============================================================
  let overlayEl = null;
  function clearOverlay() { if (overlayEl) { overlayEl.remove(); overlayEl = null; } }
  function drawOverlay(leaks) {
    clearOverlay();
    overlayEl = document.createElement("div");
    overlayEl.id = "__aetheris_overlay__";
    Object.assign(overlayEl.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: 2147483646 });
    document.documentElement.appendChild(overlayEl);
    leaks.forEach((leak, idx) => {
      (leak.selectors || []).forEach((sel) => {
        let el; try { el = document.querySelector(sel); } catch { return; }
        if (!el) return;
        const r = el.getBoundingClientRect();
        const color = leak.severity === "critical" ? "#dc2626" : leak.severity === "warning" ? "#f59e0b" : "#94a3b8";
        const box = document.createElement("div");
        Object.assign(box.style, {
          position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px",
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
    try { const el = document.querySelector(selector); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); flash(el); } } catch {}
  }
  function flash(el) {
    const orig = el.style.outline;
    el.style.outline = "3px solid #f59e0b";
    el.style.outlineOffset = "4px";
    setTimeout(() => { el.style.outline = orig; }, 1800);
  }

  // ============================================================
  // IN-PAGE FIX REGISTRY (real DOM patches, all reversible)
  // ============================================================
  const fixHistory = new Map(); // revertId → revert fn
  let nextRevertId = 1;

  function recordRevert(fn) { const id = nextRevertId++; fixHistory.set(id, fn); return id; }
  function revertFix(id) {
    const fn = fixHistory.get(id);
    if (!fn) return { ok: false, error: "revert id not found" };
    try { fn(); fixHistory.delete(id); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e) }; }
  }

  function injectBannerPreview(leak, text) {
    const banner = document.createElement("div");
    banner.textContent = String(leak?.aiFix || text || leak?.fix || "Preview fix").slice(0, 180);
    banner.setAttribute("data-aetheris-injected", "1");
    Object.assign(banner.style, {
      position: "fixed", left: "0", right: "0", bottom: "0", zIndex: "2147483640",
      background: "#f59e0b", color: "#0a0a0a", padding: "12px 18px", textAlign: "center",
      fontFamily: "ui-monospace,Menlo,monospace", fontWeight: "700", letterSpacing: "0.04em",
      boxShadow: "0 -4px 16px rgba(245,158,11,0.35)",
    });
    document.body.appendChild(banner);
    const id = recordRevert(() => banner.remove());
    return { revertId: id, message: "Injected a preview repair banner." };
  }

  function injectLeadCapturePreview(leak, label = "Start here") {
    const box = document.createElement("form");
    box.setAttribute("data-aetheris-injected", "1");
    box.innerHTML = `<strong>${label}</strong><input aria-label="Name" placeholder="Name"><input aria-label="Email" placeholder="Email"><button type="button">Submit</button>`;
    Object.assign(box.style, {
      position: "fixed", right: "16px", bottom: "16px", zIndex: "2147483640", width: "min(320px, calc(100vw - 32px))",
      display: "grid", gap: "8px", background: "#111", color: "#e5e5e5", border: "2px solid #f59e0b",
      borderRadius: "4px", padding: "12px", fontFamily: "ui-monospace,Menlo,monospace", boxShadow: "0 8px 28px rgba(0,0,0,.45)",
    });
    box.querySelectorAll("input").forEach((i) => Object.assign(i.style, { padding: "10px", border: "1px solid #333", borderRadius: "3px", background: "#181818", color: "#e5e5e5" }));
    Object.assign(box.querySelector("button").style, { padding: "10px", border: "0", borderRadius: "3px", background: "#f59e0b", color: "#0a0a0a", fontWeight: "700" });
    document.body.appendChild(box);
    const id = recordRevert(() => box.remove());
    return { revertId: id, message: "Inserted a preview lead-capture module." };
  }

  function injectProofPreview(leak) {
    const proof = document.createElement("section");
    proof.setAttribute("data-aetheris-injected", "1");
    proof.textContent = leak?.aiFix || "Proof block preview: add named outcomes, client logos, or measurable before/after results here.";
    Object.assign(proof.style, { padding: "16px", margin: "12px", background: "#111", color: "#e5e5e5", border: "2px solid #f59e0b", fontFamily: "ui-monospace,Menlo,monospace" });
    const target = document.querySelector("main") || document.body;
    target.prepend(proof);
    const id = recordRevert(() => proof.remove());
    return { revertId: id, message: "Inserted a preview proof block." };
  }

  function previewChecklist(leak, text) { return injectBannerPreview(leak, text); }

  const INPAGE_FIXES = {
    no_meta_desc(leak) {
      const proposed = (leak?.aiFix || "Service offer for [audience] that delivers [measurable outcome]. Contact today.").slice(0, 160);
      const tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      tag.setAttribute("content", proposed);
      tag.setAttribute("data-aetheris-injected", "1");
      document.head.appendChild(tag);
      const id = recordRevert(() => tag.remove());
      return { revertId: id, message: `Injected meta description (preview): "${proposed}"` };
    },
    no_h1(leak) {
      const text = (leak?.aiFix || document.title || "Untitled").slice(0, 80);
      const h1 = document.createElement("h1");
      h1.textContent = text;
      h1.setAttribute("data-aetheris-injected", "1");
      Object.assign(h1.style, { padding: "10px 16px", background: "#f59e0b", color: "#0a0a0a", fontFamily: "ui-monospace,Menlo,monospace", position: "relative", zIndex: "999" });
      document.body.prepend(h1);
      const id = recordRevert(() => h1.remove());
      return { revertId: id, message: `Inserted preview H1: "${text}"` };
    },
    multi_h1(leak) {
      const h1s = Array.from(document.querySelectorAll("h1"));
      const demoted = h1s.slice(1).map((h) => {
        const h2 = document.createElement("h2");
        for (const a of h.attributes) h2.setAttribute(a.name, a.value);
        h2.innerHTML = h.innerHTML;
        h2.setAttribute("data-aetheris-demoted", "1");
        h.replaceWith(h2);
        return h2;
      });
      const id = recordRevert(() => {
        demoted.forEach((h2) => {
          const h1 = document.createElement("h1");
          for (const a of h2.attributes) if (a.name !== "data-aetheris-demoted") h1.setAttribute(a.name, a.value);
          h1.innerHTML = h2.innerHTML;
          h2.replaceWith(h1);
        });
      });
      return { revertId: id, message: `Demoted ${demoted.length} extra H1 → H2.` };
    },
    no_atf_cta(leak) {
      const cta = document.createElement("button");
      cta.textContent = (leak?.aiFix || "Primary CTA").slice(0, 40);
      cta.setAttribute("data-aetheris-injected", "1");
      Object.assign(cta.style, {
        position: "fixed", top: "16px", right: "16px", zIndex: "2147483640",
        background: "#f59e0b", color: "#0a0a0a", border: "0", padding: "12px 18px",
        borderRadius: "4px", fontFamily: "ui-monospace,Menlo,monospace", fontWeight: "700",
        letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
        boxShadow: "0 4px 16px rgba(245,158,11,0.4)",
      });
      document.body.appendChild(cta);
      const id = recordRevert(() => cta.remove());
      return { revertId: id, message: `Floated a preview CTA in the top-right.` };
    },
    cta_crowding(leak) {
      const sels = leak?.selectors || [];
      const dimmed = [];
      sels.slice(1).forEach((s) => { // keep first, dim the rest
        try { const el = document.querySelector(s); if (el) { dimmed.push([el, el.style.cssText]); el.style.opacity = "0.35"; el.style.filter = "grayscale(1)"; } } catch {}
      });
      const id = recordRevert(() => dimmed.forEach(([el, css]) => el.style.cssText = css));
      return { revertId: id, message: `Dimmed ${dimmed.length} secondary CTAs to preview a single dominant action.` };
    },
    no_schema(leak) {
      const json = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: document.title,
        url: location.origin,
        description: meta("description") || "",
      };
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-aetheris-injected", "1");
      s.textContent = JSON.stringify(json, null, 2);
      document.head.appendChild(s);
      const id = recordRevert(() => s.remove());
      return { revertId: id, message: `Injected Organization JSON-LD (preview).` };
    },
    no_viewport() {
      const tag = document.createElement("meta");
      tag.setAttribute("name", "viewport");
      tag.setAttribute("content", "width=device-width, initial-scale=1");
      tag.setAttribute("data-aetheris-injected", "1");
      document.head.appendChild(tag);
      const id = recordRevert(() => tag.remove());
      return { revertId: id, message: `Injected responsive viewport meta tag.` };
    },
    no_canonical() {
      const tag = document.createElement("link");
      tag.setAttribute("rel", "canonical");
      tag.setAttribute("href", location.href.split("?")[0].split("#")[0]);
      tag.setAttribute("data-aetheris-injected", "1");
      document.head.appendChild(tag);
      const id = recordRevert(() => tag.remove());
      return { revertId: id, message: `Injected canonical: ${tag.href}` };
    },
    no_og() {
      const adds = [];
      const ensure = (prop, content) => {
        if (document.querySelector(`meta[property="${prop}"]`)) return;
        const t = document.createElement("meta");
        t.setAttribute("property", prop); t.setAttribute("content", content);
        t.setAttribute("data-aetheris-injected", "1");
        document.head.appendChild(t); adds.push(t);
      };
      ensure("og:title", document.title);
      ensure("og:description", meta("description") || "");
      ensure("og:url", location.href);
      ensure("og:type", "website");
      const id = recordRevert(() => adds.forEach((t) => t.remove()));
      return { revertId: id, message: `Injected ${adds.length} Open Graph tags (preview).` };
    },
    no_favicon() {
      const link = document.createElement("link");
      link.setAttribute("rel", "icon");
      link.setAttribute("href", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23f59e0b'/%3E%3Ctext x='50%25' y='62%25' font-family='monospace' font-size='22' fill='%230a0a0a' text-anchor='middle' font-weight='700'%3EA%3C/text%3E%3C/svg%3E");
      link.setAttribute("data-aetheris-injected", "1");
      document.head.appendChild(link);
      const id = recordRevert(() => link.remove());
      return { revertId: id, message: `Injected placeholder favicon.` };
    },
    tap_targets(leak) {
      const touched = [];
      (leak?.selectors || []).forEach((s) => {
        try {
          const el = document.querySelector(s);
          if (!el) return;
          touched.push([el, el.style.cssText]);
          el.style.padding = "12px";
          el.style.minWidth = "44px";
          el.style.minHeight = "44px";
          el.style.display = "inline-block";
        } catch {}
      });
      const id = recordRevert(() => touched.forEach(([el, css]) => el.style.cssText = css));
      return { revertId: id, message: `Padded ${touched.length} tap targets to ≥44px.` };
    },
    missing_alt(leak) {
      const touched = [];
      (leak?.selectors || []).forEach((s) => {
        try {
          const el = document.querySelector(s);
          if (!el || el.getAttribute("alt")) return;
          touched.push(el);
          const guess = (el.src || "").split("/").pop().split(".")[0].replace(/[-_]/g, " ").slice(0, 60);
          el.setAttribute("alt", guess || "image");
          el.setAttribute("data-aetheris-alt", "1");
        } catch {}
      });
      const id = recordRevert(() => touched.forEach((el) => { el.removeAttribute("alt"); el.removeAttribute("data-aetheris-alt"); }));
      return { revertId: id, message: `Filled placeholder alt text on ${touched.length} images.` };
    },
    dead_links(leak) {
      const touched = [];
      (leak?.selectors || []).forEach((s) => {
        try {
          const el = document.querySelector(s);
          if (!el) return;
          touched.push([el, el.style.cssText, el.getAttribute("title")]);
          el.style.outline = "2px dashed #dc2626";
          el.setAttribute("title", "Aetheris: this link has no destination.");
        } catch {}
      });
      const id = recordRevert(() => touched.forEach(([el, css, title]) => { el.style.cssText = css; title ? el.setAttribute("title", title) : el.removeAttribute("title"); }));
      return { revertId: id, message: `Flagged ${touched.length} dead links with a dashed outline.` };
    },
    form_too_long(leak) {
      const form = document.querySelector((leak.selectors || [])[0]);
      if (!form) return { error: "Form not found." };
      const fields = Array.from(form.querySelectorAll("input:not([type=hidden]):not([type=submit]),select,textarea"));
      const extras = fields.slice(3); // keep first 3
      const touched = [];
      extras.forEach((f) => {
        const row = f.closest("label") || f.parentElement;
        if (!row) return;
        touched.push([row, row.style.cssText]);
        row.style.opacity = "0.3";
        row.style.textDecoration = "line-through";
        row.style.pointerEvents = "none";
      });
      const id = recordRevert(() => touched.forEach(([el, css]) => el.style.cssText = css));
      return { revertId: id, message: `Struck through ${extras.length} extra fields to preview a 3-field form.` };
    },
    mixed_content(leak) {
      const touched = [];
      (leak?.selectors || []).forEach((s) => {
        try {
          const el = document.querySelector(s);
          if (!el) return;
          const attr = el.tagName === "LINK" ? "href" : "src";
          const orig = el.getAttribute(attr);
          if (!orig || !orig.startsWith("http:")) return;
          el.setAttribute(attr, orig.replace(/^http:/, "https:"));
          touched.push([el, attr, orig]);
        } catch {}
      });
      const id = recordRevert(() => touched.forEach(([el, attr, orig]) => el.setAttribute(attr, orig)));
      return { revertId: id, message: `Rewrote ${touched.length} insecure URLs to https://.` };
    },
    form_unlabeled(leak) {
      const touched = [];
      (leak?.selectors || []).forEach((s, idx) => {
        try {
          const el = document.querySelector(s);
          if (!el || el.getAttribute("aria-label")) return;
          touched.push([el, el.getAttribute("aria-label")]);
          el.setAttribute("aria-label", el.getAttribute("placeholder") || `Field ${idx + 1}`);
        } catch {}
      });
      const id = recordRevert(() => touched.forEach(([el, orig]) => orig === null ? el.removeAttribute("aria-label") : el.setAttribute("aria-label", orig)));
      return { revertId: id, message: `Added aria-labels to ${touched.length} fields.` };
    },
    heading_skip(leak) { return previewChecklist(leak, "Normalize heading levels in sequence: H1, H2, H3. No jumps."); },
    no_form(leak) { return injectLeadCapturePreview(leak); },
    no_followup_hook(leak) { return injectLeadCapturePreview(leak, "Add calendar/chat capture here"); },
    no_proof(leak) { return injectProofPreview(leak); },
    no_pricing(leak) { return injectBannerPreview(leak, "Pricing signal missing. Add starting price, range, or package tiers."); },
    no_visible_contact(leak) { return injectBannerPreview(leak, "Contact path missing. Add phone, email, or direct booking route."); },
    page_weight(leak) { return previewChecklist(leak, "Compress hero media. Convert large images to WebP/AVIF. Defer non-critical scripts."); },
    third_party_bloat(leak) { return previewChecklist(leak, "Audit scripts. Remove low-value tags. Defer chat, heatmaps, and retargeting until consent/intent."); },
    hero_image_weight(leak) {
      const touched = [];
      (leak?.selectors || []).forEach((s) => {
        try { const el = document.querySelector(s); if (el) { touched.push([el, el.style.cssText]); el.style.outline = "3px solid #f59e0b"; el.style.filter = "saturate(.75) contrast(.9)"; } } catch {}
      });
      const id = recordRevert(() => touched.forEach(([el, css]) => el.style.cssText = css));
      return { revertId: id, message: `Marked ${touched.length} heavy hero image(s) for compression.` };
    },
    autoplay_loud(leak) {
      const touched = [];
      (leak?.selectors || []).forEach((s) => {
        try { const el = document.querySelector(s); if (el?.tagName === "VIDEO") { touched.push([el, el.muted]); el.muted = true; } } catch {}
      });
      const id = recordRevert(() => touched.forEach(([el, muted]) => { el.muted = muted; }));
      return { revertId: id, message: `Muted ${touched.length} autoplay video(s).` };
    },
    // Generic AI-driven visual fix. Routed for any leak with a structured fixAction.
    ai_visual(leak) {
      const fa = leak?.fixAction;
      if (!fa || !fa.op) return { error: "AI did not provide a structured fix for this leak." };
      const op = fa.op;
      try {
        if (op === "injectBanner") {
          const banner = document.createElement("div");
          banner.textContent = String(fa.value || leak.fix || "");
          banner.setAttribute("data-aetheris-injected", "1");
          Object.assign(banner.style, {
            position: "fixed", left: "0", right: "0", [fa.where === "bottom" ? "bottom" : "top"]: "0",
            zIndex: "2147483640", background: "#f59e0b", color: "#0a0a0a",
            padding: "12px 18px", fontFamily: "ui-monospace,Menlo,monospace", fontWeight: "700",
            letterSpacing: "0.06em", textAlign: "center", boxShadow: "0 4px 16px rgba(245,158,11,0.4)",
          });
          document.body.appendChild(banner);
          const id = recordRevert(() => banner.remove());
          return { revertId: id, message: `Injected banner: "${banner.textContent}"` };
        }
        if (op === "injectCTA") {
          const cta = document.createElement("button");
          cta.textContent = String(fa.value || "Take Action").slice(0, 40);
          cta.setAttribute("data-aetheris-injected", "1");
          Object.assign(cta.style, {
            position: "fixed", [fa.where === "bottom" ? "bottom" : "top"]: "16px", right: "16px",
            zIndex: "2147483640", background: "#f59e0b", color: "#0a0a0a", border: "0",
            padding: "12px 18px", borderRadius: "4px", fontFamily: "ui-monospace,Menlo,monospace",
            fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(245,158,11,0.4)",
          });
          document.body.appendChild(cta);
          const id = recordRevert(() => cta.remove());
          return { revertId: id, message: `Floated AI CTA: "${cta.textContent}"` };
        }
        const el = document.querySelector(fa.selector);
        if (!el) return { error: `Selector "${fa.selector}" not found on page.` };
        if (op === "replaceText") {
          const orig = el.textContent;
          el.textContent = String(fa.value ?? "");
          el.setAttribute("data-aetheris-touched", "1");
          const id = recordRevert(() => { el.textContent = orig; el.removeAttribute("data-aetheris-touched"); });
          return { revertId: id, message: `Rewrote element text → "${String(fa.value).slice(0, 80)}"` };
        }
        if (op === "setHTML") {
          const orig = el.innerHTML;
          el.innerHTML = String(fa.value ?? "");
          el.setAttribute("data-aetheris-touched", "1");
          const id = recordRevert(() => { el.innerHTML = orig; el.removeAttribute("data-aetheris-touched"); });
          return { revertId: id, message: `Replaced element HTML.` };
        }
        if (op === "hide") {
          const orig = el.style.cssText;
          el.style.display = "none";
          el.setAttribute("data-aetheris-touched", "1");
          const id = recordRevert(() => { el.style.cssText = orig; el.removeAttribute("data-aetheris-touched"); });
          return { revertId: id, message: `Hid offending element.` };
        }
        if (op === "setStyle") {
          const styleObj = typeof fa.value === "string" ? JSON.parse(fa.value) : (fa.value || {});
          const orig = el.style.cssText;
          Object.entries(styleObj).forEach(([k, v]) => { try { el.style.setProperty(k.replace(/[A-Z]/g, m => "-" + m.toLowerCase()), String(v)); } catch {} });
          el.setAttribute("data-aetheris-touched", "1");
          const id = recordRevert(() => { el.style.cssText = orig; el.removeAttribute("data-aetheris-touched"); });
          return { revertId: id, message: `Restyled element (${Object.keys(styleObj).length} props).` };
        }
        if (op === "replaceAttr") {
          const { attr, value } = (typeof fa.value === "string" ? JSON.parse(fa.value) : fa.value) || {};
          if (!attr) return { error: "replaceAttr requires {attr,value}" };
          const orig = el.getAttribute(attr);
          el.setAttribute(attr, String(value ?? ""));
          const id = recordRevert(() => { orig === null ? el.removeAttribute(attr) : el.setAttribute(attr, orig); });
          return { revertId: id, message: `Set ${attr}="${value}".` };
        }
        return { error: `Unknown op "${op}".` };
      } catch (e) {
        return { error: String(e?.message || e) };
      }
    },
  };

  function applyFix(leak) {
    if (!leak) return { ok: false, error: "No leak provided." };
    // Any AI leak with a structured fixAction goes through the generic handler.
    const useAiVisual = leak.fixAction && typeof leak.fixAction === "object";
    const baseId = useAiVisual ? "ai_visual"
                  : leak.id.startsWith("form_too_long") ? "form_too_long"
                  : leak.id.startsWith("form_unlabeled") ? "form_unlabeled"
                 : leak.id;
    const handler = baseId && INPAGE_FIXES[baseId];
    if (!handler) return { ok: false, error: "No in-page fix available for this leak yet." };
    try {
      const out = handler(leak);
      if (out?.error) return { ok: false, error: out.error };
      return { ok: true, revertId: out.revertId, message: out.message };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  }

  // ============================================================
  // Funnel Autopsy recorder
  // ============================================================
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
    const friction = [];
    const clicks = out.steps.filter((s) => s.kind === "click");
    const errors = out.steps.filter((s) => s.kind === "error");
    if (errors.length) friction.push({ severity: "critical", title: `${errors.length} JS error(s) during the journey`, detail: errors.slice(0, 3).map((e) => e.message).join(" · ") });
    if (clicks.length > 6 && out.durationMs < 30000) friction.push({ severity: "warning", title: "Click thrash detected", detail: `${clicks.length} clicks in ${(out.durationMs/1000)|0}s suggests confusion.` });
    if (out.steps.length && !out.steps.some((s) => s.kind === "input")) friction.push({ severity: "warning", title: "No form interaction captured", detail: "Walked the funnel without filling anything." });
    out.friction = friction;
    return out;
  }

  // ============================================================
  // Selection grab (for Growth tab)
  // ============================================================
  function getSelection() {
    const s = window.getSelection();
    return s ? s.toString().trim().slice(0, 4000) : "";
  }

  // ============================================================
  // Safe Execute actions (allow-list enforced in panel)
  // ============================================================
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

  // ============================================================
  // Message router
  // ============================================================
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case "AETHERIS_PING": sendResponse({ ok: true }); return;
      case "AETHERIS_EXTRACT": sendResponse({ url: location.href, title: document.title, pageText: extractPageText(), metaDescription: meta("description"), selection: getSelection() }); return;
      case "AETHERIS_SCAN": sendResponse(runPassA()); return;
      case "AETHERIS_OVERLAY_DRAW": drawOverlay(msg.leaks || []); sendResponse({ ok: true }); return;
      case "AETHERIS_OVERLAY_CLEAR": clearOverlay(); sendResponse({ ok: true }); return;
      case "AETHERIS_OVERLAY_FOCUS": scrollToLeak(msg.selector); sendResponse({ ok: true }); return;
      case "AETHERIS_RECORD_START": startRecording(); sendResponse({ ok: true }); return;
      case "AETHERIS_RECORD_STOP": sendResponse(stopRecording() || { steps: [] }); return;
      case "AETHERIS_APPLY_FIX": sendResponse(applyFix(msg.leak)); return;
      case "AETHERIS_REVERT_FIX": sendResponse(revertFix(msg.revertId)); return;
      case "AETHERIS_EXEC": sendResponse(execAction(msg.action || {})); return;

      // ---------- HubSpot bridge ----------
      case "AETHERIS_HUBSPOT_SCRAPE": {
        try {
          const host = location.hostname;
          if (!/hubspot\.com$/.test(host) && !/hubapi\.com$/.test(host)) {
            sendResponse({ error: "Open a HubSpot tab first (app.hubspot.com)." });
            return;
          }
          const grabRows = (root) => Array.from(root.querySelectorAll("tr, [role='row']"))
            .slice(0, 400)
            .map((tr) => Array.from(tr.querySelectorAll("td, th, [role='cell'], [role='columnheader']"))
              .map((c) => (c.textContent || "").replace(/\s+/g, " ").trim())
              .filter(Boolean))
            .filter((row) => row.length);
          const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
            .slice(0, 40).map((h) => h.textContent.trim()).filter(Boolean);
          const cards = Array.from(document.querySelectorAll("[data-test-id*='card'],[data-selenium-test*='card'],[class*='Card']"))
            .slice(0, 80).map((c) => (c.textContent || "").replace(/\s+/g, " ").trim().slice(0, 400)).filter(Boolean);
          sendResponse({
            url: location.href, title: document.title,
            screen: location.pathname.split("/").filter(Boolean).slice(0, 3).join("/"),
            headings, rows: grabRows(document).slice(0, 200), cards: cards.slice(0, 60),
            visibleText: (document.body.innerText || "").slice(0, 8000),
          });
        } catch (e) { sendResponse({ error: String(e && e.message || e) }); }
        return;
      }
      // Use the user's session cookie to call private HubSpot endpoints from
      // within the hubspot.com / hubapi.com origin (no API key required).
      case "AETHERIS_HUBSPOT_API_FETCH": {
        (async () => {
          try {
            const host = location.hostname;
            if (!/hubspot\.com$/.test(host) && !/hubapi\.com$/.test(host)) {
              sendResponse({ error: "Switch to a HubSpot tab to use session-cookie fetch." }); return;
            }
            const path = String(msg.path || "");
            if (!path.startsWith("/")) { sendResponse({ error: "path must start with /" }); return; }
            const method = String(msg.method || "GET").toUpperCase();
            const init = {
              method,
              credentials: "include",
              headers: { Accept: "application/json", "Content-Type": "application/json" },
            };
            if (msg.body && method !== "GET" && method !== "HEAD") {
              init.body = typeof msg.body === "string" ? msg.body : JSON.stringify(msg.body);
            }
            const r = await fetch(`https://api.hubapi.com${path}`, init);
            const text = await r.text();
            let json = null; try { json = JSON.parse(text); } catch {}
            sendResponse({ status: r.status, ok: r.ok, json, text: json ? null : text.slice(0, 4000) });
          } catch (e) { sendResponse({ error: String(e && e.message || e) }); }
        })();
        return true;
      }
      case "AETHERIS_CMS_DETECT": {
        try {
          const html = document.documentElement.outerHTML.slice(0, 50000);
          const gen = (document.querySelector('meta[name="generator"]')?.content || "").toLowerCase();
          const isWP = /wp-content|wp-includes|wordpress/i.test(html) || /wordpress/.test(gen);
          const isWebflow = /webflow/i.test(html) || /webflow/.test(gen);
          const isShopify = /cdn\.shopify\.com|shopify/i.test(html);
          const isSquarespace = /squarespace/i.test(html);
          const isWix = /wix\.com|static\.wixstatic/i.test(html);
          const platform = isWP ? "wordpress" : isWebflow ? "webflow" : isShopify ? "shopify" : isSquarespace ? "squarespace" : isWix ? "wix" : "unknown";
          sendResponse({ platform, generator: gen || null, url: location.href, origin: location.origin });
        } catch (e) { sendResponse({ error: String(e && e.message || e) }); }
        return;
      }
      default: return;
    }
  });
})();

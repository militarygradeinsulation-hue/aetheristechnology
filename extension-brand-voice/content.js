// Brand Voice content script — attaches a floating "Brand Voice" button
// next to any focused textarea / contenteditable, and asks the backend
// to draft a reply/post in the buyer's brand voice.
//
// Panel mirrors the Aetheris Content Engine: Tone / Style / Persona / Length
// dropdowns + humanize toggle + intent textarea + insert/copy/redraft.

(function () {
  if (window.__BV_LOADED__) return;
  window.__BV_LOADED__ = true;

  const ENDPOINT = "https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/extension-brand-voice";
  const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs";

  // ============ OPTION CATALOG (mirrors Content Engine / LinkedInPostStudio) ============
  const TONES = [
    ["auto", "Auto (brand default)"],
    ["blunt-operator", "Blunt Operator — direct, no fluff"],
    ["forensic-cold", "Forensic / Cold — clinical case-file"],
    ["aggressive-callout", "Aggressive Call-Out — name the leak"],
    ["mentor-calm", "Calm Mentor — patient, teaching tone"],
    ["contrarian", "Contrarian — flip the conventional take"],
    ["storyteller", "Storyteller — 1st-person field story"],
    ["dry-witty", "Dry / Witty — restrained humor"],
    ["empathetic-peer", "Empathetic Peer — founder-to-founder"],
    ["data-driven", "Data-Driven — stat-led, numeric proof"],
    ["professional", "Professional — polished, corporate-safe"],
    ["casual", "Casual — relaxed, conversational"],
    ["confident", "Confident — assertive, self-assured"],
    ["playful", "Playful — light, cheeky"],
  ];

  const STYLES = [
    ["auto", "Auto (model picks structure)"],
    ["reaction", "Natural reaction — react to the post, no template"],
    ["hook-list-close", "Hook → numbered list → sharp close"],
    ["micro-story", "Micro-story with one dollar figure"],
    ["case-file", "Case-File format (Subject / Findings / Verdict)"],
    ["one-paragraph", "One dense paragraph, no breaks"],
    ["stat-led", "Stat-led open, 3 supporting points"],
    ["verdict-first", "Verdict first, then the proof"],
    ["question-frame", "Question frame → answer → twist"],
    ["before-after", "Before / After / What changed"],
    ["problem-solution", "Problem → 2-3 concrete moves to try"],
    ["agree-extend", "Agree → extend with one sharper detail"],
    ["polite-pushback", "Polite pushback — name the assumption"],
  ];

  const PERSONAS = [
    ["none", "No persona (default voice)"],
    ["alex-hormozi", "Alex Hormozi — offer-stacked, blunt money math"],
    ["machiavellian", "Machiavellian — strategic, power-aware"],
    ["elon-musk", "Elon Musk — terse, first-principles"],
    ["ryan-reynolds", "Ryan Reynolds — deadpan, charming wit"],
    ["robin-williams", "Robin Williams — rapid-fire, warm riffs"],
    ["clint-eastwood", "Clint Eastwood — spare, quiet menace"],
    ["hemingway", "Hemingway — short, declarative, iceberg"],
    ["aaron-sorkin", "Aaron Sorkin — walk-and-talk cadence"],
    ["anthony-bourdain", "Anthony Bourdain — gritty, observational"],
    ["churchill", "Churchill — gravitas, cadenced resolve"],
    ["denzel", "Denzel Washington — measured, moral weight"],
    ["steve-jobs", "Steve Jobs — reductive, reverent conviction"],
    ["tony-soprano", "Tony Soprano — blunt, North-Jersey menace"],
    ["don-draper", "Don Draper — mid-century pitch cadence"],
    ["bill-burr", "Bill Burr — frustrated everyman rant"],
    ["naval-ravikant", "Naval Ravikant — aphoristic, leverage-aware"],
    ["david-goggins", "David Goggins — confrontational accountability"],
    ["jocko-willink", "Jocko Willink — disciplined command voice"],
    ["mr-rogers", "Mr. Rogers — gentle, radically kind"],
    ["samuel-jackson", "Samuel L. Jackson — emphatic indignation"],
    ["mark-twain", "Mark Twain — wry, folksy demolition"],
    ["robert-greene", "Robert Greene — 48 Laws power-strategist"],
    ["robert-cialdini", "Robert Cialdini — 6 principles of influence"],
    ["aetheris-strategist", "Aetheris Strategist — Greene + Cialdini + Godin"],
  ];

  const LENGTHS = [
    ["auto", "Auto (fit the platform)"],
    ["one-liner", "One-liner (≤ 1 sentence)"],
    ["short", "Short (2-3 sentences)"],
    ["medium", "Medium (1 paragraph)"],
    ["long", "Long (2-3 paragraphs)"],
  ];

  // ============ helpers ============
  function detectPlatform() {
    const h = location.hostname;
    if (h.includes("linkedin.com")) return "linkedin";
    if (h.includes("x.com") || h.includes("twitter.com")) return "x";
    if (h.includes("reddit.com")) return "reddit";
    return "generic";
  }

  function isEditable(el) {
    if (!el) return false;
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT" && /^(text|search|url|email)$/i.test(el.type)) return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function getSelectionText(el) {
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value || "";
    if (el.isContentEditable) return el.innerText || "";
    return "";
  }

  function insertInto(el, text) {
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (el.isContentEditable) {
      el.focus();
      document.execCommand("selectAll", false);
      document.execCommand("insertText", false, text);
    }
  }

  function nearestThreadContext(el) {
    let node = el.parentElement;
    for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
      const role = node.getAttribute?.("role");
      if (role === "article" || node.tagName === "ARTICLE" || node.dataset?.testid?.includes("cellInnerDiv")) break;
    }
    node = node || el.parentElement;
    const t = (node?.innerText || "").trim().replace(/\s+/g, " ").slice(0, 1200);
    return t;
  }

  let fab = null;
  let panel = null;
  let target = null;

  function removeFab() { fab?.remove(); fab = null; }
  function removePanel() { panel?.remove(); panel = null; }

  function positionNear(el, node) {
    const r = el.getBoundingClientRect();
    node.style.top = `${Math.max(8, window.scrollY + r.top - 36)}px`;
    node.style.left = `${window.scrollX + r.right - node.offsetWidth}px`;
  }

  async function getCode() {
    const { bvCode } = await chrome.storage.local.get(["bvCode"]);
    return bvCode || null;
  }

  function optsHTML(list, selected) {
    return list
      .map(([v, l]) => `<option value="${v}" ${v === selected ? "selected" : ""}>${l.replace(/</g, "&lt;")}</option>`)
      .join("");
  }

  async function openPanel() {
    removePanel();
    const {
      bvTone = "auto",
      bvStyle = "auto",
      bvPersona = "none",
      bvLength = "auto",
      bvHumanize = true,
    } = await chrome.storage.local.get(["bvTone", "bvStyle", "bvPersona", "bvLength", "bvHumanize"]);

    panel = document.createElement("div");
    panel.className = "bv-panel";
    panel.innerHTML = `
      <div class="bv-head">
        <div class="bv-kicker">§ Aetheris Voice Engine</div>
        <button class="bv-x" id="bv-close" title="Close">×</button>
      </div>
      <div class="bv-plat">Drafting for <b>${detectPlatform()}</b></div>

      <div class="bv-field">
        <label>Tone</label>
        <select id="bv-tone">${optsHTML(TONES, bvTone)}</select>
      </div>
      <div class="bv-field">
        <label>Style / Structure</label>
        <select id="bv-style">${optsHTML(STYLES, bvStyle)}</select>
      </div>
      <div class="bv-field">
        <label>Persona</label>
        <select id="bv-persona">${optsHTML(PERSONAS, bvPersona)}</select>
      </div>
      <div class="bv-field">
        <label>Length</label>
        <select id="bv-length">${optsHTML(LENGTHS, bvLength)}</select>
      </div>

      <label class="bv-check">
        <input type="checkbox" id="bv-human" ${bvHumanize ? "checked" : ""}/>
        <span>Human texture (tiny natural imperfections)</span>
      </label>

      <div class="bv-field">
        <label>Direction (optional)</label>
        <textarea id="bv-intent" placeholder="Angle, stance, must-include, or what you want to say…"></textarea>
      </div>

      <div class="bv-row">
        <button id="bv-go" class="bv-primary">Draft</button>
      </div>
      <div id="bv-out"></div>
    `;
    document.body.appendChild(panel);

    // position under the textarea, clamp to viewport
    const r = target.getBoundingClientRect();
    let top = window.scrollY + r.bottom + 8;
    let left = window.scrollX + r.left;
    const pw = 360, ph = 560;
    if (left + pw > window.scrollX + window.innerWidth) left = window.scrollX + window.innerWidth - pw - 12;
    if (top + ph > window.scrollY + window.innerHeight) top = Math.max(window.scrollY + 8, window.scrollY + r.top - ph - 8);
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;

    panel.querySelector("#bv-close").addEventListener("click", removePanel);
    panel.querySelector("#bv-go").addEventListener("click", () => runDraft());
  }

  async function runDraft() {
    const code = await getCode();
    const out = panel.querySelector("#bv-out");
    if (!code) {
      out.innerHTML = `<div class="bv-err">No activation code. Open the extension icon → activate first.</div>`;
      return;
    }
    const intent = panel.querySelector("#bv-intent").value.trim();
    const tone = panel.querySelector("#bv-tone").value;
    const style = panel.querySelector("#bv-style").value;
    const persona = panel.querySelector("#bv-persona").value;
    const length = panel.querySelector("#bv-length").value;
    const humanize = panel.querySelector("#bv-human").checked;

    chrome.storage.local.set({
      bvTone: tone, bvStyle: style, bvPersona: persona, bvLength: length, bvHumanize: humanize,
    });

    const selection = getSelectionText(target).slice(0, 2000);
    const pageCtx = nearestThreadContext(target);
    const btn = panel.querySelector("#bv-go");
    btn.disabled = true; btn.textContent = "Drafting…";
    out.innerHTML = `<div class="bv-loading">Reading the thread and drafting on-brand…</div>`;
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON, "Authorization": `Bearer ${ANON}` },
        body: JSON.stringify({
          action: "draft",
          code,
          platform: detectPlatform(),
          intent,
          selection,
          pageContext: pageCtx,
          mode: selection ? "reply" : "post",
          tone: tone === "auto" ? "" : tone,
          style: style === "auto" ? "" : style,
          persona: persona === "none" ? "" : persona,
          length: length === "auto" ? "" : length,
          humanize,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data?.error || "Draft failed");
      renderDraft(out, data.draft);
    } catch (e) {
      out.innerHTML = `<div class="bv-err">${(e && e.message) || "Draft failed"}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = "Draft";
    }
  }

  function renderDraft(out, text) {
    out.innerHTML = "";
    const box = document.createElement("div");
    box.className = "bv-draft";
    box.textContent = text;
    out.appendChild(box);

    const meta = document.createElement("div");
    meta.className = "bv-meta";
    meta.textContent = `${text.length} chars`;
    out.appendChild(meta);

    const row = document.createElement("div"); row.className = "bv-row";
    const use = document.createElement("button");
    use.className = "bv-primary";
    use.textContent = "Insert";
    use.addEventListener("click", () => { insertInto(target, text); removePanel(); });

    const copy = document.createElement("button");
    copy.className = "bv-ghost";
    copy.textContent = "Copy";
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(text); copy.textContent = "Copied ✓"; setTimeout(() => copy.textContent = "Copy", 1200); } catch {}
    });

    const regen = document.createElement("button");
    regen.className = "bv-ghost";
    regen.textContent = "Redraft";
    regen.addEventListener("click", runDraft);

    row.appendChild(use); row.appendChild(copy); row.appendChild(regen);
    out.appendChild(row);
  }

  function showFabFor(el) {
    target = el;
    removeFab();
    fab = document.createElement("button");
    fab.type = "button";
    fab.className = "bv-fab";
    fab.textContent = "✦ Brand Voice";
    document.body.appendChild(fab);
    positionNear(el, fab);
    fab.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); openPanel(); });
  }

  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (!isEditable(el)) return;
    const r = el.getBoundingClientRect?.();
    if (r && r.height < 32 && detectPlatform() === "generic") return;
    showFabFor(el);
  });

  document.addEventListener("focusout", () => {
    setTimeout(() => {
      const a = document.activeElement;
      if (a && (a === fab || panel?.contains(a))) return;
      if (!target || !document.contains(target)) removeFab();
    }, 200);
  });

  window.addEventListener("scroll", () => { if (fab && target) positionNear(target, fab); }, { passive: true });
  window.addEventListener("resize", () => { if (fab && target) positionNear(target, fab); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { removePanel(); } });
})();

// Brand Voice content script — attaches a floating "Brand Voice" button
// next to any focused textarea / contenteditable, and asks the backend
// to draft a reply/post in the buyer's brand voice.

(function () {
  if (window.__BV_LOADED__) return;
  window.__BV_LOADED__ = true;

  const ENDPOINT = "https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/extension-brand-voice";
  const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs";

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
    // Cheap heuristic: grab up to ~1200 chars of visible text from the
    // nearest article/post ancestor, minus the composer itself.
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

  function openPanel() {
    removePanel();
    panel = document.createElement("div");
    panel.className = "bv-panel";
    panel.innerHTML = `
      <h4>Draft in brand voice · ${detectPlatform()}</h4>
      <textarea id="bv-intent" placeholder="What do you want to say? (optional)"></textarea>
      <div class="row">
        <button id="bv-go">Draft</button>
        <button id="bv-close" class="ghost">Close</button>
      </div>
      <div id="bv-out"></div>
    `;
    document.body.appendChild(panel);
    const r = target.getBoundingClientRect();
    panel.style.top = `${window.scrollY + r.bottom + 8}px`;
    panel.style.left = `${window.scrollX + r.left}px`;
    if (r.left + 340 > window.innerWidth) panel.style.left = `${window.scrollX + window.innerWidth - 350}px`;

    panel.querySelector("#bv-close").addEventListener("click", removePanel);
    panel.querySelector("#bv-go").addEventListener("click", () => runDraft());
  }

  async function runDraft() {
    const code = await getCode();
    const out = panel.querySelector("#bv-out");
    if (!code) {
      out.innerHTML = `<div class="err">No activation code. Open the extension icon → activate first.</div>`;
      return;
    }
    const intent = panel.querySelector("#bv-intent").value.trim();
    const selection = getSelectionText(target).slice(0, 2000);
    const pageCtx = nearestThreadContext(target);
    const btn = panel.querySelector("#bv-go");
    btn.disabled = true; btn.textContent = "Drafting…";
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
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data?.error || "Draft failed");
      out.innerHTML = "";
      const box = document.createElement("div");
      box.className = "draft";
      box.textContent = data.draft;
      out.appendChild(box);
      const row = document.createElement("div"); row.className = "row";
      const use = document.createElement("button"); use.textContent = "Insert into field";
      use.addEventListener("click", () => { insertInto(target, data.draft); removePanel(); });
      const regen = document.createElement("button"); regen.className = "ghost"; regen.textContent = "Redraft";
      regen.addEventListener("click", runDraft);
      row.appendChild(use); row.appendChild(regen);
      out.appendChild(row);
    } catch (e) {
      out.innerHTML = `<div class="err">${e.message}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = "Draft";
    }
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
    // Ignore very small inputs (search bars etc) unless on supported platforms
    const r = el.getBoundingClientRect?.();
    if (r && r.height < 32 && detectPlatform() === "generic") return;
    showFabFor(el);
  });

  document.addEventListener("focusout", (e) => {
    // Give the fab a moment; if focus moves to fab/panel, keep it.
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

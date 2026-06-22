// Aetheris Forensic Cockpit — side panel controller (v0.4)
import { hasInPageFix } from "./fixRegistry.js";

const SUPABASE_URL = "https://ihdjpxhcaiaixmqxyqoe.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs";

// ---------------- State ----------------
const state = {
  tab: "scan",
  activeUrl: "",
  activeHost: "",
  lastScan: null,
  lastDossier: null,
  overlayOn: false,
  mode: "observe",
  history: [],
  autopsy: null,
  caseFiles: {},
  compare: new Set(),
  revertById: new Map(), // leakId → revertId returned by content.js
};
const $ = (id) => document.getElementById(id);

// ---------------- Background relay ----------------
function relayToTab(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "AETHERIS_RELAY_TO_TAB", payload }, (r) => resolve(r || { error: "no reply" }));
  });
}
function getActiveTab() { return new Promise((r) => chrome.runtime.sendMessage({ type: "AETHERIS_GET_ACTIVE_TAB" }, (x) => r(x || {}))); }
function captureViewport() { return new Promise((r) => chrome.runtime.sendMessage({ type: "AETHERIS_CAPTURE_VIEWPORT" }, (x) => r(x || {}))); }

// ---------------- Tabs ----------------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
    state.tab = btn.dataset.tab;
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${state.tab}`));
    if (state.tab === "case") (typeof resetCaseView === "function" ? resetCaseView() : renderCaseList());
    if (state.tab === "fix") renderFix();
  });
});
// Growth sub-tabs
document.querySelectorAll(".gt").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".gt").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".gpanel").forEach((p) => p.classList.toggle("active", p.id === `gpanel-${btn.dataset.gt}`));
  });
});

// ---------------- Header tracking ----------------
async function refreshHeader() {
  const t = await getActiveTab();
  if (t?.url) {
    try { state.activeHost = new URL(t.url).hostname.replace(/^www\./, ""); } catch { state.activeHost = ""; }
    state.activeUrl = t.url;
  }
}
chrome.runtime.onMessage.addListener((m) => { if (m?.type === "AETHERIS_TAB_CHANGED") refreshHeader(); });
refreshHeader();

// ---------------- Case file persistence ----------------
async function loadCaseFiles() {
  const { caseFiles } = await chrome.storage.local.get("caseFiles");
  state.caseFiles = caseFiles || {};
}
async function saveCaseFile(scan) {
  const host = scan.host; if (!host) return;
  const entry = state.caseFiles[host] || { history: [], fixes: [], autopsies: [] };
  entry.lastScan = scan;
  entry.history = [...(entry.history || []).slice(-9), { score: scan.score, grade: scan.grade, scannedAt: scan.scannedAt }];
  state.caseFiles[host] = entry;
  await chrome.storage.local.set({ caseFiles: state.caseFiles });
}
loadCaseFiles();

// ---------------- SCAN ----------------
function switchTab(tab) {
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (btn) btn.click();
}

async function runScanFlow({ silent = false } = {}) {
  $("scan-results").innerHTML = `<div class="empty">Scanning…</div>`;
  $("scan-dossier").innerHTML = "";
  $("scan-extra").innerHTML = "";
  const co = $("scan-contacts-out"); if (co) co.innerHTML = "";
  state.lastDossier = null;
  const revertIds = Array.from(state.revertById.values());
  await Promise.allSettled(revertIds.map((revertId) => relayToTab({ type: "AETHERIS_REVERT_FIX", revertId })));
  state.revertById.clear();
  const res = await relayToTab({ type: "AETHERIS_SCAN" });
  if (res?.error) { $("scan-results").innerHTML = `<div class="bubble err">${escapeHtml(res.error)}</div>`; return res; }
  state.lastScan = res;
  await saveCaseFile(res);
  renderScan();
  renderOperatorLiveActions();
  if (state.overlayOn) drawOverlay();
  if (!silent) toast("Scan complete.");
  return res;
}

async function clearScan({ silent = false } = {}) {
  const revertIds = Array.from(state.revertById.values());
  await Promise.allSettled(revertIds.map((revertId) => relayToTab({ type: "AETHERIS_REVERT_FIX", revertId })));
  state.lastScan = null;
  state.lastDossier = null;
  state.revertById.clear();
  state.overlayOn = false;
  await relayToTab({ type: "AETHERIS_OVERLAY_CLEAR" });
  $("overlay-toggle").style.background = "transparent";
  $("overlay-toggle").style.color = "var(--fg)";
  $("scan-meta").classList.add("hidden");
  $("scan-meta").innerHTML = "";
  $("scan-dossier").innerHTML = "";
  $("scan-extra").innerHTML = "";
  $("scan-results").innerHTML = `<div class="empty">Cleared. Run a fresh forensic scan when ready.</div>`;
  $("fix-empty").classList.remove("hidden");
  $("fix-list").innerHTML = "";
  renderOperatorLiveActions();
  if (!silent) toast("Scan cleared.");
}

async function runDetectiveFlow() {
  if (!state.lastScan) return alert("Run a scan first.");
  const traceSteps = [
    "Capturing viewport…",
    "Parsing visible DOM text…",
    "Cross-referencing Pass A signals…",
    "Profiling the suspect (your funnel)…",
    "Building motive + evidence chain…",
    "Estimating annual leak exposure…",
    "Writing the dossier…",
  ];
  $("scan-dossier").innerHTML = `
    <div class="dossier loading">
      <div class="dossier-head">
        <span class="badge">Detective Mode</span>
        <span class="thinking"><span class="d"></span><span class="d"></span><span class="d"></span><span class="d"></span> Thinking</span>
      </div>
      <div class="thinking-trace" id="det-trace"></div>
    </div>`;
  const traceEl = $("det-trace");
  let traceIdx = 0;
  const traceTimer = setInterval(() => {
    if (traceIdx >= traceSteps.length) return;
    const line = document.createElement("div");
    line.className = "line"; line.textContent = "› " + traceSteps[traceIdx++];
    traceEl.appendChild(line);
  }, 650);
  const extract = await relayToTab({ type: "AETHERIS_EXTRACT" });
  const cap = await captureViewport();
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/extension-leak-scan-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        url: state.activeUrl, host: state.activeHost,
        pageText: extract?.pageText || "", screenshot: cap?.dataUrl || null,
        passA: state.lastScan,
      }),
    });
    const data = await r.json();
    clearInterval(traceTimer);
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    state.lastDossier = data;
    if (Array.isArray(data.leaks)) state.lastScan.leaks = [...state.lastScan.leaks, ...data.leaks];
    if (data.summary) state.lastScan.summary = data.summary;
    await saveCaseFile(state.lastScan);
    renderDossier();
    renderScan();
  } catch (e) {
    clearInterval(traceTimer);
    $("scan-dossier").innerHTML = `<div class="bubble err">Detective Mode failed: ${e.message}</div>`;
  }
}

$("scan-run").addEventListener("click", () => runScanFlow());
$("scan-clear").addEventListener("click", () => clearScan());
$("scan-deepen").addEventListener("click", () => runDetectiveFlow());

function renderDossier() {
  const d = state.lastDossier; if (!d) { $("scan-dossier").innerHTML = ""; return; }
  const fmt$ = (n) => "$" + (Math.round((n || 0) / 100) * 100).toLocaleString("en-US");
  const value = d.leakValueUSD ? `${fmt$(d.leakValueUSD.low)} – ${fmt$(d.leakValueUSD.high)} / yr` : "—";
  const ev = (d.dossier?.evidence || []).map((e) => `<li>${escapeHtml(e)}</li>`).join("");
  $("scan-dossier").innerHTML = `
    <div class="dossier">
      <div class="dossier-head">
        <span class="badge">Case File · ${escapeHtml(state.activeHost)}</span>
        <span class="leak-value">${escapeHtml(value)}</span>
      </div>
      ${d.summary ? `<div class="dossier-summary">${escapeHtml(d.summary)}</div>` : ""}
      ${d.dossier ? `
        <dl class="dossier-grid">
          <dt>Suspect</dt><dd>${escapeHtml(d.dossier.suspect || "—")}</dd>
          <dt>Motive</dt><dd>${escapeHtml(d.dossier.motive || "—")}</dd>
          <dt>Evidence</dt><dd><ul class="ev">${ev || "<li>—</li>"}</ul></dd>
          <dt>Verdict</dt><dd>${escapeHtml(d.dossier.verdict || "—")}</dd>
          <dt>Confession</dt><dd class="confession">${escapeHtml(d.dossier.confession || "—")}</dd>
        </dl>` : ""}
      ${d.priorityFix ? `<div class="priority"><b>Ship this week:</b> ${escapeHtml(d.priorityFix)}</div>` : ""}
      ${d.leadImpact ? `
        <div class="lead-impact" style="margin-top:8px;padding:8px;border:1px solid rgba(220,38,38,.4);background:rgba(220,38,38,.06);border-radius:6px">
          <div style="font-family:monospace;font-size:10px;text-transform:uppercase;color:#dc2626;margin-bottom:4px">Lead Drop-Off</div>
          <div style="font-size:12px;line-height:1.5">
            <div><b style="color:#dc2626">Losing</b> ${escapeHtml(d.leadImpact.currentLeadsLostPerMonth || "—")}</div>
            <div><b style="color:#10b981">Recoverable</b> ${escapeHtml(d.leadImpact.recoverableLeadsPerMonth || "—")}</div>
            <div style="color:#9ca3af">${escapeHtml(d.leadImpact.dollarPerLead || "")}</div>
            ${d.leadImpact.assumptionsNote ? `<div style="font-size:10px;color:#9ca3af;font-style:italic;margin-top:2px">${escapeHtml(d.leadImpact.assumptionsNote)}</div>` : ""}
          </div>
        </div>` : ""}
      ${d.repScript ? renderRepScript(d.repScript) : ""}
      <div class="action-bank">
        <div class="action-bank-title">Available controls</div>
        <button class="primary" data-op-action="fixes">Open fix buttons</button>
        <button class="ghost" data-op-action="overlay">Show X-ray</button>
        <button class="ghost" data-op-action="undo">Undo last fix</button>
      </div>
    </div>
  `;
  wireOperatorActionButtons($("scan-dossier"));
  wireRepScriptCopy($("scan-dossier"));
}

function renderRepScript(rs) {
  const block = (label, text) => text ? `
    <details style="margin-top:6px;border:1px solid rgba(245,158,11,.3);border-radius:6px;background:rgba(245,158,11,.06)">
      <summary style="cursor:pointer;padding:6px 8px;font-family:monospace;font-size:10px;text-transform:uppercase;color:#f59e0b;display:flex;justify-content:space-between;align-items:center">
        <span>${escapeHtml(label)}</span>
        <button class="ghost" data-copy-script="${escapeAttr(text)}" style="font-size:10px;padding:2px 6px">Copy</button>
      </summary>
      <div style="padding:8px;font-size:12px;white-space:pre-wrap;color:#e5e7eb">${escapeHtml(text)}</div>
    </details>` : "";
  const qList = Array.isArray(rs.discovery_questions) && rs.discovery_questions.length
    ? `<details style="margin-top:6px;border:1px solid rgba(245,158,11,.3);border-radius:6px;background:rgba(245,158,11,.06)">
        <summary style="cursor:pointer;padding:6px 8px;font-family:monospace;font-size:10px;text-transform:uppercase;color:#f59e0b">Discovery Questions</summary>
        <ul style="padding:8px 8px 8px 22px;font-size:12px;color:#e5e7eb">${rs.discovery_questions.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ul>
       </details>` : "";
  const oList = Array.isArray(rs.objection_handles) && rs.objection_handles.length
    ? `<details style="margin-top:6px;border:1px solid rgba(245,158,11,.3);border-radius:6px;background:rgba(245,158,11,.06)">
        <summary style="cursor:pointer;padding:6px 8px;font-family:monospace;font-size:10px;text-transform:uppercase;color:#f59e0b">Objection Handles</summary>
        <ul style="padding:8px 8px 8px 22px;font-size:12px;color:#e5e7eb">${rs.objection_handles.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ul>
       </details>` : "";
  return `
    <div style="margin-top:8px;padding:8px;border:2px solid rgba(245,158,11,.6);background:rgba(245,158,11,.1);border-radius:6px">
      <div style="font-family:monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#f59e0b;margin-bottom:4px">// REP TALK TRACK</div>
      ${block("Cold Call Opener", rs.cold_call_opener)}
      ${block("Voicemail", rs.voicemail)}
      ${block("Cold Email", rs.cold_email)}
      ${block("LinkedIn DM", rs.linkedin_dm)}
      ${block("In-Person / Zoom Pitch", rs.in_person_pitch)}
      ${block("The Close Ask", rs.close_ask)}
      ${qList}
      ${oList}
    </div>`;
}

function wireRepScriptCopy(root) {
  if (!root) return;
  root.querySelectorAll("[data-copy-script]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const txt = b.getAttribute("data-copy-script") || "";
      navigator.clipboard.writeText(txt).then(
        () => { const t = b.textContent; b.textContent = "✓ Copied"; setTimeout(() => { b.textContent = t; }, 1200); },
        () => { b.textContent = "Copy failed"; }
      );
    });
  });
}

function renderScan() {
  const s = state.lastScan; if (!s) return;
  const meta = $("scan-meta");
  meta.classList.remove("hidden");
  meta.innerHTML = `
    <span>HOST <b>${escapeHtml(s.host)}</b></span>
    <span>SCORE <b class="score">${s.score}</b></span>
    <span>GRADE <b class="grade-${s.grade}">${s.grade}</b></span>
    <span>LEAKS <b>${s.leaks.length}</b></span>
    <span>WEIGHT <b>${s.weightKB || "?"} KB</b></span>
    <span>TAGS <b>${(s.trackersPresent || []).join(", ") || "—"}</b></span>
  `;
  const out = $("scan-results");
  if (!s.leaks.length) { out.innerHTML = `<div class="empty">Clean. No deterministic leaks found.</div>`; return; }
  out.innerHTML = s.leaks.map((l, i) => {
    const fixable = hasInPageFix(l);
    const revertId = state.revertById.get(l.id);
    return `
    <div class="leak ${l.severity}" data-leak-id="${escapeAttr(l.id)}">
      <div class="leak-head">
        <div class="leak-title">${i + 1}. ${escapeHtml(l.title)}</div>
        <div class="leak-cat">${escapeHtml(l.category)} · ${l.severity}</div>
      </div>
      <div class="leak-why">${escapeHtml(l.why || "")}</div>
      <div class="leak-fix"><b>FIX:</b> ${escapeHtml(l.fix || "")}</div>
      <div class="leak-actions">
        ${l.selectors?.length ? `<button class="ghost" data-focus="${escapeAttr(l.selectors[0])}" title="Snap the live page to this area">📍 Snap to area</button>` : ""}
        <button class="ghost" data-read="${escapeAttr(l.id)}" title="Read this finding aloud">🔊 Read</button>
        ${hasInPageFix(l) && !state.revertById.get(l.id) ? `<button class="primary" data-apply="${escapeAttr(l.id)}">Fix in-page</button>` : ""}
        ${revertId ? `<button class="ghost" data-revert="${escapeAttr(l.id)}">↶ Undo</button><span class="applied">✓ Applied</span>` : ""}
        ${!fixable ? `<span class="fix-unavailable">Manual fix</span>` : ""}
        <button class="ghost" data-fix-tab="${escapeAttr(l.id)}">View fix buttons</button>
        <div class="more-menu">
          <button class="ghost more-btn" data-more="${escapeAttr(l.id)}">More ▾</button>
        </div>
      </div>
    </div>`;
  }).join("");
  wireScanActions();
}

function wireScanActions() {
  const out = $("scan-results");
  out.querySelectorAll("[data-focus]").forEach((b) => b.addEventListener("click", () => relayToTab({ type: "AETHERIS_OVERLAY_FOCUS", selector: b.dataset.focus })));
  out.querySelectorAll("[data-read]").forEach((b) => b.addEventListener("click", () => window.__aetherisReadLeak(b.dataset.read)));
  out.querySelectorAll("[data-apply]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.apply;
    b.disabled = true; b.textContent = "Applying…";
    const r = await applyLeakFix(id);
    if (!r?.ok) {
      b.disabled = false; b.textContent = "Fix in-page";
      alert(r?.error || "Fix failed.");
    }
  }));
  out.querySelectorAll("[data-revert]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.revert;
    const revertId = state.revertById.get(id);
    if (!revertId) return;
    const r = await relayToTab({ type: "AETHERIS_REVERT_FIX", revertId });
    if (r?.ok) { state.revertById.delete(id); toast("Reverted."); renderScan(); }
    else alert(r?.error || "Revert failed.");
  }));
  out.querySelectorAll("[data-fix-tab]").forEach((b) => b.addEventListener("click", () => {
    switchTab("fix");
    const card = document.querySelector(`#fix-list [data-fix-card="${CSS.escape(b.dataset.fixTab)}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }));
  out.querySelectorAll("[data-more]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const id = b.dataset.more;
    const leak = state.lastScan.leaks.find((x) => x.id === id);
    openMoreMenu(b, leak);
  }));
}

async function applyLeakFix(id, opts = {}) {
  const leak = state.lastScan?.leaks?.find((x) => x.id === id);
  if (!leak) return { ok: false, error: "Leak not found." };
  // Snap the live page to the area we're about to change so the user sees it happen
  const sel = leak.selectors?.[0];
  if (sel) { try { await relayToTab({ type: "AETHERIS_OVERLAY_FOCUS", selector: sel }); } catch {} }
  const r = await relayToTab({ type: "AETHERIS_APPLY_FIX", leak });
  if (r?.ok) {
    state.revertById.set(id, r.revertId);
    if (!opts.silent) toast(r.message || "Fix applied to live page.");
    if (!opts.skipRender) { renderScan(); renderFix(); renderOperatorLiveActions(); }
  }
  return r;
}

async function revertLeakFix(id) {
  const revertId = state.revertById.get(id);
  if (!revertId) return { ok: false, error: "Nothing to undo for this leak." };
  const r = await relayToTab({ type: "AETHERIS_REVERT_FIX", revertId });
  if (r?.ok) {
    state.revertById.delete(id);
    toast("Reverted.");
    renderScan();
    renderFix();
    renderOperatorLiveActions();
  }
  return r;
}

async function undoLastFix() {
  const lastId = Array.from(state.revertById.keys()).pop();
  if (!lastId) return toast("No applied fix to undo.");
  const r = await revertLeakFix(lastId);
  if (!r?.ok) alert(r?.error || "Undo failed.");
}

function openMoreMenu(anchor, leak) {
  document.querySelectorAll(".menu-pop").forEach((m) => m.remove());
  const menu = document.createElement("div");
  menu.className = "menu-pop";
  const subPages = ["/", "/about", "/pricing", "/contact", "/blog", "/services"];
  menu.innerHTML = `
    <button data-act="copy-fix">Copy fix text</button>
    <button data-act="copy-leak">Copy leak as JSON</button>
    <button data-act="open-tab">Open page in new tab</button>
    <button data-act="open-devtools">Inspect element (console hint)</button>
    <hr style="border:0;border-top:1px solid var(--line);margin:4px 0" />
    <div style="padding:6px 10px;font:600 10px var(--mono);color:var(--muted);letter-spacing:.1em">SCAN SUB-PAGE</div>
    ${subPages.map((p) => `<button data-scan-sub="${p}">→ ${p}</button>`).join("")}
  `;
  document.body.appendChild(menu);
  // Position in viewport, anchored to the More button, kept inside the panel.
  const r = anchor.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  // Render hidden first to measure
  menu.style.visibility = "hidden";
  menu.style.left = "0px";
  menu.style.top = "0px";
  const mw = Math.min(menu.offsetWidth, vw - 16);
  const mh = menu.offsetHeight;
  let left = Math.min(r.right - mw, vw - mw - 8);
  if (left < 8) left = 8;
  let top = r.bottom + 4;
  if (top + mh > vh - 8) top = Math.max(8, r.top - mh - 4);
  menu.style.left = left + "px";
  menu.style.top = top + "px";
  menu.style.width = mw + "px";
  menu.style.visibility = "visible";
  menu.addEventListener("click", async (e) => {
    const btn = e.target.closest("button"); if (!btn) return;
    const act = btn.dataset.act; const sub = btn.dataset.scanSub;
    if (act === "copy-fix") { await navigator.clipboard.writeText(leak.fix || ""); toast("Fix copied."); }
    else if (act === "copy-leak") { await navigator.clipboard.writeText(JSON.stringify(leak, null, 2)); toast("Leak JSON copied."); }
    else if (act === "open-tab") { chrome.tabs.create({ url: state.activeUrl }); }
    else if (act === "open-devtools") {
      const sel = leak.selectors?.[0] || "";
      await navigator.clipboard.writeText(`document.querySelector(${JSON.stringify(sel)})`);
      toast("Inspector snippet copied. Paste in DevTools console.");
    }
    else if (sub) {
      try {
        const base = new URL(state.activeUrl);
        const target = new URL(sub, base).toString();
        chrome.tabs.create({ url: target, active: true });
        toast(`Opening ${sub} — re-run scan there.`);
      } catch { toast("Could not resolve sub-page."); }
    }
    menu.remove();
  });
  setTimeout(() => {
    document.addEventListener("click", () => menu.remove(), { once: true });
  }, 0);
}

// ---------------- Overlay ----------------
$("overlay-toggle").addEventListener("click", async () => {
  state.overlayOn = !state.overlayOn;
  $("overlay-toggle").style.background = state.overlayOn ? "var(--amber)" : "transparent";
  $("overlay-toggle").style.color = state.overlayOn ? "#0a0a0a" : "var(--fg)";
  if (state.overlayOn) drawOverlay(); else relayToTab({ type: "AETHERIS_OVERLAY_CLEAR" });
});
function drawOverlay() {
  if (!state.lastScan) return;
  relayToTab({ type: "AETHERIS_OVERLAY_DRAW", leaks: state.lastScan.leaks });
}

// ---------------- OPERATOR ----------------
document.querySelectorAll("#operator-controls [data-op-action]").forEach((b) => b.addEventListener("click", () => runOperatorAction(b.dataset.opAction)));

function renderOperatorLiveActions() {
  const box = $("operator-live-actions");
  if (!box) return;
  if (!state.lastScan) {
    box.classList.remove("hidden");
    box.innerHTML = `<div class="muted">No active scan.</div><button class="primary" data-op-action="scan">Run scan now</button>`;
  } else {
    const fixable = state.lastScan.leaks.filter((l) => hasInPageFix(l) && !state.revertById.has(l.id)).slice(0, 4);
    box.classList.remove("hidden");
    box.innerHTML = `
      <div class="muted">${escapeHtml(state.lastScan.host)} · ${state.lastScan.leaks.length} leaks · ${fixable.length} one-click fixes ready</div>
      <button class="primary" data-op-action="fixes">Open fix buttons</button>
      <button class="ghost" data-op-action="detective">Run Detective</button>
      <button class="ghost" data-op-action="overlay">Toggle X-ray</button>
      ${fixable.map((l) => `<button class="ghost" data-apply="${escapeAttr(l.id)}">Fix: ${escapeHtml(String(l.title || "leak").slice(0, 24))}</button>`).join("")}
    `;
  }
  wireOperatorActionButtons(box);
}

async function runOperatorAction(action) {
  if (action === "scan") { switchTab("scan"); await runScanFlow(); return; }
  if (action === "detective") { switchTab("scan"); await runDetectiveFlow(); return; }
  if (action === "fixes") { switchTab("fix"); renderFix(); return; }
  if (action === "overlay") { $("overlay-toggle").click(); return; }
  if (action === "undo") { await undoLastFix(); return; }
  if (action === "clear") { await clearScan(); return; }
}

function wireOperatorActionButtons(root = document) {
  root.querySelectorAll("[data-op-action]").forEach((b) => b.addEventListener("click", () => runOperatorAction(b.dataset.opAction)));
  root.querySelectorAll("[data-apply]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true; b.textContent = "Applying…";
    const r = await applyLeakFix(b.dataset.apply);
    if (!r?.ok) { b.disabled = false; b.textContent = "Fix in-page"; alert(r?.error || "Fix failed."); }
  }));
  root.querySelectorAll("[data-focus]").forEach((b) => b.addEventListener("click", () => relayToTab({ type: "AETHERIS_OVERLAY_FOCUS", selector: b.dataset.focus })));
}

function decorateOperatorBubble(bubble, reply = "") {
  const actions = document.createElement("div");
  actions.className = "bubble-actions";
  const lower = reply.toLowerCase();
  const fixable = state.lastScan?.leaks?.filter((l) => hasInPageFix(l) && !state.revertById.has(l.id)) || [];
  const applied = state.revertById.size;
  const buttons = [];
  if (!state.lastScan) buttons.push(`<button class="primary" data-op-action="scan">Run scan</button>`);
  if (state.lastScan) buttons.push(`<button class="ghost" data-op-action="fixes">Open fix buttons</button>`);
  if (state.lastScan && (lower.includes("fix") || lower.includes("leak") || lower.includes("cta") || lower.includes("headline"))) {
    fixable.slice(0, 3).forEach((l) => buttons.push(`<button class="primary" data-apply="${escapeAttr(l.id)}">Fix: ${escapeHtml(String(l.title || "leak").slice(0, 22))}</button>`));
  }
  if (state.lastScan) buttons.push(`<button class="ghost" data-op-action="overlay">Show X-ray</button>`);
  if (applied) buttons.push(`<button class="ghost" data-op-action="undo">Undo last</button>`);
  buttons.push(`<button class="ghost" data-op-action="clear">Clear</button>`);
  actions.innerHTML = buttons.join("");
  bubble.appendChild(actions);
  wireOperatorActionButtons(actions);
}

document.querySelectorAll("#op-chips .chip").forEach((b) => {
  b.addEventListener("click", () => {
    $("chat-input").value = b.dataset.prompt || "";
    $("chat-input").focus();
  });
});

$("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("chat-input");
  const text = input.value.trim(); if (!text) return;
  input.value = "";
  appendBubble("user", text);
  if (await handleOperatorCommand(text)) return;
  const extract = await relayToTab({ type: "AETHERIS_EXTRACT" });
  const cap = await captureViewport();
  appendBubble("ai", "…");
  const last = $("chat-log").querySelector(".bubble.ai:last-of-type");
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/extension-operator-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        userText: text, pageUrl: extract?.url || state.activeUrl, pageText: extract?.pageText || "",
        screenshot: cap?.dataUrl || null, history: state.history.slice(-8),
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    last.textContent = data.reply || "(empty)";
    decorateOperatorBubble(last, data.reply || "");
    state.history.push({ role: "user", content: text }, { role: "assistant", content: data.reply || "" });
  } catch (err) {
    last.classList.replace("ai", "err");
    last.textContent = `Operator failed: ${err.message}`;
  }
});

async function handleOperatorCommand(text) {
  const t = text.toLowerCase();
  const wants = (...words) => words.some((w) => t.includes(w));
  if (wants("start over", "clear scan", "reset scan", "clear all")) {
    appendBubble("ai", "Clearing the scan, overlay, and any preview fixes now.");
    await clearScan();
    return true;
  }
  if (wants("run scan", "scan this", "scan page", "new scan")) {
    appendBubble("ai", "Running the forensic scan now.");
    switchTab("scan");
    await runScanFlow();
    return true;
  }
  if (wants("detective", "deepen", "case file")) {
    appendBubble("ai", "Running Detective Mode now.");
    switchTab("scan");
    await runDetectiveFlow();
    return true;
  }
  if (wants("show fixes", "fix buttons", "open fixes", "fix tab")) {
    appendBubble("ai", "Opening the fix controls now.");
    switchTab("fix");
    renderFix();
    return true;
  }
  if (wants("x-ray", "xray", "overlay", "show me")) {
    appendBubble("ai", "Toggling the on-page X-ray overlay now.");
    $("overlay-toggle").click();
    return true;
  }
  if (wants("undo", "revert")) {
    appendBubble("ai", "Undoing the last applied preview fix now.");
    await undoLastFix();
    return true;
  }
  return false;
}
function appendBubble(role, text) {
  const el = document.createElement("div");
  el.className = `bubble ${role}`;
  el.textContent = text;
  $("chat-log").appendChild(el);
  $("chat-log").scrollTop = $("chat-log").scrollHeight;
  return el;
}

renderOperatorLiveActions();

// ---------------- Read Aloud (Web Speech) ----------------
const tts = {
  queue: [],
  speaking: false,
  pickVoice() {
    const vs = speechSynthesis.getVoices();
    return vs.find((v) => /en[-_]US/i.test(v.lang) && /Google|Natural|Neural|Samantha|Daniel/i.test(v.name))
      || vs.find((v) => /^en/i.test(v.lang)) || vs[0] || null;
  },
  speak(text, onEnd) {
    if (!text) { onEnd && onEnd(); return; }
    try {
      const u = new SpeechSynthesisUtterance(String(text));
      const v = this.pickVoice(); if (v) u.voice = v;
      u.rate = 1.05; u.pitch = 1; u.volume = 1;
      u.onend = () => { this.speaking = false; onEnd && onEnd(); };
      u.onerror = () => { this.speaking = false; onEnd && onEnd(); };
      this.speaking = true;
      speechSynthesis.speak(u);
    } catch { onEnd && onEnd(); }
  },
  stop() {
    try { speechSynthesis.cancel(); } catch {}
    this.queue = []; this.speaking = false;
    const stopBtn = $("scan-read-stop"); if (stopBtn) stopBtn.classList.add("hidden");
  },
  readLeak(leak) {
    this.stop();
    const line = `${leak.title}. ${leak.why || ""}. Fix: ${leak.fix || ""}.`;
    const stopBtn = $("scan-read-stop"); if (stopBtn) stopBtn.classList.remove("hidden");
    this.speak(line, () => { if (stopBtn) stopBtn.classList.add("hidden"); });
  },
  readAll(leaks) {
    this.stop();
    if (!leaks?.length) return;
    const stopBtn = $("scan-read-stop"); if (stopBtn) stopBtn.classList.remove("hidden");
    let i = 0;
    const next = () => {
      if (i >= leaks.length) { if (stopBtn) stopBtn.classList.add("hidden"); return; }
      const l = leaks[i++];
      const line = `Finding ${i}. ${l.title}. ${l.why || ""}. Fix: ${l.fix || ""}.`;
      this.speak(line, next);
    };
    next();
  },
};
// Warm up voices list (Chrome lazy-loads them)
try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; } catch {}

// ---------------- Fix ALL ----------------
async function fixAllNow(btn) {
  if (!state.lastScan?.leaks?.length) { toast("Run a scan first."); return; }
  const targets = state.lastScan.leaks.filter((l) => hasInPageFix(l) && !state.revertById.has(l.id));
  if (!targets.length) { toast("Nothing left to auto-fix."); return; }
  const orig = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = `Fixing 0 / ${targets.length}…`; }
  let done = 0, ok = 0;
  for (const leak of targets) {
    const r = await applyLeakFix(leak.id, { silent: true, skipRender: true });
    done++; if (r?.ok) ok++;
    if (btn) btn.textContent = `Fixing ${done} / ${targets.length}…`;
    await new Promise((res) => setTimeout(res, 120));
  }
  renderScan(); renderFix(); renderOperatorLiveActions();
  toast(`Auto-fix complete: ${ok} / ${targets.length} applied.`);
  if (btn) { btn.disabled = false; btn.textContent = orig || "⚡ Fix ALL issues"; }
}

// Wire scan-tab toolbar buttons (Fix All / Read All / Stop)
(() => {
  const fixAllBtn = $("scan-fix-all");
  const readAllBtn = $("scan-read-all");
  const stopBtn = $("scan-read-stop");
  fixAllBtn && fixAllBtn.addEventListener("click", () => fixAllNow(fixAllBtn));
  readAllBtn && readAllBtn.addEventListener("click", () => tts.readAll(state.lastScan?.leaks || []));
  stopBtn && stopBtn.addEventListener("click", () => tts.stop());
})();

// Expose for inline handlers
window.__aetherisReadLeak = (id) => {
  const l = state.lastScan?.leaks?.find((x) => x.id === id);
  if (l) tts.readLeak(l);
};

// ---------------- FIX tab ----------------
function renderFix() {
  const out = $("fix-list");
  const empty = $("fix-empty");
  const toolbar = $("fix-toolbar");
  if (!state.lastScan || !state.lastScan.leaks?.length) {
    empty.classList.remove("hidden"); out.innerHTML = "";
    if (toolbar) toolbar.innerHTML = "";
    return;
  }
  empty.classList.add("hidden");
  const leaks = state.lastScan.leaks || [];
  const fixableCount = leaks.filter((l) => hasInPageFix(l) && !state.revertById.has(l.id)).length;
  if (toolbar) {
    toolbar.innerHTML = `
      <button id="fix-all-now" class="primary" style="background:var(--amber);color:#000" ${fixableCount ? "" : "disabled"}>
        ⚡ Fix ALL ${fixableCount ? `(${fixableCount})` : ""} now
      </button>
      <button id="fix-read-all" class="ghost">🔊 Read all findings</button>
      <button id="fix-read-stop" class="ghost">⏹ Stop reading</button>
    `;
    $("fix-all-now")?.addEventListener("click", (e) => fixAllNow(e.currentTarget));
    $("fix-read-all")?.addEventListener("click", () => tts.readAll(leaks));
    $("fix-read-stop")?.addEventListener("click", () => tts.stop());
  }
  out.innerHTML = leaks.map((l, i) => {
    const fixable = hasInPageFix(l);
    const revertId = state.revertById.get(l.id);
    return `
      <div class="card" data-fix-card="${escapeAttr(l.id)}">
        <div class="card-title">${i + 1}. ${escapeHtml(l.title)}</div>
        <div class="muted" style="margin-bottom:8px">${escapeHtml(l.why || "")}</div>
        <div class="leak-fix" style="margin-bottom:8px"><b>FIX:</b> ${escapeHtml(l.fix || "")}</div>
        <div class="row" style="flex-wrap:wrap">
          ${l.selectors?.length ? `<button class="ghost" data-focus="${escapeAttr(l.selectors[0])}" title="Snap the live page to this area">📍 Snap to area</button>` : ""}
          <button class="ghost" data-read="${escapeAttr(l.id)}" title="Read this finding aloud">🔊 Read</button>
          ${fixable && !revertId ? `<button class="primary" data-apply="${escapeAttr(l.id)}">Apply in-page fix</button>` : ""}
          ${revertId ? `<button class="ghost" data-revert="${escapeAttr(l.id)}">Undo this fix</button><span class="applied">✓ Applied</span>` : ""}
          <button class="ghost" data-copy-fix="${escapeAttr(l.id)}">Copy fix</button>
          <button class="ghost" data-open-page>Open page</button>
          ${!fixable ? `<span class="fix-unavailable">No safe one-click patch</span>` : ""}
        </div>
      </div>`;
  }).join("");
  out.querySelectorAll("[data-focus]").forEach((b) => b.addEventListener("click", () => relayToTab({ type: "AETHERIS_OVERLAY_FOCUS", selector: b.dataset.focus })));
  out.querySelectorAll("[data-read]").forEach((b) => b.addEventListener("click", () => window.__aetherisReadLeak(b.dataset.read)));
  out.querySelectorAll("[data-apply]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.apply;
    b.disabled = true; b.textContent = "Applying…";
    const r = await applyLeakFix(id);
    if (r?.ok) { renderFix(); renderScan(); }
    else { b.disabled = false; b.textContent = "Apply in-page fix"; alert(r?.error || "Failed."); }
  }));
  out.querySelectorAll("[data-revert]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.revert;
    const r = await revertLeakFix(id);
    if (r?.ok) { renderFix(); renderScan(); }
    else alert(r?.error || "Revert failed.");
  }));
  out.querySelectorAll("[data-copy-fix]").forEach((b) => b.addEventListener("click", async () => {
    const leak = state.lastScan.leaks.find((x) => x.id === b.dataset.copyFix);
    await navigator.clipboard.writeText(leak?.fix || "");
    toast("Fix copied.");
  }));
  out.querySelectorAll("[data-open-page]").forEach((b) => b.addEventListener("click", () => chrome.tabs.create({ url: state.activeUrl })));
}

// ---------------- GROWTH tab ----------------
async function callOperator(userText, withScreenshot = false) {
  const extract = await relayToTab({ type: "AETHERIS_EXTRACT" });
  const cap = withScreenshot ? await captureViewport() : { dataUrl: null };
  const r = await fetch(`${SUPABASE_URL}/functions/v1/extension-operator-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({
      userText,
      pageUrl: extract?.url || state.activeUrl,
      pageText: extract?.pageText || "",
      screenshot: cap?.dataUrl || null,
      history: [], mode: "growth",
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data.reply || "(empty)";
}

// ---------------- LinkedIn Reply Drafter (mirrors Content Studio) ----------------
const liState = {
  source: "image",                // image | text | reply
  imageDataUrl: null,             // for source=image
  replyImgs: { myComment: null, theirReply: null, originalPost: null },
  lastDraft: "",
  lastDraftPayload: null,
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(new Error("Could not read file"));
    fr.readAsDataURL(file);
  });
}

// Source-pill toggle
document.querySelectorAll("#li-source-pill .m").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll("#li-source-pill .m").forEach((x) => x.classList.toggle("active", x === b));
    liState.source = b.dataset.src;
    document.querySelectorAll(".li-src").forEach((el) => el.classList.add("hidden"));
    $(`li-src-${liState.source}`).classList.remove("hidden");
  });
});

// IMAGE: upload
$("li-img-file").addEventListener("change", async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try {
    liState.imageDataUrl = await readFileAsDataUrl(f);
    const p = $("li-img-preview"); p.src = liState.imageDataUrl; p.classList.remove("hidden");
  } catch (err) { toast(err.message); }
});
// IMAGE: capture current tab viewport
$("li-img-capture").addEventListener("click", async () => {
  const cap = await captureViewport();
  if (!cap?.dataUrl) return toast("Capture failed.");
  liState.imageDataUrl = cap.dataUrl;
  const p = $("li-img-preview"); p.src = cap.dataUrl; p.classList.remove("hidden");
});
$("li-img-clear").addEventListener("click", () => {
  liState.imageDataUrl = null;
  $("li-img-file").value = "";
  $("li-img-preview").classList.add("hidden");
});

// TEXT: grab selection
$("li-grab").addEventListener("click", async () => {
  const x = await relayToTab({ type: "AETHERIS_EXTRACT" });
  if (x?.selection) $("li-post").value = x.selection;
  else toast("No text selected on the page.");
});

// REPLY-TO-REPLY: per-slot image attachments
document.querySelectorAll('[data-li-img]').forEach((input) => {
  input.addEventListener("change", async (e) => {
    const slot = input.dataset.liImg;
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const url = await readFileAsDataUrl(f);
      liState.replyImgs[slot] = url;
      const prev = document.querySelector(`[data-li-prev="${slot}"]`);
      if (prev) { prev.src = url; prev.classList.remove("hidden"); }
    } catch (err) { toast(err.message); }
  });
});

async function draftLinkedInReply() {
  const out = $("li-out");
  const mode = $("li-length").value || "brief";
  const direction = $("li-direction").value.trim();

  let body = {
    mode,
    extraContext: direction,
    recentDrafts: [],
  };

  if (liState.source === "image") {
    if (!liState.imageDataUrl) return toast("Add a screenshot first.");
    body.imageDataUrl = liState.imageDataUrl;
  } else if (liState.source === "text") {
    const post = $("li-post").value.trim();
    if (post.length < 10) return toast("Paste the post text (at least 10 chars).");
    body.postText = post;
  } else {
    const mine = $("li-r-mine").value.trim();
    const theirs = $("li-r-theirs").value.trim();
    const orig = $("li-r-orig").value.trim();
    if ((mine.length < 10 && !liState.replyImgs.myComment) || (theirs.length < 5 && !liState.replyImgs.theirReply)) {
      return toast("Need your comment AND their reply (text or screenshot).");
    }
    body = {
      ...body,
      conversationKind: "reply_to_reply",
      myComment: mine,
      theirReply: theirs,
      originalPostText: orig,
      myCommentImageDataUrl: liState.replyImgs.myComment || "",
      theirReplyImageDataUrl: liState.replyImgs.theirReply || "",
      originalPostImageDataUrl: liState.replyImgs.originalPost || "",
    };
  }

  liState.lastDraftPayload = body;
  out.textContent = "Drafting…";
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/linkedin-post-respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    liState.lastDraft = data.post || "(empty)";
    out.textContent = liState.lastDraft;
  } catch (e) {
    out.textContent = `Failed: ${e.message}`;
  }
}
$("li-go").addEventListener("click", draftLinkedInReply);
$("li-regen").addEventListener("click", draftLinkedInReply);
$("li-copy").addEventListener("click", async () => {
  if (!liState.lastDraft) return toast("Nothing to copy yet.");
  try { await navigator.clipboard.writeText(liState.lastDraft); toast("Copied."); }
  catch { toast("Copy blocked by browser."); }
});

// Post from page
$("gp-go").addEventListener("click", async () => {
  const tone = $("gp-tone").value;
  const out = $("gp-out"); out.textContent = "Drafting…";
  try {
    const reply = await callOperator(
      `Draft a LinkedIn post in the "${tone}" voice based on what is on the current tab. 4-7 short lines. Lead with a pattern-claim hook. No emojis, no hashtags, no em dashes. End with one sharp question or a one-line CTA.`
    );
    out.textContent = reply;
  } catch (e) { out.textContent = `Failed: ${e.message}`; }
});

// Cold opener
$("gc-go").addEventListener("click", async () => {
  const name = $("gc-name").value.trim();
  const out = $("gc-out"); out.textContent = "Drafting…";
  try {
    const reply = await callOperator(
      `Write a cold email opener for the company on the current tab. ${name ? `Recipient first name is ${name}.` : ""} Output exactly two parts, labeled "SUBJECT:" then "BODY:". SUBJECT is 4-7 words and specific to what their page actually says. BODY is 2-3 sentences max: first line names a leak you can see on their page; second line offers one specific repair; third line is one question. No fluff. No "Hope you are well." No emojis.`,
      true
    );
    out.textContent = reply;
  } catch (e) { out.textContent = `Failed: ${e.message}`; }
});

// Hooks
$("gh-go").addEventListener("click", async () => {
  const out = $("gh-out"); out.textContent = "Generating…";
  try {
    const reply = await callOperator(
      `Read the current tab and produce exactly 5 contrarian, pattern-breaking opening lines (hooks). Each hook is one sentence, max 14 words, specific to what is on the page. Number them 1-5. No emojis, no hashtags, no em dashes.`
    );
    out.textContent = reply;
  } catch (e) { out.textContent = `Failed: ${e.message}`; }
});

// ---------------- CASE FILE ----------------
function renderCaseList() {
  loadCaseFiles().then(() => {
    const out = $("case-list");
    const q = $("case-search").value.trim().toLowerCase();
    const entries = Object.entries(state.caseFiles)
      .filter(([host]) => !q || host.includes(q))
      .sort((a, b) => (b[1].lastScan?.scannedAt || 0) - (a[1].lastScan?.scannedAt || 0));
    if (!entries.length) { out.innerHTML = `<div class="empty">No scans saved yet. Run a scan to build your case file.</div>`; return; }
    out.innerHTML = entries.map(([host, e]) => `
      <div class="case-row">
        <label class="row" style="gap:8px;cursor:pointer">
          <input type="checkbox" data-host="${escapeAttr(host)}" ${state.compare.has(host) ? "checked" : ""} />
          <span class="host">${escapeHtml(host)}</span>
        </label>
        <div class="row" style="gap:8px">
          <span class="muted">${e.lastScan?.leaks?.length || 0} leaks</span>
          <span class="grade grade-${e.lastScan?.grade || "F"}">${e.lastScan?.grade || "?"} · ${e.lastScan?.score ?? "?"}</span>
        </div>
      </div>`).join("");
    out.querySelectorAll("input[type=checkbox]").forEach((c) => c.addEventListener("change", () => {
      if (c.checked) state.compare.add(c.dataset.host); else state.compare.delete(c.dataset.host);
    }));
  });
}
$("case-search").addEventListener("input", renderCaseList);
$("case-compare").addEventListener("click", () => {
  const picks = Array.from(state.compare).slice(0, 2);
  if (picks.length !== 2) return alert("Pick exactly two case files to diff.");
  const [a, b] = picks.map((h) => state.caseFiles[h]);
  const ids = (e) => new Set((e.lastScan?.leaks || []).map((l) => l.id));
  const ia = ids(a), ib = ids(b);
  const both = [...ia].filter((x) => ib.has(x));
  const onlyA = [...ia].filter((x) => !ib.has(x));
  const onlyB = [...ib].filter((x) => !ia.has(x));
  $("case-diff").innerHTML = `
    <div class="card"><div class="card-title">Diff: ${escapeHtml(picks[0])} vs ${escapeHtml(picks[1])}</div>
      <div class="muted">Score: <b style="color:var(--amber)">${a.lastScan?.score} → ${b.lastScan?.score}</b></div>
      <pre class="out">SHARED LEAKS (${both.length})\n${both.join("\n") || "—"}\n\nONLY ${picks[0].toUpperCase()} (${onlyA.length})\n${onlyA.join("\n") || "—"}\n\nONLY ${picks[1].toUpperCase()} (${onlyB.length})\n${onlyB.join("\n") || "—"}</pre>
    </div>`;
});

// ---------------- AUTOPSY ----------------
$("autopsy-start").addEventListener("click", async () => {
  await relayToTab({ type: "AETHERIS_RECORD_START" });
  state.autopsy = { startedAt: Date.now() };
  $("autopsy-bar").classList.remove("hidden");
  $("autopsy-start").disabled = true;
});
$("autopsy-stop").addEventListener("click", async () => {
  const res = await relayToTab({ type: "AETHERIS_RECORD_STOP" });
  state.autopsy = null;
  $("autopsy-bar").classList.add("hidden");
  $("autopsy-start").disabled = false;
  const host = res?.host;
  if (host) {
    const entry = state.caseFiles[host] || { history: [], fixes: [], autopsies: [] };
    entry.autopsies = [...(entry.autopsies || []), res].slice(-5);
    state.caseFiles[host] = entry;
    await chrome.storage.local.set({ caseFiles: state.caseFiles });
  }
  document.querySelector('[data-tab="scan"]').click();
  const summary = (res.friction || []).map((f) => `• [${f.severity.toUpperCase()}] ${f.title} — ${f.detail}`).join("\n") || "No friction detected in this walkthrough.";
  $("scan-results").insertAdjacentHTML("afterbegin",
    `<div class="card"><div class="card-title">Funnel Autopsy · ${res.steps?.length || 0} steps · ${((res.durationMs||0)/1000)|0}s</div><pre class="out">${escapeHtml(summary)}</pre></div>`
  );
});

// ---------------- utils ----------------
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2400);
}
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, "&#96;"); }

// ---------------- v0.6 — Contradictions / Friction / Download / Case detail ----------------
const CONTRADICTIONS_PROMPT = `Run a BRAND CONTRADICTION SCAN on this page. Find places where the brand SAYS one thing but SHOWS another. For each contradiction return:
- CLAIM: what the page promises (verbatim quote, max 12 words)
- REALITY: what the page actually demonstrates (specific, observable)
- TRUST COST: one sentence on how this weakens buyer trust
- FIX: one specific rewrite or change

Return 3-6 contradictions, ranked by severity. No preamble. Use plain text with clear section breaks.`;

const FRICTION_PROMPT = `Run a FRICTION VOCABULARY AUDIT on this page. Find every word, phrase, or UX pattern that introduces hesitation, doubt, or work for the buyer. For each, return:
- FRICTION: the exact word/phrase/pattern (verbatim)
- WHY IT LEAKS: the cognitive cost it creates (1 sentence)
- REPLACEMENT: a sharper alternative

Group findings into: Headlines, Body Copy, CTAs, Forms, Trust signals. Rank by impact. No fluff. No preamble.`;

async function runExtraScan(label, prompt, containerId) {
  const c = $(containerId);
  c.innerHTML = `<div class="extra-report"><h4>${label}</h4><pre>Scanning…</pre></div>`;
  try {
    const extract = await relayToTab({ type: "AETHERIS_EXTRACT" });
    const cap = await captureViewport();
    const r = await fetch(`${SUPABASE_URL}/functions/v1/extension-operator-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        userText: prompt,
        pageUrl: extract?.url || state.activeUrl,
        pageText: extract?.pageText || "",
        screenshot: cap?.dataUrl || null,
        history: [],
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    const reply = data.reply || "(empty)";
    c.innerHTML = `<div class="extra-report"><h4>${label}</h4><pre>${escapeHtml(reply)}</pre>
      <div class="action-bank">
        <div class="action-bank-title">Controls</div>
        <button class="primary" data-op-action="fixes">Open fix buttons</button>
        <button class="ghost" data-op-action="detective">Run Detective</button>
        <button class="ghost" data-op-action="overlay">Show X-ray</button>
      </div>
    </div>`;
    wireOperatorActionButtons(c);
    // Auto-save to case file
    if (state.activeHost) {
      const entry = state.caseFiles[state.activeHost] || { history: [], fixes: [], autopsies: [], extras: {} };
      entry.extras = entry.extras || {};
      entry.extras[label] = { text: reply, at: Date.now() };
      state.caseFiles[state.activeHost] = entry;
      await chrome.storage.local.set({ caseFiles: state.caseFiles });
    }
  } catch (e) {
    c.innerHTML = `<div class="extra-report"><h4>${label}</h4><pre>Failed: ${escapeHtml(e.message)}</pre></div>`;
  }
}

$("scan-contradictions").addEventListener("click", () => runExtraScan("Brand Contradictions", CONTRADICTIONS_PROMPT, "scan-extra"));
$("scan-friction").addEventListener("click", () => runExtraScan("Friction Vocabulary", FRICTION_PROMPT, "scan-extra"));

// ---------------- Download report ----------------
function buildReportMarkdown(host, entry) {
  const s = entry?.lastScan; if (!s) return `# ${host}\n\nNo scan data.`;
  const d = state.lastDossier && host === state.activeHost ? state.lastDossier : null;
  const lines = [];
  lines.push(`# Aetheris Forensic Report — ${host}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`URL: ${s.url || ""}`);
  lines.push(`\n## Score\n- Grade: **${s.grade}** (${s.score}/100)`);
  lines.push(`- Leaks: ${s.leaks?.length || 0}`);
  lines.push(`- Page weight: ${s.weightKB || "?"} KB`);
  if (d?.dossier) {
    lines.push(`\n## Detective Dossier`);
    lines.push(`- **Suspect:** ${d.dossier.suspect || "—"}`);
    lines.push(`- **Motive:** ${d.dossier.motive || "—"}`);
    lines.push(`- **Verdict:** ${d.dossier.verdict || "—"}`);
    lines.push(`- **Confession:** ${d.dossier.confession || "—"}`);
    if (d.leakValueUSD) lines.push(`- **Estimated annual leak:** $${(d.leakValueUSD.low||0).toLocaleString()} – $${(d.leakValueUSD.high||0).toLocaleString()}`);
  }
  lines.push(`\n## Leaks (${s.leaks?.length || 0})`);
  (s.leaks || []).forEach((l, i) => {
    lines.push(`\n### ${i + 1}. ${l.title} [${l.severity}]`);
    lines.push(`- Category: ${l.category}`);
    if (l.why) lines.push(`- Why: ${l.why}`);
    if (l.fix) lines.push(`- Fix: ${l.fix}`);
  });
  if (entry.extras) {
    Object.entries(entry.extras).forEach(([label, payload]) => {
      lines.push(`\n## ${label}\n\n${payload.text || ""}`);
    });
  }
  return lines.join("\n");
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

$("scan-download").addEventListener("click", () => {
  if (!state.lastScan) return toast("Run a scan first.");
  const host = state.lastScan.host || state.activeHost || "report";
  const entry = state.caseFiles[host] || { lastScan: state.lastScan };
  const md = buildReportMarkdown(host, entry);
  downloadText(`aetheris-${host}-${Date.now()}.md`, md);
  toast("Report downloaded.");
});

// ---------------- Case detail view ----------------
// Event delegation: clicking a case row (not its checkbox) opens detail.
document.addEventListener("click", (e) => {
  const row = e.target.closest("#case-list .case-row");
  if (!row) return;
  if (e.target.tagName === "INPUT" || e.target.tagName === "LABEL") return;
  const host = row.querySelector("input[type=checkbox]")?.dataset.host;
  if (host) openCaseDetail(host);
});

function resetCaseView() {
  $("case-detail").innerHTML = "";
  $("case-back").classList.add("hidden");
  $("case-list").classList.remove("hidden");
  $("case-diff").classList.remove("hidden");
  renderCaseList();
}

function openCaseDetail(host) {
  const entry = state.caseFiles[host]; if (!entry) return;
  const s = entry.lastScan || {};
  $("case-list").classList.add("hidden");
  $("case-diff").classList.add("hidden");
  $("case-back").classList.remove("hidden");
  const leaks = (s.leaks || []).map((l, i) =>
    `<div class="leak ${l.severity}"><div class="leak-head"><div class="leak-title">${i+1}. ${escapeHtml(l.title)}</div><div class="leak-cat">${escapeHtml(l.category)} · ${l.severity}</div></div>${l.why?`<div class="leak-why">${escapeHtml(l.why)}</div>`:""}${l.fix?`<div class="leak-fix"><b>FIX:</b> ${escapeHtml(l.fix)}</div>`:""}</div>`
  ).join("") || `<div class="empty">No leaks recorded.</div>`;
  const extras = entry.extras ? Object.entries(entry.extras).map(([k,v]) =>
    `<div class="extra-report"><h4>${escapeHtml(k)}</h4><pre>${escapeHtml(v.text||"")}</pre></div>`
  ).join("") : "";
  $("case-detail").innerHTML = `
    <div class="card">
      <div class="card-title">${escapeHtml(host)}</div>
      <div class="meta"><span>SCORE <b>${s.score ?? "?"}</b></span><span>GRADE <b class="grade-${s.grade||"F"}">${s.grade||"?"}</b></span><span>LEAKS <b>${s.leaks?.length||0}</b></span></div>
      <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap">
        <button class="primary" id="case-download">⬇ Download Report</button>
        <button class="ghost" id="case-delete">Delete</button>
      </div>
    </div>
    ${leaks}
    ${extras}
  `;
  $("case-download").addEventListener("click", () => {
    const md = buildReportMarkdown(host, entry);
    downloadText(`aetheris-${host}-${Date.now()}.md`, md);
    toast("Report downloaded.");
  });
  $("case-delete").addEventListener("click", async () => {
    if (!confirm(`Delete case file for ${host}?`)) return;
    delete state.caseFiles[host];
    await chrome.storage.local.set({ caseFiles: state.caseFiles });
    renderCaseList();
  });
}

$("case-back").addEventListener("click", resetCaseView);

// ---------------- v0.8.5 — Collapsible sections + Contact Finder ----------------

// Delegated collapse toggling for any card with class .extra-report, .dossier, .leak
document.addEventListener("click", (e) => {
  // Click on the header element should toggle the parent .is-collapsed.
  const extraH = e.target.closest(".extra-report > h4");
  const dossierH = e.target.closest(".dossier-head");
  const leakH = e.target.closest(".leak-head");
  // Only fire if the click was directly on the header (not on a button inside it).
  if (e.target.closest("button, a, input, select, textarea")) return;
  if (extraH) extraH.parentElement.classList.toggle("is-collapsed");
  else if (dossierH) dossierH.parentElement.classList.toggle("is-collapsed");
  else if (leakH) leakH.parentElement.classList.toggle("is-collapsed");
});

function setCollapsedAll(collapsed) {
  document.querySelectorAll("#tab-scan .extra-report, #tab-scan .dossier, #tab-scan .leak, #tab-scan .contacts-card")
    .forEach((el) => el.classList.toggle("is-collapsed", collapsed));
}
$("scan-collapse-all")?.addEventListener("click", () => setCollapsedAll(true));
$("scan-expand-all")?.addEventListener("click", () => setCollapsedAll(false));

// Contacts-card uses .collapsible-head/.collapsible-body classes; delegate there too.
document.addEventListener("click", (e) => {
  const head = e.target.closest(".contacts-card > .collapsible-head");
  if (!head) return;
  if (e.target.closest("button, a")) return;
  head.parentElement.classList.toggle("is-collapsed");
});

// ----- Find Contacts (Firecrawl + RocketReach) -----
async function runFindContacts() {
  const out = $("scan-contacts-out");
  if (!out) return;
  const url = state.activeUrl || state.lastScan?.url;
  if (!url) { toast("Open a page first."); return; }
  out.innerHTML = `<div class="contacts-card"><h4>Contacts · scraping site + RocketReach…</h4><div class="muted">This can take 10-20 seconds.</div></div>`;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/extension-contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ url }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    renderContacts(data);
    // Save into case file
    if (state.activeHost) {
      const entry = state.caseFiles[state.activeHost] || { history: [], fixes: [], autopsies: [], extras: {} };
      entry.contacts = data;
      state.caseFiles[state.activeHost] = entry;
      await chrome.storage.local.set({ caseFiles: state.caseFiles });
    }
  } catch (e) {
    out.innerHTML = `<div class="contacts-card"><h4>Contacts</h4><div class="muted">Failed: ${escapeHtml(e.message)}</div></div>`;
  }
}

function copyText(s) {
  navigator.clipboard?.writeText(s).then(() => toast(`Copied ${s}`));
}

function renderContacts(d) {
  const out = $("scan-contacts-out");
  const emails = d.emails || [];
  const phones = d.phones || [];
  const socials = d.socials || {};
  const dms = d.decision_makers || [];
  const siteLeaders = d.leadership_from_site || [];
  const noteParts = [];
  if (!d.sources?.firecrawl_configured) noteParts.push("Firecrawl not configured");
  if (!d.sources?.rocketreach_configured) noteParts.push("RocketReach not configured");
  if (d.sources?.firecrawl_configured && !d.sources?.firecrawl) noteParts.push("Firecrawl returned no data");
  if (d.sources?.rocketreach_configured && !d.sources?.rocketreach) noteParts.push("RocketReach found no profiles");

  const emailChips = emails.length
    ? emails.map(e => `<span class="contact-chip">${escapeHtml(e)}<button data-copy="${escapeAttr(e)}" title="Copy">⧉</button></span>`).join("")
    : `<span class="muted">No emails found.</span>`;

  const phoneChips = phones.length
    ? phones.map(p => `<span class="contact-chip">${escapeHtml(p)}<button data-copy="${escapeAttr(p)}" title="Copy">⧉</button></span>`).join("")
    : `<span class="muted">No phone numbers found.</span>`;

  const socialBits = Object.entries(socials).filter(([, v]) => v).map(([k, v]) =>
    `<a class="contact-chip" href="${escapeAttr(v)}" target="_blank" rel="noopener">${escapeHtml(k)} ↗</a>`
  ).join("") || `<span class="muted">No social links.</span>`;

  const dmRows = dms.map(p => {
    const best = (p.emails || [])[0]?.email;
    const phone = (p.phones || [])[0]?.number;
    return `<div class="dm-row">
      ${p.profile_pic ? `<img class="dm-pic" src="${escapeAttr(p.profile_pic)}" alt="" onerror="this.style.display='none'" />` : `<div class="dm-pic"></div>`}
      <div class="dm-body">
        <div class="dm-name">${escapeHtml(p.name || "—")}</div>
        <div class="dm-title">${escapeHtml(p.title || "")}${p.employer ? " · " + escapeHtml(p.employer) : ""}</div>
        <div class="dm-meta">
          ${best ? `<span>${escapeHtml(best)} <button data-copy="${escapeAttr(best)}" style="background:transparent;border:0;color:var(--amber);cursor:pointer">⧉</button></span>` : ""}
          ${phone ? `<span>${escapeHtml(phone)} <button data-copy="${escapeAttr(phone)}" style="background:transparent;border:0;color:var(--amber);cursor:pointer">⧉</button></span>` : ""}
          ${p.linkedin_url ? `<a href="${escapeAttr(p.linkedin_url)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ""}
          ${p.location ? `<span>${escapeHtml(p.location)}</span>` : ""}
        </div>
      </div>
    </div>`;
  }).join("") || `<span class="muted">No decision-makers returned from RocketReach.</span>`;

  const siteLeaderRows = siteLeaders.length ? `
    <div class="contacts-section">
      <h5>Leadership scraped from site</h5>
      ${siteLeaders.map(l => `<div class="dm-row"><div class="dm-pic"></div><div class="dm-body">
        <div class="dm-name">${escapeHtml(l.name || "—")}</div>
        <div class="dm-title">${escapeHtml(l.title || "")}</div>
        <div class="dm-meta">${l.email ? `<span>${escapeHtml(l.email)} <button data-copy="${escapeAttr(l.email)}" style="background:transparent;border:0;color:var(--amber);cursor:pointer">⧉</button></span>` : ""}${l.linkedin ? `<a href="${escapeAttr(l.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ""}</div>
      </div></div>`).join("")}
    </div>` : "";

  out.innerHTML = `
    <div class="contacts-card">
      <div class="collapsible-head"><h4 style="margin:0">Contacts · ${escapeHtml(d.domain || "")}${d.company ? " · " + escapeHtml(d.company) : ""}</h4></div>
      <div class="collapsible-body">
        ${noteParts.length ? `<div class="muted" style="font-size:11px;margin-bottom:8px">⚠ ${escapeHtml(noteParts.join(" · "))}</div>` : ""}
        <div class="contacts-section"><h5>Emails (${emails.length})</h5>${emailChips}</div>
        <div class="contacts-section"><h5>Phones (${phones.length})</h5>${phoneChips}</div>
        <div class="contacts-section"><h5>Social</h5>${socialBits}</div>
        <div class="contacts-section"><h5>Decision-makers · RocketReach (${dms.length})</h5>${dmRows}</div>
        ${siteLeaderRows}
        <div class="muted" style="font-size:10px;margin-top:10px">Fetched ${new Date(d.fetched_at).toLocaleTimeString()}</div>
      </div>
    </div>`;

  out.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    copyText(b.dataset.copy);
  }));
}

$("scan-contacts")?.addEventListener("click", runFindContacts);

// ============================================================
// v0.9.0 — CRM (HubSpot bridge) + Auto-Fix Live Site
// ============================================================

const SB_FN = (name) => `${SUPABASE_URL}/functions/v1/${name}`;

async function getAccessCode() {
  // 1) Prefer whatever is currently typed in the always-visible CRM input
  const input = $("crm-access-code");
  const typed = (input?.value || "").trim().toUpperCase();
  if (typed) {
    await chrome.storage.local.set({ aetherisAccessCode: typed });
    return typed;
  }
  // 2) Fall back to saved code
  const { aetherisAccessCode } = await chrome.storage.local.get("aetherisAccessCode");
  if (aetherisAccessCode) {
    if (input && !input.value) input.value = aetherisAccessCode;
    return aetherisAccessCode;
  }
  // 3) Last resort: prompt + focus the input so they can change it later
  const code = (prompt("Enter your rep code or client unlock code:") || "").trim().toUpperCase();
  if (!code) { input?.focus(); return null; }
  await chrome.storage.local.set({ aetherisAccessCode: code });
  if (input) input.value = code;
  setCrmCodeStatus(`Saved code: ${code}`);
  return code;
}

function setCrmCodeStatus(msg) {
  const el = $("crm-code-status"); if (el) el.textContent = msg || "";
}

// Hydrate the CRM code input on load and wire Save / Forget
(async () => {
  const input = $("crm-access-code"); if (!input) return;
  const { aetherisAccessCode } = await chrome.storage.local.get("aetherisAccessCode");
  if (aetherisAccessCode) { input.value = aetherisAccessCode; setCrmCodeStatus(`Using saved code: ${aetherisAccessCode}`); }
  else { setCrmCodeStatus("No code saved yet. Type one above to use the HubSpot tools."); }
  input.addEventListener("input", () => {
    input.value = input.value.toUpperCase();
    setCrmCodeStatus(input.value ? `Code ready: ${input.value} (not saved yet)` : "No code entered.");
  });
  $("crm-code-save")?.addEventListener("click", async () => {
    const v = (input.value || "").trim().toUpperCase();
    if (!v) { setCrmCodeStatus("Type a code first."); return; }
    await chrome.storage.local.set({ aetherisAccessCode: v });
    input.value = v;
    setCrmCodeStatus(`Saved code: ${v}`);
    toast("Access code saved.");
  });
  $("crm-code-clear")?.addEventListener("click", async () => {
    await chrome.storage.local.remove("aetherisAccessCode");
    input.value = "";
    setCrmCodeStatus("Saved code cleared.");
    toast("Forgotten.");
  });
})();

async function callBridge(payload) {
  const r = await fetch(SB_FN("extension-hubspot-bridge"), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify(payload),
  });
  return r.json();
}

async function callCms(payload) {
  const r = await fetch(SB_FN("extension-cms-apply"), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify(payload),
  });
  return r.json();
}

// ---------- CRM tab ----------
function renderCrmResult(data) {
  const out = $("crm-out");
  if (!out) return;
  if (data?.error) { out.innerHTML = `<div class="bubble err">${escapeHtml(data.error)}</div>`; return; }
  const leaks = Array.isArray(data?.leaks) ? data.leaks : [];
  const total = data?.totalExposureUSD ? `$${Number(data.totalExposureUSD).toLocaleString()}` : "—";
  if (data?.portalId) state.hsPortalId = data.portalId;
  out.innerHTML = `
    <div class="meta"><b>${escapeHtml(data?.summary || "")}</b><br/>
      <span class="muted">Total exposure: ${total} · ${leaks.length} leak${leaks.length === 1 ? "" : "s"} found · Access: ${escapeHtml(data?.accessKind || "")}${state.hsPortalId ? " · Portal " + escapeHtml(state.hsPortalId) : ""}</span></div>
    ${leaks.map((l, i) => {
      const objType = (l.objectType && HS_OBJ_TYPE_ID[l.objectType]) ? l.objectType : "contacts";
      const ids = Array.isArray(l.recordIds) ? l.recordIds.filter(Boolean).slice(0, 10) : [];
      const presetPatch = l.fixAction?.op === "patch" && l.fixAction?.patch ? JSON.stringify(l.fixAction.patch) : "";
      const idChips = ids.map((id) => `
        <span class="chip" style="display:inline-flex;gap:4px;align-items:center;margin:2px 4px 2px 0;padding:2px 6px;border:1px solid #444;border-radius:6px;font-size:11px">
          <code>${escapeHtml(String(id))}</code>
          <a href="#" onclick="event.preventDefault();crmOpenRecord('${escapeHtml(objType)}','${escapeHtml(String(id))}')">view</a>
          <a href="#" onclick="event.preventDefault();crmEditRecord('${escapeHtml(objType)}','${escapeHtml(String(id))}'${presetPatch ? `, ${presetPatch.replace(/'/g, "\\'")}` : ""})">edit</a>
        </span>`).join("");
      return `
      <div class="bubble">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <b>${escapeHtml(l.title || "")}</b>
          <span class="muted">${escapeHtml(l.severity || "")}${l.count != null ? " · " + l.count : ""}${l.exposureUSD ? " · $" + Number(l.exposureUSD).toLocaleString() : ""}</span>
        </div>
        <div class="muted" style="font-size:11px;margin-top:4px">${escapeHtml(l.evidence || "")}</div>
        <div style="margin-top:4px"><b>Fix:</b> ${escapeHtml(l.fix || "")}</div>
        ${ids.length ? `<div style="margin-top:6px"><span class="muted" style="font-size:11px">Records (${objType}):</span><br/>${idChips}</div>` : `<div class="muted" style="font-size:11px;margin-top:6px">No specific record IDs returned. Pull deals/contacts via session to enable per-record view/edit.</div>`}
        ${presetPatch ? `<div style="margin-top:6px"><button class="btn small" onclick='crmEditRecord("${escapeHtml(objType)}","${escapeHtml(String(ids[0]||""))}", ${presetPatch})'>Apply fix to ${escapeHtml(String(ids[0]||"first"))}</button></div>` : ""}
      </div>`;
    }).join("")}
    ${data?.repScript ? `
      <div class="bubble">
        <b>Rep script</b>
        <div style="margin-top:4px"><b>Opener:</b> ${escapeHtml(data.repScript.opener || "")}</div>
        ${(data.repScript.discovery || []).map((q) => `<div>• ${escapeHtml(q)}</div>`).join("")}
        <div style="margin-top:4px"><b>Ask:</b> ${escapeHtml(data.repScript.close || "")}</div>
      </div>` : ""}
    ${Array.isArray(data?.nextThreeActions) && data.nextThreeActions.length ? `
      <div class="bubble"><b>Next 30 minutes</b>${data.nextThreeActions.map((a) => `<div>• ${escapeHtml(a)}</div>`).join("")}</div>` : ""}
  `;
}

async function crmScrape() {
  const out = $("crm-out"); out.innerHTML = `<div class="empty">Reading HubSpot tab…</div>`;
  const accessCode = await getAccessCode(); if (!accessCode) { out.innerHTML = ""; return; }
  const scrape = await relayToTab({ type: "AETHERIS_HUBSPOT_SCRAPE" });
  if (scrape?.error) { out.innerHTML = `<div class="bubble err">${escapeHtml(scrape.error)}</div>`; return; }
  state.hsPortalId = scrape.portalId || state.hsPortalId || null;
  out.innerHTML = `<div class="empty">Analyzing CRM leaks…</div>`;
  const data = await callBridge({ accessCode, mode: "dom", url: scrape.url, portalId: state.hsPortalId, payload: scrape });
  state.lastCrm = data;
  renderCrmResult(data);
}

async function crmPullViaSession(kind) {
  const out = $("crm-out"); out.innerHTML = `<div class="empty">Pulling ${kind} via your HubSpot session…</div>`;
  const accessCode = await getAccessCode(); if (!accessCode) { out.innerHTML = ""; return; }
  const path = kind === "deals"
    ? "/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,hs_lastmodifieddate,pipeline,hubspot_owner_id"
    : "/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname,lifecyclestage,hs_lead_status,lastmodifieddate,notes_last_contacted";
  const res = await relayToTab({ type: "AETHERIS_HUBSPOT_API_FETCH", path });
  if (res?.error) { out.innerHTML = `<div class="bubble err">${escapeHtml(res.error)}<br/><span class="muted">Tip: switch to a hubspot.com or app.hubspot.com tab first so the session cookie is available.</span></div>`; return; }
  if (!res?.ok) { out.innerHTML = `<div class="bubble err">HubSpot returned ${res?.status || "error"}. ${res?.json ? escapeHtml(JSON.stringify(res.json).slice(0,300)) : ""}</div>`; return; }
  out.innerHTML = `<div class="empty">Running forensic detectors on ${res.json?.results?.length || 0} ${kind}…</div>`;
  // Try to grab portalId from the tab if we don't have it
  if (!state.hsPortalId) {
    const sc = await relayToTab({ type: "AETHERIS_HUBSPOT_SCRAPE" }).catch(() => null);
    if (sc?.portalId) state.hsPortalId = sc.portalId;
  }
  const data = await callBridge({ accessCode, mode: "api", url: `hubapi.com${path}`, portalId: state.hsPortalId, payload: { kind, results: res.json?.results || [], paging: res.json?.paging } });
  state.lastCrm = data;
  renderCrmResult(data);
}

// ---------- HubSpot view / edit helpers ----------
const HS_OBJ_TYPE_ID = { contacts: "0-1", companies: "0-2", deals: "0-3", tickets: "0-5" };
function hsRecordUrl(portalId, objectType, recordId) {
  const typeId = HS_OBJ_TYPE_ID[objectType] || "0-1";
  if (!portalId) return `https://app.hubspot.com/contacts/_/record/${typeId}/${recordId}`;
  return `https://app.hubspot.com/contacts/${portalId}/record/${typeId}/${recordId}`;
}
window.crmOpenRecord = function (objectType, recordId) {
  const url = hsRecordUrl(state.hsPortalId, objectType, recordId);
  chrome.tabs.create({ url });
};
window.crmEditRecord = async function (objectType, recordId, presetPatch) {
  const accessCode = await getAccessCode(); if (!accessCode) return;
  let patch = presetPatch || null;
  if (!patch) {
    const raw = prompt(`Edit ${objectType} ${recordId}\nEnter JSON of properties to write, e.g.\n{"lifecyclestage":"opportunity"}`);
    if (!raw) return;
    try { patch = JSON.parse(raw); } catch { toast("Invalid JSON."); return; }
  }
  const path = `/crm/v3/objects/${objectType}/${recordId}`;
  const res = await relayToTab({ type: "AETHERIS_HUBSPOT_API_FETCH", path, method: "PATCH", body: { properties: patch } });
  if (res?.error) { toast(res.error); return; }
  if (!res?.ok) { toast(`HubSpot ${res?.status || "error"}: ${res?.json?.message || res?.text || ""}`); return; }
  toast(`Updated ${objectType} ${recordId}`);
};

$("crm-scrape")?.addEventListener("click", crmScrape);
$("crm-pull-deals")?.addEventListener("click", () => crmPullViaSession("deals"));
$("crm-pull-contacts")?.addEventListener("click", () => crmPullViaSession("contacts"));
$("crm-clear")?.addEventListener("click", () => { $("crm-out").innerHTML = ""; });

// ---------- Auto-Fix Site tab ----------
function buildPatchesFromScan() {
  // Convert the last scan's AI fixActions (op=replaceText with selector + value) into
  // text-level find/replace pairs the WordPress endpoint can apply to the raw HTML.
  const leaks = state.lastDossier?.leaks || state.lastScan?.leaks || [];
  const patches = [];
  for (const l of leaks) {
    const fa = l?.fixAction;
    if (!fa || fa.op !== "replaceText") continue;
    // The scanner stored the original textContent in state.revertById entries, but the
    // simpler durable signal is the leak's "original" text if present.
    const find = l.originalText || l.evidence || "";
    if (find && fa.value && typeof fa.value === "string") {
      patches.push({ find: String(find).slice(0, 400), replace: String(fa.value).slice(0, 800) });
    }
  }
  return patches;
}

async function afDetect() {
  const r = await relayToTab({ type: "AETHERIS_CMS_DETECT" });
  const el = $("af-detect");
  if (r?.error) { el.innerHTML = `<span style="color:var(--crimson, #c1121f)">${escapeHtml(r.error)}</span>`; return; }
  el.innerHTML = `Detected: <b>${escapeHtml(r.platform)}</b> at <code>${escapeHtml(r.origin || "")}</code>${r.generator ? " · " + escapeHtml(r.generator) : ""}`;
  if (r.platform === "wordpress") { $("af-site").value = r.origin || ""; $("af-pageurl").value = r.url || ""; }
  else if (r.platform !== "unknown") {
    el.innerHTML += `<br/><span class="muted">Direct write-back for ${escapeHtml(r.platform)} isn't supported yet. Use the Fix tab to copy the patch and paste it into your CMS.</span>`;
  }
}

async function afCall(action, extra = {}) {
  const out = $("af-out");
  const accessCode = await getAccessCode(); if (!accessCode) return;
  const payload = {
    accessCode, action, platform: "wordpress",
    siteUrl: $("af-site").value.trim(),
    username: $("af-user").value.trim(),
    appPassword: $("af-pass").value.trim(),
    pageUrl: $("af-pageurl").value.trim() || state.activeUrl,
    ...extra,
  };
  out.innerHTML = `<div class="empty">Calling WordPress…</div>`;
  const r = await callCms(payload);
  if (r?.error || r?.ok === false) {
    out.innerHTML = `<div class="bubble err">${escapeHtml(r.error || "Failed")}</div>`; return r;
  }
  if (action === "verify") out.innerHTML = `<div class="bubble"><b>✓ Connected as ${escapeHtml(r.user)}</b></div>`;
  else if (action === "apply" && r.dryRun) {
    out.innerHTML = `<div class="bubble"><b>Preview</b> · post #${r.postId} (${escapeHtml(r.type)}) · ${r.patchesApplied} patch${r.patchesApplied === 1 ? "" : "es"} would apply${r.patchesMissed?.length ? `, ${r.patchesMissed.length} not found` : ""}.</div>`;
  } else if (action === "apply") {
    out.innerHTML = `<div class="bubble"><b>✓ Pushed live.</b> Post #${r.postId} updated with ${r.patchesApplied} change${r.patchesApplied === 1 ? "" : "s"}. <a href="${escapeAttr(r.link || "#")}" target="_blank" rel="noopener">View ↗</a></div>`;
  }
  return r;
}

$("af-detect-btn")?.addEventListener("click", afDetect);
$("af-verify")?.addEventListener("click", () => afCall("verify"));
$("af-preview")?.addEventListener("click", () => {
  const patches = buildPatchesFromScan();
  if (!patches.length) { $("af-out").innerHTML = `<div class="bubble err">Run a scan with Deepen (Detective) first so the AI produces replaceText fixes.</div>`; return; }
  return afCall("apply", { patches, dryRun: true });
});
$("af-apply")?.addEventListener("click", async () => {
  const patches = buildPatchesFromScan();
  if (!patches.length) { $("af-out").innerHTML = `<div class="bubble err">No patches available. Run Deepen first.</div>`; return; }
  if (!confirm(`Push ${patches.length} change${patches.length === 1 ? "" : "s"} LIVE to ${$("af-site").value}? This rewrites the post content.`)) return;
  return afCall("apply", { patches, dryRun: false });
});

// ===== LinkedIn Auto-Reply Mode wiring =====
(function () {
  const KEYS = {
    enabled: "liAutoReply.enabled",
    cadence: "liAutoReply.cadenceMin",
    mode: "liAutoReply.sendMode",
    log: "liAutoReply.log",
    lastRun: "liAutoReply.lastRun",
  };
  const chk = document.getElementById("li-auto-enabled");
  const cad = document.getElementById("li-auto-cadence");
  const mode = document.getElementById("li-auto-mode");
  const scanBtn = document.getElementById("li-auto-scan-now");
  const statusEl = document.getElementById("li-auto-status");
  const logEl = document.getElementById("li-auto-log");
  if (!chk || !cad || !mode || !scanBtn) return;

  function paintStatus(s) {
    const on = !!s[KEYS.enabled];
    const last = s[KEYS.lastRun] ? new Date(s[KEYS.lastRun]).toLocaleTimeString() : "never";
    statusEl.textContent = `${on ? "● ON" : "○ OFF"} · cadence ${s[KEYS.cadence] || 60} min · mode ${s[KEYS.mode] || "send"} · last scan ${last}`;
  }
  function paintLog(arr) {
    if (!Array.isArray(arr) || !arr.length) { logEl.style.display = "none"; return; }
    logEl.style.display = "block";
    logEl.innerHTML = arr.slice(-30).reverse().map((l) => {
      const t = new Date(l.t).toLocaleTimeString();
      const color = l.level === "error" ? "#e88" : l.level === "warn" ? "#eb8" : "#9c9";
      return `<div style="color:${color}">[${t}] ${l.msg.replace(/</g,"&lt;")}</div>`;
    }).join("");
  }

  chrome.storage.local.get(Object.values(KEYS), (s) => {
    chk.checked = !!s[KEYS.enabled];
    cad.value = String(s[KEYS.cadence] || 60);
    mode.value = s[KEYS.mode] || "send";
    paintStatus(s);
    paintLog(s[KEYS.log]);
  });

  chrome.storage.onChanged.addListener((c, area) => {
    if (area !== "local") return;
    chrome.storage.local.get(Object.values(KEYS), (s) => {
      paintStatus(s);
      if (c[KEYS.log]) paintLog(s[KEYS.log]);
    });
  });

  chk.addEventListener("change", () => chrome.storage.local.set({ [KEYS.enabled]: chk.checked }));
  cad.addEventListener("change", () => chrome.storage.local.set({ [KEYS.cadence]: Number(cad.value) || 60 }));
  mode.addEventListener("change", () => chrome.storage.local.set({ [KEYS.mode]: mode.value }));
  scanBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "AETHERIS_RELAY_TO_TAB",
      payload: { type: "AETHERIS_LI_SCAN_NOW" },
    }, (resp) => {
      if (resp?.error) statusEl.textContent = `Scan failed: ${resp.error} (must be on a linkedin.com tab)`;
    });
  });
})();

// ---------------- AGENTS (one-click) ----------------
(function initAgentsTab() {
  const out = document.getElementById("ag-out");
  const status = document.getElementById("ag-status");
  const actions = document.getElementById("ag-actions");
  const briefEl = document.getElementById("ag-brief");
  const confirmBtn = document.getElementById("ag-confirm");
  const discardBtn = document.getElementById("ag-discard");
  if (!out) return;

  let pending = null; // { agent, url, plan }

  function setStatus(msg) { status.textContent = msg || ""; }
  function renderPlan(label, plan) {
    const sections = [];
    if (plan.summary) sections.push(`<div style="border-left:2px solid var(--amber);padding:6px 10px;background:rgba(0,0,0,0.3);font-style:italic;margin-bottom:8px">${escapeHtml(plan.summary)}</div>`);
    if (plan.verdict) {
      sections.push(`<div style="display:flex;gap:6px;margin-bottom:8px">
        <span class="badge">Grade ${escapeHtml(plan.verdict.grade||"—")}</span>
        <span class="badge">Score ${escapeHtml(String(plan.verdict.score||"—"))}/100</span>
        <span class="badge">${escapeHtml(plan.verdict.annualLeakUSD||"—")}</span>
      </div>`);
    }
    if (Array.isArray(plan.evidence) && plan.evidence.length) {
      sections.push(`<div><div class="card-title">Evidence</div><ul>${plan.evidence.map(e=>`<li>${escapeHtml(e)}</li>`).join("")}</ul></div>`);
    }
    if (Array.isArray(plan.fixes) && plan.fixes.length) {
      sections.push(`<div><div class="card-title">Fixes</div>${plan.fixes.map(f=>`
        <div style="border:1px solid var(--border,#333);border-radius:6px;padding:8px;margin-bottom:6px">
          <div style="font-size:11px;color:var(--amber);text-transform:uppercase;letter-spacing:.1em">${escapeHtml(f.field||f.selector||f.title||"")}</div>
          ${f.before?`<div style="text-decoration:line-through;color:#888;font-size:12px">${escapeHtml(f.before)}</div>`:""}
          <div style="font-weight:600;font-size:13px">${escapeHtml(f.after||f.action||"")}</div>
          ${f.why?`<div style="font-size:11px;color:#aaa;margin-top:2px">— ${escapeHtml(f.why)}</div>`:""}
        </div>`).join("")}</div>`);
    }
    if (Array.isArray(plan.linkedinPosts) && plan.linkedinPosts.length) {
      sections.push(`<div><div class="card-title">LinkedIn posts</div>${plan.linkedinPosts.map(p=>`
        <div style="border:1px solid var(--border,#333);border-radius:6px;padding:8px;margin-bottom:6px;white-space:pre-wrap">
          <div style="font-weight:600;margin-bottom:4px">${escapeHtml(p.hook||"")}</div>
          <div style="font-size:13px">${escapeHtml(p.body||"")}</div>
        </div>`).join("")}</div>`);
    }
    if (Array.isArray(plan.coldEmails) && plan.coldEmails.length) {
      sections.push(`<div><div class="card-title">Cold emails</div>${plan.coldEmails.map(e=>`
        <div style="border:1px solid var(--border,#333);border-radius:6px;padding:8px;margin-bottom:6px;white-space:pre-wrap">
          <div style="font-weight:600;margin-bottom:4px">Subject: ${escapeHtml(e.subject||"")}</div>
          <div style="font-size:13px">${escapeHtml(e.body||"")}</div>
        </div>`).join("")}</div>`);
    }
    if (Array.isArray(plan.ninetyDayPlan) && plan.ninetyDayPlan.length) {
      sections.push(`<div><div class="card-title">90-day plan</div>${plan.ninetyDayPlan.map(p=>`
        <div style="border:1px solid var(--border,#333);border-radius:6px;padding:8px;margin-bottom:6px">
          <div style="font-size:11px;color:var(--amber);text-transform:uppercase;letter-spacing:.1em">${escapeHtml(p.phase||"")}</div>
          <div style="font-weight:600">${escapeHtml(p.focus||"")}</div>
          <ul>${(p.moves||[]).map(m=>`<li>${escapeHtml(m)}</li>`).join("")}</ul>
        </div>`).join("")}</div>`);
    }
    out.innerHTML = `<div class="card-title">${escapeHtml(label)} · plan</div>${sections.join("")}`;
  }

  function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  async function runAgent(agent) {
    const url = state?.activeUrl || "";
    pending = null;
    actions.style.display = "none";
    out.innerHTML = "";
    setStatus(`${agent.toUpperCase()} running on ${url || "(no URL)"} …`);
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/agents-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          agent, url, brief: briefEl.value.trim(), mode: "plan",
        }),
      });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
      pending = { agent, url, plan: data.plan };
      renderPlan(data.label, data.plan);
      actions.style.display = "flex";
      setStatus("Review the plan. Confirm to save to Library.");
    } catch (e) {
      setStatus("");
      out.innerHTML = `<div class="bubble err">${escapeHtml(e.message)}</div>`;
    }
  }

  document.querySelectorAll('#tab-agents [data-agent]').forEach((b) => {
    b.addEventListener("click", () => runAgent(b.dataset.agent));
  });

  confirmBtn?.addEventListener("click", async () => {
    if (!pending) return;
    setStatus("Saving to Library…");
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/agents-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ ...pending, mode: "execute" }),
      });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
      setStatus(`Saved · ${data.item?.title || "Library item"}`);
      actions.style.display = "none";
      pending = null;
    } catch (e) {
      setStatus("Save failed: " + e.message);
    }
  });

  discardBtn?.addEventListener("click", () => {
    pending = null;
    out.innerHTML = "";
    actions.style.display = "none";
    setStatus("");
  });
})();

// ───────────────────────── GOLDEN REPORT (Scan All) ─────────────────────────
(function () {
  const tab = document.getElementById("tab-golden");
  if (!tab) return;
  const urlInput = document.getElementById("golden-url");
  const companyInput = document.getElementById("golden-company");
  const runBtn = document.getElementById("golden-run");
  const openBtn = document.getElementById("golden-open");
  const statusEl = document.getElementById("golden-status");
  const progEl = document.getElementById("golden-progress");
  const reportEl = document.getElementById("golden-report");
  let currentScanId = null;
  let pollTimer = null;

  // Prefill from active tab
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs?.[0]?.url && !urlInput.value) urlInput.value = tabs[0].url;
    });
  } catch (_) {}

  const STAGES = [
    ["queued",       "Queued"],
    ["site",         "Site crawl + branding"],
    ["scan_website", "Website forensics"],
    ["friction",     "Brand contradictions + friction audit"],
    ["crm",          "CRM / pipeline forensics"],
    ["synth",        "Synthesizing 14-chapter report"],
  ];

  function renderProgress(stageStatus) {
    progEl.innerHTML = STAGES.map(([k, label]) => {
      const st = stageStatus?.[k]?.state || "pending";
      const dot = st === "done" ? "✓" : st === "running" ? "…" : st === "skipped" ? "—" : "·";
      const color = st === "done" ? "#4ade80" : st === "running" ? "#f59e0b" : "#666";
      return `<div style="font-size:11px;color:${color};font-family:monospace">${dot} ${label}</div>`;
    }).join("");
  }

  function renderReport(row) {
    const r = row.report;
    if (!r) { reportEl.innerHTML = ""; return; }
    const chapters = r.chapters || [];
    const top = (r.top_leaks || []).map((l) =>
      `<li><b>#${l.rank}</b> ${escapeHtml(l.name)} <span style="color:#888">$${(l.dollars_low||0).toLocaleString()}–$${(l.dollars_high||0).toLocaleString()}</span></li>`
    ).join("");
    const chs = chapters.map((c) => `
      <details style="border:1px solid #2a2a35;border-radius:4px;margin:4px 0;padding:6px 8px">
        <summary style="cursor:pointer"><b style="color:#f59e0b;font-family:monospace">CH${String(c.no).padStart(2,"0")}</b> ${escapeHtml(c.title)}</summary>
        <div style="margin-top:6px;font-size:12px;line-height:1.5">
          ${c.verdict ? `<div style="color:#dc4646;font-style:italic">${escapeHtml(c.verdict)}</div>` : ""}
          ${c.what_we_found ? `<div style="margin-top:4px"><b style="color:#f59e0b;font-size:10px">WHAT WE FOUND</b><div>${escapeHtml(c.what_we_found)}</div></div>` : ""}
          ${c.why_its_leaking ? `<div style="margin-top:4px"><b style="color:#f59e0b;font-size:10px">WHY IT'S LEAKING</b><div>${escapeHtml(c.why_its_leaking)}</div></div>` : ""}
          ${c.what_its_costing ? `<div style="margin-top:4px"><b style="color:#f59e0b;font-size:10px">COST (USD)</b><div>${escapeHtml(c.what_its_costing)}</div></div>` : ""}
        </div>
      </details>
    `).join("");
    reportEl.innerHTML = `
      <h3 style="margin:8px 0 4px">${escapeHtml(row.company_name || row.target_url)}</h3>
      <div style="font-size:11px;color:#aaa;margin-bottom:8px">Executive Summary</div>
      <div style="white-space:pre-wrap;font-size:12px;line-height:1.5">${escapeHtml(r.executive_summary || "")}</div>
      ${top ? `<div style="margin-top:10px"><b style="color:#f59e0b;font-size:11px">TOP LEAKS</b><ol style="font-size:12px">${top}</ol></div>` : ""}
      <div style="margin-top:10px"><b style="color:#f59e0b;font-size:11px">INDEX — 14 CHAPTERS</b>${chs}</div>
    `;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function pollOnce() {
    if (!currentScanId) return;
    const r = await fetch(`${SUPABASE_URL}/functions/v1/forensic-scan-all?id=${currentScanId}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    const row = await r.json();
    if (row?.id) {
      renderProgress(row.stage_status);
      statusEl.textContent = `Status: ${row.status}`;
      if (row.status === "completed") {
        renderReport(row);
        openBtn.disabled = false;
        if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
        return;
      }
      if (row.status === "failed") {
        statusEl.textContent = `Failed: ${row.error_message || "unknown"}`;
        if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
        return;
      }
    }
    pollTimer = setTimeout(pollOnce, 3000);
  }

  runBtn?.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) { statusEl.textContent = "Enter a URL first."; return; }
    runBtn.disabled = true;
    openBtn.disabled = true;
    reportEl.innerHTML = "";
    progEl.innerHTML = "";
    statusEl.textContent = "Starting…";
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/forensic-scan-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ url, company: companyInput.value.trim() || undefined }),
      });
      const j = await r.json();
      if (!j?.scan_id) throw new Error(j?.error || "no scan id");
      currentScanId = j.scan_id;
      statusEl.textContent = `Started. Scan ${currentScanId.slice(0, 8)}…`;
      pollOnce();
    } catch (e) {
      statusEl.textContent = `Error: ${e.message || e}`;
    } finally {
      runBtn.disabled = false;
    }
  });

  openBtn?.addEventListener("click", () => {
    if (!currentScanId) return;
    chrome.tabs.create({ url: `https://aetheris.technology/report/${currentScanId}/ask` });
  });
})();

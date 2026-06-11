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
$("scan-run").addEventListener("click", async () => {
  $("scan-results").innerHTML = `<div class="empty">Scanning…</div>`;
  $("scan-dossier").innerHTML = "";
  state.lastDossier = null;
  state.revertById.clear();
  const res = await relayToTab({ type: "AETHERIS_SCAN" });
  if (res?.error) { $("scan-results").innerHTML = `<div class="bubble err">${res.error}</div>`; return; }
  state.lastScan = res;
  await saveCaseFile(res);
  renderScan();
  if (state.overlayOn) drawOverlay();
});

$("scan-deepen").addEventListener("click", async () => {
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
});

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
    </div>
  `;
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
        ${l.selectors?.length ? `<button class="ghost" data-focus="${escapeAttr(l.selectors[0])}">Show on page</button>` : ""}
        ${fixable && !revertId ? `<button class="primary" data-apply="${escapeAttr(l.id)}">Fix in-page</button>` : ""}
        ${revertId ? `<button class="ghost" data-revert="${escapeAttr(l.id)}">↶ Undo</button><span class="applied">✓ Applied</span>` : ""}
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
  out.querySelectorAll("[data-apply]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.apply;
    const leak = state.lastScan.leaks.find((x) => x.id === id);
    b.disabled = true; b.textContent = "Applying…";
    const r = await relayToTab({ type: "AETHERIS_APPLY_FIX", leak });
    if (r?.ok) {
      state.revertById.set(id, r.revertId);
      toast(r.message || "Fix applied to live page.");
      renderScan();
    } else {
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
  out.querySelectorAll("[data-more]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const id = b.dataset.more;
    const leak = state.lastScan.leaks.find((x) => x.id === id);
    openMoreMenu(b, leak);
  }));
}

function openMoreMenu(anchor, leak) {
  document.querySelectorAll(".menu-pop").forEach((m) => m.remove());
  const menu = document.createElement("div");
  menu.className = "menu-pop";
  const subPages = ["/", "/about", "/pricing", "/contact", "/blog", "/services"];
  menu.innerHTML = `
    <button data-act="copy-fix">📋 Copy fix text</button>
    <button data-act="copy-leak">📋 Copy leak as JSON</button>
    <button data-act="open-tab">↗ Open page in new tab</button>
    <button data-act="open-devtools">🛠 Inspect element (console hint)</button>
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
    state.history.push({ role: "user", content: text }, { role: "assistant", content: data.reply || "" });
  } catch (err) {
    last.classList.replace("ai", "err");
    last.textContent = `Operator failed: ${err.message}`;
  }
});
function appendBubble(role, text) {
  const el = document.createElement("div");
  el.className = `bubble ${role}`;
  el.textContent = text;
  $("chat-log").appendChild(el);
  $("chat-log").scrollTop = $("chat-log").scrollHeight;
}

// ---------------- FIX tab ----------------
function renderFix() {
  const out = $("fix-list");
  const empty = $("fix-empty");
  if (!state.lastScan || !state.lastScan.leaks?.length) { empty.classList.remove("hidden"); out.innerHTML = ""; return; }
  empty.classList.add("hidden");
  const fixable = state.lastScan.leaks.filter(hasInPageFix);
  if (!fixable.length) { out.innerHTML = `<div class="empty">No in-page fixes available for this scan.</div>`; return; }
  out.innerHTML = fixable.map((l, i) => {
    const revertId = state.revertById.get(l.id);
    return `
      <div class="card">
        <div class="card-title">${i + 1}. ${escapeHtml(l.title)}</div>
        <div class="muted" style="margin-bottom:8px">${escapeHtml(l.why || "")}</div>
        <div class="row">
          ${revertId
            ? `<button class="ghost" data-revert="${escapeAttr(l.id)}">Revert</button><span class="applied">✓ Applied</span>`
            : `<button class="primary" data-apply="${escapeAttr(l.id)}">Apply in-page fix</button>`}
        </div>
      </div>`;
  }).join("");
  out.querySelectorAll("[data-apply]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.apply;
    const leak = state.lastScan.leaks.find((x) => x.id === id);
    b.disabled = true; b.textContent = "Applying…";
    const r = await relayToTab({ type: "AETHERIS_APPLY_FIX", leak });
    if (r?.ok) { state.revertById.set(id, r.revertId); toast(r.message || "Applied."); renderFix(); renderScan(); }
    else { b.disabled = false; b.textContent = "Apply in-page fix"; alert(r?.error || "Failed."); }
  }));
  out.querySelectorAll("[data-revert]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.revert;
    const r = await relayToTab({ type: "AETHERIS_REVERT_FIX", revertId: state.revertById.get(id) });
    if (r?.ok) { state.revertById.delete(id); toast("Reverted."); renderFix(); renderScan(); }
    else alert(r?.error || "Revert failed.");
  }));
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
    c.innerHTML = `<div class="extra-report"><h4>${label}</h4><pre>${escapeHtml(reply)}</pre></div>`;
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

// Aetheris Forensic Cockpit — side panel controller (v0.3)
import { fixFor } from "./fixRegistry.js";

const SUPABASE_URL = "https://ihdjpxhcaiaixmqxyqoe.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs";

// ---------------- State ----------------
const state = {
  tab: "scan",
  activeUrl: "",
  activeHost: "",
  lastScan: null,
  overlayOn: false,
  mode: "observe",
  history: [],
  autopsy: null,
  caseFiles: {}, // host → { lastScan, history[] }
  compare: new Set(),
};

const $ = (id) => document.getElementById(id);

// ---------------- Background relay helpers ----------------
function relayToTab(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "AETHERIS_RELAY_TO_TAB", payload }, (r) => resolve(r || { error: "no reply" }));
  });
}
function getActiveTab() {
  return new Promise((r) => chrome.runtime.sendMessage({ type: "AETHERIS_GET_ACTIVE_TAB" }, (x) => r(x || {})));
}
function captureViewport() {
  return new Promise((r) => chrome.runtime.sendMessage({ type: "AETHERIS_CAPTURE_VIEWPORT" }, (x) => r(x || {})));
}

// ---------------- Tabs ----------------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
    state.tab = btn.dataset.tab;
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${state.tab}`));
    if (state.tab === "case") renderCaseList();
    if (state.tab === "fix") renderFix();
  });
});

// ---------------- Header / active tab tracking ----------------
async function refreshHeader() {
  const t = await getActiveTab();
  if (t?.url) {
    try { state.activeHost = new URL(t.url).hostname.replace(/^www\./, ""); } catch { state.activeHost = ""; }
    state.activeUrl = t.url;
    $("active-host").textContent = state.activeHost || t.url;
  } else {
    $("active-host").textContent = "—";
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
  const host = scan.host;
  if (!host) return;
  const entry = state.caseFiles[host] || { history: [], fixes: [], autopsies: [] };
  entry.lastScan = scan;
  entry.history = [...(entry.history || []).slice(-9), { score: scan.score, grade: scan.grade, scannedAt: scan.scannedAt }];
  state.caseFiles[host] = entry;
  await chrome.storage.local.set({ caseFiles: state.caseFiles });
}
loadCaseFiles();

// ---------------- SCAN tab ----------------
$("scan-run").addEventListener("click", async () => {
  $("scan-results").innerHTML = `<div class="empty">Scanning…</div>`;
  const res = await relayToTab({ type: "AETHERIS_SCAN" });
  if (res?.error) { $("scan-results").innerHTML = `<div class="bubble err">${res.error}</div>`; return; }
  state.lastScan = res;
  await saveCaseFile(res);
  renderScan();
  if (state.overlayOn) drawOverlay();
});

$("scan-deepen").addEventListener("click", async () => {
  if (!state.lastScan) return alert("Run a scan first.");
  $("scan-results").insertAdjacentHTML("afterbegin", `<div class="bubble ai">Running AI Pass B…</div>`);
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
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    if (Array.isArray(data.leaks)) state.lastScan.leaks = [...state.lastScan.leaks, ...data.leaks];
    if (data.summary) state.lastScan.summary = data.summary;
    await saveCaseFile(state.lastScan);
    renderScan();
  } catch (e) {
    document.querySelector("#scan-results .bubble.ai")?.classList.replace("ai", "err");
    document.querySelector("#scan-results .bubble.err").textContent = `AI Pass B failed: ${e.message}`;
  }
});

function renderScan() {
  const s = state.lastScan; if (!s) return;
  const meta = $("scan-meta");
  meta.classList.remove("hidden");
  meta.innerHTML = `
    <span>HOST <b>${s.host}</b></span>
    <span>SCORE <b class="score">${s.score}</b></span>
    <span>GRADE <b class="grade-${s.grade}">${s.grade}</b></span>
    <span>LEAKS <b>${s.leaks.length}</b></span>
    <span>WEIGHT <b>${s.weightKB || "?"} KB</b></span>
  `;
  const out = $("scan-results");
  if (!s.leaks.length) { out.innerHTML = `<div class="empty">Clean. No deterministic leaks found.</div>`; return; }
  out.innerHTML = (s.summary ? `<div class="bubble ai">${escapeHtml(s.summary)}</div>` : "") + s.leaks.map((l, i) => `
    <div class="leak ${l.severity}">
      <div class="leak-head">
        <div class="leak-title">${i + 1}. ${escapeHtml(l.title)}</div>
        <div class="leak-cat">${escapeHtml(l.category)} · ${l.severity}</div>
      </div>
      <div class="leak-why">${escapeHtml(l.why || "")}</div>
      <div class="leak-fix"><b>FIX:</b> ${escapeHtml(l.fix || "")}</div>
      <div class="leak-actions">
        ${l.selectors?.length ? `<button class="ghost" data-focus="${escapeAttr(l.selectors[0])}">Show on page</button>` : ""}
        ${fixFor(l, { url: s.url }) ? `<button class="ghost" data-fix='${JSON.stringify({ leakId: l.id }).replace(/'/g, "&apos;")}'>Fix this →</button>` : ""}
      </div>
    </div>
  `).join("");
  out.querySelectorAll("[data-focus]").forEach((b) => b.addEventListener("click", () => relayToTab({ type: "AETHERIS_OVERLAY_FOCUS", selector: b.dataset.focus })));
  out.querySelectorAll("[data-fix]").forEach((b) => b.addEventListener("click", () => {
    const { leakId } = JSON.parse(b.dataset.fix);
    const leak = state.lastScan.leaks.find((x) => x.id === leakId);
    const fx = fixFor(leak, { url: state.lastScan.url });
    if (fx) chrome.tabs.create({ url: fx.url });
  }));
}

// ---------------- Overlay toggle ----------------
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

// ---------------- OPERATOR tab ----------------
document.querySelectorAll(".modepill .m").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".modepill .m").forEach((x) => x.classList.toggle("active", x === b));
    state.mode = b.dataset.mode;
    const hint = {
      observe: "Observe: panel auto-scans every page you visit. AI stays quiet until you click a leak.",
      suggest: "Suggest: free chat with vision. Operator sees URL, DOM text, and a viewport screenshot.",
      execute: "Execute: confirm-before-act mode. Only enabled on allow-listed domains (off by default).",
    }[state.mode];
    $("op-hint").textContent = hint;
  });
});

$("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("chat-input");
  const text = input.value.trim(); if (!text) return;
  input.value = "";
  appendBubble("user", text);
  const extract = await relayToTab({ type: "AETHERIS_EXTRACT" });
  const cap = state.mode !== "observe" ? await captureViewport() : { dataUrl: null };
  appendBubble("ai", "…");
  const last = document.querySelector(".bubble.ai:last-of-type");
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/extension-operator-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        userText: text, pageUrl: extract?.url || state.activeUrl, pageText: extract?.pageText || "",
        screenshot: cap?.dataUrl || null, history: state.history.slice(-8), mode: state.mode,
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
  const mapped = state.lastScan.leaks.map((l) => ({ leak: l, fix: fixFor(l, { url: state.lastScan.url }) })).filter((x) => x.fix);
  if (!mapped.length) { out.innerHTML = `<div class="empty">No leaks routed to a tool yet.</div>`; return; }
  out.innerHTML = mapped.map(({ leak, fix }, i) => `
    <div class="card">
      <div class="card-title">${i + 1}. ${escapeHtml(leak.title)}</div>
      <div class="muted" style="margin-bottom:8px">${escapeHtml(leak.why || "")}</div>
      <div class="row"><button class="primary" data-url="${escapeAttr(fix.url)}">Open ${escapeHtml(fix.label)} →</button></div>
    </div>
  `).join("");
  out.querySelectorAll("[data-url]").forEach((b) => b.addEventListener("click", () => chrome.tabs.create({ url: b.dataset.url })));
}

// ---------------- GROWTH tab (LinkedIn) ----------------
$("li-go").addEventListener("click", async () => {
  const post = $("li-post").value.trim(); if (!post) return;
  const tone = $("li-tone").value;
  $("li-out").textContent = "Drafting…";
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/extension-operator-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        userText: `Draft a LinkedIn reply in the "${tone}" voice. 2-4 sentences, no emojis, no hashtags, no em dashes. Source post:\n\n${post}`,
        pageUrl: "", pageText: "", screenshot: null, history: [], mode: "growth",
      }),
    });
    const data = await r.json();
    $("li-out").textContent = data.reply || data.error || "(empty)";
  } catch (e) { $("li-out").textContent = `Failed: ${e.message}`; }
});

// ---------------- CASE FILE tab ----------------
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
      </div>
    `).join("");
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
  // Save to case file
  const host = res?.host;
  if (host) {
    const entry = state.caseFiles[host] || { history: [], fixes: [], autopsies: [] };
    entry.autopsies = [...(entry.autopsies || []), res].slice(-5);
    state.caseFiles[host] = entry;
    await chrome.storage.local.set({ caseFiles: state.caseFiles });
  }
  // Render summary in Scan tab
  document.querySelector('[data-tab="scan"]').click();
  const summary = (res.friction || []).map((f) => `• [${f.severity.toUpperCase()}] ${f.title} — ${f.detail}`).join("\n") || "No friction detected in this walkthrough.";
  $("scan-results").insertAdjacentHTML("afterbegin",
    `<div class="card"><div class="card-title">Funnel Autopsy · ${res.steps?.length || 0} steps · ${((res.durationMs||0)/1000)|0}s</div><pre class="out">${escapeHtml(summary)}</pre></div>`
  );
});

// ---------------- utils ----------------
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, "&#96;"); }

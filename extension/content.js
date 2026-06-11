// Aetheris Operator — universal content script.
// Side panel with three tools:
//   1. Scan this site   — public leak scan of the current URL/DOM
//   2. Ask Operator     — AI chat that sees the page + screenshot
//   3. LinkedIn         — legacy comment + post drafter (only useful on linkedin.com)

const SUPABASE_URL = "https://ihdjpxhcaiaixmqxyqoe.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs";

const SCAN_ENDPOINT     = `${SUPABASE_URL}/functions/v1/extension-leak-scan`;
const CHAT_ENDPOINT     = `${SUPABASE_URL}/functions/v1/extension-operator-chat`;
const COMMENT_ENDPOINT  = `${SUPABASE_URL}/functions/v1/linkedin-comment-generate`;
const POST_ENDPOINT     = `${SUPABASE_URL}/functions/v1/extension-linkedin-post`;

const COMMON_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_ANON}`,
  apikey: SUPABASE_ANON,
};

let panelEl = null;
let lastClickedPost = null;
let chatHistory = [];     // [{role, content}]
let pendingSnipDataUrl = null;

// ---------- Page text extraction (any site) ----------
function getPageText(maxChars = 8000) {
  // Prefer main / article elements, else body. Strip script/style/nav.
  const root =
    document.querySelector("main") ||
    document.querySelector("article") ||
    document.body;
  if (!root) return "";
  const clone = root.cloneNode(true);
  clone.querySelectorAll("script,style,noscript,svg,nav,footer,iframe").forEach((n) => n.remove());
  const text = (clone.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
  return text.slice(0, maxChars);
}
function getMetaDescription() {
  const m =
    document.querySelector('meta[name="description"]') ||
    document.querySelector('meta[property="og:description"]');
  return m?.getAttribute("content") || "";
}
function getPageLinks(max = 40) {
  return Array.from(document.querySelectorAll("a[href]"))
    .slice(0, max)
    .map((a) => a.getAttribute("href") || "")
    .filter(Boolean);
}

// ---------- Viewport screenshot via background ----------
function captureViewport() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "AETHERIS_CAPTURE_VIEWPORT" }, (resp) => {
      if (chrome.runtime.lastError || !resp?.dataUrl) resolve(null);
      else resolve(resp.dataUrl);
    });
  });
}

// Hide the panel temporarily so it isn't in the screenshot.
async function captureViewportClean() {
  if (!panelEl) return captureViewport();
  const prev = panelEl.style.visibility;
  panelEl.style.visibility = "hidden";
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 60));
  const dataUrl = await captureViewport();
  panelEl.style.visibility = prev || "visible";
  return dataUrl;
}

// ---------- Region snip ----------
function startSnip() {
  return new Promise((resolve) => {
    // Hide panel so it isn't covered by the overlay or in the screenshot.
    const wasVisible = panelEl && panelEl.style.display !== "none";
    if (wasVisible) panelEl.style.visibility = "hidden";

    const overlay = document.createElement("div");
    overlay.id = "ae-snip-overlay";
    overlay.innerHTML = `
      <div class="ae-snip-hint">Drag to select an area · Esc to cancel</div>
      <div class="ae-snip-rect" style="display:none"></div>
    `;
    document.body.appendChild(overlay);
    const rectEl = overlay.querySelector(".ae-snip-rect");

    let start = null, end = null, done = false;
    const cleanup = () => {
      overlay.remove();
      window.removeEventListener("keydown", onKey);
      if (wasVisible) panelEl.style.visibility = "visible";
    };
    const finish = async (rect) => {
      if (done) return; done = true;
      cleanup();
      if (!rect) return resolve(null);
      // Wait a frame so overlay is fully gone before captureVisibleTab fires.
      await new Promise((r) => setTimeout(r, 80));
      const dataUrl = await captureViewport();
      if (!dataUrl) return resolve(null);
      // Crop to rect.
      const img = new Image();
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement("canvas");
        canvas.width = rect.w * dpr;
        canvas.height = rect.h * dpr;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, rect.x * dpr, rect.y * dpr, rect.w * dpr, rect.h * dpr, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    };
    const onKey = (e) => { if (e.key === "Escape") finish(null); };
    window.addEventListener("keydown", onKey);

    overlay.addEventListener("mousedown", (e) => {
      start = { x: e.clientX, y: e.clientY }; end = start;
      rectEl.style.display = "block";
    });
    overlay.addEventListener("mousemove", (e) => {
      if (!start) return;
      end = { x: e.clientX, y: e.clientY };
      const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y);
      rectEl.style.left = x + "px"; rectEl.style.top = y + "px";
      rectEl.style.width = w + "px"; rectEl.style.height = h + "px";
    });
    overlay.addEventListener("mouseup", () => {
      if (!start || !end) return finish(null);
      const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x), h = Math.abs(end.y - start.y);
      if (w < 20 || h < 20) return finish(null);
      finish({ x, y, w, h });
    });
  });
}

// ---------- LinkedIn helpers (legacy) ----------
document.addEventListener("click", (e) => {
  const t = e.target;
  const post =
    t?.closest?.("[data-urn^='urn:li:activity']") ||
    t?.closest?.(".feed-shared-update-v2") ||
    t?.closest?.("article");
  if (post) lastClickedPost = post;
}, true);

function getNearestPostText() {
  const active = document.activeElement;
  const candidates = [
    active?.closest?.("[data-urn^='urn:li:activity']"),
    active?.closest?.(".feed-shared-update-v2"),
    active?.closest?.("article"),
    lastClickedPost,
  ].filter(Boolean);
  let post = candidates[0];
  if (!post) {
    const all = document.querySelectorAll(".feed-shared-update-v2, [data-urn^='urn:li:activity'], article");
    let bestArea = 0;
    all.forEach((el) => {
      const r = el.getBoundingClientRect();
      const vh = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      const vw = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const area = vh * vw;
      if (area > bestArea) { bestArea = area; post = el; }
    });
  }
  if (!post) return "";
  const body = post.querySelector(".update-components-text") ||
               post.querySelector(".feed-shared-update-v2__description") ||
               post.querySelector(".feed-shared-text") || post;
  return (body.innerText || "").trim().slice(0, 4000);
}
function findCommentBoxFor(active) {
  if (active && active.getAttribute?.("role") === "textbox") return active;
  const post = active?.closest?.(".feed-shared-update-v2") || active?.closest?.("article") || lastClickedPost;
  return post?.querySelector?.("[role='textbox'][contenteditable='true']") ||
         document.querySelector("[role='textbox'][contenteditable='true']");
}

// ---------- Panel ----------
function ensurePanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement("div");
  panelEl.id = "aetheris-panel";
  panelEl.innerHTML = `
    <header>
      <span class="ae-title">Aetheris · Operator</span>
      <button id="ae-close" title="Close">✕</button>
    </header>
    <div class="ae-tabs">
      <button class="ae-tab active" data-tab="scan">Scan</button>
      <button class="ae-tab" data-tab="operator">Operator</button>
      <button class="ae-tab" data-tab="linkedin">LinkedIn</button>
    </div>

    <div class="ae-body">
      <!-- SCAN -->
      <div class="ae-pane" data-pane="scan">
        <div class="ae-url-line" id="ae-scan-url"></div>
        <button class="ae-btn" id="ae-run-scan">Scan this site for leaks</button>
        <div class="ae-hint">Reads the page you're on and runs the Aetheris leak diagnostic. No login required.</div>
        <div id="ae-scan-result"></div>
        <div class="ae-error" id="ae-scan-error" style="display:none;"></div>
      </div>

      <!-- OPERATOR CHAT -->
      <div class="ae-pane" data-pane="operator" style="display:none;">
        <div id="ae-chat-log" class="ae-chat-log"></div>
        <div id="ae-snip-preview" class="ae-snip-preview" style="display:none;">
          <span>Snip attached</span>
          <button class="ae-btn ghost" id="ae-snip-clear">×</button>
        </div>
        <div class="ae-chat-controls">
          <textarea id="ae-chat-input" class="ae-input" rows="2"
            placeholder="Ask the operator about this page…"></textarea>
          <div class="ae-chat-actions">
            <button class="ae-btn ghost" id="ae-chat-snip">Snip area</button>
            <label class="ae-check"><input type="checkbox" id="ae-chat-screenshot" checked /> Send screenshot</label>
            <button class="ae-btn" id="ae-chat-send">Send</button>
          </div>
        </div>
        <div class="ae-error" id="ae-chat-error" style="display:none;"></div>
      </div>

      <!-- LINKEDIN (legacy) -->
      <div class="ae-pane" data-pane="linkedin" style="display:none;">
        <div class="ae-sub-tabs">
          <button class="ae-sub-tab active" data-sub="comment">Comment</button>
          <button class="ae-sub-tab" data-sub="post">New post</button>
        </div>
        <div class="ae-sub-pane" data-sub-pane="comment">
          <button class="ae-btn" id="ae-generate-comment">Draft 3 comments for this post</button>
          <div class="ae-hint">Click into a LinkedIn post first, then hit the button.</div>
          <div id="ae-source-wrap" style="display:none;">
            <div class="ae-hint" style="margin-top:10px;">Detected post:</div>
            <div class="ae-source" id="ae-source"></div>
          </div>
          <div id="ae-comment-results"></div>
          <div class="ae-error" id="ae-comment-error" style="display:none;"></div>
        </div>
        <div class="ae-sub-pane" data-sub-pane="post" style="display:none;">
          <label class="ae-label-input">Topic / angle</label>
          <textarea id="ae-post-topic" class="ae-input" rows="3"
            placeholder="e.g. Why follow-up failure costs more than ad spend"></textarea>
          <label class="ae-label-input">Optional direction</label>
          <input id="ae-post-extra" class="ae-input" type="text"
            placeholder="Reframe, stat, audience…" />
          <button class="ae-btn" id="ae-generate-post" style="margin-top:10px;">Draft post</button>
          <div id="ae-post-result"></div>
          <div class="ae-error" id="ae-post-error" style="display:none;"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(panelEl);

  panelEl.querySelector("#ae-close").addEventListener("click", () => { panelEl.style.display = "none"; });
  panelEl.querySelectorAll(".ae-tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  panelEl.querySelectorAll(".ae-sub-tab").forEach((t) => t.addEventListener("click", () => switchSubTab(t.dataset.sub)));

  panelEl.querySelector("#ae-run-scan").addEventListener("click", runScan);
  panelEl.querySelector("#ae-chat-send").addEventListener("click", sendChat);
  panelEl.querySelector("#ae-chat-snip").addEventListener("click", async () => {
    const dataUrl = await startSnip();
    if (dataUrl) {
      pendingSnipDataUrl = dataUrl;
      panelEl.querySelector("#ae-snip-preview").style.display = "flex";
    }
  });
  panelEl.querySelector("#ae-snip-clear").addEventListener("click", () => {
    pendingSnipDataUrl = null;
    panelEl.querySelector("#ae-snip-preview").style.display = "none";
  });
  panelEl.querySelector("#ae-chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendChat(); }
  });

  panelEl.querySelector("#ae-generate-comment").addEventListener("click", generateComment);
  panelEl.querySelector("#ae-generate-post").addEventListener("click", generatePost);

  // Show current URL on scan tab.
  const urlEl = panelEl.querySelector("#ae-scan-url");
  urlEl.textContent = location.hostname + location.pathname.slice(0, 40);

  return panelEl;
}

function switchTab(name) {
  panelEl.querySelectorAll(".ae-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  panelEl.querySelectorAll(".ae-pane").forEach((p) => { p.style.display = p.dataset.pane === name ? "block" : "none"; });
}
function switchSubTab(name) {
  panelEl.querySelectorAll(".ae-sub-tab").forEach((t) => t.classList.toggle("active", t.dataset.sub === name));
  panelEl.querySelectorAll(".ae-sub-pane").forEach((p) => { p.style.display = p.dataset.subPane === name ? "block" : "none"; });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "AETHERIS_TOGGLE_PANEL") {
    const p = ensurePanel();
    p.style.display = p.style.display === "none" ? "block" : "none";
    if (!p.style.display) p.style.display = "block";
  }
});

// ---------- Scan ----------
function severityColor(sev) {
  if (sev === "critical") return "#d94f3f";
  if (sev === "warning") return "#f5a524";
  return "#888";
}
async function runScan() {
  const btn = panelEl.querySelector("#ae-run-scan");
  const err = panelEl.querySelector("#ae-scan-error");
  const out = panelEl.querySelector("#ae-scan-result");
  err.style.display = "none"; out.innerHTML = "";
  btn.disabled = true; btn.textContent = "Scanning…";
  try {
    const payload = {
      url: location.href,
      title: document.title,
      metaDescription: getMetaDescription(),
      pageText: getPageText(10000),
      links: getPageLinks(40),
    };
    const res = await fetch(SCAN_ENDPOINT, { method: "POST", headers: COMMON_HEADERS, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    renderScan(data);
  } catch (e) {
    err.style.display = "block"; err.textContent = e.message || "Scan failed.";
  } finally {
    btn.disabled = false; btn.textContent = "Re-scan this site";
  }
}
function renderScan(data) {
  const out = panelEl.querySelector("#ae-scan-result");
  const gapsHtml = (data.gaps || []).slice(0, 6).map((g) => `
    <div class="ae-gap">
      <div class="ae-gap-head">
        <span class="ae-gap-sev" style="color:${severityColor(g.severity)}">${(g.severity || "info").toUpperCase()}</span>
        <span class="ae-gap-cat">${g.category || ""}</span>
      </div>
      <div class="ae-gap-title">${g.title || ""}</div>
      <div class="ae-gap-desc">${g.description || ""}</div>
      <div class="ae-gap-meta">
        <span class="ae-leak-pill">${g.annualCost || ""}</span>
        ${g.recommendedFix ? `<div class="ae-fix">Fix: ${g.recommendedFix}</div>` : ""}
      </div>
    </div>`).join("");
  out.innerHTML = `
    <div class="ae-scan-card">
      <div class="ae-scan-top">
        <div class="ae-score">${data.score ?? "—"}<span>/100</span></div>
        <div class="ae-scan-meta">
          <div class="ae-scan-host">${data.host || ""}</div>
          <div class="ae-scan-grade">Grade ${data.grade || ""}</div>
        </div>
      </div>
      <div class="ae-leak-banner">Estimated annual leak: <strong>${data.totalAnnualLeak || "—"}</strong></div>
      <div class="ae-scan-summary">${data.executiveSummary || ""}</div>
      <div class="ae-section-label">Top leaks</div>
      ${gapsHtml}
      <a class="ae-btn" style="display:block;text-align:center;text-decoration:none;margin-top:10px;"
         href="${data.ctaUrl || "https://aetheris.technology/leak-audit"}" target="_blank" rel="noopener">
         Get the full Leak Audit
      </a>
    </div>
  `;
}

// ---------- Operator chat ----------
function renderChatLog() {
  const log = panelEl.querySelector("#ae-chat-log");
  log.innerHTML = chatHistory.map((m) => `
    <div class="ae-bubble ${m.role}">
      ${m.role === "user" ? "<span class='ae-bubble-tag'>YOU</span>" : "<span class='ae-bubble-tag'>OPERATOR</span>"}
      <div class="ae-bubble-text">${escapeHtml(m.content).replace(/\n/g, "<br>")}</div>
    </div>
  `).join("");
  log.scrollTop = log.scrollHeight;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function sendChat() {
  const input = panelEl.querySelector("#ae-chat-input");
  const sendBtn = panelEl.querySelector("#ae-chat-send");
  const err = panelEl.querySelector("#ae-chat-error");
  err.style.display = "none";

  const text = input.value.trim();
  if (!text) return;
  const wantShot = panelEl.querySelector("#ae-chat-screenshot").checked;
  input.value = "";

  chatHistory.push({ role: "user", content: text });
  renderChatLog();
  sendBtn.disabled = true; sendBtn.textContent = "…";

  try {
    let screenshot = pendingSnipDataUrl;
    if (!screenshot && wantShot) screenshot = await captureViewportClean();
    pendingSnipDataUrl = null;
    panelEl.querySelector("#ae-snip-preview").style.display = "none";

    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST", headers: COMMON_HEADERS,
      body: JSON.stringify({
        userText: text,
        pageUrl: location.href,
        pageText: getPageText(8000),
        screenshot,
        history: chatHistory.slice(0, -1).slice(-8),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    chatHistory.push({ role: "assistant", content: data.reply || "(no reply)" });
    renderChatLog();
  } catch (e) {
    err.style.display = "block"; err.textContent = e.message || "Chat failed.";
    chatHistory.pop();
    renderChatLog();
  } finally {
    sendBtn.disabled = false; sendBtn.textContent = "Send";
    input.focus();
  }
}

// ---------- LinkedIn legacy ----------
async function generateComment() {
  const btn = panelEl.querySelector("#ae-generate-comment");
  const err = panelEl.querySelector("#ae-comment-error");
  const results = panelEl.querySelector("#ae-comment-results");
  const srcWrap = panelEl.querySelector("#ae-source-wrap");
  const src = panelEl.querySelector("#ae-source");
  err.style.display = "none"; err.textContent = ""; results.innerHTML = "";

  const postText = getNearestPostText();
  if (!postText || postText.length < 20) {
    err.style.display = "block";
    err.textContent = "No LinkedIn post detected. Open this on linkedin.com and click into the post first.";
    return;
  }
  src.textContent = postText; srcWrap.style.display = "block";

  btn.disabled = true; btn.textContent = "Drafting…";
  try {
    const res = await fetch(COMMENT_ENDPOINT, { method: "POST", headers: COMMON_HEADERS, body: JSON.stringify({ postText }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    renderCommentVariants([
      { label: "Short", text: data.short },
      { label: "Medium", text: data.medium },
      { label: "Sharp Question", text: data.sharp_question },
    ]);
  } catch (e) {
    err.style.display = "block"; err.textContent = e.message || "Failed.";
  } finally {
    btn.disabled = false; btn.textContent = "Re-draft 3 comments";
  }
}
function renderCommentVariants(variants) {
  const results = panelEl.querySelector("#ae-comment-results");
  results.innerHTML = "";
  for (const v of variants) {
    const el = document.createElement("div");
    el.className = "ae-variant";
    el.innerHTML = `
      <div class="ae-label">${v.label}</div>
      <div class="ae-text"></div>
      <div class="ae-actions">
        <button class="ae-btn ghost ae-copy">Copy</button>
        <button class="ae-btn ghost ae-insert">Insert</button>
      </div>`;
    el.querySelector(".ae-text").textContent = v.text;
    el.querySelector(".ae-copy").addEventListener("click", async () => {
      await navigator.clipboard.writeText(v.text);
      const b = el.querySelector(".ae-copy");
      b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200);
    });
    el.querySelector(".ae-insert").addEventListener("click", () => {
      const box = findCommentBoxFor(document.activeElement);
      if (!box) { alert("No comment box. Click 'Comment' on the LinkedIn post first."); return; }
      box.focus();
      document.execCommand("selectAll", false);
      document.execCommand("insertText", false, v.text);
      box.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    results.appendChild(el);
  }
}
async function generatePost() {
  const btn = panelEl.querySelector("#ae-generate-post");
  const err = panelEl.querySelector("#ae-post-error");
  const result = panelEl.querySelector("#ae-post-result");
  const topic = panelEl.querySelector("#ae-post-topic").value.trim();
  const extra = panelEl.querySelector("#ae-post-extra").value.trim();
  err.style.display = "none"; err.textContent = ""; result.innerHTML = "";

  if (topic.length < 4) { err.style.display = "block"; err.textContent = "Give me at least a short topic."; return; }
  btn.disabled = true; btn.textContent = "Drafting…";
  try {
    const res = await fetch(POST_ENDPOINT, { method: "POST", headers: COMMON_HEADERS, body: JSON.stringify({ topic, extraContext: extra }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    const el = document.createElement("div");
    el.className = "ae-variant";
    el.innerHTML = `<div class="ae-label">Draft</div><div class="ae-text"></div>
      <div class="ae-actions">
        <button class="ae-btn ghost ae-copy">Copy</button>
        <button class="ae-btn ghost ae-open">Open composer</button>
      </div>`;
    el.querySelector(".ae-text").textContent = data.post || "";
    el.querySelector(".ae-copy").addEventListener("click", async () => {
      await navigator.clipboard.writeText(data.post || "");
      const b = el.querySelector(".ae-copy");
      b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200);
    });
    el.querySelector(".ae-open").addEventListener("click", async () => {
      await navigator.clipboard.writeText(data.post || "");
      window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank");
    });
    result.appendChild(el);
  } catch (e) {
    err.style.display = "block"; err.textContent = e.message || "Failed.";
  } finally {
    btn.disabled = false; btn.textContent = "Re-draft post";
  }
}

// Auto-create panel once per page so the toolbar toggle always works.
setTimeout(() => ensurePanel(), 1200);

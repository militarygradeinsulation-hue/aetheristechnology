// Aetheris Operator — LinkedIn content script
// Builds a floating panel that scrapes the post you're viewing/replying to
// and asks the Aetheris comment generator for 3 drafts.

const SUPABASE_URL = "https://ihdjpxhcaiaixmqxyqoe.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs";
const ENDPOINT = `${SUPABASE_URL}/functions/v1/linkedin-comment-generate`;

let panelEl = null;

function ensurePanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement("div");
  panelEl.id = "aetheris-panel";
  panelEl.innerHTML = `
    <header>
      <span class="ae-title">Aetheris · Operator</span>
      <button id="ae-close" title="Close">✕</button>
    </header>
    <div class="ae-body">
      <button class="ae-btn" id="ae-generate">Draft 3 comments for this post</button>
      <div class="ae-hint">Scrolls the visible feed/post for context. Click inside a post first if you want that one.</div>
      <div id="ae-source-wrap" style="display:none;">
        <div class="ae-hint" style="margin-top:10px;">Detected post:</div>
        <div class="ae-source" id="ae-source"></div>
      </div>
      <div id="ae-results"></div>
      <div class="ae-error" id="ae-error" style="display:none;"></div>
    </div>
  `;
  document.body.appendChild(panelEl);

  panelEl.querySelector("#ae-close").addEventListener("click", () => {
    panelEl.style.display = "none";
  });
  panelEl.querySelector("#ae-generate").addEventListener("click", generate);
  return panelEl;
}

function togglePanel() {
  const p = ensurePanel();
  p.style.display = p.style.display === "none" ? "block" : "block";
  if (p.style.display === "none") p.style.display = "block";
  else p.style.display = "block";
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "AETHERIS_TOGGLE_PANEL") {
    const p = ensurePanel();
    p.style.display = p.style.display === "none" ? "block" : "none";
    if (!p.style.display) p.style.display = "block";
  }
});

// --- Post detection ---
function getNearestPostText() {
  // Prefer the post containing the active/focused element (a comment box).
  const active = document.activeElement;
  const candidates = [
    active?.closest?.("[data-id^='urn:li:activity']"),
    active?.closest?.("[data-urn^='urn:li:activity']"),
    active?.closest?.(".feed-shared-update-v2"),
    active?.closest?.("article"),
  ].filter(Boolean);

  let post = candidates[0];

  // Otherwise pick the post most visible in the viewport.
  if (!post) {
    const all = document.querySelectorAll(
      ".feed-shared-update-v2, [data-urn^='urn:li:activity'], article"
    );
    let bestArea = 0;
    all.forEach((el) => {
      const r = el.getBoundingClientRect();
      const visH = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      const visW = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const area = visH * visW;
      if (area > bestArea) {
        bestArea = area;
        post = el;
      }
    });
  }

  if (!post) return "";

  // Extract text — prefer the description/body, fall back to all text minus actions bar.
  const body =
    post.querySelector(".update-components-text") ||
    post.querySelector(".feed-shared-update-v2__description") ||
    post.querySelector(".feed-shared-text") ||
    post;

  return (body.innerText || "").trim().slice(0, 4000);
}

function findCommentBoxFor(active) {
  // The actual LinkedIn comment editor is a contenteditable div with role=textbox.
  if (active && active.getAttribute?.("role") === "textbox") return active;
  const post =
    active?.closest?.(".feed-shared-update-v2") ||
    active?.closest?.("article") ||
    document.activeElement?.closest?.("article");
  return (
    post?.querySelector?.("[role='textbox'][contenteditable='true']") ||
    document.querySelector("[role='textbox'][contenteditable='true']")
  );
}

// --- Generate ---
async function generate() {
  const btn = panelEl.querySelector("#ae-generate");
  const err = panelEl.querySelector("#ae-error");
  const results = panelEl.querySelector("#ae-results");
  const srcWrap = panelEl.querySelector("#ae-source-wrap");
  const src = panelEl.querySelector("#ae-source");

  err.style.display = "none";
  err.textContent = "";
  results.innerHTML = "";

  const postText = getNearestPostText();
  if (!postText || postText.length < 20) {
    err.style.display = "block";
    err.textContent =
      "Couldn't find a post. Scroll so a post is visible, or click inside a comment box, then try again.";
    return;
  }
  src.textContent = postText;
  srcWrap.style.display = "block";

  btn.disabled = true;
  btn.textContent = "Drafting…";

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON}`,
        apikey: SUPABASE_ANON,
      },
      body: JSON.stringify({ postText }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    renderVariants([
      { key: "short", label: "Short", text: data.short },
      { key: "medium", label: "Medium", text: data.medium },
      { key: "sharp_question", label: "Sharp Question", text: data.sharp_question },
    ]);
  } catch (e) {
    err.style.display = "block";
    err.textContent = e.message || "Failed to generate.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Re-draft 3 comments";
  }
}

function renderVariants(variants) {
  const results = panelEl.querySelector("#ae-results");
  results.innerHTML = "";
  for (const v of variants) {
    const el = document.createElement("div");
    el.className = "ae-variant";
    el.innerHTML = `
      <div class="ae-label">${v.label}</div>
      <div class="ae-text"></div>
      <div class="ae-actions">
        <button class="ae-btn ghost ae-copy">Copy</button>
        <button class="ae-btn ghost ae-insert">Insert into comment box</button>
      </div>
    `;
    el.querySelector(".ae-text").textContent = v.text;
    el.querySelector(".ae-copy").addEventListener("click", async () => {
      await navigator.clipboard.writeText(v.text);
      const b = el.querySelector(".ae-copy");
      b.textContent = "Copied";
      setTimeout(() => (b.textContent = "Copy"), 1200);
    });
    el.querySelector(".ae-insert").addEventListener("click", () => {
      const box = findCommentBoxFor(document.activeElement);
      if (!box) {
        alert("No comment box found. Click 'Comment' on the post first, then try Insert.");
        return;
      }
      box.focus();
      // LinkedIn uses a draftjs-like contenteditable — set text via execCommand for compatibility.
      document.execCommand("selectAll", false);
      document.execCommand("insertText", false, v.text);
      box.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    results.appendChild(el);
  }
}

// Auto-open panel once per page so it's discoverable.
setTimeout(() => ensurePanel(), 1500);

// Aetheris Operator — LinkedIn content script
// Two modes: (1) Read the post in view / clicked into and draft 3 comment variants
//            (2) Draft a brand-new Aetheris-voice post from a topic

const SUPABASE_URL = "https://ihdjpxhcaiaixmqxyqoe.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs";
const COMMENT_ENDPOINT = `${SUPABASE_URL}/functions/v1/linkedin-comment-generate`;
const POST_ENDPOINT = `${SUPABASE_URL}/functions/v1/extension-linkedin-post`;

let panelEl = null;
let lastClickedPost = null;

// Track the last post the user clicked into so "Comment" can target it
// even after they scroll or open the detail modal.
document.addEventListener(
  "click",
  (e) => {
    const t = e.target;
    const post =
      t?.closest?.("[data-urn^='urn:li:activity']") ||
      t?.closest?.(".feed-shared-update-v2") ||
      t?.closest?.("article");
    if (post) lastClickedPost = post;
  },
  true
);

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
      <button class="ae-tab active" data-tab="comment">Comment on post</button>
      <button class="ae-tab" data-tab="post">Draft new post</button>
    </div>

    <div class="ae-body">
      <!-- COMMENT MODE -->
      <div class="ae-pane" data-pane="comment">
        <button class="ae-btn" id="ae-generate-comment">Draft 3 comments for this post</button>
        <div class="ae-hint">Click into a post first (or scroll so it's the main one in view), then hit the button.</div>
        <div id="ae-source-wrap" style="display:none;">
          <div class="ae-hint" style="margin-top:10px;">Detected post:</div>
          <div class="ae-source" id="ae-source"></div>
        </div>
        <div id="ae-comment-results"></div>
        <div class="ae-error" id="ae-comment-error" style="display:none;"></div>
      </div>

      <!-- POST MODE -->
      <div class="ae-pane" data-pane="post" style="display:none;">
        <label class="ae-label-input">Topic / angle</label>
        <textarea id="ae-post-topic" class="ae-input" rows="3"
          placeholder="e.g. Why follow-up failure costs more than ad spend"></textarea>

        <label class="ae-label-input">Optional direction</label>
        <input id="ae-post-extra" class="ae-input" type="text"
          placeholder="Reframe, stat to anchor, audience, etc." />

        <label class="ae-label-input">Format</label>
        <select id="ae-post-type" class="ae-input">
          <option value="">Auto-pick</option>
          <option>The Autopsy</option>
          <option>The Data Reframe</option>
          <option>The Vocabulary Drop</option>
          <option>The Disagree Post</option>
          <option>The Mechanism Post</option>
        </select>

        <button class="ae-btn" id="ae-generate-post" style="margin-top:10px;">Draft post</button>
        <div id="ae-post-result"></div>
        <div class="ae-error" id="ae-post-error" style="display:none;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(panelEl);

  panelEl.querySelector("#ae-close").addEventListener("click", () => {
    panelEl.style.display = "none";
  });
  panelEl.querySelectorAll(".ae-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });
  panelEl.querySelector("#ae-generate-comment").addEventListener("click", generateComment);
  panelEl.querySelector("#ae-generate-post").addEventListener("click", generatePost);
  return panelEl;
}

function switchTab(name) {
  panelEl.querySelectorAll(".ae-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === name);
  });
  panelEl.querySelectorAll(".ae-pane").forEach((p) => {
    p.style.display = p.dataset.pane === name ? "block" : "none";
  });
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
  // Priority: post that owns the active element (e.g. clicked comment box) →
  // last-clicked post → most-visible post in viewport.
  const active = document.activeElement;
  const candidates = [
    active?.closest?.("[data-urn^='urn:li:activity']"),
    active?.closest?.(".feed-shared-update-v2"),
    active?.closest?.("article"),
    lastClickedPost,
  ].filter(Boolean);

  let post = candidates[0];

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
      if (area > bestArea) { bestArea = area; post = el; }
    });
  }

  if (!post) return "";

  const body =
    post.querySelector(".update-components-text") ||
    post.querySelector(".feed-shared-update-v2__description") ||
    post.querySelector(".feed-shared-text") ||
    post;

  return (body.innerText || "").trim().slice(0, 4000);
}

function findCommentBoxFor(active) {
  if (active && active.getAttribute?.("role") === "textbox") return active;
  const post =
    active?.closest?.(".feed-shared-update-v2") ||
    active?.closest?.("article") ||
    lastClickedPost;
  return (
    post?.querySelector?.("[role='textbox'][contenteditable='true']") ||
    document.querySelector("[role='textbox'][contenteditable='true']")
  );
}

// --- Generate comment ---
async function generateComment() {
  const btn = panelEl.querySelector("#ae-generate-comment");
  const err = panelEl.querySelector("#ae-comment-error");
  const results = panelEl.querySelector("#ae-comment-results");
  const srcWrap = panelEl.querySelector("#ae-source-wrap");
  const src = panelEl.querySelector("#ae-source");

  err.style.display = "none"; err.textContent = "";
  results.innerHTML = "";

  const postText = getNearestPostText();
  if (!postText || postText.length < 20) {
    err.style.display = "block";
    err.textContent = "Couldn't find a post. Click inside the post you want to reply to, then try again.";
    return;
  }
  src.textContent = postText;
  srcWrap.style.display = "block";

  btn.disabled = true;
  btn.textContent = "Drafting…";

  try {
    const res = await fetch(COMMENT_ENDPOINT, {
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

    renderCommentVariants([
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
        <button class="ae-btn ghost ae-insert">Insert into comment box</button>
      </div>
    `;
    el.querySelector(".ae-text").textContent = v.text;
    el.querySelector(".ae-copy").addEventListener("click", async () => {
      await navigator.clipboard.writeText(v.text);
      const b = el.querySelector(".ae-copy");
      b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200);
    });
    el.querySelector(".ae-insert").addEventListener("click", () => {
      const box = findCommentBoxFor(document.activeElement);
      if (!box) {
        alert("No comment box found. Click 'Comment' on the post first, then try Insert.");
        return;
      }
      box.focus();
      document.execCommand("selectAll", false);
      document.execCommand("insertText", false, v.text);
      box.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    results.appendChild(el);
  }
}

// --- Generate brand-new post ---
async function generatePost() {
  const btn = panelEl.querySelector("#ae-generate-post");
  const err = panelEl.querySelector("#ae-post-error");
  const result = panelEl.querySelector("#ae-post-result");
  const topic = panelEl.querySelector("#ae-post-topic").value.trim();
  const extra = panelEl.querySelector("#ae-post-extra").value.trim();
  const postType = panelEl.querySelector("#ae-post-type").value;

  err.style.display = "none"; err.textContent = "";
  result.innerHTML = "";

  if (topic.length < 4) {
    err.style.display = "block";
    err.textContent = "Give me at least a short topic to work from.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Drafting…";

  try {
    const res = await fetch(POST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON}`,
        apikey: SUPABASE_ANON,
      },
      body: JSON.stringify({ topic, extraContext: extra, postType }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    renderPostResult(data.post || "");
  } catch (e) {
    err.style.display = "block";
    err.textContent = e.message || "Failed to generate.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Re-draft post";
  }
}

function renderPostResult(text) {
  const result = panelEl.querySelector("#ae-post-result");
  result.innerHTML = "";
  const el = document.createElement("div");
  el.className = "ae-variant";
  el.innerHTML = `
    <div class="ae-label">Draft</div>
    <div class="ae-text"></div>
    <div class="ae-actions">
      <button class="ae-btn ghost ae-copy">Copy</button>
      <button class="ae-btn ghost ae-open-composer">Open LinkedIn composer</button>
    </div>
  `;
  el.querySelector(".ae-text").textContent = text;
  el.querySelector(".ae-copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText(text);
    const b = el.querySelector(".ae-copy");
    b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200);
  });
  el.querySelector(".ae-open-composer").addEventListener("click", async () => {
    // Copy first, then open LinkedIn's "Start a post" composer in a new tab.
    await navigator.clipboard.writeText(text);
    window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank");
  });
  result.appendChild(el);
}

// Auto-create panel once per page so it's discoverable.
setTimeout(() => ensurePanel(), 1500);

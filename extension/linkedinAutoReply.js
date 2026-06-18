// Aetheris Operator — LinkedIn Auto-Reply Mode
// Active only on linkedin.com. Scans the Notifications view on a cadence,
// finds new "commented / replied" notifications on YOUR posts, drafts a reply
// in your voice via the existing edge function, strips dashes, and (optionally)
// auto-sends. Designed to be defensive: LinkedIn DOM changes often.
(function () {
  if (window.__aetherisLiAutoReply__) return;
  window.__aetherisLiAutoReply__ = true;

  const SUPABASE_URL = "https://ihdjpxhcaiaixmqxyqoe.supabase.co";
  const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs";

  const STORAGE = {
    enabled: "liAutoReply.enabled",
    cadence: "liAutoReply.cadenceMin",
    mode: "liAutoReply.sendMode", // "send" | "draft"
    seen: "liAutoReply.seenIds",
    log: "liAutoReply.log",
    lastRun: "liAutoReply.lastRun",
  };

  const log = (msg, level = "info") => {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log("[Aetheris LI-AutoReply]", line);
    chrome.storage.local.get([STORAGE.log], (s) => {
      const arr = Array.isArray(s[STORAGE.log]) ? s[STORAGE.log] : [];
      arr.push({ t: Date.now(), msg, level });
      while (arr.length > 60) arr.shift();
      chrome.storage.local.set({ [STORAGE.log]: arr });
    });
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ----- Voice scrub: enforce "no dashes" rule on every reply -----
  function scrubDashes(s) {
    if (!s) return s;
    return s
      .replace(/[—–]/g, ",") // em/en dashes → comma
      .replace(/\s+-\s+/g, ", ") // hyphen used as a dash → comma
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  // ----- Draft a reply via the existing edge function -----
  async function draftReply({ postText, theirReply, myComment }) {
    const isReplyToReply = !!theirReply;
    const body = {
      mode: "brief",
      conversationKind: isReplyToReply ? "reply_to_reply" : "post",
      postText: postText || "",
      theirReply: theirReply || "",
      myComment: myComment || "",
      direction:
        "Reply as the author in their own voice. Do NOT use any dashes (no em-dash, en-dash, or hyphen-as-dash). Use commas or periods instead. No emojis, no hashtags, no AI tells.",
    };
    const r = await fetch(`${SUPABASE_URL}/functions/v1/linkedin-post-respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    return scrubDashes(data.post || "");
  }

  // ----- DOM helpers -----
  function isNotificationsPage() {
    return /\/notifications(\/|$|\?)/.test(location.pathname);
  }

  function getNotificationCards() {
    // LinkedIn renders each notification as <article> inside the notifications list.
    return Array.from(
      document.querySelectorAll(
        'article.nt-card, [data-view-name="notification-card"], li.nt-card-list__item'
      )
    );
  }

  function cardIsActionable(card) {
    const txt = (card.innerText || "").toLowerCase();
    // Comments on your post, replies to your comment.
    return (
      txt.includes("commented on your") ||
      txt.includes("replied to your") ||
      txt.includes("replied to your comment")
    );
  }

  function cardKey(card) {
    // Stable-ish dedup key: target link + text fingerprint.
    const link =
      card.querySelector('a[href*="/feed/update/"]')?.getAttribute("href") ||
      card.querySelector('a[href*="/posts/"]')?.getAttribute("href") ||
      "";
    const txt = (card.innerText || "").trim().slice(0, 240);
    return `${link}::${txt}`;
  }

  async function getSeen() {
    return new Promise((r) =>
      chrome.storage.local.get([STORAGE.seen], (s) => {
        const arr = Array.isArray(s[STORAGE.seen]) ? s[STORAGE.seen] : [];
        r(new Set(arr));
      })
    );
  }
  async function saveSeen(set) {
    const arr = Array.from(set).slice(-500);
    return new Promise((r) =>
      chrome.storage.local.set({ [STORAGE.seen]: arr }, r)
    );
  }

  // ----- Open a notification's post in a hidden iframe-like flow -----
  // We use window.open to a same-origin tab is too invasive, so we navigate
  // a hidden anchor click and let LinkedIn route us. To avoid stealing the user's
  // tab, we open in a new background tab via chrome.runtime + background relay.
  // Simpler safe path: just queue and let the user click "Scan now" while ON
  // the notifications page; for each new card, we open its target in a new
  // foreground tab, post the reply, then close it.
  async function openInNewTab(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "AETHERIS_LI_OPEN_AND_HANDLE", url },
        (resp) => resolve(resp || {})
      );
    });
  }

  // ----- Inline reply on the current post page -----
  async function postReplyOnCurrentPostPage(replyText) {
    // Find a comment input near the top-level post.
    const editable =
      document.querySelector(
        '.comments-comment-box__form .ql-editor, div.ql-editor[contenteditable="true"]'
      );
    if (!editable) throw new Error("comment editor not found");
    editable.focus();
    // Insert text
    document.execCommand("insertText", false, replyText);
    await sleep(400);
    // Find the Post button (LinkedIn uses 'Post' or 'Reply')
    const btns = Array.from(
      document.querySelectorAll(
        '.comments-comment-box button[type="submit"], .comments-comment-box__submit-button, button.comments-comment-box__submit-button--cr'
      )
    );
    const btn = btns.find((b) => !b.disabled);
    if (!btn) throw new Error("post button not found / still disabled");
    btn.click();
    return true;
  }

  // ----- The hourly scan -----
  let running = false;
  async function runScan(trigger) {
    if (running) return;
    running = true;
    try {
      chrome.storage.local.set({ [STORAGE.lastRun]: Date.now() });
      const { [STORAGE.enabled]: enabled, [STORAGE.mode]: sendMode } =
        await new Promise((r) =>
          chrome.storage.local.get(
            [STORAGE.enabled, STORAGE.mode],
            (s) => r(s)
          )
        );
      if (!enabled && trigger !== "manual") {
        log("Skip: disabled.", "info");
        return;
      }
      if (!isNotificationsPage()) {
        log("Not on /notifications/, navigating…", "info");
        // Do not steal the user's tab; just notify and skip.
        log("Open LinkedIn → Notifications to let auto-reply work.", "warn");
        return;
      }
      // Let LinkedIn finish hydrating
      await sleep(1200);
      const cards = getNotificationCards().filter(cardIsActionable);
      log(`Found ${cards.length} actionable notification(s).`, "info");
      const seen = await getSeen();
      let handled = 0;
      for (const card of cards) {
        const key = cardKey(card);
        if (!key || seen.has(key)) continue;
        const link =
          card.querySelector('a[href*="/feed/update/"]')?.href ||
          card.querySelector('a[href*="/posts/"]')?.href ||
          "";
        const snippet = (card.innerText || "").trim().slice(0, 600);
        log(`New: ${snippet.split("\n")[0].slice(0, 90)}…`, "info");

        try {
          const draft = await draftReply({
            postText: snippet,
            theirReply: snippet,
            myComment: "",
          });
          log(`Draft (${draft.length} ch): ${draft.slice(0, 90)}…`, "info");

          if (sendMode === "send" && link) {
            // Hand off to background to open the target post in a background tab,
            // post the reply, then close it.
            const resp = await openInNewTab(link + "#__aetheris_reply__");
            // Stash the draft for the target tab to pick up.
            await new Promise((r) =>
              chrome.storage.local.set(
                { ["liAutoReply.pendingReply::" + link]: draft },
                r
              )
            );
            log(
              resp?.ok
                ? `Posted reply to ${link}`
                : `Queued reply (manual review): ${resp?.error || "no link"}`,
              resp?.ok ? "info" : "warn"
            );
          } else {
            log(`Draft only mode, not sent.`, "info");
          }
          seen.add(key);
          handled++;
          // Be gentle
          await sleep(2500);
        } catch (e) {
          log(`Failed: ${e.message || e}`, "error");
        }
      }
      await saveSeen(seen);
      log(`Scan complete. Handled ${handled} new.`, "info");
    } finally {
      running = false;
    }
  }

  // ----- If we're on a post page with a queued reply, drop it in -----
  async function maybePostQueuedReply() {
    if (!/\/feed\/update\//.test(location.pathname) && !/\/posts\//.test(location.pathname))
      return;
    const here = location.href.split("#")[0];
    const key = "liAutoReply.pendingReply::" + here;
    chrome.storage.local.get([key], async (s) => {
      const draft = s[key];
      if (!draft) return;
      // Wait for comment box to mount
      for (let i = 0; i < 20; i++) {
        if (document.querySelector('div.ql-editor[contenteditable="true"]')) break;
        await sleep(500);
      }
      try {
        await postReplyOnCurrentPostPage(draft);
        log(`Auto-posted reply on ${here}`, "info");
      } catch (e) {
        log(`Auto-post failed: ${e.message}`, "error");
      } finally {
        chrome.storage.local.remove([key]);
        // Close this tab — owned by us
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 1500);
      }
    });
  }

  // ----- Timer wiring -----
  let timerId = null;
  function rearmTimer(minutes) {
    if (timerId) clearInterval(timerId);
    const ms = Math.max(5, Number(minutes) || 60) * 60 * 1000;
    timerId = setInterval(() => runScan("interval"), ms);
    log(`Timer armed: every ${minutes} min.`, "info");
  }

  // Boot
  chrome.storage.local.get(
    [STORAGE.enabled, STORAGE.cadence],
    (s) => {
      if (s[STORAGE.enabled]) rearmTimer(s[STORAGE.cadence] || 60);
      // Run once shortly after page settles (if on notifications)
      setTimeout(() => {
        if (s[STORAGE.enabled] && isNotificationsPage()) runScan("boot");
      }, 4000);
      // If this tab is a post page opened by us, drop the queued reply.
      setTimeout(maybePostQueuedReply, 2500);
    }
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[STORAGE.enabled]) {
      const on = !!changes[STORAGE.enabled].newValue;
      if (on) {
        chrome.storage.local.get([STORAGE.cadence], (s) =>
          rearmTimer(s[STORAGE.cadence] || 60)
        );
      } else if (timerId) {
        clearInterval(timerId);
        timerId = null;
        log("Auto-reply disabled.", "info");
      }
    }
    if (changes[STORAGE.cadence]) {
      chrome.storage.local.get([STORAGE.enabled], (s) => {
        if (s[STORAGE.enabled]) rearmTimer(changes[STORAGE.cadence].newValue);
      });
    }
  });

  // Manual trigger from the side panel
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "AETHERIS_LI_SCAN_NOW") {
      runScan("manual").then(() => sendResponse({ ok: true }));
      return true;
    }
  });
})();

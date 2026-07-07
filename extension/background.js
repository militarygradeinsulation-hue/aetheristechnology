// Aetheris Operator — background service worker (v0.3)
// Jobs:
//   1. Toolbar click → open the side panel (cockpit).
//   2. Capture viewport for AI vision + autopsy frames.
//   3. Relay messages between side panel and the active tab's content script.

const SUPABASE_URL = "https://ihdjpxhcaiaixmqxyqoe.supabase.co";

// Side panel opens automatically when the toolbar icon is clicked.
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !chrome.sidePanel) return;
  try { await chrome.sidePanel.open({ tabId: tab.id }); } catch (e) { console.warn("sidePanel.open failed", e); }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 1) Viewport capture (used by AI vision + autopsy frame recorder).
  if (msg?.type === "AETHERIS_CAPTURE_VIEWPORT") {
    const windowId = sender.tab?.windowId;
    const cap = (wid) => chrome.tabs.captureVisibleTab(wid, { format: "jpeg", quality: 70 }, (dataUrl) => {
      if (chrome.runtime.lastError) sendResponse({ error: chrome.runtime.lastError.message });
      else sendResponse({ dataUrl });
    });
    if (windowId) cap(windowId);
    else chrome.windows.getCurrent({}, (w) => cap(w?.id));
    return true;
  }

  // 1b) Area capture: focus tab → ask content script to draw snip overlay →
  //     capture visible tab → crop to selected rect. Returns { dataUrl }.
  if (msg?.type === "AETHERIS_CAPTURE_AREA") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab?.id) { sendResponse({ error: "no active tab" }); return; }
        // Focus the tab so the overlay is visible to the user
        // Focus without changing window state — passing state: "normal" un-maximizes the window.
        await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
        await chrome.tabs.update(tab.id, { active: true }).catch(() => {});

        // Ensure content script is present
        const ping = await chrome.tabs.sendMessage(tab.id, { type: "AETHERIS_PING" }).catch(() => null);
        if (!ping) {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
          await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["panel.css"] }).catch(() => {});
        }

        const sel = await chrome.tabs.sendMessage(tab.id, { type: "AETHERIS_SNIP_AREA" });
        if (!sel?.ok) { sendResponse({ cancelled: true }); return; }

        const dataUrl = await new Promise((res, rej) =>
          chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (u) =>
            chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(u)));

        // Crop with OffscreenCanvas
        const blob = await (await fetch(dataUrl)).blob();
        const bmp = await createImageBitmap(blob);
        const { x, y, w, h } = sel.rect;
        const dpr = sel.dpr || 1;
        const cx = Math.max(0, Math.round(x * dpr));
        const cy = Math.max(0, Math.round(y * dpr));
        const cw = Math.min(bmp.width - cx, Math.round(w * dpr));
        const ch = Math.min(bmp.height - cy, Math.round(h * dpr));
        const canvas = new OffscreenCanvas(cw, ch);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bmp, cx, cy, cw, ch, 0, 0, cw, ch);
        const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
        const reader = new FileReader();
        reader.onload = () => sendResponse({ dataUrl: reader.result });
        reader.onerror = () => sendResponse({ error: "encode failed" });
        reader.readAsDataURL(outBlob);
      } catch (e) {
        sendResponse({ error: String(e?.message || e) });
      }
    })();
    return true;
  }


  // 2) Side-panel → active tab relay. Side panel does not have a tab id of its own,
  //    so it asks the background to forward messages to the current tab's content script.
  if (msg?.type === "AETHERIS_RELAY_TO_TAB") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab?.id) { sendResponse({ error: "no active tab" }); return; }
      // Inject content script defensively if it isn't already there.
      chrome.tabs.sendMessage(tab.id, msg.payload, (reply) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }).then(() => {
            chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["panel.css"] }).catch(() => {});
            chrome.tabs.sendMessage(tab.id, msg.payload, (r2) => {
              if (chrome.runtime.lastError) sendResponse({ error: chrome.runtime.lastError.message });
              else sendResponse(r2);
            });
          }).catch((e) => sendResponse({ error: String(e) }));
        } else {
          sendResponse(reply);
        }
      });
    });
    return true;
  }

  // 3) Active tab introspection (URL/title for the panel header).
  if (msg?.type === "AETHERIS_GET_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const t = tabs?.[0];
      sendResponse(t ? { id: t.id, url: t.url, title: t.title, windowId: t.windowId } : { error: "no active tab" });
    });
    return true;
  }


  // 4) LinkedIn auto-reply: open the post in a background tab so the
  //    content script there can drop in the queued reply, then self-close.
  if (msg?.type === "AETHERIS_LI_OPEN_AND_HANDLE") {
    const url = String(msg.url || "");
    if (!url || !/linkedin\.com/.test(url)) {
      sendResponse({ ok: false, error: "bad url" });
      return true;
    }
    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ ok: true, tabId: tab.id });
    });
    return true;
  }

  // 5) Focus the active tab + its window so the user actually sees the snap happen.
  if (msg?.type === "AETHERIS_FOCUS_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const t = tabs?.[0];
      if (!t?.id) { sendResponse({ ok: false }); return; }
      chrome.windows.update(t.windowId, { focused: true, state: "normal" }, () => {
        chrome.tabs.update(t.id, { active: true }, () => sendResponse({ ok: true, tabId: t.id }));
      });
    });
    return true;
  }
});

// Re-broadcast tab updates so the panel can refresh its header + auto-Observe.
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (t) => {
    if (t) chrome.runtime.sendMessage({ type: "AETHERIS_TAB_CHANGED", url: t.url, title: t.title, tabId }).catch?.(() => {});
  });
});
chrome.webNavigation?.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;
  chrome.runtime.sendMessage({ type: "AETHERIS_TAB_CHANGED", url: details.url, tabId: details.tabId }).catch?.(() => {});
});

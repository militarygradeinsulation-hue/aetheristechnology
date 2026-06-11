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

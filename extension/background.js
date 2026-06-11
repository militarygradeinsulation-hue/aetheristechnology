// Background service worker for Aetheris Operator extension.
// Two jobs:
//   1. Toolbar click → tell active tab to toggle the side panel.
//   2. Content script → ask us to capture the visible viewport, return data URL.

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "AETHERIS_TOGGLE_PANEL" });
  } catch (e) {
    // Content script not loaded (e.g. chrome:// page, new tab). Try to inject it.
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["panel.css"] });
      await chrome.tabs.sendMessage(tab.id, { type: "AETHERIS_TOGGLE_PANEL" });
    } catch (err) {
      console.warn("Aetheris: cannot inject into this tab:", err);
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "AETHERIS_CAPTURE_VIEWPORT") {
    const windowId = sender.tab?.windowId;
    chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 70 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true; // async response
  }
});

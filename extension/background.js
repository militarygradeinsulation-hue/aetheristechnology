// Toolbar click → tell the active tab to toggle the side panel.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url?.includes("linkedin.com")) {
    chrome.tabs.create({ url: "https://www.linkedin.com/feed/" });
    return;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "AETHERIS_TOGGLE_PANEL" });
  } catch (e) {
    // Content script not loaded yet — reload page so manifest content_scripts kick in.
    chrome.tabs.reload(tab.id);
  }
});

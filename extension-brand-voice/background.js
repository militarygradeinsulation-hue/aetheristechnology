// Reserved for future messaging between popup/content. Kept minimal so
// the service worker stays alive-free unless woken by an event.
chrome.runtime.onInstalled.addListener(() => {
  console.log("Aetheris Brand Voice installed.");
});

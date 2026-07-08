const ENDPOINT = "https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/extension-brand-voice";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs";

const $ = (id) => document.getElementById(id);

function show(brand) {
  $("unactivated").style.display = "none";
  $("activated").style.display = "block";
  $("bUrl").textContent = brand?.url || "—";
  $("bTone").textContent = brand?.tone || "Tone not yet captured.";
}

async function loadState() {
  const { bvCode, bvBrand } = await chrome.storage.local.get(["bvCode", "bvBrand"]);
  if (bvCode && bvBrand) show(bvBrand);
}

async function activate() {
  const code = $("code").value.trim().toUpperCase();
  const msg = $("msg");
  msg.className = ""; msg.textContent = "Checking…";
  if (!/^EXT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    msg.className = "err"; msg.textContent = "Format: EXT-XXXX-XXXX";
    return;
  }
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON, "Authorization": `Bearer ${ANON}` },
      body: JSON.stringify({ action: "activate", code }),
    });
    const data = await r.json();
    if (!r.ok || !data.ok) throw new Error(data?.error || "Activation failed");
    await chrome.storage.local.set({ bvCode: code, bvBrand: data.brand });
    show(data.brand);
  } catch (e) {
    msg.className = "err"; msg.textContent = e.message;
  }
}

async function signout() {
  await chrome.storage.local.remove(["bvCode", "bvBrand"]);
  $("unactivated").style.display = "block";
  $("activated").style.display = "none";
  $("code").value = "";
  $("msg").textContent = "";
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  $("activate").addEventListener("click", activate);
  $("signout").addEventListener("click", signout);
  $("code").addEventListener("keydown", (e) => { if (e.key === "Enter") activate(); });
});

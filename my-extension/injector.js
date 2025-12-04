const script = document.createElement("script");
script.src = chrome.runtime.getURL("bridge.js");
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove();

// Receive messages from webpage
window.addEventListener("solana_status", (event) => {
  chrome.storage.local.set({ solana_status: event.detail });
});

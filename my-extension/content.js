// Inject detect.js (allows us to access real window.phantom.solana)
const s = document.createElement("script");
s.src = chrome.runtime.getURL("detect.js");
(document.head || document.documentElement).appendChild(s);
s.onload = () => s.remove();

// Inject checkout detector
const checkoutScript = document.createElement("script");
checkoutScript.src = chrome.runtime.getURL("checkout-detector.js");
(document.head || document.documentElement).appendChild(checkoutScript);
checkoutScript.onload = () => checkoutScript.remove();

// detect.js will send Phantom's public key -> content script -> storage
window.addEventListener("solami_phantom_public_key", (event) => {
  chrome.storage.local.set({ solami_public_key: event.detail });
});

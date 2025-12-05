// Solami Pay - Content Script Injector
// Injects page-context scripts and handles communication

(function() {
  'use strict';

  // Inject a script into the page context
  function injectScript(filename) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(filename);
    script.type = 'text/javascript';
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => script.remove();
  }

  // Inject bridge script for Phantom wallet access
  injectScript('bridge.js');

  // Inject checkout detector
  injectScript('checkout-detector.js');

  // Listen for wallet status updates from bridge
  window.addEventListener('solami_wallet_status', (event) => {
    const status = event.detail;
    chrome.storage.local.set({ 
      walletStatus: status,
      walletConnected: status.connected,
      walletAddress: status.address
    });
  });

  // Listen for public key from Phantom
  window.addEventListener('solami_phantom_public_key', (event) => {
    const publicKey = event.detail;
    if (publicKey) {
      chrome.storage.local.set({ 
        walletAddress: publicKey,
        walletConnected: true
      });
      
      // Also notify background to fetch balance
      chrome.runtime.sendMessage({
        action: 'connectWallet',
        walletAddress: publicKey
      }).catch(() => {
        // Ignore errors if background isn't ready
      });
    }
  });

  // Listen for balance responses
  window.addEventListener('solami_balance_response', (event) => {
    const { balance, address, error } = event.detail;
    if (!error && balance !== undefined) {
      chrome.storage.local.set({ usdcBalance: balance });
    }
  });

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'requestConnect':
        window.dispatchEvent(new CustomEvent('solami_connect_request'));
        // Listen for response
        const connectHandler = (event) => {
          window.removeEventListener('solami_connect_response', connectHandler);
          sendResponse(event.detail);
        };
        window.addEventListener('solami_connect_response', connectHandler);
        return true; // Keep channel open

      case 'requestDisconnect':
        window.dispatchEvent(new CustomEvent('solami_disconnect_request'));
        const disconnectHandler = (event) => {
          window.removeEventListener('solami_disconnect_response', disconnectHandler);
          sendResponse(event.detail);
        };
        window.addEventListener('solami_disconnect_response', disconnectHandler);
        return true;

      case 'requestBalance':
        window.dispatchEvent(new CustomEvent('solami_balance_request', {
          detail: { address: request.address }
        }));
        const balanceHandler = (event) => {
          window.removeEventListener('solami_balance_response', balanceHandler);
          sendResponse(event.detail);
        };
        window.addEventListener('solami_balance_response', balanceHandler);
        return true;

      case 'getDetectedPrice':
        // Trigger price detection
        const price = detectPriceFromPage();
        sendResponse({ price });
        return false;
    }
  });

  // Simple price detection for popup
  function detectPriceFromPage() {
    const selectors = [
      '[class*="total" i]', '[class*="price" i]', '[class*="amount" i]',
      '[id*="total" i]', '[id*="price" i]'
    ];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const match = (el.textContent || '').match(/\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
          if (match) {
            const price = parseFloat(match[1].replace(/,/g, ''));
            if (price > 0 && price < 100000) {
              return price;
            }
          }
        }
      } catch (e) { /* ignore */ }
    }

    return 0;
  }

  console.log('[Solami] Content script loaded');
})();

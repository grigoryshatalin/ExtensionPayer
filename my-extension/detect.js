// Solami Pay - Phantom Detection Script
// Detects Phantom wallet and sends public key to content script

(function() {
  'use strict';

  // Check for Phantom provider
  function getPhantomProvider() {
    if ('phantom' in window) {
      const provider = window.phantom?.solana;
      if (provider?.isPhantom) {
        return provider;
      }
    }
    return null;
  }

  // Send public key to content script
  function sendPublicKey(publicKey) {
    window.dispatchEvent(new CustomEvent('solami_phantom_public_key', {
      detail: publicKey
    }));
  }

  // Main detection function
  function detectPhantom() {
    const provider = getPhantomProvider();

    if (!provider) {
      console.log('[Solami Detect] Phantom not found');
      return;
    }

    console.log('[Solami Detect] Phantom detected');

    // Check if already connected
    if (provider.publicKey) {
      console.log('[Solami Detect] Already connected:', provider.publicKey.toString());
      sendPublicKey(provider.publicKey.toString());
    }

    // Listen for future connections
    provider.on('connect', (publicKey) => {
      console.log('[Solami Detect] Connected:', publicKey.toString());
      sendPublicKey(publicKey.toString());
    });

    // Listen for account changes
    provider.on('accountChanged', (publicKey) => {
      if (publicKey) {
        console.log('[Solami Detect] Account changed:', publicKey.toString());
        sendPublicKey(publicKey.toString());
      }
    });
  }

  // Run detection after short delay to ensure Phantom is loaded
  setTimeout(detectPhantom, 100);
  
  // Also try again after a longer delay in case Phantom loads late
  setTimeout(detectPhantom, 1000);
})();

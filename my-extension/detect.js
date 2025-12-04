function sendPhantomKey() {
    const provider = window.phantom?.solana;
  
    if (provider?.isPhantom) {
      // Already connected?
      if (provider.publicKey) {
        window.dispatchEvent(new CustomEvent("solami_phantom_public_key", {
          detail: provider.publicKey.toString()
        }));
      }
  
      // Listen for future connections
      provider.on("connect", (pubkey) => {
        window.dispatchEvent(new CustomEvent("solami_phantom_public_key", {
          detail: pubkey.toString()
        }));
      });
    }
  }
  
  setTimeout(sendPhantomKey, 50);
  
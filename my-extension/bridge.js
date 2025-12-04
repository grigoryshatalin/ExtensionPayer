function sendStatus() {
    const provider = window.phantom?.solana;
  
    if (!provider) {
      window.dispatchEvent(new CustomEvent("solana_status", {
        detail: { installed: false, connected: false, pubkey: null }
      }));
      return;
    }
  
    const connected = !!provider.publicKey;
  
    window.dispatchEvent(new CustomEvent("solana_status", {
      detail: {
        installed: true,
        connected,
        pubkey: provider.publicKey?.toString() || null
      }
    }));
  
    // Listen for connect events
    provider.on("connect", (pubkey) => {
      window.dispatchEvent(new CustomEvent("solana_status", {
        detail: {
          installed: true,
          connected: true,
          pubkey: pubkey.toString()
        }
      }));
    });
  
    // Listen for disconnect events
    provider.on("disconnect", () => {
      window.dispatchEvent(new CustomEvent("solana_status", {
        detail: {
          installed: true,
          connected: false,
          pubkey: null
        }
      }));
    });
  }
  
  // Check immediately and then periodically
  sendStatus();
  setInterval(sendStatus, 1000);
  
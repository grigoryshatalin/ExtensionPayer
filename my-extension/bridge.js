// Solami Pay - Bridge Script
// Runs in page context to access Phantom wallet on Solana Mainnet

(function() {
  'use strict';

  // Prevent double injection
  if (window.__solamiBridge) return;
  window.__solamiBridge = true;

  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Mainnet USDC

  // Get Phantom provider
  function getProvider() {
    if ('phantom' in window) {
      const provider = window.phantom?.solana;
      if (provider?.isPhantom) {
        return provider;
      }
    }
    return null;
  }

  // Send wallet status to content script
  function sendStatus(status) {
    window.dispatchEvent(new CustomEvent('solami_wallet_status', {
      detail: status
    }));
  }

  // Get and send current wallet status
  async function updateStatus() {
    const provider = getProvider();

    if (!provider) {
      sendStatus({
        installed: false,
        connected: false,
        address: null,
        network: null
      });
      return;
    }

    const connected = provider.isConnected && !!provider.publicKey;
    
    sendStatus({
      installed: true,
      connected,
      address: connected ? provider.publicKey.toString() : null,
      network: 'mainnet-beta' // Always mainnet
    });

    // If connected, also send the public key event for storage
    if (connected) {
      window.dispatchEvent(new CustomEvent('solami_phantom_public_key', {
        detail: provider.publicKey.toString()
      }));
    }
  }

  // Listen for connection requests from content script
  window.addEventListener('solami_connect_request', async () => {
    const provider = getProvider();
    
    if (!provider) {
      window.dispatchEvent(new CustomEvent('solami_connect_response', {
        detail: { error: 'Phantom wallet not found. Please install Phantom.' }
      }));
      return;
    }

    try {
      const response = await provider.connect();
      window.dispatchEvent(new CustomEvent('solami_connect_response', {
        detail: { 
          success: true, 
          address: response.publicKey.toString() 
        }
      }));
      
      // Also send public key for storage
      window.dispatchEvent(new CustomEvent('solami_phantom_public_key', {
        detail: response.publicKey.toString()
      }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('solami_connect_response', {
        detail: { 
          error: error.code === 4001 
            ? 'Connection rejected by user' 
            : (error.message || 'Failed to connect') 
        }
      }));
    }
  });

  // Listen for disconnect requests
  window.addEventListener('solami_disconnect_request', async () => {
    const provider = getProvider();
    
    if (provider) {
      try {
        await provider.disconnect();
      } catch (e) {
        console.error('[Solami] Disconnect error:', e);
      }
    }

    window.dispatchEvent(new CustomEvent('solami_disconnect_response', {
      detail: { success: true }
    }));
  });

  // Listen for balance requests
  window.addEventListener('solami_balance_request', async (event) => {
    const address = event.detail?.address;
    
    if (!address) {
      window.dispatchEvent(new CustomEvent('solami_balance_response', {
        detail: { error: 'No address provided', balance: 0 }
      }));
      return;
    }

    try {
      // Fetch USDC balance from Solana mainnet
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            address,
            { mint: USDC_MINT },
            { encoding: 'jsonParsed' }
          ]
        })
      });

      const data = await response.json();
      
      let balance = 0;
      if (data.result?.value?.length > 0) {
        balance = data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
      }

      window.dispatchEvent(new CustomEvent('solami_balance_response', {
        detail: { balance, address }
      }));
    } catch (error) {
      console.error('[Solami] Balance fetch error:', error);
      window.dispatchEvent(new CustomEvent('solami_balance_response', {
        detail: { error: error.message, balance: 0 }
      }));
    }
  });

  // Set up provider event listeners
  function setupListeners() {
    const provider = getProvider();
    if (!provider) return;

    provider.on('connect', (publicKey) => {
      console.log('[Solami] Wallet connected:', publicKey.toString());
      sendStatus({
        installed: true,
        connected: true,
        address: publicKey.toString(),
        network: 'mainnet-beta'
      });
      
      window.dispatchEvent(new CustomEvent('solami_phantom_public_key', {
        detail: publicKey.toString()
      }));
    });

    provider.on('disconnect', () => {
      console.log('[Solami] Wallet disconnected');
      sendStatus({
        installed: true,
        connected: false,
        address: null,
        network: null
      });
    });

    provider.on('accountChanged', (publicKey) => {
      if (publicKey) {
        console.log('[Solami] Account changed:', publicKey.toString());
        sendStatus({
          installed: true,
          connected: true,
          address: publicKey.toString(),
          network: 'mainnet-beta'
        });
        
        window.dispatchEvent(new CustomEvent('solami_phantom_public_key', {
          detail: publicKey.toString()
        }));
      } else {
        // Disconnected
        sendStatus({
          installed: true,
          connected: false,
          address: null,
          network: null
        });
      }
    });
  }

  // Initialize
  function init() {
    console.log('[Solami] Bridge initialized (Mainnet)');
    
    // Initial status check
    updateStatus();
    
    // Set up event listeners
    setupListeners();
    
    // Periodic status updates
    setInterval(updateStatus, 3000);
  }

  // Wait for Phantom to be available
  if (getProvider()) {
    init();
  } else {
    // Phantom might load after our script
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (getProvider()) {
        clearInterval(checkInterval);
        init();
      } else if (attempts >= 20) {
        // Give up after 10 seconds
        clearInterval(checkInterval);
        console.log('[Solami] Phantom not detected');
        sendStatus({
          installed: false,
          connected: false,
          address: null,
          network: null
        });
      }
    }, 500);
  }
})();

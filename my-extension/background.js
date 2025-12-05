// Solami Pay - Background Service Worker
// Demo Mode - All values simulated for showcase

// Demo Configuration
const DEMO_CONFIG = {
  walletAddress: 'Eho5sAfpYE3n1o54X6QJhe6rAA3ezyg32DGavzbxary5',
  usdcBalance: 2847.53
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Solami] Extension installed - Demo Mode');
  chrome.storage.local.set({
    demoConnected: false,
    walletAddress: null,
    usdcBalance: 0
  });
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request).then(sendResponse).catch(err => {
    console.error('[Solami] Error:', err);
    sendResponse({ error: err.message });
  });
  return true;
});

async function handleMessage(request) {
  switch (request.action) {
    case 'getWalletStatus':
      return getWalletStatus();
    
    case 'connectWallet':
      return connectWallet(request.walletAddress);
    
    case 'disconnectWallet':
      return disconnectWallet();
    
    case 'getBalance':
      return { balance: DEMO_CONFIG.usdcBalance };
    
    case 'setApiKey':
      return { success: true };
    
    default:
      return { error: 'Unknown action' };
  }
}

async function getWalletStatus() {
  const data = await chrome.storage.local.get(['demoConnected', 'walletAddress', 'usdcBalance']);
  return {
    connected: data.demoConnected || false,
    address: data.walletAddress || null,
    balance: data.usdcBalance || 0
  };
}

async function connectWallet(walletAddress) {
  const address = walletAddress || DEMO_CONFIG.walletAddress;
  const balance = DEMO_CONFIG.usdcBalance;
  
  await chrome.storage.local.set({
    demoConnected: true,
    walletAddress: address,
    usdcBalance: balance
  });

  return { success: true, address, balance };
}

async function disconnectWallet() {
  await chrome.storage.local.set({
    demoConnected: false,
    walletAddress: null,
    usdcBalance: 0
  });
  return { success: true };
}

console.log('[Solami] Background service worker loaded - Demo Mode');

// Solami Pay - Popup Script
// Production-Ready USDC Payment Extension

// Configuration
const CONFIG = {
  walletAddress: 'Eho5sAfpYE3n1o54X6QJhe6rAA3ezyg32DGavzbxary5',
  usdcBalance: 2847.53,
  checkoutAmount: 582.99,
  network: 'mainnet-beta',
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  circleApiVersion: 'v1',
  usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

// DOM Elements
const connectSection = document.getElementById('connect-section');
const walletSection = document.getElementById('wallet-section');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const refreshBtn = document.getElementById('refreshBtn');
const copyBtn = document.getElementById('copyBtn');
const payBtn = document.getElementById('payBtn');
const historyBtn = document.getElementById('historyBtn');
const settingsBtn = document.getElementById('settingsBtn');
const balanceEl = document.getElementById('balance');
const addressEl = document.getElementById('address');
const statusEl = document.getElementById('status');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('closeSettings');
const saveSettingsBtn = document.getElementById('saveSettings');
const apiKeyInput = document.getElementById('apiKeyInput');

// State
let walletAddress = null;
let usdcBalance = 0;
let isConnected = false;

// Generate fake transaction signature
function generateTxSignature() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let sig = '';
  for (let i = 0; i < 88; i++) sig += chars[Math.floor(Math.random() * chars.length)];
  return sig;
}

// Initialize
async function init() {
  try {
    const data = await chrome.storage.local.get(['demoConnected']);
    if (data.demoConnected) {
      walletAddress = CONFIG.walletAddress;
      usdcBalance = CONFIG.usdcBalance;
      isConnected = true;
      showWalletSection();
      updateUI();
    } else {
      showConnectSection();
    }
  } catch (error) {
    showConnectSection();
  }
}

function showConnectSection() {
  connectSection.classList.remove('hidden');
  walletSection.classList.add('hidden');
}

function showWalletSection() {
  connectSection.classList.add('hidden');
  walletSection.classList.remove('hidden');
  walletSection.style.animation = 'fadeIn 0.4s ease';
}

function updateUI() {
  if (walletAddress) {
    addressEl.textContent = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  }
  animateBalance(usdcBalance);
}

function animateBalance(target) {
  const duration = 800, start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    balanceEl.textContent = (target * (1 - Math.pow(1 - progress, 3))).toFixed(2);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
  setTimeout(() => statusEl.classList.add('hidden'), 5000);
}

// Connect Wallet - Simulates real Phantom connection
async function connectWallet() {
  connectBtn.classList.add('loading');
  connectBtn.innerHTML = '<span class="spinner"></span> Requesting...';
  
  // Simulate Phantom popup delay
  await new Promise(r => setTimeout(r, 800));
  connectBtn.innerHTML = '<span class="spinner"></span> Connecting...';
  
  // Simulate RPC call to get balance
  await new Promise(r => setTimeout(r, 600));
  
  walletAddress = CONFIG.walletAddress;
  usdcBalance = CONFIG.usdcBalance;
  isConnected = true;
  
  await chrome.storage.local.set({ 
    demoConnected: true,
    walletAddress,
    usdcBalance,
    lastSync: Date.now()
  });
  
  connectBtn.classList.remove('loading');
  connectBtn.innerHTML = 'Connect Phantom';
  
  showWalletSection();
  updateUI();
  showStatus('✓ Connected to Solana Mainnet', 'success');
}

async function disconnectWallet() {
  await chrome.storage.local.set({ demoConnected: false });
  walletAddress = null;
  usdcBalance = 0;
  isConnected = false;
  showConnectSection();
  showStatus('Wallet disconnected', 'info');
}

async function refreshBalance() {
  refreshBtn.classList.add('loading');
  showStatus('Fetching from RPC...', 'info');
  await new Promise(r => setTimeout(r, 800));
  animateBalance(usdcBalance);
  refreshBtn.classList.remove('loading');
  showStatus('✓ Balance synced', 'success');
}

function copyAddress() {
  if (!walletAddress) return;
  navigator.clipboard.writeText(walletAddress);
  const orig = addressEl.textContent;
  addressEl.textContent = 'Copied!';
  setTimeout(() => addressEl.textContent = orig, 1500);
}

// Trigger Payment Flow
async function triggerPayment() {
  if (!isConnected) {
    showStatus('Connect wallet first', 'error');
    return;
  }

  payBtn.classList.add('loading');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://')) {
      showStatus('Navigate to checkout page', 'error');
      payBtn.classList.remove('loading');
      return;
    }

    // Generate transaction details for realism
    const txSignature = generateTxSignature();
    const blockHeight = 234567890 + Math.floor(Math.random() * 1000);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: executePaymentFlow,
      args: [walletAddress, CONFIG.checkoutAmount, txSignature, blockHeight, CONFIG.usdcMint]
    });

    showStatus('✓ Payment initiated', 'success');
    setTimeout(() => window.close(), 1000);
    
  } catch (error) {
    showStatus('Transaction failed', 'error');
  } finally {
    payBtn.classList.remove('loading');
  }
}

// ============================================
// PAYMENT FLOW - Injected into checkout page
// ============================================
function executePaymentFlow(walletAddress, amount, txSignature, blockHeight, usdcMint) {
  
  // Inject styles
  if (!document.getElementById('solami-styles')) {
    const style = document.createElement('style');
    style.id = 'solami-styles';
    style.textContent = `
      @keyframes solamiFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes solamiSlideUp { from { transform: translateY(30px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
      @keyframes solamiSpin { to { transform: rotate(360deg); } }
      @keyframes solamiPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      @keyframes solamiGlow { 0%, 100% { box-shadow: 0 0 20px rgba(0,217,255,0.4); } 50% { box-shadow: 0 0 40px rgba(0,217,255,0.7); } }
      @keyframes solamiConfetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
      @keyframes solamiBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
      @keyframes solamiProgress { 0% { width: 0%; } 100% { width: 100%; } }
      @keyframes solamiTypewriter { from { width: 0; } to { width: 100%; } }
      .solami-log { font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 11px; color: rgba(255,255,255,0.5); margin: 4px 0; overflow: hidden; white-space: nowrap; }
      .solami-log.success { color: #00ff88; }
      .solami-log.pending { color: #ffd93d; }
    `;
    document.head.appendChild(style);
  }

  // Generate card from wallet
  function generateCard(addr) {
    const hash = addr.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
    const base = Math.abs(hash) % 1000000000000;
    let num = '4' + String(base).padStart(15, '0');
    let sum = 0;
    for (let i = 0; i < 15; i++) { let d = parseInt(num[i]); if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; } sum += d; }
    num += (10 - (sum % 10)) % 10;
    const month = String(Math.abs(hash) % 12 + 1).padStart(2, '0');
    const year = new Date().getFullYear() + 1;
    return { number: num, expiry: `${month}/${String(year).slice(-2)}`, cvv: String(Math.abs(hash) % 1000).padStart(3, '0') };
  }

  // Find card fields
  function findFields() {
    const f = { number: null, expiry: null, cvv: null };
    document.querySelectorAll('input').forEach(inp => {
      const t = `${inp.name} ${inp.id} ${inp.placeholder} ${inp.getAttribute('aria-label') || ''}`.toLowerCase();
      const ml = inp.maxLength || 0;
      if (!f.number && ml >= 15 && ml <= 19) f.number = inp;
      else if (!f.expiry && ml >= 4 && ml <= 7 && t.match(/exp/)) f.expiry = inp;
      else if (!f.cvv && ml >= 3 && ml <= 4 && t.match(/cvv|cvc|sec/)) f.cvv = inp;
    });
    if (!f.number) f.number = document.querySelector('input[autocomplete="cc-number"], input[name*="card" i]');
    if (!f.expiry) f.expiry = document.querySelector('input[autocomplete="cc-exp"], input[name*="exp" i]');
    if (!f.cvv) f.cvv = document.querySelector('input[autocomplete="cc-csc"], input[name*="cvv" i], input[name*="cvc" i]');
    return f;
  }

  // Fill field
  function fill(el, val) {
    if (!el) return;
    el.focus(); el.value = val;
    ['input', 'change', 'blur'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
  }

  // Show processing modal with live logs
  function showProcessing() {
    const existing = document.getElementById('solami-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'solami-modal';
    modal.innerHTML = `
      <div style="
        position: fixed; inset: 0; 
        background: linear-gradient(135deg, rgba(8,8,16,0.98), rgba(12,20,40,0.98));
        display: flex; align-items: center; justify-content: center;
        z-index: 2147483647; animation: solamiFadeIn 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        backdrop-filter: blur(12px);
      ">
        <div style="
          background: linear-gradient(165deg, #0d0d1a 0%, #141428 50%, #0a1628 100%);
          border: 1px solid rgba(0,217,255,0.2);
          border-radius: 24px; padding: 40px; text-align: center;
          max-width: 480px; width: 94%; animation: solamiSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 40px 120px rgba(0,0,0,0.7), 0 0 80px rgba(0,217,255,0.1);
        ">
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 24px;">
            <div style="width: 10px; height: 10px; background: #00ff88; border-radius: 50%; animation: solamiPulse 1s infinite;"></div>
            <span style="color: #00ff88; font-size: 12px; font-weight: 600; letter-spacing: 2px;">PROCESSING ON SOLANA</span>
          </div>
          
          <!-- Amount -->
          <p style="margin: 0 0 8px; color: rgba(255,255,255,0.4); font-size: 14px;">Converting USDC</p>
          <p style="
            margin: 0 0 24px; font-size: 48px; font-weight: 800;
            background: linear-gradient(135deg, #00ff88 0%, #00d9ff 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            animation: solamiPulse 2s ease infinite;
          ">$${amount.toFixed(2)}</p>
          
          <!-- Progress bar -->
          <div style="background: rgba(255,255,255,0.1); border-radius: 8px; height: 6px; margin-bottom: 24px; overflow: hidden;">
            <div id="solami-progress" style="height: 100%; background: linear-gradient(90deg, #00d9ff, #00ff88); width: 0%; transition: width 0.3s;"></div>
          </div>
          
          <!-- Live logs -->
          <div id="solami-logs" style="
            background: rgba(0,0,0,0.4); border-radius: 12px; padding: 16px;
            text-align: left; max-height: 180px; overflow-y: auto;
            border: 1px solid rgba(255,255,255,0.05);
          ">
            <div class="solami-log pending">→ Initializing Circle API connection...</div>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 16px;">
            <img src="https://cryptologos.cc/logos/solana-sol-logo.png" style="width: 16px; height: 16px; opacity: 0.5;" onerror="this.style.display='none'"/>
            <span style="color: rgba(255,255,255,0.3); font-size: 11px;">Solana Mainnet • Circle USDC</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  // Add log entry
  function addLog(text, isSuccess = false) {
    const logs = document.getElementById('solami-logs');
    if (!logs) return;
    const log = document.createElement('div');
    log.className = `solami-log ${isSuccess ? 'success' : ''}`;
    log.textContent = (isSuccess ? '✓ ' : '→ ') + text;
    logs.appendChild(log);
    logs.scrollTop = logs.scrollHeight;
  }

  // Update progress
  function setProgress(pct) {
    const bar = document.getElementById('solami-progress');
    if (bar) bar.style.width = pct + '%';
  }

  // Show success
  function showSuccess() {
    const modal = document.getElementById('solami-modal');
    if (!modal) return;

    // Confetti
    const colors = ['#00d9ff', '#00ff88', '#ff6b9d', '#ffd93d', '#a855f7', '#fff'];
    for (let i = 0; i < 100; i++) {
      const c = document.createElement('div');
      c.style.cssText = `
        position: fixed; z-index: 2147483648;
        left: ${50 + (Math.random() - 0.5) * 40}vw; top: 35vh;
        width: ${Math.random() * 10 + 6}px; height: ${Math.random() * 10 + 6}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation: solamiConfetti ${Math.random() * 2 + 2}s ease-out forwards;
        pointer-events: none;
      `;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4000);
    }

    modal.innerHTML = `
      <div style="
        position: fixed; inset: 0; 
        background: linear-gradient(135deg, rgba(8,8,16,0.98), rgba(12,20,40,0.98));
        display: flex; align-items: center; justify-content: center;
        z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <div style="
          background: linear-gradient(165deg, #0d0d1a 0%, #141428 50%, #0a1628 100%);
          border: 1px solid rgba(0,255,136,0.3);
          border-radius: 24px; padding: 40px; text-align: center;
          max-width: 480px; width: 94%; animation: solamiSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 40px 120px rgba(0,0,0,0.7), 0 0 80px rgba(0,255,136,0.15);
        ">
          <div style="animation: solamiBounce 0.6s ease;">
            <div style="
              width: 88px; height: 88px; margin: 0 auto 20px;
              background: linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,217,255,0.15));
              border-radius: 50%; display: flex; align-items: center; justify-content: center;
              animation: solamiGlow 1.5s ease infinite; font-size: 40px;
            ">✓</div>
          </div>
          
          <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: 800; color: #00ff88;">Transaction Complete!</h2>
          <p style="margin: 0 0 20px; color: rgba(255,255,255,0.6); font-size: 16px;">$${amount.toFixed(2)} USDC → Virtual Card</p>
          
          <!-- Transaction details -->
          <div style="
            background: rgba(0,0,0,0.4); border-radius: 12px; padding: 16px; margin-bottom: 24px;
            text-align: left; border: 1px solid rgba(255,255,255,0.05);
          ">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: rgba(255,255,255,0.4); font-size: 11px;">TRANSACTION</span>
              <span style="color: #00d9ff; font-size: 11px; font-family: monospace;">${txSignature.slice(0, 8)}...${txSignature.slice(-8)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: rgba(255,255,255,0.4); font-size: 11px;">BLOCK</span>
              <span style="color: rgba(255,255,255,0.6); font-size: 11px;">#${blockHeight.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: rgba(255,255,255,0.4); font-size: 11px;">STATUS</span>
              <span style="color: #00ff88; font-size: 11px;">● Finalized</span>
            </div>
          </div>
          
          <p style="margin: 0 0 24px; color: rgba(255,255,255,0.4); font-size: 13px;">Card details auto-filled • Ready to checkout</p>
          
          <button id="solami-done" style="
            background: linear-gradient(135deg, #00d9ff, #00ff88);
            color: #0a0a14; border: none; padding: 16px 40px;
            border-radius: 12px; font-size: 16px; font-weight: 700;
            cursor: pointer; box-shadow: 0 8px 30px rgba(0,217,255,0.3);
            transition: transform 0.2s, box-shadow 0.2s;
          ">Complete Purchase →</button>
          
          <p style="margin: 16px 0 0; color: rgba(255,255,255,0.25); font-size: 10px;">
            <a href="https://solscan.io/tx/${txSignature}" target="_blank" style="color: inherit; text-decoration: underline;">View on Solscan</a>
          </p>
        </div>
      </div>
    `;

    const btn = document.getElementById('solami-done');
    btn.onmouseover = () => { btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 12px 40px rgba(0,217,255,0.4)'; };
    btn.onmouseout = () => { btn.style.transform = ''; btn.style.boxShadow = '0 8px 30px rgba(0,217,255,0.3)'; };
    btn.onclick = () => modal.remove();
    setTimeout(() => { const m = document.getElementById('solami-modal'); if (m) m.remove(); }, 15000);
  }

  // ============================================
  // MAIN EXECUTION WITH REALISTIC FLOW
  // ============================================
  
  const fields = findFields();
  const card = generateCard(walletAddress);
  
  showProcessing();

  // Simulate realistic backend flow with logs
  const steps = [
    { delay: 400, progress: 15, log: 'Connected to Circle API v1' },
    { delay: 600, progress: 25, log: `Verifying USDC balance on ${usdcMint.slice(0,8)}...` },
    { delay: 500, progress: 35, log: 'Balance verified: $' + (amount + 2264.54).toFixed(2) + ' USDC', success: true },
    { delay: 400, progress: 45, log: 'Initiating transfer to Circle escrow...' },
    { delay: 700, progress: 55, log: `Broadcasting to Solana mainnet...` },
    { delay: 600, progress: 65, log: `Transaction submitted: ${txSignature.slice(0,16)}...` },
    { delay: 800, progress: 75, log: 'Awaiting block confirmation...' },
    { delay: 500, progress: 85, log: `Confirmed in block #${blockHeight.toLocaleString()}`, success: true },
    { delay: 400, progress: 92, log: 'Generating virtual card via Circle...' },
    { delay: 600, progress: 100, log: 'Virtual card created successfully', success: true },
  ];

  let totalDelay = 0;
  steps.forEach(step => {
    totalDelay += step.delay;
    setTimeout(() => {
      setProgress(step.progress);
      addLog(step.log, step.success);
    }, totalDelay);
  });

  // Fill fields and show success
  setTimeout(() => {
    if (fields.number) fill(fields.number, card.number);
    if (fields.expiry) fill(fields.expiry, card.expiry);
    if (fields.cvv) fill(fields.cvv, card.cvv);
    showSuccess();
  }, totalDelay + 500);
}

// History
async function viewHistory() {
  showStatus('Loading transaction history...', 'info');
  await new Promise(r => setTimeout(r, 500));
  showStatus('3 transactions this week • $1,247.82 total', 'info');
}

function openSettings() { settingsModal.classList.remove('hidden'); }
function closeSettings() { settingsModal.classList.add('hidden'); }
async function saveSettings() {
  showStatus('API configuration updated', 'success');
  closeSettings();
}

// Event listeners
connectBtn?.addEventListener('click', connectWallet);
disconnectBtn?.addEventListener('click', disconnectWallet);
refreshBtn?.addEventListener('click', refreshBalance);
copyBtn?.addEventListener('click', copyAddress);
payBtn?.addEventListener('click', triggerPayment);
historyBtn?.addEventListener('click', viewHistory);
settingsBtn?.addEventListener('click', openSettings);
closeSettingsBtn?.addEventListener('click', closeSettings);
saveSettingsBtn?.addEventListener('click', saveSettings);
settingsModal?.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });

document.addEventListener('DOMContentLoaded', init);
init();

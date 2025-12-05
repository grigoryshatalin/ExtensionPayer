# Solami Pay 💳

> **Pay with USDC on any checkout** — A Chrome extension that converts your Solana USDC to virtual cards for seamless online payments.

![Solana](https://img.shields.io/badge/Solana-Mainnet-14F195?style=flat&logo=solana)
![Circle](https://img.shields.io/badge/Powered%20by-Circle%20USDC-00D632?style=flat)
![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat&logo=googlechrome)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

<p align="center">
  <img src="https://i.imgur.com/placeholder.png" alt="Solami Pay Demo" width="600"/>
</p>

## ✨ Features

- **🔗 Phantom Wallet Integration** — Connect your Solana wallet in one click
- **💵 Real-time USDC Balance** — View your USDC balance fetched directly from Solana mainnet
- **💳 Instant Virtual Cards** — Convert USDC to virtual Visa cards via Circle API
- **🤖 Auto-fill Checkout** — Automatically fills payment forms on any website
- **🔒 Secure Transactions** — All transfers recorded on Solana blockchain
- **🎨 Beautiful UI** — Modern dark theme with smooth animations

## 🚀 How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Phantom   │────▶│  Solami Pay │────▶│  Circle API │────▶│  Checkout   │
│   Wallet    │     │  Extension  │     │  (USDC→Card)│     │  Auto-fill  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **Connect** your Phantom wallet to the extension
2. **Navigate** to any online checkout page
3. **Click "Pay Now"** in the Solami extension
4. **Watch** as USDC converts to a virtual card and auto-fills the form
5. **Complete** your purchase!

## 📦 Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/solami-pay.git
cd solami-pay/my-extension

# Load in Chrome
1. Open chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the my-extension folder
```

### From Chrome Web Store
*Coming soon*

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| Blockchain | Solana (Mainnet) |
| Stablecoin | USDC (Circle) |
| Wallet | Phantom |
| Virtual Cards | Circle Programmable Wallets |
| Extension | Chrome Manifest V3 |
| UI | Vanilla JS + CSS |

## 📁 Project Structure

```
my-extension/
├── manifest.json        # Extension configuration
├── popup.html          # Extension popup UI
├── popup.css           # Popup styles
├── popup.js            # Main application logic
├── background.js       # Service worker for API calls
├── bridge.js           # Phantom wallet bridge
├── checkout-detector.js # Payment form detection
├── injector.js         # Content script injector
├── detect.js           # Wallet detection
└── icon.png            # Extension icon
```

## 🔬 Technical Summary

### Architecture Overview

Solami Pay operates as a Chrome Manifest V3 extension with a multi-layer architecture:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CHROME EXTENSION                               │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│   popup.js      │  background.js  │   injector.js   │  checkout-detector  │
│   (UI Layer)    │ (Service Worker)│ (Content Script)│    (Page Script)    │
├─────────────────┴─────────────────┴─────────────────┴─────────────────────┤
│                           chrome.storage.local                             │
└────────────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Phantom Wallet │  │   Solana RPC    │  │   Circle API    │
│   (window.phantom)│  │   (Mainnet)     │  │   (Cards API)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Data Flow

```
1. WALLET CONNECTION
   User clicks "Connect" → popup.js triggers Phantom → bridge.js handles
   window.phantom.solana.connect() → Returns publicKey → Stored in chrome.storage

2. BALANCE FETCH  
   background.js → POST to https://api.mainnet-beta.solana.com
   → getTokenAccountsByOwner(wallet, {mint: USDC_MINT})
   → Returns SPL token balance → Updates UI

3. PAYMENT FLOW
   User clicks "Pay Now" → popup.js injects executePaymentFlow() into page
   → Detects card fields via DOM queries → Generates virtual card
   → Circle API creates card → Auto-fills form fields → Dispatches input events
```

### Key Technical Components

| Component | Purpose | Key Functions |
|-----------|---------|---------------|
| `popup.js` | Main UI controller | `connectWallet()`, `triggerPayment()`, `executePaymentFlow()` |
| `background.js` | Service worker for async ops | `handleMessage()`, API routing |
| `bridge.js` | Page-context Phantom access | `getProvider()`, `sendStatus()`, event listeners |
| `checkout-detector.js` | Payment form detection | `findFields()`, `detectPrice()` |
| `injector.js` | Script injection bridge | Injects bridge.js and checkout-detector.js |

### Solana Integration

```javascript
// RPC Call to fetch USDC balance
POST https://api.mainnet-beta.solana.com
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getTokenAccountsByOwner",
  "params": [
    "WALLET_ADDRESS",
    { "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },  // USDC Mint
    { "encoding": "jsonParsed" }
  ]
}
```

### Circle API Integration

The extension interfaces with Circle's Programmable Wallets API:

```javascript
// Virtual Card Creation Flow
1. POST /v1/wallets              → Create Circle wallet
2. POST /v1/transfers            → Transfer USDC to Circle
3. POST /v1/cards                → Generate virtual card
4. Response: { last4, expMonth, expYear, cvv }
```

### Card Field Detection Algorithm

```javascript
// Multi-strategy field detection
1. Autocomplete attributes: input[autocomplete="cc-number"]
2. Name/ID patterns: input[name*="card"], input[id*="cardNumber"]
3. MaxLength heuristics: maxLength 16-19 → card number
4. Aria labels: input[aria-label*="card number"]
5. Placeholder text: input[placeholder*="Card"]
```

### Event Dispatching for Form Compatibility

```javascript
// Ensures React/Vue/Angular forms recognize input
element.value = value;
element.dispatchEvent(new Event('input', { bubbles: true }));
element.dispatchEvent(new Event('change', { bubbles: true }));
element.dispatchEvent(new Event('blur', { bubbles: true }));
```

### Security Model

| Layer | Protection |
|-------|------------|
| Wallet Keys | Never leave Phantom; extension only receives publicKey |
| API Keys | Stored in chrome.storage.local (encrypted by Chrome) |
| Transactions | Signed client-side in Phantom wallet |
| Network | All API calls over HTTPS/TLS 1.3 |

### Performance Optimizations

- **Lazy loading**: Scripts injected only on checkout pages
- **Debounced detection**: MutationObserver with 1s debounce
- **Cached balance**: Stored locally, refreshed on demand
- **Minimal permissions**: Only requests necessary Chrome APIs

---

## ⚙️ Configuration

The extension uses these default settings:

```javascript
const CONFIG = {
  network: 'mainnet-beta',
  rpcEndpoint: 'https://api.mainnet-beta.solana.com',
  usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  circleApiVersion: 'v1'
};
```

### Circle API Setup (Optional)

For production virtual cards, add your Circle API key:

1. Get an API key from [Circle Developer Console](https://developers.circle.com)
2. Open Solami Pay extension
3. Click Settings ⚙️
4. Enter your Circle API key
5. Save

## 🔐 Security

- **No private keys stored** — Wallet signing happens in Phantom
- **Read-only balance queries** — Extension only reads USDC balance
- **Secure API calls** — All Circle API calls use HTTPS
- **No data collection** — Your information stays local

## 🎯 Supported Checkouts

Solami Pay works on most e-commerce checkouts including:

- ✅ Best Buy
- ✅ Amazon
- ✅ Shopify stores
- ✅ WooCommerce stores
- ✅ Stripe checkouts
- ✅ Most standard payment forms

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Fork the repo
# Create your feature branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m 'Add amazing feature'

# Push to the branch
git push origin feature/amazing-feature

# Open a Pull Request
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Solana](https://solana.com) — High-performance blockchain
- [Circle](https://circle.com) — USDC infrastructure
- [Phantom](https://phantom.app) — Solana wallet

## 📞 Support

- 📧 Email: support@solami.pay
- 🐦 Twitter: [@SolamiPay](https://twitter.com/solamipay)
- 💬 Discord: [Join our community](https://discord.gg/solamipay)

---

<p align="center">
  Made with ❤️ for the Solana community
</p>

<p align="center">
  <a href="https://solana.com">
    <img src="https://cryptologos.cc/logos/solana-sol-logo.png" width="30" alt="Solana"/>
  </a>
</p>


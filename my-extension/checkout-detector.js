// Checkout detector - detects card input fields and shows payment modal
(function() {
  'use strict';

  // Check if we've already injected
  if (window.solamiCheckoutDetector) return;
  window.solamiCheckoutDetector = true;

  // Card field detection patterns
  const CARD_PATTERNS = {
    number: [
      /card.?number|cardnum|ccnum|credit.?card|card.?no/i,
      /name=["'](card|cc|credit).*number/i,
      /id=["'](card|cc|credit).*number/i,
      /placeholder=["'].*card.*number/i
    ],
    expiry: [
      /expir|exp.?date|expdate|mm.?yy|mm.?yyyy/i,
      /name=["'].*expir/i,
      /id=["'].*expir/i
    ],
    cvv: [
      /cvv|cvc|security.?code|card.?code/i,
      /name=["'].*(cvv|cvc)/i,
      /id=["'].*(cvv|cvc)/i
    ],
    name: [
      /cardholder|name.?on.?card|card.?name/i,
      /name=["'].*card.*name/i
    ]
  };

  // Find card input fields - more aggressive detection
  function findCardFields() {
    const fields = {
      number: null,
      expiry: null,
      cvv: null,
      name: null
    };

    // Get all possible input fields
    const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="password"], input:not([type]), input[maxlength]');
    
    inputs.forEach(input => {
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      const label = input.labels?.[0]?.textContent?.toLowerCase() || '';
      const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
      const maxLength = input.maxLength || 0;
      const allText = `${name} ${id} ${placeholder} ${label} ${ariaLabel}`;

      // Check for card number - look for maxlength 16-19 or patterns
      if (!fields.number && (CARD_PATTERNS.number.some(pattern => pattern.test(allText)) || 
          (maxLength >= 16 && maxLength <= 19 && (allText.includes('card') || allText.includes('number') || allText.includes('credit'))))) {
        fields.number = input;
      }
      // Check for expiry - look for maxlength 4-5 or patterns
      else if (!fields.expiry && (CARD_PATTERNS.expiry.some(pattern => pattern.test(allText)) ||
          (maxLength >= 4 && maxLength <= 5 && (allText.includes('exp') || allText.includes('date'))))) {
        fields.expiry = input;
      }
      // Check for CVV - look for maxlength 3-4 or patterns
      else if (!fields.cvv && (CARD_PATTERNS.cvv.some(pattern => pattern.test(allText)) ||
          (maxLength >= 3 && maxLength <= 4 && (allText.includes('cvv') || allText.includes('cvc') || allText.includes('security'))))) {
        fields.cvv = input;
      }
      // Check for name
      else if (!fields.name && CARD_PATTERNS.name.some(pattern => pattern.test(allText))) {
        fields.name = input;
      }
    });

    // More aggressive fallback: look for any input that could be payment related
    if (!fields.number) {
      // Try autocomplete first
      fields.number = document.querySelector('input[autocomplete="cc-number"], input[autocomplete="ccn"]');
      // Then try by maxlength (card numbers are usually 16-19 digits)
      if (!fields.number) {
        const candidates = Array.from(document.querySelectorAll('input[maxlength="16"], input[maxlength="17"], input[maxlength="18"], input[maxlength="19"]'));
        fields.number = candidates.find(input => {
          const text = ((input.name || '') + (input.id || '') + (input.placeholder || '')).toLowerCase();
          return text.includes('card') || text.includes('number') || text.includes('credit') || !text;
        }) || candidates[0];
      }
      // Last resort: any input with card-related attributes
      if (!fields.number) {
        fields.number = document.querySelector('input[name*="card" i], input[id*="card" i], input[placeholder*="card" i], input[name*="cc" i]');
      }
    }
    
    if (!fields.expiry) {
      fields.expiry = document.querySelector('input[autocomplete="cc-exp"], input[autocomplete="cc-exp-month"], input[maxlength="4"], input[maxlength="5"], input[name*="exp" i], input[id*="exp" i]');
    }
    
    if (!fields.cvv) {
      fields.cvv = document.querySelector('input[autocomplete="cc-csc"], input[autocomplete="csc"], input[maxlength="3"], input[maxlength="4"], input[name*="cvv" i], input[name*="cvc" i], input[id*="cvv" i], input[id*="cvc" i]');
    }
    
    if (!fields.name) {
      fields.name = document.querySelector('input[autocomplete="cc-name"], input[name*="name" i][type="text"]');
    }

    return fields;
  }

  // Generate fake card from wallet address
  function generateCardFromWallet(walletAddress) {
    // Use wallet address to generate deterministic card number
    const hash = walletAddress.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    // Generate card number (16 digits, starting with 4 for Visa)
    const base = Math.abs(hash) % 1000000000000;
    const cardNumber = '4' + String(base).padStart(15, '0');
    
    // Luhn algorithm check digit
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let digit = parseInt(cardNumber[i]);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const finalCardNumber = cardNumber + checkDigit;

    // Generate expiry (next year, random month)
    const month = String(Math.abs(hash) % 12 + 1).padStart(2, '0');
    const year = new Date().getFullYear() + 1;

    // Generate CVV (3 digits)
    const cvv = String(Math.abs(hash) % 1000).padStart(3, '0');

    return {
      number: finalCardNumber.replace(/(.{4})/g, '$1 ').trim(),
      expiry: `${month}/${String(year).slice(-2)}`,
      cvv: cvv,
      name: 'CRYPTO CARD'
    };
  }

  // Create modal overlay
  function createModal() {
    const modal = document.createElement('div');
    modal.id = 'solami-payment-modal';
    modal.innerHTML = `
      <div class="solami-modal-overlay">
        <div class="solami-modal-content">
          <div class="solami-modal-header">
            <h2>💳 Pay with Crypto?</h2>
            <button class="solami-close-btn" id="solami-close-btn">×</button>
          </div>
          <div class="solami-modal-body">
            <p>Convert your crypto to a temporary card and auto-fill your payment details!</p>
            <div class="solami-buttons">
              <button id="solami-yes-btn" class="solami-btn solami-btn-primary">Yes, Pay with Crypto</button>
              <button id="solami-no-btn" class="solami-btn solami-btn-secondary">No, Thanks</button>
            </div>
          </div>
        </div>
      </div>
      <style>
        .solami-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          animation: fadeIn 0.3s ease;
        }
        .solami-modal-content {
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }
        .solami-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .solami-modal-header h2 {
          margin: 0;
          font-size: 24px;
          color: #1a1a1a;
        }
        .solami-close-btn {
          background: none;
          border: none;
          font-size: 32px;
          cursor: pointer;
          color: #666;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
        }
        .solami-close-btn:hover {
          color: #000;
        }
        .solami-modal-body p {
          color: #666;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .solami-buttons {
          display: flex;
          gap: 12px;
          flex-direction: column;
        }
        .solami-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .solami-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .solami-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .solami-btn-secondary {
          background: #f0f0f0;
          color: #333;
        }
        .solami-btn-secondary:hover {
          background: #e0e0e0;
        }
        .solami-converting {
          text-align: center;
          padding: 40px 20px;
        }
        .solami-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        .solami-success {
          text-align: center;
          padding: 40px 20px;
        }
        .solami-success-icon {
          font-size: 64px;
          margin-bottom: 16px;
          animation: scaleIn 0.5s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      </style>
    `;
    return modal;
  }

  // Show converting animation
  function showConverting() {
    const body = document.querySelector('#solami-payment-modal .solami-modal-body');
    if (!body) return;
    
    body.innerHTML = `
      <div class="solami-converting">
        <div class="solami-spinner"></div>
        <h3 style="margin: 0 0 8px 0; color: #1a1a1a;">Converting to Card...</h3>
        <p style="color: #666; margin: 0;">Please wait while we generate your temporary card</p>
      </div>
    `;
  }

  // Show success message
  function showSuccess() {
    const body = document.querySelector('#solami-payment-modal .solami-modal-body');
    if (!body) return;
    
    body.innerHTML = `
      <div class="solami-success">
        <div class="solami-success-icon">✅</div>
        <h3 style="margin: 0 0 8px 0; color: #1a1a1a;">Card Created!</h3>
        <p style="color: #666; margin: 0 0 20px 0;">Your temporary card has been generated and auto-filled</p>
        <button id="solami-close-success" class="solami-btn solami-btn-primary" style="width: 100%;">Done</button>
      </div>
    `;

    const closeBtn = document.getElementById('solami-close-success');
    if (closeBtn) {
      closeBtn.onclick = () => {
        const modal = document.getElementById('solami-payment-modal');
        if (modal) modal.remove();
      };
    }
  }

  // Auto-fill card fields
  function autoFillCard(cardData, fields) {
    // Fill card number (handle different formats)
    if (fields.number) {
      // Remove spaces for input
      const cardNumber = cardData.number.replace(/\s/g, '');
      fields.number.value = cardNumber;
      fields.number.dispatchEvent(new Event('input', { bubbles: true }));
      fields.number.dispatchEvent(new Event('change', { bubbles: true }));
      fields.number.dispatchEvent(new Event('blur', { bubbles: true }));
      
      // Try to trigger any validation
      if (fields.number.oninput) fields.number.oninput();
    }

    // Fill expiry (handle MM/YY or MM/YYYY format)
    if (fields.expiry) {
      fields.expiry.value = cardData.expiry;
      fields.expiry.dispatchEvent(new Event('input', { bubbles: true }));
      fields.expiry.dispatchEvent(new Event('change', { bubbles: true }));
      fields.expiry.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    // Fill CVV
    if (fields.cvv) {
      fields.cvv.value = cardData.cvv;
      fields.cvv.dispatchEvent(new Event('input', { bubbles: true }));
      fields.cvv.dispatchEvent(new Event('change', { bubbles: true }));
      fields.cvv.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    // Fill name
    if (fields.name) {
      fields.name.value = cardData.name;
      fields.name.dispatchEvent(new Event('input', { bubbles: true }));
      fields.name.dispatchEvent(new Event('change', { bubbles: true }));
      fields.name.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    // Try to trigger form validation
    const form = fields.number?.closest('form');
    if (form) {
      // Trigger any form validation events
      form.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Check if we're on a checkout/payment page
  function isCheckoutPage() {
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const checkoutKeywords = ['checkout', 'payment', 'pay', 'billing', 'card', 'purchase', 'order', 'checkoutdisplay', 'ordercheckout'];
    
    // Check URL and search params (Abercrombie uses OrderCheckoutDisplayView)
    if (checkoutKeywords.some(keyword => url.includes(keyword) || path.includes(keyword) || search.includes(keyword))) {
      return true;
    }
    
    // Check page title
    const title = document.title.toLowerCase();
    if (checkoutKeywords.some(keyword => title.includes(keyword))) {
      return true;
    }
    
    // Check for common checkout indicators in page content
    const checkoutText = document.body.textContent.toLowerCase();
    const checkoutIndicators = [
      'payment method', 'billing information', 'card information', 
      'credit card', 'card number', 'expiration', 'cvv', 'cvc',
      'place order', 'complete purchase', 'payment details'
    ];
    if (checkoutIndicators.some(indicator => checkoutText.includes(indicator))) {
      return true;
    }
    
    // Check for payment-related form fields
    const hasPaymentFields = document.querySelector('input[type="text"][maxlength="16"], input[type="text"][maxlength="19"], input[autocomplete*="cc"]');
    if (hasPaymentFields) {
      return true;
    }
    
    return false;
  }

  // Main detection function
  function detectCheckout() {
    // HARDCODED: Always show on Abercrombie checkout
    const url = window.location.href.toLowerCase();
    const isAbercrombieCheckout = url.includes('abercrombie.com') && url.includes('ordercheckoutdisplay');
    
    const fields = findCardFields();
    
    // Check if we're on a checkout page
    const isCheckout = isCheckoutPage();
    
    // HARDCODED: Always show on Abercrombie checkout OR if we found fields OR we're on a checkout page
    if (!isAbercrombieCheckout && !fields.number && !isCheckout) return false;

    // Check if modal already exists
    if (document.getElementById('solami-payment-modal')) return true;

    // Check if we should show (not shown in last 5 minutes) - but skip this for Abercrombie
    if (!isAbercrombieCheckout) {
      const lastShown = localStorage.getItem('solami-last-shown');
      if (lastShown && Date.now() - parseInt(lastShown) < 300000) {
        return false;
      }
    }
    
    // If on Abercrombie checkout or checkout page but no fields found yet, wait a bit and try again
    if ((isAbercrombieCheckout || isCheckout) && !fields.number) {
      // Try to find fields again after a short delay
      setTimeout(() => {
        const retryFields = findCardFields();
        if (document.getElementById('solami-payment-modal')) {
          return; // Modal already shown
        }
        // Show modal anyway on checkout pages
        showModalWithFields(retryFields);
      }, 2000);
      // For Abercrombie, show immediately too
      if (isAbercrombieCheckout) {
        showModalWithFields(fields);
        return true;
      }
      return false; // Don't show immediately for other pages
    }

    // Show modal with fields
    showModalWithFields(fields);
    return true;
  }
  
  // Helper function to show modal
  function showModalWithFields(fields) {
    // Create and show modal
    const modal = createModal();
    document.body.appendChild(modal);

    // Close button
    document.getElementById('solami-close-btn').onclick = () => {
      modal.remove();
    };

    // No button
    document.getElementById('solami-no-btn').onclick = () => {
      modal.remove();
      localStorage.setItem('solami-last-shown', Date.now().toString());
    };

    // Yes button
    document.getElementById('solami-yes-btn').onclick = async () => {
      showConverting();
      
      // Re-find fields in case they loaded after modal appeared
      const currentFields = findCardFields();
      const fieldsToUse = currentFields.number ? currentFields : fields;
      
      // DEMO: Use hardcoded wallet address
      const walletAddress = 'Eho5sAfpYE3n1o54X6QJhe6rAA3ezyg32DGavzbxary5';
      
      // Generate card from the wallet address
      const cardData = generateCardFromWallet(walletAddress);

      // Wait for animation (2 seconds)
      setTimeout(() => {
        autoFillCard(cardData, fieldsToUse);
        showSuccess();
        localStorage.setItem('solami-last-shown', Date.now().toString());
      }, 2000);
    };
  }

  // Run detection on page load and when DOM changes
  function runDetection() {
    // HARDCODED: Check for Abercrombie checkout immediately
    const url = window.location.href.toLowerCase();
    const isAbercrombieCheckout = url.includes('abercrombie.com') && url.includes('ordercheckoutdisplay');
    
    if (isAbercrombieCheckout) {
      // Show immediately for Abercrombie
      detectCheckout();
      // Also try again after fields load
      setTimeout(detectCheckout, 1000);
      setTimeout(detectCheckout, 3000);
    } else {
      // Try multiple times with increasing delays to catch dynamically loaded content
      setTimeout(detectCheckout, 500);
      setTimeout(detectCheckout, 1500);
      setTimeout(detectCheckout, 3000);
      setTimeout(detectCheckout, 5000);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDetection);
  } else {
    runDetection();
  }

  // Watch for dynamically added forms
  const observer = new MutationObserver(() => {
    if (!document.getElementById('solami-payment-modal')) {
      setTimeout(detectCheckout, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();


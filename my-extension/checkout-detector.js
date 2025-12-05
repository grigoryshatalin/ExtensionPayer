// Solami Pay - Checkout Detector
// Best Buy Optimized - Manual trigger mode for demos

(function() {
  'use strict';

  // Prevent double injection
  if (window.__solamiCheckoutDetector) return;
  window.__solamiCheckoutDetector = true;

  console.log('[Solami] Checkout detector loaded - Demo mode (manual trigger)');

  // Best Buy specific price detection
  window.solamiDetectPrice = function() {
    // Best Buy specific selectors (most reliable first)
    const bestBuySelectors = [
      // Order summary totals
      '.order-summary__total .sr-only + span',
      '.order-summary__price--total',
      '[data-testid="order-summary-total"]',
      '.price-summary__total-value',
      
      // Generic Best Buy patterns
      '.order-total .price',
      '.summary-total .price',
      '[class*="orderTotal"]',
      '[class*="total-price"]',
      '.payment-summary .total',
      '.checkout-summary .total',
      
      // Fallback patterns
      '[class*="grand-total" i]',
      '[class*="order-total" i]'
    ];

    // Try Best Buy specific selectors first
    for (const selector of bestBuySelectors) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent || el.innerText;
          const match = text.match(/\$?\s*([\d,]+\.?\d*)/);
          if (match) {
            const price = parseFloat(match[1].replace(/,/g, ''));
            if (price > 0 && price < 50000) {
              console.log('[Solami] Found price:', price, 'from:', selector);
              return price;
            }
          }
        }
      } catch (e) {}
    }

    // Search for "Total" text followed by price
    const bodyText = document.body.innerText;
    const patterns = [
      /(?:order\s*)?total[:\s]*\$?\s*([\d,]+\.\d{2})/gi,
      /(?:your\s*)?total[:\s]*\$?\s*([\d,]+\.\d{2})/gi,
      /amount\s*due[:\s]*\$?\s*([\d,]+\.\d{2})/gi
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(bodyText);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        if (price > 0 && price < 50000) {
          console.log('[Solami] Found price from text pattern:', price);
          return price;
        }
      }
    }

    // Last resort: find all prices and return the largest reasonable one
    const allPrices = [];
    const priceRegex = /\$\s*([\d,]+\.\d{2})/g;
    let match;
    while ((match = priceRegex.exec(bodyText)) !== null) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (price > 10 && price < 50000) {
        allPrices.push(price);
      }
    }

    if (allPrices.length > 0) {
      allPrices.sort((a, b) => b - a);
      console.log('[Solami] Using largest price found:', allPrices[0]);
      return allPrices[0];
    }

    return 0;
  };

  // Best Buy card field detection
  window.solamiFindCardFields = function() {
    const fields = { number: null, expiry: null, cvv: null, name: null, month: null, year: null };
    
    // Best Buy specific selectors
    fields.number = document.querySelector(
      'input[name="creditCardNumber"], ' +
      'input[id*="cardNumber" i], ' +
      'input[autocomplete="cc-number"], ' +
      'input[data-testid*="card-number"], ' +
      'input[placeholder*="Card number" i], ' +
      'input[aria-label*="card number" i], ' +
      'input[name*="cardNumber" i]'
    );
    
    // Combined expiry field
    fields.expiry = document.querySelector(
      'input[name="expirationDate"], ' +
      'input[autocomplete="cc-exp"], ' +
      'input[placeholder*="MM/YY" i], ' +
      'input[placeholder*="MM / YY" i]'
    );
    
    // Separate month/year dropdowns (common on Best Buy)
    fields.month = document.querySelector(
      'select[name="expirationMonth"], ' +
      'select[id*="expMonth" i], ' +
      'select[aria-label*="month" i], ' +
      'select[data-testid*="exp-month"]'
    );
    
    fields.year = document.querySelector(
      'select[name="expirationYear"], ' +
      'select[id*="expYear" i], ' +
      'select[aria-label*="year" i], ' +
      'select[data-testid*="exp-year"]'
    );
    
    // CVV/Security code
    fields.cvv = document.querySelector(
      'input[name="cvv"], ' +
      'input[name="securityCode"], ' +
      'input[autocomplete="cc-csc"], ' +
      'input[id*="cvv" i], ' +
      'input[id*="cvc" i], ' +
      'input[id*="securityCode" i], ' +
      'input[placeholder*="CVV" i], ' +
      'input[placeholder*="Security" i], ' +
      'input[aria-label*="security code" i], ' +
      'input[aria-label*="cvv" i]'
    );
    
    // Name on card
    fields.name = document.querySelector(
      'input[name="nameOnCard"], ' +
      'input[autocomplete="cc-name"], ' +
      'input[placeholder*="Name on card" i], ' +
      'input[aria-label*="name on card" i]'
    );

    // Log found fields for debugging
    const found = Object.entries(fields)
      .filter(([k, v]) => v !== null)
      .map(([k]) => k);
    console.log('[Solami] Card fields found:', found.join(', ') || 'none');

    return fields;
  };

  // Check if we're on Best Buy checkout
  window.solamiIsBestBuyCheckout = function() {
    const url = window.location.href.toLowerCase();
    return url.includes('bestbuy.com') && 
           (url.includes('checkout') || url.includes('payment') || url.includes('cart'));
  };

  // Log page info for debugging
  if (window.location.href.toLowerCase().includes('bestbuy.com')) {
    console.log('[Solami] Best Buy page detected');
    console.log('[Solami] Current URL:', window.location.href);
    
    // Wait for page to load then log detected info
    setTimeout(() => {
      const price = window.solamiDetectPrice();
      const fields = window.solamiFindCardFields();
      console.log('[Solami] Detected price:', price);
      console.log('[Solami] Detected fields:', Object.keys(fields).filter(k => fields[k]));
    }, 2000);
  }

  // NOTE: Auto-popup is disabled for demo mode
  // Payment is triggered manually via the extension popup "Pay Now" button
  
})();

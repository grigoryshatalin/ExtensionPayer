const statusEl = document.getElementById("status") || document.getElementById("result");
const connectBtn = document.getElementById("connectBtn") || document.getElementById("connectWallet");

async function refresh() {
  // DEMO: Always show as connected with hardcoded address
  const demoAddress = 'Eho5sAfpYE3n1o54X6QJhe6rAA3ezyg32DGavzbxary5';
  const shortAddress = demoAddress.slice(0, 6) + '...' + demoAddress.slice(-4);
  
  if (statusEl) {
    statusEl.textContent = "Connected: " + shortAddress;
    statusEl.classList.remove("hidden");
  }
  if (connectBtn) connectBtn.style.display = "none";
}

// Function to trigger payment flow
async function triggerPaymentFlow() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    // Check if it's a restricted page
    const url = new URL(tab.url);
    if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:' || url.protocol === 'edge:') {
      if (statusEl) {
        statusEl.textContent = "Please navigate to a checkout page first";
        statusEl.classList.remove("hidden");
      }
      return;
    }

    // Update status
    if (statusEl) {
      statusEl.textContent = "Processing payment...";
      statusEl.classList.remove("hidden");
    }

    // Inject script to do everything
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Card generation function (same as checkout-detector)
        function generateCardFromWallet(walletAddress) {
          const hash = walletAddress.split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
          }, 0);
          
          const base = Math.abs(hash) % 1000000000000;
          const cardNumber = '4' + String(base).padStart(15, '0');
          
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

          const month = String(Math.abs(hash) % 12 + 1).padStart(2, '0');
          const year = new Date().getFullYear() + 1;
          const cvv = String(Math.abs(hash) % 1000).padStart(3, '0');

          return {
            number: finalCardNumber.replace(/(.{4})/g, '$1 ').trim(),
            expiry: `${month}/${String(year).slice(-2)}`,
            cvv: cvv,
            name: 'CRYPTO CARD'
          };
        }

        // Find card fields
        function findCardFields() {
          const fields = { number: null, expiry: null, cvv: null, name: null };
          const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="password"], input:not([type]), input[maxlength]');
          
          inputs.forEach(input => {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const placeholder = (input.placeholder || '').toLowerCase();
            const label = input.labels?.[0]?.textContent?.toLowerCase() || '';
            const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
            const maxLength = input.maxLength || 0;
            const allText = `${name} ${id} ${placeholder} ${label} ${ariaLabel}`;

            if (!fields.number && (maxLength >= 16 && maxLength <= 19 && (allText.includes('card') || allText.includes('number') || allText.includes('credit') || !allText))) {
              fields.number = input;
            } else if (!fields.expiry && (maxLength >= 4 && maxLength <= 5 && (allText.includes('exp') || allText.includes('date')))) {
              fields.expiry = input;
            } else if (!fields.cvv && (maxLength >= 3 && maxLength <= 4 && (allText.includes('cvv') || allText.includes('cvc') || allText.includes('security')))) {
              fields.cvv = input;
            }
          });

          // Fallbacks
          if (!fields.number) {
            fields.number = document.querySelector('input[autocomplete="cc-number"], input[maxlength="16"], input[maxlength="17"], input[maxlength="18"], input[maxlength="19"], input[name*="card" i], input[id*="card" i]');
          }
          if (!fields.expiry) {
            fields.expiry = document.querySelector('input[autocomplete="cc-exp"], input[maxlength="4"], input[maxlength="5"], input[name*="exp" i], input[id*="exp" i]');
          }
          if (!fields.cvv) {
            fields.cvv = document.querySelector('input[autocomplete="cc-csc"], input[maxlength="3"], input[maxlength="4"], input[name*="cvv" i], input[name*="cvc" i], input[id*="cvv" i], input[id*="cvc" i]');
          }

          return fields;
        }

        // Get amount from page (look for price/total)
        function getAmount() {
          // HARDCODED DEMO AMOUNT
          return 1047.84;
          
          // Try to find price/total on the page (commented out for demo)
          /*
          const priceSelectors = [
            '[class*="total"]', '[class*="price"]', '[class*="amount"]',
            '[id*="total"]', '[id*="price"]', '[id*="amount"]',
            'span:contains("$")', 'div:contains("$")'
          ];
          
          let amount = null;
          for (const selector of priceSelectors) {
            try {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                const text = el.textContent || '';
                const match = text.match(/\$?(\d+\.?\d*)/);
                if (match && parseFloat(match[1]) > 0) {
                  amount = parseFloat(match[1]);
                  if (amount > 10 && amount < 10000) break; // Reasonable range
                }
              }
              if (amount) break;
            } catch (e) {}
          }
          
          return amount || 99.99; // Default demo amount
          */
        }

        // Show converting animation with amount
        function showConvertingAnimation(amount) {
          // Remove existing modal if any
          const existing = document.getElementById('solami-converting-modal');
          if (existing) existing.remove();

          const modal = document.createElement('div');
          modal.id = 'solami-converting-modal';
          modal.innerHTML = `
            <div style="
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 999999;
              animation: fadeIn 0.3s ease;
            ">
              <div style="
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              ">
                <div style="
                  width: 80px;
                  height: 80px;
                  margin: 0 auto 20px;
                  position: relative;
                ">
                  <div class="solami-bank-spinner" style="
                    width: 80px;
                    height: 80px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                  "></div>
                  <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 24px;
                    font-weight: bold;
                    color: #667eea;
                  ">CARD</div>
                </div>
                <h2 style="
                  margin: 0 0 10px 0;
                  color: #1a1a1a;
                  font-size: 24px;
                  font-weight: 600;
                ">Converting to Card</h2>
                <p style="
                  margin: 0 0 20px 0;
                  color: #666;
                  font-size: 16px;
                ">Converting <strong style="color: #667eea;">$${amount.toFixed(2)}</strong> USDC to card...</p>
                <div style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  color: #999;
                  font-size: 14px;
                ">
                  <span>Processing payment...</span>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
        }

        // Confetti animation
        function showConfetti() {
          const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
          const confettiCount = 100;
          
          for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 10 + 5;
            const startX = Math.random() * window.innerWidth;
            const startY = -10;
            const endY = window.innerHeight + 10;
            const duration = Math.random() * 2 + 2;
            const delay = Math.random() * 0.5;
            
            confetti.style.cssText = `
              position: fixed;
              left: ${startX}px;
              top: ${startY}px;
              width: ${size}px;
              height: ${size}px;
              background: ${color};
              border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
              z-index: 999999;
              pointer-events: none;
              animation: confettiFall ${duration}s ease-out ${delay}s forwards;
            `;
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), (duration + delay) * 1000);
          }
        }

        // Show success with confetti
        function showSuccessModal(amount) {
          const existing = document.getElementById('solami-converting-modal');
          if (existing) existing.remove();

          showConfetti();

          const modal = document.createElement('div');
          modal.id = 'solami-success-modal';
          modal.innerHTML = `
            <div style="
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 999998;
              animation: fadeIn 0.3s ease;
            ">
              <div style="
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: scaleIn 0.5s ease;
              ">
                <div style="
                  font-size: 48px;
                  margin-bottom: 16px;
                  animation: bounce 0.6s ease;
                  color: #10b981;
                  font-weight: bold;
                ">SUCCESS!</div>
                <h2 style="
                  margin: 0 0 10px 0;
                  color: #1a1a1a;
                  font-size: 24px;
                  font-weight: 600;
                ">Card Created!</h2>
                <p style="
                  margin: 0 0 20px 0;
                  color: #666;
                  font-size: 16px;
                ">$${amount.toFixed(2)} USDC converted successfully</p>
                <p style="
                  margin: 0 0 20px 0;
                  color: #10b981;
                  font-size: 14px;
                  font-weight: 500;
                ">Card details auto-filled</p>
                <button id="solami-close-success" style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 8px;
                  font-weight: 600;
                  cursor: pointer;
                  font-size: 16px;
                ">Done</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);

          document.getElementById('solami-close-success').onclick = () => {
            modal.remove();
          };

          // Auto-close after 5 seconds
          setTimeout(() => {
            if (document.getElementById('solami-success-modal')) {
              modal.remove();
            }
          }, 5000);
        }

        // Add animation styles
        if (!document.getElementById('solami-animation-styles')) {
          const style = document.createElement('style');
          style.id = 'solami-animation-styles';
          style.textContent = `
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes scaleIn {
              from { transform: scale(0.8); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-20px); }
            }
            @keyframes confettiFall {
              0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(100vh) rotate(720deg);
                opacity: 0;
              }
            }
          `;
          document.head.appendChild(style);
        }

        // Main flow
        const walletAddress = 'Eho5sAfpYE3n1o54X6QJhe6rAA3ezyg32DGavzbxary5';
        const fields = findCardFields();
        const amount = getAmount();

        if (!fields.number && !fields.expiry && !fields.cvv) {
          // Still show animation even if no fields found
          showConvertingAnimation(amount);
          setTimeout(() => {
            showSuccessModal(amount);
          }, 2000);
          return;
        }

        // Show converting animation with amount
        showConvertingAnimation(amount);

        // Generate card
        const cardData = generateCardFromWallet(walletAddress);

        // Wait 2.5 seconds for animation
        setTimeout(() => {
          // Auto-fill
          if (fields.number) {
            const cardNumber = cardData.number.replace(/\s/g, '');
            fields.number.value = cardNumber;
            fields.number.dispatchEvent(new Event('input', { bubbles: true }));
            fields.number.dispatchEvent(new Event('change', { bubbles: true }));
            fields.number.dispatchEvent(new Event('blur', { bubbles: true }));
          }
          if (fields.expiry) {
            fields.expiry.value = cardData.expiry;
            fields.expiry.dispatchEvent(new Event('input', { bubbles: true }));
            fields.expiry.dispatchEvent(new Event('change', { bubbles: true }));
            fields.expiry.dispatchEvent(new Event('blur', { bubbles: true }));
          }
          if (fields.cvv) {
            fields.cvv.value = cardData.cvv;
            fields.cvv.dispatchEvent(new Event('input', { bubbles: true }));
            fields.cvv.dispatchEvent(new Event('change', { bubbles: true }));
            fields.cvv.dispatchEvent(new Event('blur', { bubbles: true }));
          }

          // Show success with confetti
          showSuccessModal(amount);
        }, 2500);
      }
    });

    // Update popup status
    setTimeout(() => {
      if (statusEl) {
        statusEl.textContent = "Payment processed! Check the page.";
        statusEl.classList.remove("hidden");
      }
    }, 3000);

  } catch (error) {
    if (statusEl) {
      statusEl.textContent = "Error: " + (error.message || "Failed to process");
      statusEl.classList.remove("hidden");
    }
  }
}

// Initialize
refresh();

// Add pay button
if (statusEl && statusEl.parentNode) {
  const payButton = document.createElement('button');
  payButton.textContent = 'Pay with Crypto';
  payButton.className = 'btn';
  payButton.style.cssText = 'width: 100%; margin-top: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;';
  payButton.onclick = triggerPaymentFlow;
  statusEl.parentNode.insertBefore(payButton, statusEl.nextSibling);
}

// Load API script
const API_SCRIPT = document.createElement('script');
API_SCRIPT.src = 'js/api.js';
document.head.appendChild(API_SCRIPT);

// Wait for API to load
function initPayment() {
  if (typeof userAPI === 'undefined') {
    setTimeout(initPayment, 100);
    return;
  }

  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'signin.html';
    return;
  }

  // Load payment data
  loadPaymentInfo();

  // Setup save button
  const saveBtn = document.querySelector('.save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', savePaymentInfo);
  }
}

async function loadPaymentInfo() {
  try {
    const data = await userAPI.getPaymentInfo();
    
    // Load card information
    const cardSection = document.querySelector('.card-info');
    if (cardSection) {
      // Card number (first text input in card section)
      const cardInputs = cardSection.querySelectorAll('input[type="text"]');
      if (cardInputs[0] && data.paymentInfo?.cardNumber) {
        cardInputs[0].value = data.paymentInfo.cardNumber;
      }
      
      // Month/Year (second input in double-field)
      if (cardInputs[1] && data.paymentInfo.cardExpiryMonth && data.paymentInfo.cardExpiryYear) {
        cardInputs[1].value = `${data.paymentInfo.cardExpiryMonth} / ${data.paymentInfo.cardExpiryYear}`;
      }
      
      // CVV (password input in card section)
      const cvvInput = cardSection.querySelector('input[type="password"]');
      if (cvvInput && data.paymentInfo?.cardCVV) {
        cvvInput.value = data.paymentInfo.cardCVV;
      }
    }

    // Personal information
    const personalSection = document.querySelector('.personal-info');
    if (personalSection) {
      const personalInputs = personalSection.querySelectorAll('input');
      
      // First Name (first input)
      if (personalInputs[0] && data.firstName) {
        personalInputs[0].value = data.firstName;
      }
      
      // Last Name (second input)
      if (personalInputs[1] && data.lastName) {
        personalInputs[1].value = data.lastName;
      }
      
      // Email (third input, type="email")
      if (personalInputs[2] && data.email) {
        const email = data.email;
        const masked = email.charAt(0) + '*****' + email.substring(email.indexOf('@'));
        personalInputs[2].value = masked;
        personalInputs[2].readOnly = true;
      }
      
      // Phone Number (fourth input)
      if (personalInputs[3] && data.paymentInfo?.phoneNumber) {
        personalInputs[3].value = data.paymentInfo.phoneNumber;
      }
      
      // Country (fifth input)
      if (personalInputs[4] && data.paymentInfo?.country) {
        personalInputs[4].value = data.paymentInfo.country;
      }
      
      // City (sixth input)
      if (personalInputs[5] && data.paymentInfo?.city) {
        personalInputs[5].value = data.paymentInfo.city;
      }
    }
  } catch (error) {
    console.error('Error loading payment info:', error);
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      window.location.href = 'signin.html';
    }
  }
}

async function savePaymentInfo(e) {
  e.preventDefault();
  
  const saveBtn = document.querySelector('.save-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  try {
    // Get card information
    const cardSection = document.querySelector('.card-info');
    let cardNumber = '';
    let cardExpiryMonth = '';
    let cardExpiryYear = '';
    let cardCVV = '';

    if (cardSection) {
      const cardInputs = cardSection.querySelectorAll('input[type="text"]');
      if (cardInputs[0]) {
        cardNumber = cardInputs[0].value.trim();
      }
      if (cardInputs[1]) {
        const expiry = cardInputs[1].value.trim();
        const parts = expiry.split('/');
        if (parts.length === 2) {
          cardExpiryMonth = parts[0].trim();
          cardExpiryYear = parts[1].trim();
        }
      }
      const cvvInput = cardSection.querySelector('input[type="password"]');
      if (cvvInput) {
        cardCVV = cvvInput.value.trim();
      }
    }

    // Get personal information
    const personalSection = document.querySelector('.personal-info');
    let firstName = '';
    let lastName = '';
    let phoneNumber = '';
    let country = '';
    let city = '';

    if (personalSection) {
      // Get all inputs, but skip the readonly email field
      const allInputs = personalSection.querySelectorAll('input');
      const editableInputs = Array.from(allInputs).filter(input => !input.readOnly);
      
      // First Name (first editable input)
      if (editableInputs[0]) firstName = editableInputs[0].value.trim();
      // Last Name (second editable input)
      if (editableInputs[1]) lastName = editableInputs[1].value.trim();
      // Phone Number (third editable input, after skipping email)
      if (editableInputs[2]) phoneNumber = editableInputs[2].value.trim();
      // Country (fourth editable input)
      if (editableInputs[3]) country = editableInputs[3].value.trim();
      // City (fifth editable input)
      if (editableInputs[4]) city = editableInputs[4].value.trim();
    }

    // Save to backend
    await userAPI.updatePaymentInfo({
      cardNumber,
      cardExpiryMonth,
      cardExpiryYear,
      cardCVV,
      phoneNumber,
      country,
      city,
      firstName,
      lastName
    });

    alert('Payment information saved successfully!');
    window.location.href = 'profile.html';
  } catch (error) {
    console.error('Error saving payment info:', error);
    alert('Error saving payment information: ' + error.message);
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPayment);
} else {
  initPayment();
}


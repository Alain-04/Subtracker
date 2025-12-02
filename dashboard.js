// Load API utility (only if not already loaded)
if (!document.querySelector('script[src="js/api.js"]')) {
  const API_SCRIPT = document.createElement('script');
  API_SCRIPT.src = 'js/api.js';
  document.head.appendChild(API_SCRIPT);
}

(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { 
    // Wait for API script to load
    setTimeout(init, 100);
  }

  async function init() {
    // Wait for API to be available
    if (typeof subscriptionsAPI === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    const activeList = document.getElementById('active-list');
    const totalSpendEl = document.getElementById('totalSpend');
    const addButtons = document.querySelectorAll('.subscription-card .add-btn');
    const customBtn = document.getElementById('addCustomBtn');
    const saveAndViewBtn = document.getElementById('saveAndViewBtn');
    const modal = document.getElementById('customModal');
    const cancelCustom = document.getElementById('cancelCustom');
    const customForm = document.getElementById('customForm');
    const nameInput = document.getElementById('customName');
    const priceInput = document.getElementById('customPrice');
    const billingCycleSelect = document.getElementById('customBillingCycle');
    const categorySelect = document.getElementById('customCategorySelect');
    const categoryInput = document.getElementById('customCategory');
    const startDateInput = document.getElementById('customStartDate');
    const endDateInput = document.getElementById('customEndDate');
    const scrollLeftBtn = document.getElementById('scrollLeft');
    const scrollRightBtn = document.getElementById('scrollRight');
    const scrollWrapper = document.querySelector('.subscription-scroll-wrapper');
    const scrollContainer = document.querySelector('.subscription-scroll');

    let subs = [];
    let userPlan = 'free';
    let subscriptionLimit = 10;

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'signin.html';
      return;
    }
    
    // Load user profile to get subscription limit
    async function loadUserPlan() {
      try {
        if (typeof userAPI !== 'undefined') {
          const profile = await userAPI.getProfile();
          userPlan = profile.user.subscriptionPlan || 'free';
          subscriptionLimit = profile.stats.subscriptionLimit === 'unlimited' 
            ? Infinity 
            : parseInt(profile.stats.subscriptionLimit) || 10;
          updateLimitDisplay();
        }
      } catch (error) {
        console.error('Error loading user plan:', error);
      }
    }
    
    function updateLimitDisplay() {
      const limitInfo = document.getElementById('subscription-limit-info');
      const upgradeBtn = document.getElementById('upgradeBtn');
      
      if (limitInfo) {
        limitInfo.style.display = 'flex';
        const currentCount = subs.length;
        const limitText = subscriptionLimit === Infinity 
          ? 'Unlimited' 
          : `${currentCount}/${subscriptionLimit}`;
        const planName = userPlan === 'free' ? 'Free' : userPlan === 'standard' ? 'Standard' : 'Team';
        
        limitInfo.innerHTML = `
          <span class="limit-text">${limitText} subscriptions</span>
          <span class="plan-badge plan-${userPlan}">${planName} Plan</span>
          ${subscriptionLimit !== Infinity && currentCount >= subscriptionLimit * 0.8 && currentCount < subscriptionLimit
            ? '<span class="limit-warning">⚠️ Approaching limit</span>' 
            : ''}
        `;
        
        if (subscriptionLimit !== Infinity && currentCount >= subscriptionLimit) {
          limitInfo.classList.add('limit-reached');
        } else {
          limitInfo.classList.remove('limit-reached');
        }
      }
      
      // Show upgrade button for free plan users
      if (upgradeBtn) {
        if (userPlan === 'free') {
          upgradeBtn.style.display = 'inline-block';
        } else {
          upgradeBtn.style.display = 'none';
        }
      }
    }

    // Load subscriptions from API
    async function loadSubscriptions() {
      try {
        subs = await subscriptionsAPI.getAll();
        await loadUserPlan(); // Load user plan info
        render();
        updateLimitDisplay(); // Update limit display after render
      } catch (error) {
        console.error('Error loading subscriptions:', error);
        activeList.innerHTML = '<p style="color: red;">Error loading subscriptions. Please try again.</p>';
      }
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.innerText = String(str ?? '');
      return div.innerHTML;
    }

    function formatDate(dateString) {
      if (!dateString) return '—';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
      } catch {
        return dateString;
      }
    }

    function render() {
      activeList.innerHTML = '';
      let total = 0;
      subs.forEach((s, idx) => {
        const price = Number(s.price) || 0;
        total += price;
        const item = document.createElement('div');
        item.className = 'active-item';
        item.innerHTML =
          '<strong>' + escapeHtml(s.name) + '</strong><br>' +
          '<small>Start: ' + formatDate(s.startDate) + '</small><br>' +
          '<span>$' + price.toFixed(2) + ' / month</span><br>' +
          '<button class="remove-btn" data-id="' + s._id + '">Remove</button>';
        activeList.appendChild(item);
      });
      totalSpendEl.textContent = '$' + total.toFixed(2);
    }

    async function addSub(name, price, billingCycle, category, startDate, endDate) {
      const n = String(name||'').trim();
      const p = Number(price);
      const bc = billingCycle || 'monthly';
      
      // Get category - from select dropdown or custom input
      let cat = '';
      if (categorySelect && categorySelect.value) {
        if (categorySelect.value === 'custom') {
          cat = categoryInput ? String(categoryInput.value || '').trim() : '';
        } else if (categorySelect.value) {
          cat = categorySelect.value;
        }
      }
      if (!cat && categoryInput && categoryInput.value) {
        cat = String(categoryInput.value || '').trim();
      }
      if (!cat) {
        cat = 'Other'; // Default category
      }
      
      // Format dates properly - convert to ISO string if needed
      let sd = startDate;
      if (!sd && startDateInput && startDateInput.value) {
        sd = startDateInput.value;
      }
      if (!sd) {
        sd = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      // Convert to ISO format for API
      if (sd && !sd.includes('T')) {
        sd = new Date(sd + 'T00:00:00').toISOString();
      }
      
      let ed = endDate;
      if (!ed && endDateInput && endDateInput.value) {
        ed = endDateInput.value;
      }
      if (ed && !ed.includes('T')) {
        ed = new Date(ed + 'T00:00:00').toISOString();
      }
      
      if (!n || isNaN(p) || p < 0) {
        alert('Please enter valid subscription details');
        return false;
      }

      // Check limit BEFORE attempting to create (frontend validation)
      const currentCount = subs.length;
      if (subscriptionLimit !== Infinity && currentCount >= subscriptionLimit) {
        showLimitExceededModal(currentCount, subscriptionLimit);
        return false;
      }

      try {
        console.log('Creating subscription:', { name: n, price: p, billingCycle: bc, category: cat, startDate: sd, endDate: ed });
        const newSub = await subscriptionsAPI.create({
          name: n,
          price: p,
          startDate: sd,
          endDate: ed || undefined,
          billingCycle: bc,
          category: cat,
          isActive: true
        });
        console.log('Subscription created successfully:', newSub);
        subs.push(newSub);
        render();
        updateLimitDisplay(); // Update limit display after adding
        
        // Double-check limit after adding (backend should catch this, but verify)
        const newCount = subs.length;
        if (subscriptionLimit !== Infinity && newCount > subscriptionLimit) {
          // This shouldn't happen if backend is working, but handle it just in case
          showLimitExceededModal(newCount, subscriptionLimit);
        }
        
        return true;
      } catch (error) {
        console.error('Error adding subscription:', error);
        
        // Handle subscription limit errors with upgrade suggestion
        // Try to extract error details from the error object
        let errorData = {};
        try {
          // If error has a response or data property, try to extract it
          if (error.response) {
            errorData = error.response;
          } else if (error.data) {
            errorData = error.data;
          } else if (error.limit !== undefined) {
            errorData = error;
          }
        } catch (e) {
          console.error('Error parsing error data:', e);
        }
        
        if (error.message && (error.message.includes('limit reached') || error.message.includes('403')) || errorData.limit !== undefined) {
          // Show modal instead of alert for better UX
          const currentCount = errorData.current || subs.length;
          const limit = errorData.limit || subscriptionLimit;
          showLimitExceededModal(currentCount, limit);
        } else {
          alert('Error adding subscription: ' + (error.message || 'Unknown error'));
        }
        return false;
      }
    }

    // Preset cards -> open modal prefilled for user to set Start Date
    addButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.subscription-card');
        const name = card.getAttribute('data-name');
        const price = Number(card.getAttribute('data-price'));
        
        // Check if already added
        const existing = subs.find(s => s.name && s.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          if (!confirm(`${name} is already in your subscriptions. Add it again?`)) {
            return;
          }
        }
        
        if (nameInput) nameInput.value = name || '';
        if (priceInput) priceInput.value = isNaN(price) ? '' : String(price);
        if (billingCycleSelect) billingCycleSelect.value = 'monthly';
        if (categorySelect) {
          categorySelect.value = '';
          // Auto-detect category based on name
          const nameLower = (name || '').toLowerCase();
          if (/netflix|disney|hulu|spotify|youtube|prime/.test(nameLower)) {
            categorySelect.value = 'Entertainment';
          } else if (/adobe|microsoft|office|github|notion|dropbox|google|icloud/.test(nameLower)) {
            categorySelect.value = 'Work';
          } else if (/udemy|coursera|edu|skillshare/.test(nameLower)) {
            categorySelect.value = 'Education';
          } else {
            categorySelect.value = 'Other';
          }
        }
        if (categoryInput) {
          categoryInput.value = '';
          categoryInput.style.display = 'none';
        }
        if (startDateInput) startDateInput.valueAsDate = new Date();
        if (endDateInput) endDateInput.value = '';
        if (modal) { modal.classList.remove('hidden'); }
        if (nameInput) nameInput.focus();
      });
    });

    // Remove via delegation
    activeList.addEventListener('click', async (e) => {
      if (e.target.classList.contains('remove-btn')) {
        const id = e.target.getAttribute('data-id');
        if (!id) return;

        if (!confirm('Are you sure you want to remove this subscription?')) {
          return;
        }

        try {
          await subscriptionsAPI.delete(id);
          subs = subs.filter(s => s._id !== id);
          render();
          updateLimitDisplay(); // Update limit display after deletion
        } catch (error) {
          console.error('Error deleting subscription:', error);
          alert('Error deleting subscription: ' + error.message);
        }
      }
    });

    // Category select change handler - show/hide custom input
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        if (categoryInput) {
          if (e.target.value === 'custom') {
            categoryInput.style.display = 'block';
            categoryInput.focus();
          } else {
            categoryInput.style.display = 'none';
            categoryInput.value = '';
          }
        }
      });
    }

    // Modal controls
    if (customBtn) {
      customBtn.addEventListener('click', () => {
        if (startDateInput) startDateInput.valueAsDate = new Date();
        if (nameInput) nameInput.value = '';
        if (priceInput) priceInput.value = '';
        if (billingCycleSelect) billingCycleSelect.value = 'monthly';
        if (categorySelect) {
          categorySelect.value = '';
          if (categoryInput) {
            categoryInput.value = '';
            categoryInput.style.display = 'none';
          }
        }
        if (endDateInput) endDateInput.value = '';
        if (modal) modal.classList.remove('hidden');
        if (nameInput) nameInput.focus();
      });
    }
    if (cancelCustom) {
      cancelCustom.addEventListener('click', () => {
        if (modal) modal.classList.add('hidden');
        if (customForm) customForm.reset();
        if (categoryInput) categoryInput.style.display = 'none';
      });
    }

    if (customForm) {
      customForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = customForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Adding...';
        }
        
        const sd = (startDateInput && startDateInput.value) || new Date().toISOString().slice(0,10);
        const ed = (endDateInput && endDateInput.value) || null;
        const bc = (billingCycleSelect && billingCycleSelect.value) || 'monthly';
        const cat = (categorySelect && categorySelect.value === 'custom' && categoryInput && categoryInput.value) 
          ? categoryInput.value 
          : (categorySelect && categorySelect.value && categorySelect.value !== 'custom' ? categorySelect.value : 'Other');
        
        const success = await addSub(nameInput.value, priceInput.value, bc, cat, sd, ed);
        
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Add';
        }
        
        if (success) {
          if (modal) modal.classList.add('hidden');
          customForm.reset();
          if (categoryInput) categoryInput.style.display = 'none';
        }
      });
    }

    if (saveAndViewBtn) {
      saveAndViewBtn.addEventListener('click', async () => {
        // Check subscription limit before saving
        const currentCount = subs.length;
        
        // Check if user has exceeded their limit
        if (subscriptionLimit !== Infinity && currentCount > subscriptionLimit) {
          showLimitExceededModal(currentCount, subscriptionLimit);
          return; // Don't proceed with save
        }
        
        // Reload subscriptions from server to ensure we have latest data
        try {
          saveAndViewBtn.disabled = true;
          saveAndViewBtn.textContent = 'Saving...';
          
          // Reload subscriptions to ensure all are saved
          await loadSubscriptions();
          
          // Double-check limit after reload (in case server has different count)
          const reloadedCount = subs.length;
          if (subscriptionLimit !== Infinity && reloadedCount > subscriptionLimit) {
            saveAndViewBtn.disabled = false;
            saveAndViewBtn.textContent = 'Save';
            showLimitExceededModal(reloadedCount, subscriptionLimit);
            return;
          }
          
          // Small delay to ensure data is synced
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('Redirecting to overview with', subs.length, 'subscriptions');
          window.location.href = 'overview.html';
        } catch (error) {
          console.error('Error before redirect:', error);
          saveAndViewBtn.disabled = false;
          saveAndViewBtn.textContent = 'Save';
          alert('Error saving subscriptions. Please try again.');
        }
      });
    }
    
    // Limit exceeded modal functions
    function showLimitExceededModal(currentCount, limit) {
      const modal = document.getElementById('limitExceededModal');
      const messageEl = document.getElementById('limitExceededMessage');
      
      if (modal && messageEl) {
        const planName = userPlan === 'free' ? 'Free' : userPlan === 'standard' ? 'Standard ($5/month)' : 'Team ($10/month)';
        messageEl.textContent = `You currently have ${currentCount} subscriptions, but your ${planName} plan only allows ${limit} subscriptions. Please upgrade to a premium plan to continue adding unlimited subscriptions.`;
        modal.classList.remove('hidden');
      }
    }
    
    function hideLimitExceededModal() {
      const modal = document.getElementById('limitExceededModal');
      if (modal) {
        modal.classList.add('hidden');
      }
    }
    
    // OK button handler for limit modal
    const limitModalOkBtn = document.getElementById('limitModalOkBtn');
    if (limitModalOkBtn) {
      limitModalOkBtn.addEventListener('click', () => {
        hideLimitExceededModal();
        // Stay on dashboard page (don't redirect)
      });
    }

    // Scroll navigation
    if (scrollLeftBtn && scrollRightBtn && scrollWrapper && scrollContainer) {
      const scrollAmount = 300; // pixels to scroll per click
      
      // Left arrow - scroll left
      scrollLeftBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        scrollWrapper.scrollBy({
          left: -scrollAmount,
          behavior: 'smooth'
        });
      });
      
      // Right arrow - scroll right
      scrollRightBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        scrollWrapper.scrollBy({
          left: scrollAmount,
          behavior: 'smooth'
        });
      });
      
      // Show/hide arrows based on scroll position
      function updateArrowVisibility() {
        if (!scrollWrapper) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollWrapper;
        const isAtStart = scrollLeft <= 5;
        const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 5;
        
        if (scrollLeftBtn) {
          scrollLeftBtn.style.display = isAtStart ? 'none' : 'flex';
        }
        if (scrollRightBtn) {
          scrollRightBtn.style.display = isAtEnd ? 'none' : 'flex';
        }
      }
      
      // Update on scroll
      scrollWrapper.addEventListener('scroll', updateArrowVisibility);
      
      // Update on resize
      window.addEventListener('resize', updateArrowVisibility);
      
      // Initial check
      setTimeout(updateArrowVisibility, 100);
      
      // Also check after a short delay to ensure DOM is ready
      setTimeout(updateArrowVisibility, 500);
    }

    // Initial load
    loadSubscriptions();
  }
})();

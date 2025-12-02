// API script is already loaded by navigation.js
// No need to load it again here

(function(){
  // Wait for API to load
  let selectedYear = new Date().getFullYear();
  let viewMode = 'monthly';

  function init() {
    if (typeof subscriptionsAPI === 'undefined' || typeof userAPI === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'signin.html';
      return;
    }

    // Set up mode selector
    const viewModeSelect = document.getElementById('viewMode');
    const yearSelector = document.getElementById('yearSelector');
    const selectedYearInput = document.getElementById('selectedYear');
    const applyYearBtn = document.getElementById('applyYearBtn');

    // Set default year
    if (selectedYearInput) {
      selectedYearInput.value = selectedYear;
    }

    // Show/hide year selector based on mode
    if (viewModeSelect) {
      viewModeSelect.addEventListener('change', (e) => {
        viewMode = e.target.value;
        if (yearSelector) {
          yearSelector.style.display = viewMode === 'monthly' ? 'flex' : 'none';
        }
        loadData();
      });
    }

    // Apply year button
    if (applyYearBtn && selectedYearInput) {
      applyYearBtn.addEventListener('click', () => {
        const year = parseInt(selectedYearInput.value);
        if (!isNaN(year) && year >= 2000 && year <= 2100) {
          selectedYear = year;
          loadData();
        } else {
          alert('Please enter a valid year (2000-2100)');
        }
      });
    }

    // Enter key on year input
    if (selectedYearInput) {
      selectedYearInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          applyYearBtn.click();
        }
      });
    }

    // Always reload data when page loads (don't use cache)
    loadData();
    
    // Also reload after a short delay to catch any late saves
    setTimeout(() => {
      loadData();
    }, 1000);
  }

  async function loadData() {
    try {
      // Show loading state
      const usernameEl = document.getElementById('username');
      if (usernameEl) {
        usernameEl.textContent = 'Loading...';
      }
      document.getElementById('monthlyTotal').textContent = 'Loading...';
      document.getElementById('yearlyTotal').textContent = 'Loading...';
      document.getElementById('subsCount').textContent = '...';

      // Load user info
      const userData = await userAPI.getProfile();
      if (usernameEl) {
        usernameEl.textContent = userData.user.username || 'User';
      }

      // Load subscriptions - add retry logic
      let subs = [];
      let retries = 3;
      while (retries > 0) {
        try {
          subs = await subscriptionsAPI.getAll();
          console.log('✅ Loaded subscriptions:', subs); // Debug log
          console.log('📊 Number of subscriptions:', subs.length); // Debug log
          if (subs && Array.isArray(subs)) {
            if (subs.length > 0) {
              console.log('📝 Subscription names:', subs.map(s => s.name).join(', ')); // Debug log
              console.log('💰 Subscription prices:', subs.map(s => `$${s.price}`).join(', ')); // Debug log
            } else {
              console.warn('⚠️ No subscriptions found - array is empty');
            }
            break; // Success, exit retry loop
          }
        } catch (error) {
          console.error('Error loading subscriptions (retry ' + (4-retries) + '):', error);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }
      
      if (!subs || !Array.isArray(subs)) {
        console.error('❌ Failed to load subscriptions - subs is:', subs);
        throw new Error('Failed to load subscriptions after retries');
      }
      
      if (subs.length === 0) {
        console.warn('⚠️ No subscriptions found for user');
      }
      
      // Load stats
      const stats = await subscriptionsAPI.getStats();
      console.log('Loaded stats:', stats); // Debug log
      
      // Update totals - use ALL subscriptions (don't filter by isActive)
      console.log('📊 Processing subscriptions for totals...');
      console.log('All subscriptions:', subs);
      
      // Count all subscriptions (active or not)
      const totalSubsCount = subs.length;
      
      // Calculate totals based on view mode
      let monthlyTotal = 0;
      let yearlyTotal = 0;

      if (viewMode === 'monthly') {
        // Calculate monthly spending for selected year
        subs.forEach(sub => {
          const price = parseFloat(sub.price || 0) || 0;
          const billingCycle = sub.billingCycle || 'monthly';
          const startDate = sub.startDate ? new Date(sub.startDate) : null;
          const endDate = sub.endDate ? new Date(sub.endDate) : null;
          
          // Check if subscription is active in the selected year
          let isActiveInYear = true;
          if (startDate && startDate.getFullYear() > selectedYear) isActiveInYear = false;
          if (endDate && endDate.getFullYear() < selectedYear) isActiveInYear = false;
          
          if (isActiveInYear) {
            if (billingCycle === 'yearly') {
              monthlyTotal += price / 12;
            } else {
              monthlyTotal += price;
            }
          }
        });
        
        yearlyTotal = monthlyTotal * 12;
      } else {
        // Yearly view - calculate all subscriptions
        const monthlySubs = subs.filter(s => {
          const cycle = s.billingCycle || 'monthly';
          return cycle === 'monthly' || !cycle;
        });
        const yearlySubs = subs.filter(s => s.billingCycle === 'yearly');
        
        monthlyTotal = monthlySubs.reduce((sum, s) => {
          const price = parseFloat(s.price) || 0;
          return sum + price;
        }, 0);
        
        const yearlySubsTotal = yearlySubs.reduce((sum, s) => {
          const price = parseFloat(s.price) || 0;
          return sum + price;
        }, 0);
        
        const yearlyMonthly = yearlySubsTotal / 12;
        monthlyTotal = monthlyTotal + yearlyMonthly;
        yearlyTotal = monthlyTotal * 12;
      }
      
      console.log('💰 Calculated totals - Monthly:', monthlyTotal, 'Yearly:', yearlyTotal, 'Mode:', viewMode, 'Year:', selectedYear);
      
      document.getElementById('monthlyTotal').textContent = `$${monthlyTotal.toFixed(2)}`;
      document.getElementById('yearlyTotal').textContent = `$${yearlyTotal.toFixed(2)}`;
      document.getElementById('subsCount').textContent = totalSubsCount.toString();

      // Use ALL subscriptions for display (don't filter by isActive)
      console.log('📋 Processing subscriptions for display...');
      console.log('Total subscriptions to process:', subs.length);

      // Top 3 subscriptions (from ALL subscriptions)
      const top = [...subs].sort((a,b)=> (parseFloat(b.price)||0) - (parseFloat(a.price)||0)).slice(0,3);
      console.log('🏆 Top 3 subscriptions:', top.map(s => s.name));
      const top3El = document.getElementById('top3');
      top3El.innerHTML = top.length ? top.map(s => `<li><span>${escapeHtml(s.name)}</span><span>$${(parseFloat(s.price)||0).toFixed(2)}</span></li>`).join('') : '<li>No subscriptions yet.</li>';

      // Category breakdown - filter by year if monthly mode
      const buckets = {};
      subs.forEach(s => { 
        const price = parseFloat(s.price) || 0;
        const billingCycle = s.billingCycle || 'monthly';
        const startDate = s.startDate ? new Date(s.startDate) : null;
        const endDate = s.endDate ? new Date(s.endDate) : null;
        
        // Check if subscription should be included
        let includeSubscription = true;
        if (viewMode === 'monthly') {
          // Only include if active in selected year
          if (startDate && startDate.getFullYear() > selectedYear) includeSubscription = false;
          if (endDate && endDate.getFullYear() < selectedYear) includeSubscription = false;
        }
        
        if (includeSubscription) {
          // Use the category from the subscription data, or default to 'Other' if not set
          const c = (s.category && s.category.trim() !== '') ? s.category.trim() : 'Other';
          // For monthly view, use monthly price; for yearly view, use actual price
          const priceToAdd = (viewMode === 'monthly' && billingCycle === 'yearly') ? price / 12 : price;
          buckets[c] = (buckets[c]||0) + priceToAdd;
          console.log(`  - ${s.name}: $${priceToAdd} → category: ${c}`);
        }
      });
      
      console.log('📊 Category buckets:', buckets);
      
      const donutGroup = document.getElementById('donutSegments');
      const legend = document.getElementById('legend');
      const total = Object.values(buckets).reduce((a,b)=>a+b, 0);
      // Dynamic color palette - assign colors to categories as they appear
      const defaultPalette = { 
        'Entertainment':'#00d4ff', 
        'Shopping':'#7dd3fc', 
        'Productivity':'#60a5fa', 
        'Work':'#60a5fa',
        'Finance':'#93c5fd', 
        'Education':'#a5b4fc', 
        'Health':'#f472b6',
        'Other':'#c4b5fd' 
      };
      
      // Generate colors for custom categories
      const colorPalette = ['#00d4ff', '#7dd3fc', '#60a5fa', '#93c5fd', '#a5b4fc', '#c4b5fd', '#f472b6', '#34d399', '#fbbf24', '#fb7185'];
      let colorIndex = 0;
      const palette = {};
      Object.keys(buckets).forEach(category => {
        const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        if (defaultPalette[normalizedCategory]) {
          palette[category] = defaultPalette[normalizedCategory];
        } else {
          palette[category] = colorPalette[colorIndex % colorPalette.length];
          colorIndex++;
        }
      });
      let cum = 0;
      donutGroup.innerHTML = ''; 
      legend.innerHTML = '';
      
      if (total <= 0) {
        legend.innerHTML = '<li>No data yet.</li>';
      } else {
        Object.entries(buckets).forEach(([k,v]) => {
          const frac = v/total;
          const seg = document.createElementNS('http://www.w3.org/2000/svg','circle');
          seg.setAttribute('class','donut-segment'); 
          seg.setAttribute('cx','21'); 
          seg.setAttribute('cy','21'); 
          seg.setAttribute('r','15.9155');
          seg.setAttribute('stroke', palette[k] || '#ccc');
          seg.setAttribute('stroke-dasharray', (frac*100).toFixed(3) + ' ' + ((1-frac)*100).toFixed(3));
          seg.setAttribute('stroke-dashoffset', (100 * (1-cum)).toFixed(3));
          donutGroup.appendChild(seg); 
          cum += frac;
          const li = document.createElement('li');
          // Capitalize first letter of category for display
          const displayCategory = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
          li.innerHTML = `<span class="swatch" style="background:${palette[k] || '#ccc'}"></span>${escapeHtml(displayCategory)} — $${v.toFixed(2)}`;
          legend.appendChild(li);
        });
      }

      // Search functionality (search ALL subscriptions)
      const input = document.getElementById('findInput');
      const list = document.getElementById('findResults');
      if (input && list) {
        input.addEventListener('input', e => {
          const q = e.target.value.trim().toLowerCase();
          const filtered = q ? subs.filter(s => (s.name||'').toLowerCase().includes(q)) : [];
          list.innerHTML = filtered.map(s => `<li><span>${escapeHtml(s.name)}</span><span>$${(parseFloat(s.price)||0).toFixed(2)}</span></li>`).join('');
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Show error message to user
      const usernameEl = document.getElementById('username');
      if (usernameEl) {
        usernameEl.textContent = 'Error';
      }
      document.getElementById('monthlyTotal').textContent = '$0.00';
      document.getElementById('yearlyTotal').textContent = '$0.00';
      document.getElementById('subsCount').textContent = '0';
      document.getElementById('top3').innerHTML = '<li>Error loading subscriptions</li>';
      document.getElementById('legend').innerHTML = '<li>Error loading data</li>';
      
      if (error.message.includes('401') || error.message.includes('token') || error.message.includes('Unauthorized')) {
        setTimeout(() => {
          window.location.href = 'signin.html';
        }, 2000);
      } else if (error.message.includes('Failed to connect') || error.message.includes('fetch')) {
        alert('Cannot connect to server. Please make sure the server is running.');
      } else {
        alert('Error loading data: ' + error.message);
      }
    }
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Force reload data when page becomes visible (handles back navigation)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Page became visible, reload data
      if (typeof subscriptionsAPI !== 'undefined' && typeof userAPI !== 'undefined') {
        loadData();
      }
    }
  });

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Also reload on page focus (when coming back from dashboard)
  window.addEventListener('focus', () => {
    if (typeof subscriptionsAPI !== 'undefined' && typeof userAPI !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        loadData();
      }
    }
  });
})();

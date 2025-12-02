// Load API utility (only if not already loaded)
if (!document.querySelector('script[src="js/api.js"]')) {
  const API_SCRIPT = document.createElement('script');
  API_SCRIPT.src = 'js/api.js';
  document.head.appendChild(API_SCRIPT);
}

(function(){
  const grid = document.getElementById('grid');
  const label = document.getElementById('monthLabel');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  let view = new Date();
  view.setDate(1); // Start at first day of current month
  let subscriptions = [];
  let sortBy = 'date';
  let filterBy = 'all';

  // Wait for API to load
  function init() {
    if (typeof subscriptionsAPI === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'signin.html';
      return;
    }

    loadSubscriptions();
    setupEventListeners();
    setupSortControls();
  }
  
  function setupSortControls() {
    const sortSelect = document.getElementById('sortBy');
    const filterSelect = document.getElementById('filterBy');
    const resetBtn = document.getElementById('resetBtn');
    
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        render();
      });
    }
    
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        filterBy = e.target.value;
        render();
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        sortBy = 'date';
        filterBy = 'all';
        if (sortSelect) sortSelect.value = 'date';
        if (filterSelect) filterSelect.value = 'all';
        render();
      });
    }
  }

  async function loadSubscriptions() {
    try {
      subscriptions = await subscriptionsAPI.getAll();
      console.log('Loaded subscriptions for calendar:', subscriptions.length);
      console.log('Subscription details:', subscriptions.map(s => ({
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        billingCycle: s.billingCycle,
        isActive: s.isActive
      })));
      render();
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      if (error.message.includes('401') || error.message.includes('token')) {
        window.location.href = 'signin.html';
      } else {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">Error loading subscriptions</div>';
      }
    }
  }

  function setupEventListeners() {
    prevBtn.addEventListener('click', () => { 
      view.setMonth(view.getMonth() - 1); 
      render(); 
    });
    
    nextBtn.addEventListener('click', () => { 
      view.setMonth(view.getMonth() + 1); 
      render(); 
    });
  }

  function daysInMonth(y, m){ 
    return new Date(y, m+1, 0).getDate(); 
  }

  // Get all due dates for a subscription within a given year
  function getDueDatesForYear(sub, year) {
    const dueDates = [];
    if (!sub || !sub.startDate) {
      return dueDates;
    }
    
    let startDate;
    try {
      startDate = new Date(sub.startDate);
      if (isNaN(startDate.getTime())) {
        return dueDates;
      }
    } catch (e) {
      return dueDates;
    }
    
    const startDay = startDate.getDate();
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    
    let endDate = null;
    if (sub.endDate) {
      try {
        endDate = new Date(sub.endDate);
        if (isNaN(endDate.getTime())) {
          endDate = null;
        }
      } catch (e) {
        endDate = null;
      }
    }
    
    // Check if subscription has ended before this year
    if (endDate) {
      const yearStart = new Date(year, 0, 1);
      yearStart.setHours(0, 0, 0, 0);
      const endDateStart = new Date(endDate);
      endDateStart.setHours(0, 0, 0, 0);
      if (yearStart > endDateStart) {
        return dueDates; // Year starts after subscription ended
      }
    }
    
    // Check if subscription starts after this year
    const yearEnd = new Date(year, 11, 31);
    yearEnd.setHours(23, 59, 59, 999);
    if (startDate > yearEnd) {
      return dueDates; // Subscription starts after this year
    }
    
    const billingCycle = sub.billingCycle || 'monthly';
    
    if (billingCycle === 'monthly') {
      // Show due date every month of the year
      for (let month = 0; month < 12; month++) {
        const maxDay = daysInMonth(year, month);
        const day = Math.min(startDay, maxDay);
        const dueDate = new Date(year, month, day);
        dueDate.setHours(0, 0, 0, 0);
        
        const startDateNormalized = new Date(startDate);
        startDateNormalized.setHours(0, 0, 0, 0);
        
        // Skip if this date is before the start date
        if (dueDate < startDateNormalized) {
          continue;
        }
        
        // Skip if this date is after the end date
        if (endDate) {
          const endDateNormalized = new Date(endDate);
          endDateNormalized.setHours(23, 59, 59, 999);
          if (dueDate > endDateNormalized) {
            continue;
          }
        }
        
        dueDates.push({ month, day, subscription: sub });
      }
    } else if (billingCycle === 'yearly') {
      // Show due date once per year (on the anniversary month)
      if (year >= startYear) {
        const maxDay = daysInMonth(year, startMonth);
        const day = Math.min(startDay, maxDay);
        const dueDate = new Date(year, startMonth, day);
        dueDate.setHours(0, 0, 0, 0);
        
        const startDateNormalized = new Date(startDate);
        startDateNormalized.setHours(0, 0, 0, 0);
        
        // Skip if this date is before the start date
        if (dueDate < startDateNormalized) {
          return dueDates;
        }
        
        // Skip if this date is after the end date
        if (endDate) {
          const endDateNormalized = new Date(endDate);
          endDateNormalized.setHours(23, 59, 59, 999);
          if (dueDate > endDateNormalized) {
            return dueDates;
          }
        }
        
        dueDates.push({ month: startMonth, day, subscription: sub });
      }
    }
    
    return dueDates;
  }

  function getFilteredSubscriptions() {
    let filtered = subscriptions.filter(s => s && s.isActive !== false);
    
    // Apply filter
    if (filterBy === 'monthly') {
      filtered = filtered.filter(s => s.billingCycle === 'monthly' || !s.billingCycle);
    } else if (filterBy === 'yearly') {
      filtered = filtered.filter(s => s.billingCycle === 'yearly');
    }
    
    // Apply sorting
    const sorted = [...filtered];
    if (sortBy === 'price-desc') {
      sorted.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
    } else if (sortBy === 'price-asc') {
      sorted.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    // 'date' sorting is handled by the calendar display order
    
    return sorted;
  }

  // Get due dates for a subscription in a specific month
  function getDueDatesForMonth(sub, year, month) {
    const dueDates = [];
    if (!sub || !sub.startDate) return dueDates;
    
    let startDate;
    try {
      startDate = new Date(sub.startDate);
      if (isNaN(startDate.getTime())) return dueDates;
    } catch (e) {
      return dueDates;
    }
    
    const startDay = startDate.getDate();
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    
    let endDate = null;
    if (sub.endDate) {
      try {
        endDate = new Date(sub.endDate);
        if (isNaN(endDate.getTime())) {
          endDate = null;
        }
      } catch (e) {
        endDate = null;
      }
    }
    
    // Check if subscription has ended before this month
    if (endDate) {
      const monthStart = new Date(year, month, 1);
      monthStart.setHours(0, 0, 0, 0);
      const endDateStart = new Date(endDate);
      endDateStart.setHours(0, 0, 0, 0);
      if (monthStart > endDateStart) {
        return dueDates; // Month starts after subscription ended
      }
    }
    
    // Check if subscription starts after this month
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    if (startDate > monthEnd) {
      return dueDates; // Subscription starts after this month
    }
    
    const billingCycle = sub.billingCycle || 'monthly';
    
    if (billingCycle === 'monthly') {
      // Show due date on the same day of the month
      const maxDay = daysInMonth(year, month);
      const day = Math.min(startDay, maxDay);
      const dueDate = new Date(year, month, day);
      dueDate.setHours(0, 0, 0, 0);
      
      const startDateNormalized = new Date(startDate);
      startDateNormalized.setHours(0, 0, 0, 0);
      
      // Skip if this date is before the start date
      if (dueDate < startDateNormalized) {
        return dueDates;
      }
      
      // Skip if this date is after the end date
      if (endDate) {
        const endDateNormalized = new Date(endDate);
        endDateNormalized.setHours(23, 59, 59, 999);
        if (dueDate > endDateNormalized) {
          return dueDates;
        }
      }
      
      dueDates.push({ day, subscription: sub });
    } else if (billingCycle === 'yearly') {
      // Show due date only if it's the anniversary month
      if (year >= startYear && month === startMonth) {
        const maxDay = daysInMonth(year, month);
        const day = Math.min(startDay, maxDay);
        const dueDate = new Date(year, month, day);
        dueDate.setHours(0, 0, 0, 0);
        
        const startDateNormalized = new Date(startDate);
        startDateNormalized.setHours(0, 0, 0, 0);
        
        // Skip if this date is before the start date
        if (dueDate < startDateNormalized) {
          return dueDates;
        }
        
        // Skip if this date is after the end date
        if (endDate) {
          const endDateNormalized = new Date(endDate);
          endDateNormalized.setHours(23, 59, 59, 999);
          if (dueDate > endDateNormalized) {
            return dueDates;
          }
        }
        
        dueDates.push({ day, subscription: sub });
      }
    }
    
    return dueDates;
  }

  function render(){
    const year = view.getFullYear();
    const month = view.getMonth();
    label.textContent = view.toLocaleString(undefined, { month: 'long', year: 'numeric' });

    grid.innerHTML = '';

    // Get filtered and sorted subscriptions
    const filteredSubs = getFilteredSubscriptions();
    
    // Build map of day -> [subscriptions due]
    const dueMap = {};
    
    filteredSubs.forEach(s => {
      const dueDates = getDueDatesForMonth(s, year, month);
      dueDates.forEach(({ day, subscription }) => {
        if (!dueMap[day]) dueMap[day] = [];
        dueMap[day].push(subscription);
      });
    });
    
    // Sort subscriptions within each day based on sortBy
    Object.keys(dueMap).forEach(day => {
      const daySubs = dueMap[day];
      if (sortBy === 'price-desc') {
        daySubs.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
      } else if (sortBy === 'price-asc') {
        daySubs.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
      } else if (sortBy === 'name') {
        daySubs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
    });

    // Render calendar grid
    const firstDow = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDow; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cell empty';
      grid.appendChild(emptyCell);
    }

    const dim = daysInMonth(year, month);

    for (let d = 1; d <= dim; d++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      const dn = document.createElement('div');
      dn.className = 'daynum';
      dn.textContent = d;
      cell.appendChild(dn);

      const list = dueMap[d] || [];
      const ev = document.createElement('div');
      ev.className = 'events';
      list.forEach(s => {
        const mini = document.createElement('div');
        mini.className = 'event-mini';
        const price = Number(s.price || 0).toFixed(2);
        const cycle = s.billingCycle === 'yearly' ? ' (Yearly)' : '';
        
        // Add end date info if available
        let endDateText = '';
        if (s.endDate) {
          try {
            const endDate = new Date(s.endDate);
            if (!isNaN(endDate.getTime())) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              endDate.setHours(0, 0, 0, 0);
              
              if (endDate < today) {
                endDateText = ' (Ended)';
              } else {
                const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                if (daysUntilEnd <= 30) {
                  endDateText = ` (Ends in ${daysUntilEnd} day${daysUntilEnd !== 1 ? 's' : ''})`;
                } else {
                  endDateText = ` (Ends ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
                }
              }
            }
          } catch (e) {
            // Ignore date parsing errors
          }
        }
        
        mini.textContent = `${s.name} — $${price}${cycle}${endDateText}`;
        ev.appendChild(mini);
      });
      cell.appendChild(ev);

      grid.appendChild(cell);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
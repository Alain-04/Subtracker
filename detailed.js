// Load API utility (only if not already loaded)
if (!document.querySelector('script[src="js/api.js"]')) {
  const API_SCRIPT = document.createElement('script');
  API_SCRIPT.src = 'js/api.js';
  document.head.appendChild(API_SCRIPT);
}

document.addEventListener("DOMContentLoaded", () => {
  const modeSelect = document.getElementById("modeSelect");
  const categoriesBox = document.getElementById("categoriesBox");
  const fromYearInput = document.getElementById("fromYear");
  const toYearInput = document.getElementById("toYear");
  const applyBtn = document.getElementById("applyYearBtn");
  const yearSelectorMonthly = document.getElementById("yearSelectorMonthly");
  const yearRange = document.getElementById("yearRange");
  const selectedYearMonthlyInput = document.getElementById("selectedYearMonthly");
  const applyYearMonthlyBtn = document.getElementById("applyYearMonthlyBtn");

  let subscriptions = [];
  let selectedYear = new Date().getFullYear();

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
  }

  // Load subscriptions from API
  async function loadSubscriptions() {
    try {
      subscriptions = await subscriptionsAPI.getAll();
      updateChart();
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      if (error.message.includes('401') || error.message.includes('token')) {
        window.location.href = 'signin.html';
      } else {
        categoriesBox.innerHTML = '<div style="color: red;">Error loading subscriptions</div>';
      }
    }
  }

  // Load subscriptions (now uses API data)
  function loadSubs() {
    return subscriptions;
  }

  // Get monthly spending data for selected year
  function getMonthlyData() {
    const subs = loadSubs();
    // Filter out paused subscriptions (treat as deleted)
    const activeSubs = subs.filter(s => s.isActive !== false);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const spending = new Array(12).fill(0);

    activeSubs.forEach(sub => {
      const price = parseFloat(sub.price || 0) || 0;
      const billingCycle = sub.billingCycle || 'monthly';
      const startDate = sub.startDate ? new Date(sub.startDate) : null;
      const endDate = sub.endDate ? new Date(sub.endDate) : null;
      
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(selectedYear, i, 1);
        const monthEnd = new Date(selectedYear, i + 1, 0);
        
        // Check if subscription is active in this month
        let isActive = true;
        if (startDate && startDate > monthEnd) isActive = false;
        if (endDate && endDate < monthStart) isActive = false;
        
        if (isActive) {
          // Convert yearly subscriptions to monthly
          if (billingCycle === 'yearly') {
            spending[i] += price / 12;
          } else {
            spending[i] += price;
          }
        }
      }
    });

    return { labels: months, data: spending };
  }

  // Get yearly spending data
  function getYearlyData() {
    const subs = loadSubs();
    // Filter out paused subscriptions (treat as deleted)
    const activeSubs = subs.filter(s => s.isActive !== false);
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Get year range from inputs or use current year
    let startYear = currentYear;
    let endYear = currentYear;
    
    if (fromYearInput && toYearInput) {
      const from = parseInt(fromYearInput.value);
      const to = parseInt(toYearInput.value);
      if (!isNaN(from) && !isNaN(to) && from <= to) {
        startYear = from;
        endYear = to;
      }
    }

    const years = [];
    const spending = [];
    
    for (let year = startYear; year <= endYear; year++) {
      years.push(year.toString());
      let total = 0;
      
      activeSubs.forEach(sub => {
        const price = parseFloat(sub.price || 0) || 0;
        const billingCycle = sub.billingCycle || 'monthly';
        const startDate = sub.startDate ? new Date(sub.startDate) : null;
        const endDate = sub.endDate ? new Date(sub.endDate) : null;
        
        // Count active months in this year
        let activeMonths = 12;
        if (startDate && startDate.getFullYear() === year) {
          activeMonths = 12 - startDate.getMonth();
        }
        if (endDate && endDate.getFullYear() === year) {
          activeMonths = Math.min(activeMonths, endDate.getMonth() + 1);
        }
        if (startDate && startDate.getFullYear() > year) activeMonths = 0;
        if (endDate && endDate.getFullYear() < year) activeMonths = 0;
        
        // Convert to monthly equivalent for calculation
        const monthlyPrice = billingCycle === 'yearly' ? price / 12 : price;
        total += monthlyPrice * activeMonths;
      });
      
      spending.push(total);
    }

    return { labels: years, data: spending };
  }

  // Get category breakdown
  function getCategories() {
    const subs = loadSubs();
    // Filter out paused subscriptions (treat as deleted)
    const activeSubs = subs.filter(s => s.isActive !== false);
    const mode = modeSelect ? modeSelect.value : 'monthly';
    const categories = {};
    
    activeSubs.forEach(sub => {
      const price = parseFloat(sub.price || 0) || 0;
      const billingCycle = sub.billingCycle || 'monthly';
      const startDate = sub.startDate ? new Date(sub.startDate) : null;
      const endDate = sub.endDate ? new Date(sub.endDate) : null;
      
      // Check if subscription should be included
      let includeSubscription = true;
      if (mode === 'monthly') {
        // Only include if active in selected year
        if (startDate && startDate.getFullYear() > selectedYear) includeSubscription = false;
        if (endDate && endDate.getFullYear() < selectedYear) includeSubscription = false;
      }
      
      if (includeSubscription) {
        const category = (sub.category || "Other").toLowerCase();
        // For monthly view, use monthly price; for yearly view, use actual price
        const priceToAdd = (mode === 'monthly' && billingCycle === 'yearly') ? price / 12 : price;
        categories[category] = (categories[category] || 0) + priceToAdd;
      }
    });
    
    return categories;
  }

  // Initialize chart
  const ctx = document.getElementById("spendingChart").getContext("2d");
  let chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        label: "Spending ($)",
        data: [],
        backgroundColor: "rgba(37, 99, 235, 0.7)",
        borderColor: "rgba(37, 99, 235, 1)",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: "#fff"
          }
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "rgba(37, 99, 235, 1)",
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return "$" + context.parsed.y.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#fff"
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)"
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#fff",
            callback: function(value) {
              return "$" + value.toFixed(0);
            }
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)"
          }
        }
      }
    }
  });

  // Calculate statistics
  function calculateStats() {
    const subs = loadSubs();
    const mode = modeSelect ? modeSelect.value : 'monthly';
    let activeSubs = [];
    let totalMonthly = 0;
    let totalYearly = 0;
    
    if (mode === 'monthly') {
      // Filter subscriptions active in selected year
      activeSubs = subs.filter(sub => {
        const startDate = sub.startDate ? new Date(sub.startDate) : null;
        const endDate = sub.endDate ? new Date(sub.endDate) : null;
        let isActiveInYear = true;
        if (startDate && startDate.getFullYear() > selectedYear) isActiveInYear = false;
        if (endDate && endDate.getFullYear() < selectedYear) isActiveInYear = false;
        return isActiveInYear && sub.isActive !== false;
      });
      
      activeSubs.forEach(sub => {
        const price = parseFloat(sub.price || 0) || 0;
        const billingCycle = sub.billingCycle || 'monthly';
        if (billingCycle === 'yearly') {
          totalMonthly += price / 12;
        } else {
          totalMonthly += price;
        }
      });
      totalYearly = totalMonthly * 12;
    } else {
      // Yearly mode - use all active subscriptions
      activeSubs = subs.filter(s => s.isActive !== false);
      
      activeSubs.forEach(sub => {
        const price = parseFloat(sub.price || 0) || 0;
        if (sub.billingCycle === 'yearly') {
          totalYearly += price;
          totalMonthly += price / 12;
        } else {
          totalMonthly += price;
          totalYearly += price * 12;
        }
      });
    }
    
    const averagePrice = activeSubs.length > 0 ? totalMonthly / activeSubs.length : 0;
    
    // Update stat cards
    document.getElementById('totalMonthly').textContent = `$${totalMonthly.toFixed(2)}`;
    document.getElementById('totalYearly').textContent = `$${totalYearly.toFixed(2)}`;
    document.getElementById('activeCount').textContent = activeSubs.length;
    document.getElementById('averagePrice').textContent = `$${averagePrice.toFixed(2)}`;
    
    return { totalMonthly, totalYearly, activeSubs };
  }

  // Display subscriptions table
  function displaySubscriptionsTable() {
    const subs = loadSubs();
    const table = document.getElementById('subscriptionsTable');
    
    if (subs.length === 0) {
      table.innerHTML = '<p style="color: rgba(255,255,255,0.6);">No subscriptions found.</p>';
      return;
    }
    
    let html = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Billing Cycle</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    subs.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
    
    subs.forEach(sub => {
      const price = parseFloat(sub.price || 0) || 0;
      const startDate = sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A';
      const endDate = sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'No end date';
      const billingCycle = (sub.billingCycle || 'monthly').charAt(0).toUpperCase() + (sub.billingCycle || 'monthly').slice(1);
      const isActive = sub.isActive !== false;
      const now = new Date();
      const endDateObj = sub.endDate ? new Date(sub.endDate) : null;
      const hasEnded = endDateObj && endDateObj < now;
      const status = hasEnded ? 'ended' : (isActive ? 'active' : 'paused');
      const statusText = hasEnded ? 'Ended' : (isActive ? 'Active' : 'Paused');
      
      html += `
        <tr>
          <td>${escapeHtml(sub.name || 'Unknown')}</td>
          <td class="price">$${price.toFixed(2)}</td>
          <td>${billingCycle}</td>
          <td>${startDate}</td>
          <td>${endDate}</td>
          <td>
            ${hasEnded ? 
              `<span class="status ${status}">${statusText}</span>` : 
              `<button class="status-btn status ${status}" data-id="${sub._id}" data-active="${isActive}">${statusText}</button>`
            }
          </td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    table.innerHTML = html;
    
    // Add click handlers to status buttons
    const statusButtons = table.querySelectorAll('.status-btn');
    statusButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const subId = btn.getAttribute('data-id');
        const currentActive = btn.getAttribute('data-active') === 'true';
        const newActive = !currentActive;
        
        try {
          btn.disabled = true;
          btn.textContent = 'Updating...';
          
          // Update subscription via API
          await subscriptionsAPI.update(subId, { isActive: newActive });
          
          // Reload subscriptions and refresh the page
          await loadSubscriptions();
          updateChart();
        } catch (error) {
          console.error('Error updating subscription status:', error);
          alert('Error updating subscription: ' + (error.message || 'Unknown error'));
          btn.disabled = false;
        }
      });
    });
  }

  // Display top expenses
  function displayTopExpenses() {
    const subs = loadSubs();
    // Filter out paused subscriptions (treat as deleted)
    const activeSubs = subs.filter(s => s.isActive !== false);
    const totalMonthly = activeSubs.reduce((sum, s) => {
      const price = parseFloat(s.price || 0) || 0;
      return sum + (s.billingCycle === 'yearly' ? price / 12 : price);
    }, 0);
    
    const topExpenses = [...activeSubs]
      .map(s => ({
        name: s.name,
        price: parseFloat(s.price || 0) || 0,
        cycle: s.billingCycle || 'monthly',
        monthlyPrice: s.billingCycle === 'yearly' ? (parseFloat(s.price || 0) || 0) / 12 : (parseFloat(s.price || 0) || 0)
      }))
      .sort((a, b) => b.monthlyPrice - a.monthlyPrice)
      .slice(0, 5);
    
    const container = document.getElementById('topExpenses');
    
    if (topExpenses.length === 0) {
      container.innerHTML = '<p style="color: rgba(255,255,255,0.6);">No expenses to display.</p>';
      return;
    }
    
    let html = '';
    topExpenses.forEach((expense, index) => {
      const percentage = totalMonthly > 0 ? ((expense.monthlyPrice / totalMonthly) * 100).toFixed(1) : 0;
      html += `
        <div class="expense-item">
          <div>
            <div class="name">${index + 1}. ${escapeHtml(expense.name)}</div>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-top: 0.25rem;">
              ${expense.cycle.charAt(0).toUpperCase() + expense.cycle.slice(1)} • $${expense.price.toFixed(2)}/${expense.cycle === 'yearly' ? 'year' : 'month'}
            </div>
          </div>
          <div style="display: flex; align-items: center;">
            <span class="price">$${expense.monthlyPrice.toFixed(2)}/mo</span>
            <span class="percentage">${percentage}%</span>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  }

  // Update chart and categories
  function updateChart() {
    const mode = modeSelect.value;
    const chartData = mode === "yearly" ? getYearlyData() : getMonthlyData();
    const categories = getCategories();

    // Update chart
    chart.data.labels = chartData.labels;
    chart.data.datasets[0].data = chartData.data;
    chart.update();

    // Update statistics
    calculateStats();

    // Update categories display
    categoriesBox.innerHTML = "";
    let total = 0;
    
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    
    sortedCategories.forEach(([cat, value]) => {
      total += value;
      const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
      categoriesBox.innerHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <span style="font-weight: 500;">${catName}</span>
          <div style="text-align: right;">
            <strong style="color: #60a5fa; font-size: 1.1rem;">$${value.toFixed(2)}</strong>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.6);">${percentage}%</div>
          </div>
        </div>
      `;
    });
    
    categoriesBox.innerHTML += `
      <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid rgba(96, 165, 250, 0.3); display: flex; justify-content: space-between; align-items: center;">
        <strong style="font-size: 1.2rem;">TOTAL</strong>
        <strong style="font-size: 1.5rem; color: #60a5fa;">$${total.toFixed(2)}</strong>
      </div>
    `;
    
    // Update subscriptions table
    displaySubscriptionsTable();
    
    // Update top expenses
    displayTopExpenses();
  }

  // Set default year values
  if (fromYearInput && toYearInput) {
    const currentYear = new Date().getFullYear();
    fromYearInput.value = currentYear;
    toYearInput.value = currentYear;
  }

  // Set default year for monthly selector
  if (selectedYearMonthlyInput) {
    selectedYearMonthlyInput.value = selectedYear;
  }

  // Show/hide year selectors based on mode
  function updateYearSelectors() {
    const mode = modeSelect ? modeSelect.value : 'monthly';
    if (yearSelectorMonthly) {
      yearSelectorMonthly.style.display = mode === 'monthly' ? 'flex' : 'none';
    }
    if (yearRange) {
      yearRange.style.display = mode === 'yearly' ? 'flex' : 'none';
    }
  }

  // Event listeners
  if (modeSelect) {
    modeSelect.addEventListener("change", () => {
      updateYearSelectors();
      updateChart();
    });
  }

  // Monthly year selector
  if (applyYearMonthlyBtn && selectedYearMonthlyInput) {
    applyYearMonthlyBtn.addEventListener("click", () => {
      const year = parseInt(selectedYearMonthlyInput.value);
      if (!isNaN(year) && year >= 2000 && year <= 2100) {
        selectedYear = year;
        updateChart();
      } else {
        alert('Please enter a valid year (2000-2100)');
      }
    });

    // Enter key on year input
    selectedYearMonthlyInput.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') {
        applyYearMonthlyBtn.click();
      }
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      if (modeSelect && modeSelect.value !== "yearly") {
        modeSelect.value = "yearly";
        updateYearSelectors();
      }
      updateChart();
    });
  }

  // Initialize year selectors visibility
  updateYearSelectors();

    // Initialize when API is ready
    init();
});

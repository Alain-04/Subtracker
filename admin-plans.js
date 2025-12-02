// Admin Plans Dashboard - Premium Subscribers
let planChart, revenueChart;

// Wait for API to load
function init() {
  if (typeof userAPI === 'undefined' || typeof adminAPI === 'undefined' || typeof Chart === 'undefined') {
    setTimeout(init, 100);
    return;
  }
  checkAdminAccess();
}

async function checkAdminAccess() {
  try {
    const user = await userAPI.getProfile();
    if (user.user.role !== 'admin') {
      showError('Access denied. Admin privileges required.');
      setTimeout(() => {
        window.location.href = 'overview.html';
      }, 2000);
      return;
    }
    loadPremiumSubscribers();
  } catch (error) {
    console.error('Error checking admin access:', error);
    showError('Authentication required. Redirecting to login...');
    setTimeout(() => {
      window.location.href = 'signin.html';
    }, 2000);
  }
}

async function loadPremiumSubscribers() {
  try {
    const planStats = await adminAPI.getPlanStats();
    console.log('Plan stats received:', planStats);
    
    hideLoading();
    showSections();
    updateRevenueStats(planStats);
    updatePlanStats(planStats);
    createCharts(planStats);
    displayUsersByPlan(planStats);
    setupLogout();
  } catch (error) {
    console.error('Error loading premium subscriber data:', error);
    showError('Error loading premium subscriber data: ' + error.message);
  }
}

function updateRevenueStats(stats) {
  const standardCount = parseInt(stats.plans.standard.count) || 0;
  const teamCount = parseInt(stats.plans.team.count) || 0;
  const freeCount = parseInt(stats.plans.free.count) || 0;
  
  const standardRevenue = parseFloat(stats.plans.standard.revenue) || 0;
  const teamRevenue = parseFloat(stats.plans.team.revenue) || 0;
  
  const totalPremium = standardCount + teamCount;
  const monthlyRevenue = standardRevenue + teamRevenue;
  const yearlyRevenue = monthlyRevenue * 12;
  
  // Update revenue cards with null checks
  const monthlyEl = document.getElementById('monthlyRevenue');
  const yearlyEl = document.getElementById('yearlyRevenue');
  const totalEl = document.getElementById('totalPremiumSubscribers');
  const breakdownEl = document.getElementById('premiumBreakdown');
  const freeEl = document.getElementById('freePlanCount');
  
  if (monthlyEl) monthlyEl.textContent = `$${monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (yearlyEl) yearlyEl.textContent = `$${yearlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (totalEl) totalEl.textContent = totalPremium;
  if (breakdownEl) breakdownEl.textContent = `${standardCount} on $5 plan, ${teamCount} on $10 plan`;
  if (freeEl) freeEl.textContent = freeCount;
}

function updatePlanStats(stats) {
  const standardCount = parseInt(stats.plans.standard.count) || 0;
  const teamCount = parseInt(stats.plans.team.count) || 0;
  const standardRevenue = parseFloat(stats.plans.standard.revenue) || 0;
  const teamRevenue = parseFloat(stats.plans.team.revenue) || 0;
  
  // Update plan stats with null checks
  const standardCountEl = document.getElementById('standardPlanCount');
  const standardRevenueEl = document.getElementById('standardPlanRevenue');
  const teamCountEl = document.getElementById('teamPlanCount');
  const teamRevenueEl = document.getElementById('teamPlanRevenue');
  const standardSubEl = document.getElementById('standardSubscriberCount');
  const standardMonthlyEl = document.getElementById('standardMonthlyTotal');
  const teamSubEl = document.getElementById('teamSubscriberCount');
  const teamMonthlyEl = document.getElementById('teamMonthlyTotal');
  
  if (standardCountEl) standardCountEl.textContent = standardCount;
  if (standardRevenueEl) standardRevenueEl.textContent = `$${standardRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month revenue`;
  if (teamCountEl) teamCountEl.textContent = teamCount;
  if (teamRevenueEl) teamRevenueEl.textContent = `$${teamRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month revenue`;
  
  // Update subscriber counts in detail section
  if (standardSubEl) standardSubEl.textContent = standardCount;
  if (standardMonthlyEl) standardMonthlyEl.textContent = `$${standardRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (teamSubEl) teamSubEl.textContent = teamCount;
  if (teamMonthlyEl) teamMonthlyEl.textContent = `$${teamRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function createCharts(stats) {
  const chartsSection = document.getElementById('chartsSection');
  if (chartsSection) {
    chartsSection.style.display = 'grid';
  }

  const standardCount = parseInt(stats.plans.standard.count) || 0;
  const teamCount = parseInt(stats.plans.team.count) || 0;
  const freeCount = parseInt(stats.plans.free.count) || 0;
  const standardRevenue = parseFloat(stats.plans.standard.revenue) || 0;
  const teamRevenue = parseFloat(stats.plans.team.revenue) || 0;

  // Plan Distribution Chart
  const planCtx = document.getElementById('planChart');
  if (planChart) {
    planChart.destroy();
  }
  planChart = new Chart(planCtx, {
    type: 'doughnut',
    data: {
      labels: ['Free Plan ($0)', 'Standard Plan ($5)', 'Team Plan ($10)'],
      datasets: [{
        label: 'Subscribers',
        data: [freeCount, standardCount, teamCount],
        backgroundColor: [
          'rgba(148, 163, 184, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(37, 99, 235, 0.6)'
        ],
        borderColor: [
          'rgba(148, 163, 184, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(37, 99, 235, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#e5e7eb',
            font: {
              size: 14
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} ${value === 1 ? 'subscriber' : 'subscribers'} (${percentage}%)`;
            }
          }
        }
      }
    }
  });

  // Revenue Chart
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueChart) {
    revenueChart.destroy();
  }
  revenueChart = new Chart(revenueCtx, {
    type: 'bar',
    data: {
      labels: ['Standard Plan ($5)', 'Team Plan ($10)'],
      datasets: [{
        label: 'Monthly Revenue ($)',
        data: [standardRevenue, teamRevenue],
        backgroundColor: [
          'rgba(239, 68, 68, 0.6)',
          'rgba(37, 99, 235, 0.6)'
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(37, 99, 235, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `$${parseFloat(context.parsed.y).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#e5e7eb',
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#e5e7eb'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    }
  });
}

function displayUsersByPlan(stats) {
  const plansDetails = document.getElementById('plansDetails');
  if (plansDetails) {
    plansDetails.style.display = 'block';
  }

  // Standard Plan Users ($5/month) - Premium subscribers
  const standardUsersEl = document.getElementById('standardPlanUsers');
  const standardUsers = stats.plans.standard.users || [];
  
  if (standardUsersEl) {
    if (standardUsers.length === 0) {
      standardUsersEl.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 1rem;">No subscribers on the $5 plan yet.</p>';
    } else {
      standardUsersEl.innerHTML = standardUsers.map(user => 
        `<div class="user-item">
          <div>
            <strong>${escapeHtml(user.username)}</strong>
            <span style="color: rgba(255,255,255,0.6); margin-left: 0.5rem;">${escapeHtml(user.email || 'N/A')}</span>
          </div>
          <small style="color: rgba(255,255,255,0.5);">Subscribed: ${new Date(user.createdAt).toLocaleDateString()}</small>
        </div>`
      ).join('');
    }
  }

  // Team Plan Users ($10/month) - Premium subscribers
  const teamUsersEl = document.getElementById('teamPlanUsers');
  const teamUsers = stats.plans.team.users || [];
  
  if (teamUsersEl) {
    if (teamUsers.length === 0) {
      teamUsersEl.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 1rem;">No subscribers on the $10 plan yet.</p>';
    } else {
      teamUsersEl.innerHTML = teamUsers.map(user => 
        `<div class="user-item">
          <div>
            <strong>${escapeHtml(user.username)}</strong>
            <span style="color: rgba(255,255,255,0.6); margin-left: 0.5rem;">${escapeHtml(user.email || 'N/A')}</span>
          </div>
          <small style="color: rgba(255,255,255,0.5);">Subscribed: ${new Date(user.createdAt).toLocaleDateString()}</small>
        </div>`
      ).join('');
    }
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        authAPI.logout();
      }
    });
  }
}

function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function hideLoading() {
  const loadingEl = document.getElementById('loadingMessage');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

function showSections() {
  const revenueStats = document.getElementById('revenueStatsSection');
  const planStats = document.getElementById('planStatsSection');
  const charts = document.getElementById('chartsSection');
  const plansDetails = document.getElementById('plansDetails');
  
  if (revenueStats) revenueStats.style.display = 'grid';
  if (planStats) planStats.style.display = 'grid';
  if (charts) charts.style.display = 'grid';
  if (plansDetails) plansDetails.style.display = 'block';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.innerText = String(str ?? '');
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


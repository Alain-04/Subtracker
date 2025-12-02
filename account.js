// Wait for API to load
(function() {
  function init() {
    // Wait for API utilities to be available
    if (typeof userAPI === 'undefined' || typeof authAPI === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'signin.html';
      return;
    }

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
          authAPI.logout();
        }
      });
    }

    // Load user account data
    async function loadAccountData() {
      try {
        const usernameEl = document.getElementById('acc-username');
        const emailEl = document.getElementById('acc-email');
        
        if (usernameEl) usernameEl.textContent = 'Loading...';
        if (emailEl) emailEl.textContent = 'Loading...';

        const userData = await userAPI.getProfile();
        
        if (userData && userData.user) {
          const user = userData.user;
          
          // Display username (full, not encrypted)
          if (usernameEl) {
            usernameEl.textContent = user.username || 'N/A';
          }
          
          // Display email (full, not encrypted)
          if (emailEl) {
            emailEl.textContent = user.email || 'N/A';
          }
        } else {
          throw new Error('Invalid user data received');
        }
      } catch (error) {
        console.error('Error loading account data:', error);
        const usernameEl = document.getElementById('acc-username');
        const emailEl = document.getElementById('acc-email');
        
        if (usernameEl) usernameEl.textContent = 'Error loading username';
        if (emailEl) emailEl.textContent = 'Error loading email';
        
        // If unauthorized, redirect to login
        if (error.message.includes('401') || error.message.includes('token') || error.message.includes('Unauthorized')) {
          setTimeout(() => {
            window.location.href = 'signin.html';
          }, 2000);
        }
      }
    }

    // Change password handler
    const updatePassBtn = document.getElementById('updatePassBtn');
    if (updatePassBtn) {
      updatePassBtn.addEventListener('click', async () => {
        const currentPass = document.getElementById('currentPass').value;
        const newPass = document.getElementById('newPass').value;
        const confirmNewPass = document.getElementById('confirmNewPass').value;

        // Validation
        if (!currentPass || !newPass || !confirmNewPass) {
          alert('Please fill in all password fields.');
          return;
        }

        if (newPass !== confirmNewPass) {
          alert('New password and confirmation do not match.');
          return;
        }

        if (newPass.length < 6) {
          alert('New password must be at least 6 characters.');
          return;
        }

        try {
          updatePassBtn.disabled = true;
          updatePassBtn.textContent = 'Updating...';

          await userAPI.changePassword(currentPass, newPass);

          alert('Password updated successfully!');
          
          // Clear password fields
          document.getElementById('currentPass').value = '';
          document.getElementById('newPass').value = '';
          document.getElementById('confirmNewPass').value = '';
        } catch (error) {
          console.error('Error updating password:', error);
          let errorMessage = error.message || 'Failed to update password';
          
          if (errorMessage.includes('incorrect') || errorMessage.includes('Current password')) {
            alert('Current password is incorrect.');
          } else {
            alert('Error: ' + errorMessage);
          }
        } finally {
          updatePassBtn.disabled = false;
          updatePassBtn.textContent = 'Update Password';
        }
      });
    }

    // Load account data on page load
    loadAccountData();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Wait a bit for API scripts to load
    setTimeout(init, 100);
  }
})();






// Load API script (only if not already loaded)
if (!document.querySelector('script[src="js/api.js"]')) {
  const API_SCRIPT = document.createElement('script');
  API_SCRIPT.src = 'js/api.js';
  document.head.appendChild(API_SCRIPT);
}

// Wait for API to load
function initProfile() {
  if (typeof userAPI === 'undefined') {
    setTimeout(initProfile, 100);
    return;
  }

  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'signin.html';
    return;
  }

  // Load user profile data
  loadProfile();
  
  // Setup picture upload handlers
  setupPictureHandlers();
}

async function loadProfile() {
  try {
    const data = await userAPI.getProfile();
    
    // Update username
    const usernameEl = document.getElementById('username-display');
    if (usernameEl) {
      usernameEl.textContent = data.user.username || 'N/A';
    }

    // Update email (masked)
    const emailEl = document.getElementById('email-display');
    if (emailEl && data.user.email) {
      const email = data.user.email;
      const masked = email.charAt(0) + '*****' + email.substring(email.indexOf('@'));
      emailEl.textContent = masked;
    }

    // Update subscription count
    const subsEl = document.getElementById('subscriptions-display');
    if (subsEl) {
      const count = data.stats?.activeSubscriptions || 0;
      subsEl.textContent = `${count} active`;
    }

    // Update profile picture
    const profileImg = document.getElementById('profile-img');
    if (profileImg && data.user.profilePicture) {
      profileImg.src = data.user.profilePicture;
    }

    // Show admin panel ONLY if user is admin
    // Check role from API response
    const userRole = data.user.role;
    console.log('[Profile] User role from API:', userRole);
    console.log('[Profile] Full user data:', data.user);
    
    // Also check localStorage as fallback
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const storedRole = storedUser.role || userRole;
    console.log('[Profile] Stored user role:', storedRole);
    
    // Show admin card if role is 'admin' (check both sources)
    const adminCard = document.getElementById('admin-card');
    
    if (userRole === 'admin' || storedRole === 'admin' || data.user.username === 'admin123') {
      console.log('[Profile] ✅ User is admin - showing admin card');
      console.log('[Profile] Admin card element:', adminCard);
      if (adminCard) {
        adminCard.style.display = 'block';
        adminCard.style.visibility = 'visible';
        adminCard.style.opacity = '1';
        adminCard.removeAttribute('hidden');
        console.log('[Profile] ✅ Admin card should now be visible');
      } else {
        console.error('[Profile] ❌ Admin card element not found in DOM!');
      }
    } else {
      console.log('[Profile] User is not an admin. Role:', userRole, 'Username:', data.user.username);
      // Hide admin card
      if (adminCard) {
        adminCard.style.display = 'none';
        adminCard.style.visibility = 'hidden';
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    // If unauthorized, redirect to login
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      window.location.href = 'signin.html';
    } else {
      // Show error on page
      const usernameEl = document.getElementById('username-display');
      const emailEl = document.getElementById('email-display');
      const subsEl = document.getElementById('subscriptions-display');
      if (usernameEl) usernameEl.textContent = 'Error loading';
      if (emailEl) emailEl.textContent = 'Error loading';
      if (subsEl) subsEl.textContent = 'Error loading';
    }
  }
}

function setupPictureHandlers() {
  const uploadBtn = document.getElementById('upload-picture-btn');
  const removeBtn = document.getElementById('remove-picture-btn');
  const modal = document.getElementById('picture-modal');
  const cameraModal = document.getElementById('camera-modal');
  const takePicBtn = document.getElementById('take-pic-btn');
  const fromDeviceBtn = document.getElementById('from-device-btn');
  const cancelBtn = document.getElementById('cancel-picture-btn');
  const fileInput = document.getElementById('file-input');
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  const captureBtn = document.getElementById('capture-btn');
  const cancelCameraBtn = document.getElementById('cancel-camera-btn');
  let stream = null;

  // Open modal when upload is clicked
  if (uploadBtn) {
    uploadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal) modal.classList.remove('hidden');
    });
  }

  // Take picture option - open camera directly
  if (takePicBtn) {
    takePicBtn.addEventListener('click', async () => {
      if (modal) modal.classList.add('hidden');
      
      try {
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment' // Prefer rear camera on mobile
          } 
        });
        
        if (video && stream) {
          video.srcObject = stream;
          if (cameraModal) cameraModal.classList.remove('hidden');
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Could not access camera. Please make sure you grant camera permissions and try again.');
        if (modal) modal.classList.remove('hidden');
      }
    });
  }

  // From device option
  if (fromDeviceBtn) {
    fromDeviceBtn.addEventListener('click', () => {
      if (modal) modal.classList.add('hidden');
      if (fileInput) fileInput.click();
    });
  }

  // Cancel button (source selection modal)
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (modal) modal.classList.add('hidden');
    });
  }

  // Capture photo from camera
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      if (video && canvas) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            // Stop camera stream
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
              stream = null;
            }
            
            // Close camera modal
            if (cameraModal) cameraModal.classList.add('hidden');
            
            // Handle the captured image
            handleImageBlob(blob);
          }
        }, 'image/jpeg', 0.9);
      }
    });
  }

  // Cancel camera
  if (cancelCameraBtn) {
    cancelCameraBtn.addEventListener('click', () => {
      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      if (cameraModal) cameraModal.classList.add('hidden');
      if (modal) modal.classList.remove('hidden');
    });
  }

  // Handle file selection (from device)
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImageFile(file);
        if (modal) modal.classList.add('hidden');
      }
    });
  }

  // Remove picture
  if (removeBtn) {
    removeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to remove your profile picture?')) {
        try {
          await userAPI.updateProfile({ profilePicture: '' });
          const profileImg = document.getElementById('profile-img');
          if (profileImg) {
            profileImg.src = 'images/profile_black.png';
          }
          alert('Profile picture removed successfully!');
        } catch (error) {
          console.error('Error removing picture:', error);
          alert('Error removing profile picture: ' + error.message);
        }
      }
    });
  }
}

function handleImageBlob(blob) {
  // Convert blob to base64
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const base64Image = e.target.result;
      
      // Update profile picture
      await userAPI.updateProfile({ profilePicture: base64Image });
      
      // Update image on page
      const profileImg = document.getElementById('profile-img');
      if (profileImg) {
        profileImg.src = base64Image;
      }
      
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading picture:', error);
      alert('Error uploading profile picture: ' + error.message);
    }
  };
  
  reader.onerror = () => {
    alert('Error reading image.');
  };
  
  reader.readAsDataURL(blob);
}

function handleImageFile(file) {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image size must be less than 5MB.');
    return;
  }

  // Read file as base64
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const base64Image = e.target.result;
      
      // Update profile picture
      await userAPI.updateProfile({ profilePicture: base64Image });
      
      // Update image on page
      const profileImg = document.getElementById('profile-img');
      if (profileImg) {
        profileImg.src = base64Image;
      }
      
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading picture:', error);
      alert('Error uploading profile picture: ' + error.message);
    }
  };
  
  reader.onerror = () => {
    alert('Error reading image file.');
  };
  
  reader.readAsDataURL(file);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfile);
} else {
  initProfile();
}


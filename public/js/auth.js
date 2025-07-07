// Handle user authentication
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  checkAuthStatus();
  
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  
  // Logout link
  const logoutLinks = document.querySelectorAll('#logoutLink, #logoutNavLink');
  logoutLinks.forEach(link => {
    if (link) {
      link.addEventListener('click', handleLogout);
    }
  });
});

async function checkAuthStatus() {
  try {
    const response = await fetch('/api/me', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      updateUIForLoggedInUser(data.user);
      
      // Check if user is author of current post
      if (window.location.pathname.includes('/post.html')) {
        checkPostOwnership(data.user.userId);
      }
    } else {
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
  }
}

async function checkPostOwnership(userId) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) return;
    
    const response = await fetch(`/api/posts/${postId}`);
    if (response.ok) {
      const post = await response.json();
      const deleteButton = document.getElementById('deleteButton');
      
      if (post.authorId === userId && deleteButton) {
        deleteButton.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error checking post ownership:', error);
  }
}

function updateUIForLoggedInUser(user) {
  // Hide login/register links
  const loginLinks = document.querySelectorAll('#loginLink, #loginNavLink');
  loginLinks.forEach(link => {
    if (link) link.style.display = 'none';
  });
  
  const registerLinks = document.querySelectorAll('#registerLink');
  registerLinks.forEach(link => {
    if (link) link.style.display = 'none';
  });
  
  // Show dashboard/profile/logout links
  const dashboardLinks = document.querySelectorAll('#dashboardLink, #dashboardNavLink');
  dashboardLinks.forEach(link => {
    if (link) link.style.display = 'flex';
  });
  
  const profileLinks = document.querySelectorAll('#profileLink, #profileNavLink');
  profileLinks.forEach(link => {
    if (link) {
      link.style.display = 'flex';
      link.href = `/profile.html`;
    }
  });
  
  const logoutLinks = document.querySelectorAll('#logoutLink, #logoutNavLink');
  logoutLinks.forEach(link => {
    if (link) link.style.display = 'flex';
  });
  
  const writeLinks = document.querySelectorAll('#writeNavLink, #startWritingLink');
  writeLinks.forEach(link => {
    if (link) link.style.display = 'flex';
  });
  
  // Update username in dashboard
  const usernameDisplay = document.getElementById('usernameDisplay');
  if (usernameDisplay && user) {
    usernameDisplay.textContent = user.username;
  }
  
  // Update profile info if on profile page
  if (window.location.pathname.includes('/profile.html')) {
    const profileUsername = document.getElementById('profileUsername');
    if (profileUsername && user) {
      profileUsername.textContent = user.username;
    }
    
    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail && user) {
      profileEmail.textContent = user.email;
    }
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && user.avatar) {
      userAvatar.src = user.avatar;
    }
  }
}

function updateUIForLoggedOutUser() {
  // Show login/register links
  const loginLinks = document.querySelectorAll('#loginLink, #loginNavLink');
  loginLinks.forEach(link => {
    if (link) link.style.display = 'flex';
  });
  
  const registerLinks = document.querySelectorAll('#registerLink');
  registerLinks.forEach(link => {
    if (link) link.style.display = 'flex';
  });
  
  // Hide dashboard/profile/logout links
  const dashboardLinks = document.querySelectorAll('#dashboardLink, #dashboardNavLink');
  dashboardLinks.forEach(link => {
    if (link) link.style.display = 'none';
  });
  
  const profileLinks = document.querySelectorAll('#profileLink, #profileNavLink');
  profileLinks.forEach(link => {
    if (link) link.style.display = 'none';
  });
  
  const logoutLinks = document.querySelectorAll('#logoutLink, #logoutNavLink');
  logoutLinks.forEach(link => {
    if (link) link.style.display = 'none';
  });
  
  const writeLinks = document.querySelectorAll('#writeNavLink, #startWritingLink');
  writeLinks.forEach(link => {
    if (link) link.style.display = 'none';
  });
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  // Show loading state
  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Redirect to dashboard after successful login
      window.location.href = '/dashboard.html';
    } else {
      alert(data.error || 'Login gagal');
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Terjadi kesalahan saat login');
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (password !== confirmPassword) {
    alert('Kata sandi tidak cocok');
    return;
  }
  
  // Show loading state
  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('Registrasi berhasil! Silakan login.');
      window.location.href = '/login.html';
    } else {
      alert(data.error || 'Registrasi gagal');
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Registration error:', error);
    alert('Terjadi kesalahan saat registrasi');
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  }
}

async function handleLogout(e) {
  e.preventDefault();
  
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}
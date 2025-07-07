// Main application script
document.addEventListener('DOMContentLoaded', () => {
  // Set current year in footer
  document.getElementById('currentYear').textContent = new Date().getFullYear();
  
  // Theme toggle functionality
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    // Check for saved theme preference or use dark mode as default
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update button icon and text
    const icon = themeToggle.querySelector('i');
    if (savedTheme === 'dark') {
      icon.classList.replace('fa-moon', 'fa-sun');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i> Mode Terang';
    } else {
      icon.classList.replace('fa-sun', 'fa-moon');
      themeToggle.innerHTML = '<i class="fas fa-moon"></i> Mode Gelap';
    }
    
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      // Set new theme
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Update button icon and text
      const icon = themeToggle.querySelector('i');
      if (newTheme === 'dark') {
        icon.classList.replace('fa-sun', 'fa-moon');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> Mode Gelap';
      } else {
        icon.classList.replace('fa-moon', 'fa-sun');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Mode Terang';
      }
    });
  }
  
  // Check auth status on page load
  checkAuthStatus();
  
  // Profile link functionality
  const profileLinks = document.querySelectorAll('#profileLink, #profileNavLink');
  profileLinks.forEach(link => {
    if (link) {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
          const response = await fetch('/api/me', {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            window.location.href = `/profile.html?id=${data.user.userId}`;
          } else {
            window.location.href = '/login.html';
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          window.location.href = '/login.html';
        }
      });
    }
  });
  
  // Delete button functionality
  const deleteButton = document.getElementById('deleteButton');
  if (deleteButton) {
    deleteButton.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const urlParams = new URLSearchParams(window.location.search);
      const postId = urlParams.get('id');
      
      if (!postId) return;
      
      const confirmDelete = confirm('Apakah Anda yakin ingin menghapus postingan ini?');
      if (!confirmDelete) return;
      
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          alert('Postingan berhasil dihapus');
          window.location.href = '/dashboard.html';
        } else {
          const data = await response.json();
          alert(data.error || 'Gagal menghapus postingan');
        }
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('Terjadi kesalahan saat menghapus postingan');
      }
    });
  }
  
  // Save draft button functionality
  const saveDraftButton = document.getElementById('saveDraft');
  if (saveDraftButton) {
    saveDraftButton.addEventListener('click', () => {
      alert('Fitur simpan draft akan segera hadir!');
    });
  }
});
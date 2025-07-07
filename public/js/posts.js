// Handle posts functionality
document.addEventListener('DOMContentLoaded', () => {
  // Load posts on homepage
  if (document.getElementById('featuredPosts')) {
    loadFeaturedPosts();
  }
  
  // Load posts on dashboard
  if (document.getElementById('userPosts') || document.getElementById('communityPosts')) {
    loadDashboardPosts();
  }
  
  // Load posts on profile page
  if (document.getElementById('profilePosts')) {
    loadProfilePosts();
  }
  
  // Handle post form
  const postForm = document.getElementById('postForm');
  if (postForm) {
    postForm.addEventListener('submit', handlePostSubmit);
  }
  
  // Load single post
  if (window.location.pathname.includes('/post.html')) {
    loadSinglePost();
  }
  
  // Handle like button
  const likeButton = document.getElementById('likeButton');
  if (likeButton) {
    likeButton.addEventListener('click', handleLike);
  }
  
  // Handle share button
  const shareButton = document.getElementById('shareButton');
  if (shareButton) {
    shareButton.addEventListener('click', handleShare);
  }
  
  // Handle comment form
  const commentForm = document.getElementById('commentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit);
  }
});

async function loadFeaturedPosts() {
  try {
    const response = await fetch('/api/posts');
    const posts = await response.json();
    
    const featuredPostsContainer = document.getElementById('featuredPosts');
    featuredPostsContainer.innerHTML = '';
    
    // Display only the first 6 posts
    const featuredPosts = posts.slice(0, 6);
    
    if (featuredPosts.length === 0) {
      featuredPostsContainer.innerHTML = '<p class="no-posts">Belum ada karya yang tersedia. Jadilah yang pertama berbagi!</p>';
      return;
    }
    
    featuredPosts.forEach(post => {
      const postElement = createPostCard(post);
      featuredPostsContainer.appendChild(postElement);
    });
  } catch (error) {
    console.error('Error loading featured posts:', error);
    const featuredPostsContainer = document.getElementById('featuredPosts');
    featuredPostsContainer.innerHTML = '<p class="error-message">Gagal memuat karya. Silakan coba lagi nanti.</p>';
  }
}

async function loadDashboardPosts() {
  try {
    const response = await fetch('/api/posts');
    const posts = await response.json();
    
    // Get current user
    const userResponse = await fetch('/api/me', {
      credentials: 'include'
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      const userId = userData.user.userId;
      
      // Filter user's posts
      const userPosts = posts.filter(post => post.authorId === userId);
      const communityPosts = posts.filter(post => post.authorId !== userId);
      
      // Display user's posts
      const userPostsContainer = document.getElementById('userPosts');
      if (userPostsContainer) {
        userPostsContainer.innerHTML = '';
        
        if (userPosts.length === 0) {
          userPostsContainer.innerHTML = '<p class="no-posts">Anda belum memiliki karya. <a href="/write.html" class="text-link">Tulis karya pertama Anda!</a></p>';
        } else {
          userPosts.forEach(post => {
            const postElement = createPostCard(post);
            userPostsContainer.appendChild(postElement);
          });
        }
      }
      
      // Display community posts
      const communityPostsContainer = document.getElementById('communityPosts');
      if (communityPostsContainer) {
        communityPostsContainer.innerHTML = '';
        
        if (communityPosts.length === 0) {
          communityPostsContainer.innerHTML = '<p class="no-posts">Belum ada karya dari komunitas.</p>';
        } else {
          communityPosts.forEach(post => {
            const postElement = createPostCard(post);
            communityPostsContainer.appendChild(postElement);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading dashboard posts:', error);
    const userPostsContainer = document.getElementById('userPosts');
    const communityPostsContainer = document.getElementById('communityPosts');
    
    if (userPostsContainer) {
      userPostsContainer.innerHTML = '<p class="error-message">Gagal memuat karya Anda. Silakan coba lagi nanti.</p>';
    }
    
    if (communityPostsContainer) {
      communityPostsContainer.innerHTML = '<p class="error-message">Gagal memuat karya komunitas. Silakan coba lagi nanti.</p>';
    }
  }
}

async function loadProfilePosts() {
  try {
    // Extract user ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    if (!userId) {
      // If no ID in URL, try to get current user
      const userResponse = await fetch('/api/me', {
        credentials: 'include'
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        window.location.href = `/profile.html?id=${userData.user.userId}`;
        return;
      } else {
        window.location.href = '/login.html';
        return;
      }
    }
    
    // Get user profile data
    const response = await fetch(`/api/users/${userId}`);
    const userData = await response.json();
    
    // Update profile info
    document.getElementById('profileUsername').textContent = userData.username;
    document.getElementById('profileEmail').textContent = userData.email;
    
    if (userData.avatar) {
      document.getElementById('userAvatar').src = userData.avatar;
    }
    
    // Update stats
    document.getElementById('postCount').textContent = userData.posts.length;
    
    // Calculate total likes and views
    const totalLikes = userData.posts.reduce((sum, post) => sum + post.likes, 0);
    const totalViews = userData.posts.reduce((sum, post) => sum + post.views, 0);
    
    document.getElementById('likeCount').textContent = totalLikes;
    document.getElementById('viewCount').textContent = totalViews;
    
    // Display user's posts
    const profilePostsContainer = document.getElementById('profilePosts');
    profilePostsContainer.innerHTML = '';
    
    if (userData.posts.length === 0) {
      profilePostsContainer.innerHTML = '<p class="no-posts">Belum ada karya yang dibagikan.</p>';
      return;
    }
    
    userData.posts.forEach(post => {
      const postElement = createPostCard(post, true);
      profilePostsContainer.appendChild(postElement);
    });
    
  } catch (error) {
    console.error('Error loading profile posts:', error);
    const profilePostsContainer = document.getElementById('profilePosts');
    profilePostsContainer.innerHTML = '<p class="error-message">Gagal memuat profil. Silakan coba lagi nanti.</p>';
  }
}

async function loadSinglePost() {
  try {
    // Extract post ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) {
      window.location.href = '/';
      return;
    }
    
    const response = await fetch(`/api/posts/${postId}`);
    const post = await response.json();
    
    // Update post details
    document.title = `${post.title} - Egunkari`;
    document.getElementById('postTitle').textContent = post.title;
    document.getElementById('postAuthor').textContent = `Oleh ${post.authorName}`;
    document.getElementById('postDate').textContent = new Date(post.createdAt).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    document.getElementById('postViews').textContent = `${post.views} dilihat`;
    document.getElementById('postContent').textContent = post.content;
    document.getElementById('likeCount').textContent = post.likes;
    
    // Update tags
    const tagsContainer = document.getElementById('postTags');
    tagsContainer.innerHTML = '';
    
    if (post.tags && post.tags.length > 0) {
      post.tags.forEach(tag => {
        if (tag.trim()) {
          const tagElement = document.createElement('span');
          tagElement.className = 'tag';
          tagElement.textContent = tag.trim();
          tagsContainer.appendChild(tagElement);
        }
      });
    }
    
    // Update comments
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    
    if (post.comments && post.comments.length > 0) {
      post.comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';
        commentElement.innerHTML = `
          <div class="comment-header">
            <div class="comment-author">
              ${comment.authorAvatar ? `<img src="${comment.authorAvatar}" alt="${comment.authorName}">` : ''}
              <span>${comment.authorName}</span>
            </div>
            <span class="comment-date">${new Date(comment.createdAt).toLocaleDateString('id-ID')}</span>
          </div>
          <div class="comment-text">${comment.text}</div>
        `;
        commentsList.appendChild(commentElement);
      });
    } else {
      commentsList.innerHTML = '<p class="no-comments">Belum ada komentar. Jadilah yang pertama berkomentar!</p>';
    }
    
    // Check if user is logged in to enable comment form
    checkAuthStatus();
    
  } catch (error) {
    console.error('Error loading single post:', error);
    window.location.href = '/';
  }
}

function createPostCard(post, showDelete = false) {
  const postCard = document.createElement('div');
  postCard.className = 'post-card';
  
  // Truncate content for preview
  const previewContent = post.content.length > 150 
    ? post.content.substring(0, 150) + '...' 
    : post.content;
  
  const postDate = new Date(post.createdAt).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  postCard.innerHTML = `
    <div class="post-card-content">
      <h3>${post.title}</h3>
      <div class="post-meta">
        <span class="author">${post.authorName}</span>
        <span class="date">${postDate}</span>
        <span class="views"><i class="fas fa-eye"></i> ${post.views}</span>
        <span class="likes"><i class="fas fa-heart"></i> ${post.likes}</span>
      </div>
      <p>${previewContent}</p>
      <div class="post-tags">
        ${post.tags.map(tag => tag.trim() ? `<span class="tag">${tag.trim()}</span>` : '').join('')}
      </div>
      <div class="post-actions">
        <a href="/post.html?id=${post.id}" class="btn btn-outline"><i class="fas fa-book-open"></i> Baca</a>
        ${showDelete ? `<button class="btn btn-danger btn-sm delete-post" data-id="${post.id}"><i class="fas fa-trash"></i> Hapus</button>` : ''}
      </div>
    </div>
  `;
  
  // Add delete event listener if needed
  if (showDelete) {
    const deleteButton = postCard.querySelector('.delete-post');
    deleteButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const confirmDelete = confirm('Apakah Anda yakin ingin menghapus postingan ini?');
      if (!confirmDelete) return;
      
      try {
        const response = await fetch(`/api/posts/${post.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          postCard.remove();
          // Update post count
          const postCount = document.getElementById('postCount');
          if (postCount) {
            postCount.textContent = parseInt(postCount.textContent) - 1;
          }
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
  
  // Add click event to the whole card
  postCard.addEventListener('click', (e) => {
    if (!e.target.closest('.delete-post') && !e.target.closest('.btn-danger')) {
      window.location.href = `/post.html?id=${post.id}`;
    }
  });
  
  return postCard;
}

async function handlePostSubmit(e) {
  e.preventDefault();
  
  const title = document.getElementById('postTitle').value;
  const content = document.getElementById('postContent').value;
  const tags = document.getElementById('postTags').value;
  
  // Show loading state
  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mempublikasikan...';
  
  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, content, tags }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('Karya berhasil dipublikasikan!');
      window.location.href = `/post.html?id=${data.postId}`;
    } else {
      alert(data.error || 'Gagal mempublikasikan karya');
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Error submitting post:', error);
    alert('Terjadi kesalahan saat mempublikasikan karya');
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  }
}

async function handleLike() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) return;
    
    // Show loading state
    const likeButton = document.getElementById('likeButton');
    const originalText = likeButton.innerHTML;
    likeButton.disabled = true;
    likeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
    
    const response = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      document.getElementById('likeCount').textContent = data.likes;
    }
    
    likeButton.disabled = false;
    likeButton.innerHTML = originalText;
  } catch (error) {
    console.error('Error liking post:', error);
    const likeButton = document.getElementById('likeButton');
    likeButton.disabled = false;
    likeButton.innerHTML = '<i class="fas fa-heart"></i> Suka';
  }
}

function handleShare() {
  const url = window.location.href;
  const title = document.getElementById('postTitle').textContent;
  
  if (navigator.share) {
    navigator.share({
      title: title,
      text: 'Lihat karya ini di Egunkari',
      url: url
    }).catch(err => {
      console.error('Error sharing:', err);
      copyToClipboard(url);
    });
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  alert('Link berhasil disalin ke clipboard!');
}

async function handleCommentSubmit(e) {
  e.preventDefault();
  
  const text = document.getElementById('commentText').value;
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  
  if (!text || !postId) return;
  
  // Show loading state
  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
  
  try {
    const response = await fetch(`/api/posts/${postId}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Clear comment input
      document.getElementById('commentText').value = '';
      
      // Remove "no comments" message if exists
      const noCommentsMsg = document.querySelector('.no-comments');
      if (noCommentsMsg) noCommentsMsg.remove();
      
      // Add new comment to the list
      const commentsList = document.getElementById('commentsList');
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.innerHTML = `
        <div class="comment-header">
          <div class="comment-author">
            ${data.comment.authorAvatar ? `<img src="${data.comment.authorAvatar}" alt="${data.comment.authorName}">` : ''}
            <span>${data.comment.authorName}</span>
          </div>
          <span class="comment-date">${new Date(data.comment.createdAt).toLocaleDateString('id-ID')}</span>
        </div>
        <div class="comment-text">${data.comment.text}</div>
      `;
      commentsList.appendChild(commentElement);
      
      // Scroll to the new comment
      commentElement.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (error) {
    console.error('Error submitting comment:', error);
    alert('Terjadi kesalahan saat mengirim komentar');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  }
}
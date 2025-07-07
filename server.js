require('dotenv').config();
const express = require('express');
const path = require('path');
const { google } = require('googleapis');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();
const port = process.env.PORT || 3000;

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

// Regular middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  etag: false
}));

// Google Sheets Configuration
const spreadsheetId = process.env.SPREADSHEET_ID || '1OTwKWXNhj1a0A74kKDz5jSjvaoSWyCESQIbGGDyRYfM';
const usersSheetName = 'egunkari_users';
const postsSheetName = 'egunkari_posts';

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'egunkari-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Helper function to access Google Sheets
async function accessGoogleSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// Initialize sheets with proper headers
async function initializeSheets() {
  try {
    const googleSheets = await accessGoogleSheets();
    
    // Get all sheets
    const spreadsheet = await googleSheets.spreadsheets.get({ spreadsheetId });
    const sheets = spreadsheet.data.sheets || [];
    const sheetTitles = sheets.map(sheet => sheet.properties.title);
    
    // Create users sheet if not exists
    if (!sheetTitles.includes(usersSheetName)) {
      await googleSheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: usersSheetName,
                gridProperties: { rowCount: 1000, columnCount: 10 }
              }
            }
          }]
        }
      });
      
      await googleSheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${usersSheetName}!A1:E1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [['ID', 'Email', 'Username', 'Password', 'Avatar']]
        }
      });
    }
    
    // Create posts sheet if not exists
    if (!sheetTitles.includes(postsSheetName)) {
      await googleSheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: postsSheetName,
                gridProperties: { rowCount: 1000, columnCount: 12 }
              }
            }
          }]
        }
      });
      
      await googleSheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${postsSheetName}!A1:L1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[
            'ID', 'Author ID', 'Author Name', 'Title', 'Content', 
            'Tags', 'Created At', 'Updated At', 'Views', 
            'Likes', 'Comments', 'IsDeleted'
          ]]
        }
      });
    }
  } catch (error) {
    console.error('Error initializing sheets:', error);
  }
}

initializeSheets();

// Utility functions
function generateAvatarUrl(username) {
  const colors = ['FFAD08', 'EDD382', 'FCFF4B', 'FF70A6', 'FF9770', 'FFD670', 'E9FF70', '7DCD85'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${color}&color=fff&size=128`;
}

// API Routes

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }
    
    const googleSheets = await accessGoogleSheets();
    
    // Check if user exists
    const usersResponse = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${usersSheetName}!A2:E`
    });
    
    const users = usersResponse.data.values || [];
    const userExists = users.some(user => user[1] === email);
    
    if (userExists) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }
    
    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const avatarUrl = generateAvatarUrl(username);
    
    await googleSheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${usersSheetName}!A2:E2`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[userId, email, username, hashedPassword, avatarUrl]]
      }
    });
    
    res.status(201).json({ 
      message: 'Registrasi berhasil',
      user: { id: userId, username, email, avatar: avatarUrl }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password harus diisi' });
    }
    
    const googleSheets = await accessGoogleSheets();
    const usersResponse = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${usersSheetName}!A2:E`
    });
    
    const users = usersResponse.data.values || [];
    const user = users.find(user => user[1] === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    
    const passwordMatch = await bcrypt.compare(password, user[3]);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user[0], 
        email: user[1], 
        username: user[2],
        avatar: user[4] || generateAvatarUrl(user[2])
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000, // 1 hour
      sameSite: 'strict'
    });
    
    res.json({ 
      message: 'Login berhasil',
      user: {
        id: user[0],
        username: user[2],
        email: user[1],
        avatar: user[4] || generateAvatarUrl(user[2])
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout berhasil' });
});

// Get current user
app.get('/api/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Tidak terotorisasi' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Token tidak valid' });
  }
});

// Post Routes

// Create a new post
app.post('/api/posts', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Tidak terotorisasi' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const { title, content, tags } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan konten harus diisi' });
    }
    
    const googleSheets = await accessGoogleSheets();
    const postId = uuidv4();
    const now = new Date().toISOString();
    
    await googleSheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${postsSheetName}!A2:L2`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          postId,
          decoded.userId,
          decoded.username,
          title,
          content,
          tags || '',
          now,
          now,
          0, // views
          0, // likes
          JSON.stringify([]), // comments
          'FALSE' // isDeleted
        ]]
      }
    });
    
    res.status(201).json({ 
      message: 'Postingan berhasil dibuat',
      postId 
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get all active posts
app.get('/api/posts', async (req, res) => {
  try {
    const googleSheets = await accessGoogleSheets();
    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${postsSheetName}!A2:L`
    });
    
    const rows = response.data.values || [];
    const posts = rows
      .filter(row => row[11] !== 'TRUE') // Filter out deleted posts
      .map(row => ({
        id: row[0],
        authorId: row[1],
        authorName: row[2],
        title: row[3],
        content: row[4],
        tags: row[5] ? row[5].split(',').map(tag => tag.trim()) : [],
        createdAt: row[6],
        updatedAt: row[7],
        views: parseInt(row[8]) || 0,
        likes: parseInt(row[9]) || 0,
        comments: JSON.parse(row[10] || '[]')
      }));
    
    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const googleSheets = await accessGoogleSheets();
    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${postsSheetName}!A2:L`
    });
    
    const rows = response.data.values || [];
    const post = rows.find(row => row[0] === id && row[11] !== 'TRUE');
    
    if (!post) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan' });
    }
    
    // Increment view count
    const rowIndex = rows.findIndex(row => row[0] === id) + 2;
    const currentViews = parseInt(post[8]) || 0;
    
    await googleSheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${postsSheetName}!I${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[currentViews + 1]]
      }
    });
    
    res.json({
      id: post[0],
      authorId: post[1],
      authorName: post[2],
      title: post[3],
      content: post[4],
      tags: post[5] ? post[5].split(',').map(tag => tag.trim()) : [],
      createdAt: post[6],
      updatedAt: post[7],
      views: currentViews + 1,
      likes: parseInt(post[9]) || 0,
      comments: JSON.parse(post[10] || '[]')
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Like a post
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Tidak terotorisasi' });
    }
    
    const { id } = req.params;
    const googleSheets = await accessGoogleSheets();
    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${postsSheetName}!A2:L`
    });
    
    const rows = response.data.values || [];
    const post = rows.find(row => row[0] === id && row[11] !== 'TRUE');
    
    if (!post) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan' });
    }
    
    const rowIndex = rows.findIndex(row => row[0] === id) + 2;
    const currentLikes = parseInt(post[9]) || 0;
    
    await googleSheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${postsSheetName}!J${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[currentLikes + 1]]
      }
    });
    
    res.json({ 
      message: 'Postingan disukai',
      likes: currentLikes + 1
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Add comment to post
app.post('/api/posts/:id/comment', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Tidak terotorisasi' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Komentar tidak boleh kosong' });
    }
    
    const googleSheets = await accessGoogleSheets();
    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${postsSheetName}!A2:L`
    });
    
    const rows = response.data.values || [];
    const post = rows.find(row => row[0] === id && row[11] !== 'TRUE');
    
    if (!post) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan' });
    }
    
    const rowIndex = rows.findIndex(row => row[0] === id) + 2;
    const currentComments = JSON.parse(post[10] || '[]');
    const newComment = {
      id: uuidv4(),
      authorId: decoded.userId,
      authorName: decoded.username,
      authorAvatar: decoded.avatar,
      text,
      createdAt: new Date().toISOString()
    };
    
    currentComments.push(newComment);
    
    await googleSheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${postsSheetName}!K${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[JSON.stringify(currentComments)]]
      }
    });
    
    res.json({ 
      message: 'Komentar berhasil ditambahkan',
      comment: newComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Delete a post (soft delete)
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Tidak terotorisasi' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = req.params;
    
    const googleSheets = await accessGoogleSheets();
    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${postsSheetName}!A2:L`
    });
    
    const rows = response.data.values || [];
    const post = rows.find(row => row[0] === id);
    
    if (!post) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan' });
    }
    
    // Check if user is the author
    if (post[1] !== decoded.userId) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin' });
    }
    
    const rowIndex = rows.findIndex(row => row[0] === id) + 2;
    
    // Mark as deleted
    await googleSheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${postsSheetName}!L${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['TRUE']]
      }
    });
    
    res.json({ message: 'Postingan berhasil dihapus' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Get user profile with posts
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const googleSheets = await accessGoogleSheets();
    
    // Get user info
    const usersResponse = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${usersSheetName}!A2:E`
    });
    
    const users = usersResponse.data.values || [];
    const user = users.find(u => u[0] === id);
    
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }
    
    // Get user posts (not deleted)
    const postsResponse = await googleSheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${postsSheetName}!A2:L`
    });
    
    const posts = (postsResponse.data.values || [])
      .filter(post => post[1] === id && post[11] !== 'TRUE')
      .map(post => ({
        id: post[0],
        title: post[3],
        content: post[4],
        tags: post[5] ? post[5].split(',').map(tag => tag.trim()) : [],
        createdAt: post[6],
        updatedAt: post[7],
        views: parseInt(post[8]) || 0,
        likes: parseInt(post[9]) || 0,
        comments: JSON.parse(post[10] || '[]')
      }));
    
    res.json({
      id: user[0],
      username: user[2],
      email: user[1],
      avatar: user[4] || generateAvatarUrl(user[2]),
      posts
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Serve HTML files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan server' });
});

// Start server
app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});
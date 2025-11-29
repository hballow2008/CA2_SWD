const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// CSRF Token Store
const csrfTokenStore = new Map();

// Clean old CSRF tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of csrfTokenStore.entries()) {
    if (data.expiresAt < now) {
      csrfTokenStore.delete(token);
    }
  }
}, 10 * 60 * 1000);

// Generate CSRF Token
function generateCSRFToken(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour expiry
  csrfTokenStore.set(token, { email, expiresAt });
  return token;
}

// Validate CSRF Token Middleware
function validateCSRFToken(req, res, next) {
  const token = req.headers['x-csrf-token'];
  const email = req.body.email || req.query.email;
  
  if (!token) {
    return res.status(403).json({ 
      success: false,
      error: 'CSRF token missing',
      csrfError: true 
    });
  }
  
  const storedData = csrfTokenStore.get(token);
  
  if (!storedData) {
    return res.status(403).json({ 
      success: false,
      error: 'Invalid or expired CSRF token',
      csrfError: true 
    });
  }
  
  if (storedData.expiresAt < Date.now()) {
    csrfTokenStore.delete(token);
    return res.status(403).json({ 
      success: false,
      error: 'CSRF token expired',
      csrfError: true 
    });
  }
  
  if (email && storedData.email !== email.toLowerCase().trim()) {
    return res.status(403).json({ 
      success: false,
      error: 'CSRF token mismatch',
      csrfError: true 
    });
  }
  
  next();
}

// Rate limiting storage
const rateLimitStore = { login: {}, signup: {}, passwordChange: {} };

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(endpoint => {
    Object.keys(rateLimitStore[endpoint]).forEach(key => {
      if (rateLimitStore[endpoint][key].resetTime < now) {
        delete rateLimitStore[endpoint][key];
      }
    });
  });
}, 5 * 60 * 1000);

// Rate limiting middleware
function rateLimit(endpoint, maxAttempts, windowMs) {
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore[endpoint][identifier]) {
      rateLimitStore[endpoint][identifier] = { count: 0, resetTime: now + windowMs };
    }
    
    const record = rateLimitStore[endpoint][identifier];
    
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    
    if (record.count >= maxAttempts) {
      const waitTime = Math.ceil((record.resetTime - now) / 1000 / 60);
      return res.status(429).json({ 
        success: false,
        error: `Too many attempts. Please try again in ${waitTime} minute(s).`,
        rateLimited: true
      });
    }
    
    record.count++;
    next();
  };
}

function sanitizeInput(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';
  return input.trim().substring(0, maxLength);
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

function validatePassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  return true;
}

const db = new sqlite3.Database('./notes.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_by TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`INSERT OR IGNORE INTO notes (id, title, content, created_by)
      VALUES (1, '1. Welcome to ADMIN ACCOUNT.', '1. Welcome to ADMIN ACCOUNT.', 'admin')`);

    db.run("UPDATE notes SET created_by = ? WHERE created_by = ?", ['admin', 'user']);
    db.run("DELETE FROM notes WHERE id IN (2,3) OR title IN (?,?)", ['Shopping List', 'Meeting Notes']);

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      failed_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run("ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0", () => {});
    db.run("ALTER TABLE users ADD COLUMN locked_until DATETIME", () => {});
    db.run("ALTER TABLE users ADD COLUMN last_login DATETIME", () => {});

    const adminHash = bcrypt.hashSync('Admin@123', 10);
    const tomHash = bcrypt.hashSync('Tom@pass123', 10);
    const jerryHash = bcrypt.hashSync('Jerry@pass123', 10);

    db.run(`INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?,?,?,?)`, 
      ['admin', 'admin@me.com', adminHash, 'admin']);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?,?,?,?)`, 
      ['Tom', 'tom@me.com', tomHash, 'user']);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?,?,?,?)`, 
      ['Jerry', 'jerry@me.com', jerryHash, 'user']);
    console.log('Database initialized');
  });
}

function validateSession(req, res, next) {
  let username = req.query.username || req.body.username;
  let email = req.query.email || req.body.email;
  
  if (!email && !username) {
    return res.status(401).json({ 
      error: 'Session expired. Please login again.',
      sessionExpired: true 
    });
  }

  const identifier = email || username;
  
  db.get('SELECT * FROM users WHERE email = ? OR username = ?', [identifier, identifier], (err, user) => {
    if (err) {
      return res.status(500).json({ 
        error: 'Server error',
        sessionExpired: false 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Session expired. Please login again.',
        sessionExpired: true 
      });
    }

    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      const now = new Date();
      
      if (lockedUntil > now) {
        const minutesLeft = Math.ceil((lockedUntil - now) / 1000 / 60);
        return res.status(403).json({ 
          error: `Account locked. Try again in ${minutesLeft} minute(s).`,
          accountLocked: true,
          minutesLeft
        });
      } else {
        db.run('UPDATE users SET locked_until = NULL, failed_attempts = 0 WHERE id = ?', [user.id]);
      }
    }

    req.user = user;
    next();
  });
}

// Signup
app.post('/api/signup', rateLimit('signup', 3, 60 * 60 * 1000), (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.json({ success: false, error: 'Please provide username, email and password.' });
  }

  const cleanUsername = sanitizeInput(username, 30);
  if (!validateUsername(cleanUsername)) {
    return res.json({ success: false, error: 'Username must be 3-30 characters (letters, numbers, underscore, hyphen only)' });
  }

  const emailLower = email.toLowerCase().trim();
  if (!validateEmail(emailLower)) {
    return res.json({ success: false, error: 'Please provide a valid email address.' });
  }

  if (!validatePassword(password)) {
    return res.json({ 
      success: false, 
      error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.' 
    });
  }

  db.get('SELECT id FROM users WHERE email = ?', [emailLower], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: 'Server error' });
    if (row) return res.json({ success: false, error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)', 
      [cleanUsername, emailLower, hash, 'user'], 
      function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        return res.json({ success: true, user: { username: cleanUsername, email: emailLower, role: 'user' } });
      }
    );
  });
});

// Login - Returns CSRF token
app.post('/api/login', rateLimit('login', 5, 15 * 60 * 1000), (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.json({ success: false, error: 'Please provide email and password.' });
  }

  const emailLower = email.toLowerCase().trim();
  if (!validateEmail(emailLower)) {
    return res.json({ success: false, error: 'Please provide a valid email address.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [emailLower], (err, user) => {
    if (err) return res.status(500).json({ success: false, error: 'Server error' });
    if (!user) return res.json({ success: false, error: 'Invalid credentials.', emailNotFound: true });

    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      const now = new Date();
      
      if (lockedUntil > now) {
        const minutesLeft = Math.ceil((lockedUntil - now) / 1000 / 60);
        return res.json({ 
          success: false, 
          error: `Account temporarily locked due to multiple failed login attempts. Try again in ${minutesLeft} minute(s).`,
          accountLocked: true,
          minutesLeft
        });
      } else {
        db.run('UPDATE users SET locked_until = NULL, failed_attempts = 0 WHERE id = ?', [user.id]);
        user.locked_until = null;
        user.failed_attempts = 0;
      }
    }

    const match = bcrypt.compareSync(password, user.password);
    
    if (match) {
      db.run('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      
      // Generate CSRF token
      const csrfToken = generateCSRFToken(emailLower);
      
      return res.json({ 
        success: true, 
        user: { 
          username: user.username, 
          email: user.email, 
          role: user.role, 
          lastLogin: user.last_login 
        },
        csrfToken: csrfToken
      });
    } else {
      const newFailedAttempts = (user.failed_attempts || 0) + 1;
      
      if (newFailedAttempts >= 3) {
        const lockUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        db.run('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?', 
          [newFailedAttempts, lockUntil, user.id]);
        
        return res.json({ 
          success: false, 
          error: 'Too many failed attempts. Account locked for 5 minutes.',
          accountLocked: true,
          minutesLeft: 5
        });
      } else {
        db.run('UPDATE users SET failed_attempts = ? WHERE id = ?', [newFailedAttempts, user.id]);
        const attemptsLeft = 3 - newFailedAttempts;
        
        return res.json({ 
          success: false, 
          error: `Invalid credentials. ${attemptsLeft} attempt(s) remaining before account lock.`,
          attemptsLeft
        });
      }
    }
  });
});

// Change Password - CSRF Protected
app.post('/api/change-password', validateCSRFToken, rateLimit('passwordChange', 5, 60 * 60 * 1000), (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  if (!email || !oldPassword || !newPassword) {
    return res.json({ success: false, error: 'Please provide email, old password, and new password.' });
  }

  const emailLower = email.toLowerCase().trim();

  if (!validatePassword(newPassword)) {
    return res.json({ 
      success: false, 
      error: 'New password must be at least 8 characters with uppercase, lowercase, number, and special character.' 
    });
  }

  db.get('SELECT * FROM users WHERE email = ?', [emailLower], (err, user) => {
    if (err) return res.status(500).json({ success: false, error: 'Server error' });
    if (!user) return res.json({ success: false, error: 'User not found.' });

    const match = bcrypt.compareSync(oldPassword, user.password);
    
    if (!match) {
      return res.json({ success: false, error: 'Current password is incorrect.' });
    }

    if (oldPassword === newPassword) {
      return res.json({ success: false, error: 'New password must be different from current password.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id], (err) => {
      if (err) return res.status(500).json({ success: false, error: 'Failed to update password.' });
      
      // Invalidate CSRF tokens for this user
      for (const [token, data] of csrfTokenStore.entries()) {
        if (data.email === emailLower) {
          csrfTokenStore.delete(token);
        }
      }
      
      return res.json({ success: true, message: 'Password changed successfully!' });
    });
  });
});

// Notes routes - CSRF Protected
function canAccessNote(role, createdBy, username) {
  if (role === 'admin') return true;
  return createdBy === username;
}

function canModifyNote(role, createdBy, username) {
  if (role === 'admin') return true;
  return createdBy === username;
}

app.get('/api/notes', validateCSRFToken, validateSession, (req, res) => {
  const { role, username } = req.query;
  
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  let query = 'SELECT * FROM notes';
  let params = [];

  if (role === 'user') {
    if (!username) return res.status(400).json({ error: 'Missing username for user role' });
    query += ' WHERE created_by = ?';
    params.push(sanitizeInput(username, 50));
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, notes) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(notes);
  });
});

app.get('/api/notes/:id', validateCSRFToken, validateSession, (req, res) => {
  const { id } = req.params;
  const { role, username } = req.query;
  
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  const noteId = parseInt(id);
  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, note) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    
    if (!canAccessNote(role, note.created_by, username)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(note);
  });
});

app.post('/api/notes', validateCSRFToken, validateSession, (req, res) => {
  const { title, content, role, username } = req.body;

  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  if (role === 'user' && !username) {
    return res.status(400).json({ error: 'Missing username for user role' });
  }

  const cleanTitle = sanitizeInput(title, 200);
  const cleanContent = sanitizeInput(content, 5000);

  if (!cleanTitle || !cleanContent) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const creator = role === 'admin' ? (username || 'admin') : username;
  const cleanCreator = sanitizeInput(creator, 50);
  
  db.run('INSERT INTO notes (title, content, created_by) VALUES (?, ?, ?)',
    [cleanTitle, cleanContent, cleanCreator],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Note created', noteId: this.lastID });
    }
  );
});

app.put('/api/notes/:id', validateCSRFToken, validateSession, (req, res) => {
  const { id } = req.params;
  const { title, content, role, username } = req.body;
 
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  const noteId = parseInt(id);
  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, note) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    
    if (!canModifyNote(role, note.created_by, username)) {
      return res.status(403).json({ error: 'Access denied - you can only edit your own notes' });
    }
    
    const cleanTitle = sanitizeInput(title, 200);
    const cleanContent = sanitizeInput(content, 5000);

    if (!cleanTitle || !cleanContent) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    db.run('UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [cleanTitle, cleanContent, noteId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Note updated', changes: this.changes });
      }
    );
  });
});

app.delete('/api/notes/:id', validateCSRFToken, validateSession, (req, res) => {
  const { id } = req.params;
  const { role, username } = req.query;
  
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  const noteId = parseInt(id);
  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, note) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    
    if (!canModifyNote(role, note.created_by, username)) {
      return res.status(403).json({ error: 'Access denied - you can only delete your own notes' });
    }
    
    db.run('DELETE FROM notes WHERE id = ?', [noteId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Note deleted', deletedCount: this.changes });
    });
  });
});

app.get('/api/notes/search/:query', validateCSRFToken, validateSession, (req, res) => {
  const { query } = req.params;
  const { role, username } = req.query;
  
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }
  
  const cleanQuery = sanitizeInput(query, 100);
  if (!cleanQuery) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchPattern = `%${cleanQuery}%`;
  let sql = 'SELECT * FROM notes WHERE (title LIKE ? OR content LIKE ?)';
  let params = [searchPattern, searchPattern];
  
  if (role === 'user') {
    if (!username) return res.status(400).json({ error: 'Missing username for search' });
    sql += ' AND created_by = ?';
    params.push(sanitizeInput(username, 50));
  }
  
  db.all(sql, params, (err, notes) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(notes);
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Notes API Server with CSRF Protection', status: 'running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('✅ CSRF Protection enabled');
});
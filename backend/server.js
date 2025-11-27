const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Input validation
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
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  return true;
}

// Initialize SQLite Database
const db = new sqlite3.Database('./notes.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database
function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_by TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      INSERT OR IGNORE INTO notes (id, title, content, created_by)
      VALUES 
        (1, '1. Welcome to ADMIN ACCOUNT.', '1. Welcome to ADMIN ACCOUNT.', 'admin')
    `);

    // Migrate sample notes to admin
    db.run("UPDATE notes SET created_by = ? WHERE created_by = ?", ['admin', 'user'], (err) => {
      if (err) {
        console.error('Error migrating sample notes:', err.message || err);
      } else {
        console.log('Sample notes migrated to admin');
      }
    });

    // Remove unwanted sample notes
    db.run("DELETE FROM notes WHERE id IN (2,3) OR title IN (?,?)", ['Shopping List', 'Meeting Notes'], (err) => {
      if (err) {
        console.error('Error deleting sample notes:', err.message || err);
      } else {
        console.log('Removed unwanted sample notes');
      }
    });

    console.log('Database initialized successfully');
    
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      const adminHash = bcrypt.hashSync('Admin@123', 10);
      const tomHash = bcrypt.hashSync('Tom@pass123', 10);
      const jerryHash = bcrypt.hashSync('Jerry@pass123', 10);

      db.run(`INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?,?,?,?)`, 
        ['admin', 'admin@me.com', adminHash, 'admin']);
      db.run(`INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?,?,?,?)`, 
        ['Tom', 'tom@me.com', tomHash, 'user']);
      db.run(`INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?,?,?,?)`, 
        ['Jerry', 'jerry@me.com', jerryHash, 'user']);
      console.log('Seeded demo users (admin, Tom, Jerry)');
    } catch (e) {
      console.error('Error seeding users:', e.message || e);
    }
  });
}

// ============ NOTES ROUTES ============
function canAccessNote(role, createdBy, username) {
  if (role === 'admin') return true;
  return createdBy === username;
}

function canModifyNote(role, createdBy, username) {
  if (role === 'admin') return true;
  return createdBy === username;
}

// Get notes based on role 
app.get('/api/notes', (req, res) => {
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
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(notes);
  });
});

// Get single note
app.get('/api/notes/:id', (req, res) => {
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
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    if (!canAccessNote(role, note.created_by, username)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(note);
  });
});

// Create note
app.post('/api/notes', (req, res) => {
  const { title, content, role, username } = req.body;

  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  if (role === 'user' && !username) {
    return res.status(400).json({ error: 'Missing username for user role' });
  }

  // Sanitize inputs entered
  const cleanTitle = sanitizeInput(title, 200);
  const cleanContent = sanitizeInput(content, 5000);

  if (!cleanTitle || !cleanContent) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const creator = role === 'admin' ? (username || 'admin') : username;
  const cleanCreator = sanitizeInput(creator, 50);
  
  db.run(
    'INSERT INTO notes (title, content, created_by) VALUES (?, ?, ?)',
    [cleanTitle, cleanContent, cleanCreator],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: 'Note created',
        noteId: this.lastID
      });
    }
  );
});

// Update note 
app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, role, username } = req.body;
 
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  const noteId = parseInt(id);
  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  // First get the note to check ownership
  db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, note) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    if (!canModifyNote(role, note.created_by, username)) {
      return res.status(403).json({ error: 'Access denied - you can only edit your own notes' });
    }
    
    // Sanitize inputs entered
    const cleanTitle = sanitizeInput(title, 200);
    const cleanContent = sanitizeInput(content, 5000);

    if (!cleanTitle || !cleanContent) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    db.run(
      'UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [cleanTitle, cleanContent, noteId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Note updated', changes: this.changes });
      }
    );
  });
});

// Delete note 
app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { role, username } = req.query;
  
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  const noteId = parseInt(id);
  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  // First get the note to check ownership
  db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, note) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    if (!canModifyNote(role, note.created_by, username)) {
      return res.status(403).json({ error: 'Access denied - you can only delete your own notes' });
    }
    
    db.run('DELETE FROM notes WHERE id = ?', [noteId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Note deleted', deletedCount: this.changes });
    });
  });
});

// Search notes 
app.get('/api/notes/search/:query', (req, res) => {
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
  
  // Regular users can see only their own notes
  if (role === 'user') {
    if (!username) return res.status(400).json({ error: 'Missing username for search' });
    sql += ' AND created_by = ?';
    params.push(sanitizeInput(username, 50));
  }
  
  db.all(sql, params, (err, notes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(notes);
  });
});

// ============ AUTH: Signup & Login (DB-backed) ============

// Signup endpoint - SECURED
app.post('/api/signup', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.json({ success: false, error: 'Please provide username, email and password.' });
  }

  // Validate username
  const cleanUsername = sanitizeInput(username, 30);
  if (!validateUsername(cleanUsername)) {
    return res.json({ success: false, error: 'Username must be 3-30 characters (letters, numbers, underscore, hyphen only)' });
  }

  // Validate email
  const emailLower = email.toLowerCase().trim();
  if (!validateEmail(emailLower)) {
    return res.json({ success: false, error: 'Please provide a valid email address.' });
  }

  // Validate password strength
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
    db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)', 
      [cleanUsername, emailLower, hash, 'user'], 
      function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        return res.json({ success: true, user: { username: cleanUsername, email: emailLower, role: 'user' } });
      }
    );
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
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
    if (!user) return res.json({ success: false, error: 'Invalid credentials.' });

    const match = bcrypt.compareSync(password, user.password);
    if (match) {
      return res.json({ success: true, user: { username: user.username, email: user.email, role: user.role } });
    } else {
      return res.json({ success: false, error: 'Invalid credentials.' });
    }
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Notes API Server',
    status: 'running',
    endpoints: {
      notes: '/api/notes',
      search: '/api/notes/search/:query',
      note: '/api/notes/:id'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
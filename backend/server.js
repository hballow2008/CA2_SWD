const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

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
        (1, '1. Welcom to ADMIN ACCOUNT.', '1. Welcom to ADMIN ACCOUNT.', 'admin')
    `);

    // Migrate sample notes to admin so they don't appear in normal users' sandboxes
    db.run("UPDATE notes SET created_by = 'admin' WHERE created_by = 'user'", (err) => {
      if (err) {
        console.error('Error migrating sample notes:', err.message || err);
      } else {
        console.log('Sample notes migrated to admin');
      }
    });

    // Remove unwanted sample notes (shopping list, meeting notes) if present
    db.run("DELETE FROM notes WHERE id IN (2,3) OR title IN ('Shopping List','Meeting Notes')", (err) => {
      if (err) {
        console.error('Error deleting sample notes:', err.message || err);
      } else {
        console.log('Removed unwanted sample notes');
      }
    });

    console.log('Database initialized successfully');
    // Create users table and seed demo users (passwords hashed)
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
      const adminHash = bcrypt.hashSync('admin123', 10);
      const tomHash = bcrypt.hashSync('tompass', 10);
      const jerryHash = bcrypt.hashSync('jerrypass', 10);

      db.run(`INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?,?,?,?)`, ['admin', 'admin@me.com', adminHash, 'admin']);
      db.run(`INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?,?,?,?)`, ['Tom', 'tom@me.com', tomHash, 'user']);
      db.run(`INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?,?,?,?)`, ['Jerry', 'jerry@me.com', jerryHash, 'user']);
      console.log('Seeded demo users (admin, Tom, Jerry)');
    } catch (e) {
      console.error('Error seeding users:', e.message || e);
    }
  });
}

// ============ NOTES ROUTES ============
// Check if user can access note
// Check if user can access note. For non-admins, compare by username.
function canAccessNote(role, createdBy, username) {
  if (role === 'admin') return true;
  return createdBy === username;
}

// Check if user can modify note. For non-admins, compare by username.
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

  // Regular users see only their own notes (created_by === username)
  if (role === 'user') {
    if (!username) return res.status(400).json({ error: 'Missing username for user role' });
    query += ` WHERE created_by = '${username}'`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, (err, notes) => {
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

  db.get(`SELECT * FROM notes WHERE id = ${id}`, (err, note) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check permissions
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

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const creator = role === 'admin' ? (username || 'admin') : username;
  const query = `INSERT INTO notes (title, content, created_by) VALUES ('${title}', '${content}', '${creator}')`;
  
  db.run(query, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      message: 'Note created',
      noteId: this.lastID
    });
  });
});

// Update note
app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, role, username } = req.body;
 
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  // First get the note to check ownership
  db.get(`SELECT * FROM notes WHERE id = ${id}`, (err, note) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check permissions
    if (!canModifyNote(role, note.created_by, username)) {
      return res.status(403).json({ error: 'Access denied - you can only edit your own notes' });
    }
    
    const query = `UPDATE notes SET title = '${title}', content = '${content}', updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
    
    db.run(query, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Note updated', changes: this.changes });
    });
  });
});

// Delete note
app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { role, username } = req.query;
  
  if (!role || (role !== 'admin' && role !== 'user')) {
    return res.status(400).json({ error: 'Invalid or missing role' });
  }

  // First get the note to check ownership
  db.get(`SELECT * FROM notes WHERE id = ${id}`, (err, note) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check permissions
    if (!canModifyNote(role, note.created_by, username)) {
      return res.status(403).json({ error: 'Access denied - you can only delete your own notes' });
    }
    
    db.run(`DELETE FROM notes WHERE id = ${id}`, function(err) {
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
  
  let sql = `SELECT * FROM notes WHERE (title LIKE '%${query}%' OR content LIKE '%${query}%')`;
  
  // Regular users see only their own notes
  if (role === 'user') {
    if (!username) return res.status(400).json({ error: 'Missing username for search' });
    sql += ` AND created_by = '${username}'`;
  }
  
  db.all(sql, (err, notes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(notes);
  });
});

// Start server
// ============ AUTH: Signup & Login (DB-backed) ============

// Signup endpoint: create new user with hashed password
app.post('/api/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.json({ success: false, error: 'Please provide username, email and password.' });
  }

  const emailLower = email.toLowerCase();
  db.get('SELECT id FROM users WHERE email = ?', [emailLower], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: 'Server error' });
    if (row) return res.json({ success: false, error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)', [username, emailLower, hash, 'user'], function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      return res.json({ success: true, user: { username, email: emailLower, role: 'user' } });
    });
  });
});

// Login endpoint: verify against users table
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({ success: false, error: 'Please provide email and password.' });
  }

  const emailLower = email.toLowerCase();
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

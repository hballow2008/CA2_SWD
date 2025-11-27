// Sanitization and validation helpers
function sanitizeInput(input, maxLength = 1000) {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, maxLength);
}

function sanitizeHTML(html) {
    // Use DOMPurify if available, otherwise escape HTML
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a', 'code', 'pre'],
            ALLOWED_ATTR: ['href', 'title', 'target']
        });
    } else {
        // Fallback: escape HTML
        return escapeHTML(html);
    }
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let currentRole = 'user';
let currentUser = null;
let allNotes = [];
let editingNoteId = null;

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existing = document.querySelector('.app-notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `app-notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    // Set colors based on type
    if (type === 'success') {
        notification.style.background = '#28a745';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.background = '#dc3545';
        notification.style.color = 'white';
    } else if (type === 'warning') {
        notification.style.background = '#ffc107';
        notification.style.color = '#333';
    } else {
        notification.style.background = '#667eea';
        notification.style.color = 'white';
    }
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(storedUser);
    currentRole = currentUser.role;
    
    displayUserInfo();
    loadNotes();
    updateRoleUI();
    
    // Show welcome message only if just logged in
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    if (justLoggedIn === 'true') {
        showNotification(`Welcome back, ${currentUser.username}!`, 'success');
        sessionStorage.removeItem('justLoggedIn'); // Clear flag
    }
});

// Display user info in header
function displayUserInfo() {
    const userDisplay = document.getElementById('userDisplay');
    const appTitle = document.getElementById('appTitle');
    userDisplay.textContent = `Welcome, ${currentUser.username}!`;
    appTitle.textContent = `${currentUser.username}'s Note-Taking App`;
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        showNotification('Logged out successfully!', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    }
}

// Update UI based on current role
function updateRoleUI() {
    const roleMessage = document.getElementById('roleMessage');
    const createSection = document.getElementById('createSection');
    const roleInfo = document.querySelector('.role-info');
    const body = document.body;
    const footer = document.querySelector('.app-footer');

    if (currentRole === 'admin') {
        roleMessage.innerHTML = '<strong>Admin Mode:</strong> You can create, edit, and delete any note.';
        roleInfo.className = 'role-info admin';
        createSection.style.display = 'block';
        body.className = 'admin-theme';
        footer.className = 'app-footer admin-footer';
    } else {
        roleMessage.innerHTML = '<strong>User Mode:</strong> You can create, edit, and delete only your own notes.';
        roleInfo.className = 'role-info user';
        createSection.style.display = 'block';
        body.className = 'user-theme';
        footer.className = 'app-footer user-footer';
    }

    renderNotes(allNotes);
}

// Load all notes
async function loadNotes() {
    try {
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = '<p class="loading">Loading notes...</p>';
        
        allNotes = await api.getNotes(currentRole);
        renderNotes(allNotes);
    } catch (error) {
        document.getElementById('notesList').innerHTML = 
            '<p class="no-notes">Error loading notes. Make sure the backend is running!</p>';
        showNotification('Failed to load notes. Check your connection.', 'error');
    }
}

// Render notes to the page
function renderNotes(notes) {
    const notesList = document.getElementById('notesList');

    if (notes.length === 0) {
        notesList.innerHTML = '<p class="no-notes">No notes found. Create your first note!</p>';
        return;
    }

    notesList.innerHTML = notes.map(note => {
        const canEdit = currentRole === 'admin' || (currentUser && note.created_by === currentUser.username);
        
        // Sanitize title and content for display
        const safeTitle = escapeHTML(note.title);
        const safeContent = sanitizeHTML(note.content);
        
        return `
        <div class="note-card">
            <div class="note-card-header">
                <h3>${safeTitle}</h3>
                ${canEdit ? `
                    <div class="note-actions">
                        <button class="btn-edit" onclick="editNote(${note.id})">Edit</button>
                        <button class="btn-delete" onclick="deleteNote(${note.id})">Delete</button>
                    </div>
                ` : ''}
            </div>
            <div class="note-card-content">
                ${safeContent}
            </div>
            <div class="note-card-footer">
                <span class="note-badge badge-${escapeHTML(note.created_by)}">${escapeHTML(note.created_by)}</span>
                <span>Created: ${new Date(note.created_at).toLocaleDateString()}</span>
            </div>
        </div>
    `}).join('');
}

// Toggle note form visibility
function toggleForm() {
    const noteForm = document.getElementById('noteForm');
    const isHidden = noteForm.classList.contains('hidden');
    
    if (isHidden) {
        noteForm.classList.remove('hidden');
        document.getElementById('noteTitle').focus();
        showNotification('Fill in the form to create a new note', 'info');
    } else {
        noteForm.classList.add('hidden');
        cancelEdit();
    }
}

// Save note (create/update)
async function saveNote() {
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    const editNoteId = document.getElementById('editNoteId').value;

    const title = sanitizeInput(titleInput.value, 200);
    const content = sanitizeInput(contentInput.value, 5000);

    // Validate inputs
    if (!title || title.trim().length === 0) {
        showNotification('Please enter a note title!', 'warning');
        titleInput.focus();
        return;
    }
    
    if (!content || content.trim().length === 0) {
        showNotification('Please enter note content!', 'warning');
        contentInput.focus();
        return;
    }

    try {
        if (editNoteId) {
            await api.updateNote(editNoteId, title, content, currentRole);
            showNotification('✓ Note updated successfully!', 'success');
        } else {
            await api.createNote(title, content, currentRole);
            showNotification('✓ Note created successfully!', 'success');
        }
        
        cancelEdit();
        loadNotes();
    } catch (error) {
        showNotification('✗ Error saving note: ' + error.message, 'error');
    }
}

// Edit note
async function editNote(noteId) {
    try {
        const note = await api.getNote(noteId, currentRole);      
        
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        document.getElementById('editNoteId').value = note.id;
        document.getElementById('formTitle').textContent = 'Edit Note';
        
        document.getElementById('noteForm').classList.remove('hidden');
        document.getElementById('noteTitle').focus();
        
        showNotification('Editing note: ' + note.title, 'info');
    } catch (error) {
        showNotification('✗ Error loading note: ' + error.message, 'error');
    }
}

// Delete note
async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
        return;
    }

    try {
        await api.deleteNote(noteId, currentRole);
        showNotification('✓ Note deleted successfully!', 'success');
        loadNotes();
    } catch (error) {
        showNotification('✗ Error deleting note: ' + error.message, 'error');
    }
}

// Cancel edit
function cancelEdit() {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('editNoteId').value = '';
    document.getElementById('formTitle').textContent = 'Create New Note';
    document.getElementById('noteForm').classList.add('hidden');
}

// Search notes
async function searchNotes() {
    const searchInput = document.getElementById('searchInput');
    const query = sanitizeInput(searchInput.value, 100);

    if (!query || query.trim().length === 0) {
        showNotification('Please enter a search query!', 'warning');
        searchInput.focus();
        return;
    }

    try {
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = '<p class="loading">Searching...</p>';
        
        const results = await api.searchNotes(query, currentRole);
        allNotes = results;
        renderNotes(results);
        
        if (results.length === 0) {
            showNotification(`No notes found matching "${escapeHTML(query)}"`, 'info');
        } else {
            showNotification(`Found ${results.length} note(s) matching "${escapeHTML(query)}"`, 'success');
        }
    } catch (error) {
        showNotification('✗ Search error: ' + error.message, 'error');
        loadNotes();
    }
}

// Clear search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    showNotification('Search cleared', 'info');
    loadNotes();
}
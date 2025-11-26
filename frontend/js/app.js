let currentRole = 'user'; // 'admin' or 'user'
let currentUser = null; // Store logged-in user info
let allNotes = [];
let editingNoteId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
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
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Update UI based on current role
function updateRoleUI() {
    const adminBtn = document.getElementById('adminBtn');
    const userBtn = document.getElementById('userBtn');
    const roleMessage = document.getElementById('roleMessage');
    const createSection = document.getElementById('createSection');
    const roleInfo = document.querySelector('.role-info');
    const body = document.body;
    const footer = document.querySelector('.app-footer');

    // Update active button
    if (currentRole === 'admin') {
        adminBtn.classList.add('active');
        userBtn.classList.remove('active');
        roleMessage.innerHTML = '<strong>Admin Mode:</strong> You can create, edit, and delete any note.';
        roleInfo.className = 'role-info admin';
        createSection.style.display = 'block';
        
        // Admin styling - Red theme
        body.className = 'admin-theme';
        footer.className = 'app-footer admin-footer';
    } else {
        adminBtn.classList.remove('active');
        userBtn.classList.add('active');
        roleMessage.innerHTML = '<strong>User Mode:</strong> You can create, edit, and delete only your own notes.';
        roleInfo.className = 'role-info user';
        createSection.style.display = 'block';
        
        // User styling - Green theme
        body.className = 'user-theme';
        footer.className = 'app-footer user-footer';
    }

    // Re-render notes to update action buttons
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
        // Show action buttons if admin OR if it's the user's own note
        const canEdit = currentRole === 'admin' || note.created_by === currentRole;
        
        return `
        <div class="note-card">
            <div class="note-card-header">
                <h3>${note.title}</h3>
                ${canEdit ? `
                    <div class="note-actions">
                        <button class="btn-edit" onclick="editNote(${note.id})">Edit</button>
                        <button class="btn-delete" onclick="deleteNote(${note.id})">Delete</button>
                    </div>
                ` : ''}
            </div>
            <div class="note-card-content">
                ${note.content}
            </div>
            <div class="note-card-footer">
                <span class="note-badge badge-${note.created_by}">${note.created_by}</span>
                <span>Created: ${new Date(note.created_at).toLocaleDateString()}</span>
            </div>
        </div>
    `}).join('');
}
// Toggle note form visibility
function toggleForm() {
    const noteForm = document.getElementById('noteForm');
    noteForm.classList.toggle('hidden');
   
    if (!noteForm.classList.contains('hidden')) {
        document.getElementById('noteTitle').focus();
    }
}
// Save note (create or update)
async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const editNoteId = document.getElementById('editNoteId').value;

    if (!title || !content) {
        alert('Please fill in both title and content!');
        return;
    }
    try {
        if (editNoteId) {
            // Update existing note
            await api.updateNote(editNoteId, title, content, currentRole);
            alert('Note updated successfully!');
        } else {
            // Create new note
            await api.createNote(title, content, currentRole);
            alert('Note created successfully!');
        }
        // Reset form and reload
        cancelEdit();
        loadNotes();
    } catch (error) {
        alert('Error saving note: ' + error.message);
    }
}

// Edit note
async function editNote(noteId) {
    try {
        const note = await api.getNote(noteId, currentRole);      
        // Populate form
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        document.getElementById('editNoteId').value = note.id;
        document.getElementById('formTitle').textContent = 'Edit Note';
        
        // Show form
        document.getElementById('noteForm').classList.remove('hidden');
        document.getElementById('noteTitle').focus();
    } catch (error) {
        alert('Error loading note: ' + error.message);
    }
}

// Delete note
async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }
    try {
        await api.deleteNote(noteId, currentRole);
        alert('Note deleted successfully!');
        loadNotes();
    } catch (error) {
        alert('Error deleting note: ' + error.message);
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
    const query = searchInput.value.trim();

    if (!query) {
        alert('Please enter a search query!');
        return;
    }
    try {
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = '<p class="loading">Searching...</p>';
        
        const results = await api.searchNotes(query, currentRole);
        allNotes = results;
        renderNotes(results);
    } catch (error) {
        alert('Search error: ' + error.message);
        loadNotes();
    }
}

// Clear search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    loadNotes();
}
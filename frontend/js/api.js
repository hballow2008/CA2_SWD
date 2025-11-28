const API_URL = 'http://localhost:5001/api';

// Helper to get stored user info
function getStoredUser() {
    try {
        const s = localStorage.getItem('currentUser');
        if (!s) return null;
        return JSON.parse(s);
    } catch (e) {
        return null;
    }
}

// Helper to get stored username
function getStoredUsername() {
    const user = getStoredUser();
    return user ? user.username : null;
}

// Helper to get stored email
function getStoredEmail() {
    const user = getStoredUser();
    return user ? user.email : null;
}

const api = {
    getNotes: async (role = 'user') => {
        try {
            const username = getStoredUsername();
            const email = getStoredEmail();
            
            let url = `${API_URL}/notes?role=${encodeURIComponent(role)}`;
            if (username) url += `&username=${encodeURIComponent(username)}`;
            if (email) url += `&email=${encodeURIComponent(email)}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            // Check for session expired
            if (data.sessionExpired || data.error?.includes('Session')) {
                throw new Error('Session expired');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch notes');
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching notes:', error);
            throw error;
        }
    },

    getNote: async (id, role = 'user') => {
        try {
            const username = getStoredUsername();
            const email = getStoredEmail();
            
            let url = `${API_URL}/notes/${encodeURIComponent(id)}?role=${encodeURIComponent(role)}`;
            if (username) url += `&username=${encodeURIComponent(username)}`;
            if (email) url += `&email=${encodeURIComponent(email)}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            // Check for session expired
            if (data.sessionExpired || data.error?.includes('Session')) {
                throw new Error('Session expired');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch note');
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching note:', error);
            throw error;
        }
    },

    createNote: async (title, content, role) => {
        try {
            const username = getStoredUsername();
            const email = getStoredEmail();
            
            const body = { title, content, role };
            if (username) body.username = username;
            if (email) body.email = email;
            
            const response = await fetch(`${API_URL}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            // Check for session expired
            if (data.sessionExpired || data.error?.includes('Session')) {
                throw new Error('Session expired');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create note');
            }
            
            return data;
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    },

    updateNote: async (id, title, content, role = 'user') => {
        try {
            const username = getStoredUsername();
            const email = getStoredEmail();
            
            const body = { title, content, role };
            if (username) body.username = username;
            if (email) body.email = email;
            
            const response = await fetch(`${API_URL}/notes/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            // Check for session expired
            if (data.sessionExpired || data.error?.includes('Session')) {
                throw new Error('Session expired');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update note');
            }
            
            return data;
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    },

    deleteNote: async (id, role = 'user') => {
        try {
            const username = getStoredUsername();
            const email = getStoredEmail();
            
            let url = `${API_URL}/notes/${encodeURIComponent(id)}?role=${encodeURIComponent(role)}`;
            if (username) url += `&username=${encodeURIComponent(username)}`;
            if (email) url += `&email=${encodeURIComponent(email)}`;
            
            const response = await fetch(url, { method: 'DELETE' });
            const data = await response.json();
            
            // Check for session expired
            if (data.sessionExpired || data.error?.includes('Session')) {
                throw new Error('Session expired');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete note');
            }
            
            return data;
        } catch (error) {
            console.error('Error deleting note:', error);
            throw error;
        }
    },

    searchNotes: async (query, role = 'user') => {
        try {
            const username = getStoredUsername();
            const email = getStoredEmail();
            
            let url = `${API_URL}/notes/search/${encodeURIComponent(query)}?role=${encodeURIComponent(role)}`;
            if (username) url += `&username=${encodeURIComponent(username)}`;
            if (email) url += `&email=${encodeURIComponent(email)}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            // Check for session expired
            if (data.sessionExpired || data.error?.includes('Session')) {
                throw new Error('Session expired');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Search failed');
            }
            
            return data;
        } catch (error) {
            console.error('Error searching notes:', error);
            throw error;
        }
    }
};
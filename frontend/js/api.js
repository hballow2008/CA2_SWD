const API_URL = 'http://localhost:5001/api';

function getStoredUser() {
    try {
        const s = localStorage.getItem('currentUser');
        if (!s) return null;
        return JSON.parse(s);
    } catch (e) {
        console.error('Error getting stored user:', e);
        return null;
    }
}

function getStoredUsername() {
    const user = getStoredUser();
    return user ? user.username : null;
}

function getStoredEmail() {
    const user = getStoredUser();
    return user ? user.email : null;
}

function getCSRFToken() {
    try {
        return sessionStorage.getItem('csrfToken');
    } catch (e) {
        console.error('Error getting CSRF token:', e);
        return null;
    }
}

function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const csrfToken = getCSRFToken();
    
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }
    
    return headers;
}

function handleCSRFError() {
    console.log('CSRF error detected, clearing session and redirecting to login');
    sessionStorage.removeItem('csrfToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

const api = {
    getNotes: async (role = 'user') => {
        try {
            const username = getStoredUsername();
            const email = getStoredEmail();
            
            console.log('Getting notes with:', { role, username, email, hasCSRF: !!getCSRFToken() });
            
            if (!email && !username) {
                console.error('No user credentials found');
                throw new Error('Session expired');
            }
            
            let url = `${API_URL}/notes?role=${encodeURIComponent(role)}`;
            if (username) url += `&username=${encodeURIComponent(username)}`;
            if (email) url += `&email=${encodeURIComponent(email)}`;
            
            console.log('Fetching notes from:', url);
            
            const response = await fetch(url, { headers: getHeaders() });
            const data = await response.json();
            
            console.log('Notes response:', data);
            
            if (data.csrfError) {
                handleCSRFError();
                throw new Error('CSRF token error');
            }
            
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
            
            if (!email && !username) {
                throw new Error('Session expired');
            }
            
            let url = `${API_URL}/notes/${encodeURIComponent(id)}?role=${encodeURIComponent(role)}`;
            if (username) url += `&username=${encodeURIComponent(username)}`;
            if (email) url += `&email=${encodeURIComponent(email)}`;
            
            const response = await fetch(url, { headers: getHeaders() });
            const data = await response.json();
            
            if (data.csrfError) {
                handleCSRFError();
                throw new Error('CSRF token error');
            }
            
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
            
            if (!email && !username) {
                throw new Error('Session expired');
            }
            
            const body = { title, content, role };
            if (username) body.username = username;
            if (email) body.email = email;
            
            console.log('Creating note with:', body);
            
            const response = await fetch(`${API_URL}/notes`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            if (data.csrfError) {
                handleCSRFError();
                throw new Error('CSRF token error');
            }
            
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
            
            if (!email && !username) {
                throw new Error('Session expired');
            }
            
            const body = { title, content, role };
            if (username) body.username = username;
            if (email) body.email = email;
            
            const response = await fetch(`${API_URL}/notes/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            if (data.csrfError) {
                handleCSRFError();
                throw new Error('CSRF token error');
            }
            
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
            
            if (!email && !username) {
                throw new Error('Session expired');
            }
            
            let url = `${API_URL}/notes/${encodeURIComponent(id)}?role=${encodeURIComponent(role)}`;
            if (username) url += `&username=${encodeURIComponent(username)}`;
            if (email) url += `&email=${encodeURIComponent(email)}`;
            
            const response = await fetch(url, { 
                method: 'DELETE',
                headers: getHeaders()
            });
            const data = await response.json();
            
            if (data.csrfError) {
                handleCSRFError();
                throw new Error('CSRF token error');
            }
            
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
            
            if (!email && !username) {
                throw new Error('Session expired');
            }
            
            let url = `${API_URL}/notes/search/${encodeURIComponent(query)}?role=${encodeURIComponent(role)}`;
            if (username) url += `&username=${encodeURIComponent(username)}`;
            if (email) url += `&email=${encodeURIComponent(email)}`;
            
            const response = await fetch(url, { headers: getHeaders() });
            const data = await response.json();
            
            if (data.csrfError) {
                handleCSRFError();
                throw new Error('CSRF token error');
            }
            
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
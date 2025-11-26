const API_URL = 'http://localhost:5001/api';

const api = {
    getNotes: async (role = 'user') => {
        try {
            const response = await fetch(`${API_URL}/notes?role=${role}`);
            if (!response.ok) throw new Error('Failed to fetch notes');
            return await response.json();
        } catch (error) {
            console.error('Error fetching notes:', error);
            throw error;
        }
    },

    getNote: async (id, role = 'user') => {
        try {
            const response = await fetch(`${API_URL}/notes/${id}?role=${role}`);
            if (!response.ok) throw new Error('Failed to fetch note');
            return await response.json();
        } catch (error) {
            console.error('Error fetching note:', error);
            throw error;
        }
    },

    createNote: async (title, content, role) => {
        try {
            const response = await fetch(`${API_URL}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, role })
            });
            if (!response.ok) throw new Error('Failed to create note');
            return await response.json();
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    },

    updateNote: async (id, title, content, role = 'user') => {
        try {
            const response = await fetch(`${API_URL}/notes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, role })
            });
            if (!response.ok) throw new Error('Failed to update note');
            return await response.json();
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    },

    deleteNote: async (id, role = 'user') => {
        try {
            const response = await fetch(`${API_URL}/notes/${id}?role=${role}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete note');
            return await response.json();
        } catch (error) {
            console.error('Error deleting note:', error);
            throw error;
        }
    },

    searchNotes: async (query, role = 'user') => {
        try {
            const response = await fetch(`${API_URL}/notes/search/${query}?role=${role}`);
            if (!response.ok) throw new Error('Search failed');
            return await response.json();
        } catch (error) {
            console.error('Error searching notes:', error);
            throw error;
        }
    }
};
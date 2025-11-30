function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function sanitizeInput(input, maxLength = 100) {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, maxLength);
}

function showMessage(msg, text, color, background = '', autoDismiss = true) {
    msg.textContent = text;
    msg.style.color = color;
    msg.style.background = background;
    msg.style.padding = background ? '0.75rem' : '';
    msg.style.borderRadius = background ? '6px' : '';
    msg.style.fontWeight = 'bold';
    
    if (autoDismiss) {
        setTimeout(() => {
            msg.textContent = '';
            msg.style.color = '';
            msg.style.background = '';
            msg.style.padding = '';
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const showBanner = sessionStorage.getItem('showLoginBanner');
    if (showBanner === 'true') {
        const msg = document.getElementById('loginMessage');
        showMessage(msg, '✓ Account created successfully! Please login with your credentials.', 'green', '#d4edda', true);
        sessionStorage.removeItem('showLoginBanner');
    }
});

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const email = sanitizeInput(emailInput.value, 100).toLowerCase();
    const password = passwordInput.value;
    const msg = document.getElementById('loginMessage');
    
    // Clear previous message
    msg.textContent = '';
    msg.style.color = '';
    msg.style.background = '';
    msg.style.padding = '';
    
    // Validate inputs
    if (!email || !password) {
        showMessage(msg, '✗ Please enter both email and password', 'red', '', true);
        return;
    }
    
    if (!validateEmail(email)) {
        showMessage(msg, '✗ Please enter a valid email address', 'red', '', true);
        return;
    }
    
    try {
        showMessage(msg, 'Logging in...', '#667eea', '', false);
        msg.style.fontWeight = 'normal';
        
        const res = await fetch('http://localhost:5001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            showMessage(msg, '✓ Login successful! Redirecting...', 'green', '', false);
            
            // Store user info
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            // Store CSRF token
            if (data.csrfToken) {
                sessionStorage.setItem('csrfToken', data.csrfToken);
            }
            
            sessionStorage.setItem('justLoggedIn', 'true');
            
            // Clear inputs only on success
            emailInput.value = '';
            passwordInput.value = '';
            
            window.location.href = 'index.html';
            
        } else {
            // DO NOT clear inputs on error - keep them for retry
            passwordInput.value = '';
            
            if (data.accountLocked) {
                showMessage(msg, `🔒 ${data.error}`, '#dc3545', '#f8d7da', true);
            } else if (data.emailNotFound) {
                showMessage(msg, '✗ Email not found. Please check your email or sign up.', 'red', '', true);
            } else if (data.attemptsLeft !== undefined) {
                showMessage(msg, `✗ ${data.error}`, '#dc3545', '#f8d7da', true);
            } else if (data.rateLimited) {
                showMessage(msg, `⏱️ ${data.error}`, '#856404', '#fff3cd', true);
            } else {
                showMessage(msg, '✗ ' + (data.error || 'Invalid credentials. Please try again.'), 'red', '', true);
            }
        }
    } catch (error) {
        showMessage(msg, '✗ Network error. Please check if the server is running.', 'red', '', true);
        console.error('Login error:', error);
    }
});
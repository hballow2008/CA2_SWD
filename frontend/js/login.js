function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function sanitizeInput(input, maxLength = 100) {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, maxLength);
}

document.addEventListener('DOMContentLoaded', () => {
    const showBanner = sessionStorage.getItem('showLoginBanner');
    if (showBanner === 'true') {
        const msg = document.getElementById('loginMessage');
        msg.textContent = '✓ Account created successfully! Please login with your credentials.';
        msg.style.color = 'green';
        msg.style.fontWeight = 'bold';
        msg.style.padding = '0.75rem';
        msg.style.background = '#d4edda';
        msg.style.borderRadius = '6px';
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
        msg.textContent = '✗ Please enter both email and password';
        msg.style.color = 'red';
        return;
    }
    
    if (!validateEmail(email)) {
        msg.textContent = '✗ Please enter a valid email address';
        msg.style.color = 'red';
        return;
    }
    
    try {
        msg.textContent = 'Logging in...';
        msg.style.color = '#667eea';
        
        const res = await fetch('http://localhost:5001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            msg.textContent = '✓ Login successful! Redirecting...';
            msg.style.color = 'green';
            msg.style.fontWeight = 'bold';
            
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
            if (data.accountLocked) {
                msg.textContent = `🔒 ${data.error}`;
                msg.style.color = '#dc3545';
                msg.style.fontWeight = 'bold';
            } else if (data.emailNotFound) {
                msg.textContent = '✗ Email not found. Please check your email or sign up.';
                msg.style.color = 'red';
            } else if (data.attemptsLeft !== undefined) {
                msg.textContent = `✗ ${data.error}`;
                msg.style.color = '#dc3545';
                msg.style.fontWeight = 'bold';
            } else if (data.rateLimited) {
                msg.textContent = `⏱️ ${data.error}`;
                msg.style.color = '#ffc107';
                msg.style.fontWeight = 'bold';
            } else {
                msg.textContent = '✗ ' + (data.error || 'Invalid credentials. Please try again.');
                msg.style.color = 'red';
            }
        }
    } catch (error) {
        msg.textContent = '✗ Network error. Please check if the server is running.';
        msg.style.color = 'red';
        console.error('Login error:', error);
    }
});
// Validation functions
function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('one special character (!@#$%^&*...)');
    }
    return errors;
}

function sanitizeInput(input, maxLength = 100) {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, maxLength);
}

// Real-time password strength indicator
function updatePasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthDiv = document.getElementById('passwordStrength');
    const errors = validatePassword(password);
    
    if (!password) {
        strengthDiv.innerHTML = '';
        return;
    }
    
    if (errors.length === 0) {
        strengthDiv.innerHTML = '<span style="color: green;">✓ Strong password</span>';
    } else {
        strengthDiv.innerHTML = `<span style="color: #dc3545;">Password must contain: ${errors.join(', ')}</span>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Add password strength indicator
    const passwordInput = document.getElementById('password');
    const strengthDiv = document.createElement('div');
    strengthDiv.id = 'passwordStrength';
    strengthDiv.style.cssText = 'margin-top: 0.5rem; font-size: 0.85rem;';
    passwordInput.parentNode.appendChild(strengthDiv);
    
    passwordInput.addEventListener('input', updatePasswordStrength);
});

document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = sanitizeInput(document.getElementById('username').value, 30);
    const email = sanitizeInput(document.getElementById('email').value, 100).toLowerCase();
    const password = document.getElementById('password').value;
    const retype = document.getElementById('retype').value;
    const msg = document.getElementById('signupMessage');
    
    // Clear previous message
    msg.textContent = '';
    msg.style.color = '';
    
    // Validate username
    if (!validateUsername(username)) {
        msg.textContent = '✗ Username must be 3-30 characters (letters, numbers, underscore, hyphen only)';
        msg.style.color = 'red';
        return;
    }
    
    // Validate email
    if (!validateEmail(email)) {
        msg.textContent = '✗ Please enter a valid email address';
        msg.style.color = 'red';
        return;
    }
    
    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        msg.textContent = `✗ Password must contain: ${passwordErrors.join(', ')}`;
        msg.style.color = 'red';
        return;
    }
    
    // Validate passwords matches
    if (password !== retype) {
        msg.textContent = '✗ Passwords do not match';
        msg.style.color = 'red';
        return;
    }
    
    try {
        // Show loading state
        msg.textContent = 'Creating your account...';
        msg.style.color = '#667eea';
        
        const res = await fetch('http://localhost:5001/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            msg.textContent = '✓ Signup successful! Redirecting to login...';
            msg.style.color = 'green';
            msg.style.fontWeight = 'bold';
            
            // Redirect after 800ms to login page
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 800);
        } else {
            msg.textContent = '✗ ' + (data.error || 'Signup failed. Please try again.');
            msg.style.color = 'red';
        }
    } catch (error) {
        msg.textContent = '✗ Network error. Please check if the server is running.';
        msg.style.color = 'red';
        console.error('Signup error:', error);
    }
});
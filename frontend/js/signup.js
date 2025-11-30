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

function updateEmailValidation() {
    const email = document.getElementById('email').value.trim();
    const emailIndicator = document.getElementById('emailIndicator');
    
    if (!email) {
        emailIndicator.innerHTML = '';
        return;
    }
    
    if (validateEmail(email)) {
        emailIndicator.innerHTML = '<span style="color: green;">✓ Valid email format</span>';
    } else {
        emailIndicator.innerHTML = '<span style="color: #dc3545;">✗ Please enter a valid email (e.g., user@example.com)</span>';
    }
}

function updateUsernameValidation() {
    const username = document.getElementById('username').value.trim();
    const usernameIndicator = document.getElementById('usernameIndicator');
    
    if (!username) {
        usernameIndicator.innerHTML = '';
        return;
    }
    
    if (validateUsername(username)) {
        usernameIndicator.innerHTML = '<span style="color: green;">✓ Valid username</span>';
    } else {
        usernameIndicator.innerHTML = '<span style="color: #dc3545;">✗ 3-30 characters (letters, numbers, _ or - only)</span>';
    }
}

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

function updatePasswordMatch() {
    const password = document.getElementById('password').value;
    const retype = document.getElementById('retype').value;
    const matchIndicator = document.getElementById('passwordMatch');
    
    if (!retype) {
        matchIndicator.innerHTML = '';
        return;
    }
    
    if (password === retype) {
        matchIndicator.innerHTML = '<span style="color: green;">✓ Passwords match</span>';
    } else {
        matchIndicator.innerHTML = '<span style="color: #dc3545;">✗ Passwords do not match</span>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username');
    const usernameIndicator = document.createElement('div');
    usernameIndicator.id = 'usernameIndicator';
    usernameIndicator.style.cssText = 'margin-top: 0.5rem; font-size: 0.85rem;';
    usernameInput.parentNode.appendChild(usernameIndicator);
    usernameInput.addEventListener('input', updateUsernameValidation);
    
    const emailInput = document.getElementById('email');
    const emailIndicator = document.createElement('div');
    emailIndicator.id = 'emailIndicator';
    emailIndicator.style.cssText = 'margin-top: 0.5rem; font-size: 0.85rem;';
    emailInput.parentNode.appendChild(emailIndicator);
    emailInput.addEventListener('input', updateEmailValidation);
    
    const passwordInput = document.getElementById('password');
    const strengthDiv = document.createElement('div');
    strengthDiv.id = 'passwordStrength';
    strengthDiv.style.cssText = 'margin-top: 0.5rem; font-size: 0.85rem;';
    passwordInput.parentNode.appendChild(strengthDiv);
    passwordInput.addEventListener('input', updatePasswordStrength);
    
    const retypeInput = document.getElementById('retype');
    const matchIndicator = document.createElement('div');
    matchIndicator.id = 'passwordMatch';
    matchIndicator.style.cssText = 'margin-top: 0.5rem; font-size: 0.85rem;';
    retypeInput.parentNode.appendChild(matchIndicator);
    retypeInput.addEventListener('input', updatePasswordMatch);
    passwordInput.addEventListener('input', updatePasswordMatch);
});

document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = sanitizeInput(document.getElementById('username').value, 30);
    const email = sanitizeInput(document.getElementById('email').value, 100).toLowerCase();
    const password = document.getElementById('password').value;
    const retype = document.getElementById('retype').value;
    const msg = document.getElementById('signupMessage');
    
    if (!validateUsername(username)) {
        showMessage(msg, '✗ Username must be 3-30 characters (letters, numbers, underscore, hyphen only)', 'red', '', true);
        return;
    }
    
    if (!validateEmail(email)) {
        showMessage(msg, '✗ Please enter a valid email address', 'red', '', true);
        return;
    }
    
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        showMessage(msg, `✗ Password must contain: ${passwordErrors.join(', ')}`, 'red', '', true);
        return;
    }
    
    if (password !== retype) {
        showMessage(msg, '✗ Passwords do not match', 'red', '', true);
        return;
    }
    
    try {
        showMessage(msg, 'Creating your account...', '#667eea', '', false);
        msg.style.fontWeight = 'normal';
        
        const res = await fetch('http://localhost:5001/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            showMessage(msg, '✓ Signup successful! Redirecting to login...', 'green', '#d4edda', false);
            
            sessionStorage.setItem('showLoginBanner', 'true');
            
            // Delay redirect by 2 seconds so user sees success message
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            if (data.rateLimited) {
                showMessage(msg, `⏱️ ${data.error}`, '#856404', '#fff3cd', true);
            } else {
                showMessage(msg, '✗ ' + (data.error || 'Signup failed. Please try again.'), 'red', '#f8d7da', true);
            }
        }
    } catch (error) {
        showMessage(msg, '✗ Network error. Please check if the server is running.', 'red', '#f8d7da', true);
        console.error('Signup error:', error);
    }
});
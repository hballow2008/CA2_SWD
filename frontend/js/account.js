let currentUser = null;

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

function updatePasswordValidation() {
    const newPassword = document.getElementById('newPassword').value;
    const newPasswordIndicator = document.getElementById('newPasswordIndicator');
    
    if (!newPassword) {
        newPasswordIndicator.innerHTML = '';
        return;
    }
    
    const errors = validatePassword(newPassword);
    if (errors.length === 0) {
        newPasswordIndicator.innerHTML = '<span style="color: green;">✓ Strong password</span>';
    } else {
        newPasswordIndicator.innerHTML = `<span style="color: #dc3545;">Password must contain: ${errors.join(', ')}</span>`;
    }
}

function updatePasswordMatch() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchIndicator = document.getElementById('confirmPasswordIndicator');
    
    if (!confirmPassword) {
        matchIndicator.innerHTML = '';
        return;
    }
    
    if (newPassword === confirmPassword) {
        matchIndicator.innerHTML = '<span style="color: green;">✓ Passwords match</span>';
    } else {
        matchIndicator.innerHTML = '<span style="color: #dc3545;">✗ Passwords do not match</span>';
    }
}

function getCSRFToken() {
    try {
        return sessionStorage.getItem('csrfToken');
    } catch (e) {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(storedUser);
    
    document.getElementById('displayUsername').textContent = currentUser.username;
    document.getElementById('displayEmail').textContent = currentUser.email;
    document.getElementById('displayRole').textContent = currentUser.role.toUpperCase();
    
    const newPasswordInput = document.getElementById('newPassword');
    const newPasswordIndicator = document.createElement('div');
    newPasswordIndicator.id = 'newPasswordIndicator';
    newPasswordIndicator.style.cssText = 'margin-top: 0.5rem; font-size: 0.85rem;';
    newPasswordInput.parentNode.appendChild(newPasswordIndicator);
    newPasswordInput.addEventListener('input', updatePasswordValidation);
    
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const confirmPasswordIndicator = document.createElement('div');
    confirmPasswordIndicator.id = 'confirmPasswordIndicator';
    confirmPasswordIndicator.style.cssText = 'margin-top: 0.5rem; font-size: 0.85rem;';
    confirmPasswordInput.parentNode.appendChild(confirmPasswordIndicator);
    confirmPasswordInput.addEventListener('input', updatePasswordMatch);
    newPasswordInput.addEventListener('input', updatePasswordMatch);
});

document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const msg = document.getElementById('changePasswordMessage');
    
    msg.textContent = '';
    msg.style.color = '';
    
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
        msg.textContent = `✗ New password must contain: ${passwordErrors.join(', ')}`;
        msg.style.color = 'red';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        msg.textContent = '✗ New passwords do not match';
        msg.style.color = 'red';
        return;
    }
    
    if (currentPassword === newPassword) {
        msg.textContent = '✗ New password must be different from current password';
        msg.style.color = 'red';
        return;
    }
    
    try {
        msg.textContent = 'Changing password...';
        msg.style.color = '#667eea';
        
        const csrfToken = getCSRFToken();
        if (!csrfToken) {
            msg.textContent = '✗ Security token missing. Please login again.';
            msg.style.color = 'red';
            setTimeout(() => {
                localStorage.removeItem('currentUser');
                sessionStorage.removeItem('csrfToken');
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        const res = await fetch('http://localhost:5001/api/change-password', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                email: currentUser.email,
                oldPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        const data = await res.json();
        
        if (data.csrfError) {
            msg.textContent = '✗ Security token error. Please login again.';
            msg.style.color = 'red';
            setTimeout(() => {
                localStorage.removeItem('currentUser');
                sessionStorage.removeItem('csrfToken');
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        if (data.success) {
            msg.textContent = '✓ Password changed successfully! Redirecting to login...';
            msg.style.color = 'green';
            msg.style.fontWeight = 'bold';
            
            document.getElementById('changePasswordForm').reset();
            
            setTimeout(() => {
                localStorage.removeItem('currentUser');
                sessionStorage.removeItem('csrfToken');
                window.location.href = 'login.html';
            }, 2000);
        } else {
            msg.textContent = '✗ ' + (data.error || 'Failed to change password');
            msg.style.color = 'red';
        }
    } catch (error) {
        msg.textContent = '✗ Network error. Please check if the server is running.';
        msg.style.color = 'red';
        console.error('Change password error:', error);
    }
});
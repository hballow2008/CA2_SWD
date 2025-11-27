// Validation function
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function sanitizeInput(input, maxLength = 100) {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, maxLength);
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = sanitizeInput(document.getElementById('username').value, 100).toLowerCase();
    const password = document.getElementById('password').value;
    const msg = document.getElementById('loginMessage');
    
    // Clear previous message
    msg.textContent = '';
    msg.style.color = '';
    
    // Validate inputs
    if (!email || !password) {
        msg.textContent = '✗ Please enter both email and password';
        msg.style.color = 'red';
        return;
    }
    
    // Validate email format
    if (!validateEmail(email)) {
        msg.textContent = '✗ Please enter a valid email address';
        msg.style.color = 'red';
        return;
    }
    
    try {
        // Show loading state
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
            
            // Store user info in localStorage
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            // Set flag to show welcome message
            sessionStorage.setItem('justLoggedIn', 'true');
            
            // Redirect after 1 second
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            msg.textContent = '✗ ' + (data.error || 'Invalid credentials. Please try again.');
            msg.style.color = 'red';
        }
    } catch (error) {
        msg.textContent = '✗ Network error. Please check if the server is running.';
        msg.style.color = 'red';
        console.error('Login error:', error);
    }
});
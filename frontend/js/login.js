document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const res = await fetch('http://localhost:5001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    const msg = document.getElementById('loginMessage');
    if (data.success) {
        msg.textContent = 'Login successful!';
        msg.style.color = 'green';
        // Store user info in localStorage
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } else {
        msg.textContent = data.error || 'Login failed.';
        msg.style.color = 'red';
    }
});
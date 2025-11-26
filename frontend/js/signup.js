document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();
    const retype = document.getElementById('retype').value.trim();
    const msg = document.getElementById('signupMessage');
    if (password !== retype) {
        msg.textContent = 'Passwords do not match.';
        msg.style.color = 'red';
        return;
    }
    const res = await fetch('http://localhost:5001/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, phone, password })
    });
    const data = await res.json();
    if (data.success) {
        msg.textContent = 'Signup successful! You can now login.';
        msg.style.color = 'green';
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    } else {
        msg.textContent = data.error || 'Signup failed.';
        msg.style.color = 'red';
    }
});
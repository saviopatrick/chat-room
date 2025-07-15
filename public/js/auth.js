const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const loginBtn = document.getElementById('login-btn');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showError('Please enter both username and password');
        return;
    }
    
    // Disable login button and show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store user data in sessionStorage
            sessionStorage.setItem('chatUser', JSON.stringify(data.user));
            
            // Redirect to room selection
            window.location.href = 'index.html';
        } else {
            showError(data.message || 'Login failed');
        }
    } catch (error) {
        showError('Connection error. Please try again.');
        console.error('Login error:', error);
    } finally {
        // Re-enable login button
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const user = sessionStorage.getItem('chatUser');
    if (user) {
        window.location.href = 'index.html';
    }
});
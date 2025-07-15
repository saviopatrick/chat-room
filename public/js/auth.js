const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  
  if (!username || !password) {
    showError('Please enter both username and password');
    return;
  }
  
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
      sessionStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to room selection
      window.location.href = 'index.html';
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (error) {
    showError('Network error. Please try again.');
  }
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 5000);
}

// Check if user is already logged in
window.addEventListener('load', () => {
  const user = sessionStorage.getItem('user');
  if (user) {
    window.location.href = 'index.html';
  }
});
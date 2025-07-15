const socket = io();

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const room = document.getElementById('room').value;
    
    const errorMessage = document.getElementById('error-message');
    errorMessage.style.display = 'none';
    
    // Emit authentication request
    socket.emit('authenticate', { username, password, room });
});

// Listen for authentication response
socket.on('authResponse', (response) => {
    if (response.success) {
        // Store user info and redirect to chat
        sessionStorage.setItem('user', JSON.stringify(response.user));
        window.location.href = `chat.html?username=${response.user.username}&room=${response.user.room}&role=${response.user.role}`;
    } else {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = response.message;
        errorMessage.style.display = 'block';
    }
});

// Listen for room full error
socket.on('roomFull', () => {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = 'Room is full. Maximum 10 users allowed.';
    errorMessage.style.display = 'block';
});
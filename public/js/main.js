// Get DOM elements
const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

// Check authentication
const user = sessionStorage.getItem('user');
if (!user) {
  window.location.href = 'login.html';
  throw new Error('No user session');
}

const userData = JSON.parse(user);

// Get URL parameters
const urlParams = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

// Use URL parameters or fallback to session data
const finalUsername = urlParams.username || userData.username;
const finalUserId = urlParams.userId || userData.id;
const finalRoom = urlParams.room || 'JavaScript';

// Initialize socket connection
const socket = io();

// Socket connection handlers
socket.on('connect', () => {
  console.log('Connected to server');
  // Join room after connection is established
  socket.emit('joinRoom', { 
    username: finalUsername, 
    room: finalRoom, 
    userId: finalUserId 
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  addMessage('System', 'Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  addMessage('System', 'Connection error: ' + error);
});

// Chat message handler
socket.on('message', (message) => {
  console.log('Received message:', message);
  addMessage(message.username, message.text, message.file);
});

// Room users handler
socket.on('roomUsers', (data) => {
  console.log('Room users:', data);
  roomName.textContent = data.room;
  updateUserList(data.users);
});

// File message handler
socket.on('fileMessage', (data) => {
  console.log('Received file message:', data);
  addMessage(data.username, data.message, data.file);
});

// Form submission handler
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const messageInput = e.target.elements.msg;
  const message = messageInput.value.trim();
  
  if (!message) return;
  
  // Send message
  socket.emit('chatMessage', message);
  
  // Clear input
  messageInput.value = '';
  messageInput.focus();
});

// Helper function to add messages to chat
function addMessage(username, text, file = null) {
  const div = document.createElement('div');
  div.classList.add('message');
  
  const metaP = document.createElement('p');
  metaP.classList.add('meta');
  metaP.innerText = username;
  metaP.innerHTML += `<span>${new Date().toLocaleTimeString()}</span>`;
  div.appendChild(metaP);
  
  const textP = document.createElement('p');
  textP.classList.add('text');
  
  if (file) {
    textP.innerHTML = `
      ${text}
      <div class="file-message">
        <img src="${file.url}" alt="${file.originalname}" style="max-width: 300px; max-height: 200px; border-radius: 5px; margin-top: 5px;">
        <div class="file-info">
          <small>${file.originalname} (${formatFileSize(file.size)})</small>
        </div>
      </div>
    `;
  } else {
    textP.innerText = text;
  }
  
  div.appendChild(textP);
  chatMessages.appendChild(div);
  
  // Auto-scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Helper function to update user list
function updateUserList(users) {
  userList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.innerText = user.username;
    userList.appendChild(li);
  });
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Leave room handler
document.getElementById('leave-btn').addEventListener('click', () => {
  const confirmLeave = confirm('Are you sure you want to leave the chatroom?');
  if (confirmLeave) {
    socket.emit('chatMessage', '/exit');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  }
});

// Add initial connection message
addMessage('System', 'Connecting to server...');

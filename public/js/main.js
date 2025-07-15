const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

// Check authentication
const user = sessionStorage.getItem('user');
if (!user) {
  window.location.href = 'login.html';
}

const userData = JSON.parse(user);

// Get username and room from URL
const { username, room, userId } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

// Verify that the logged-in user matches the URL parameters
if (username && username !== userData.username) {
  window.location.href = 'login.html';
}

// Use session data if URL parameters are missing
const finalUsername = username || userData.username;
const finalUserId = userId || userData.id;
const finalRoom = room || 'JavaScript'; // Default room if not specified

const socket = io();

// Debug socket connection
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Join chatroom
socket.emit('joinRoom', { username: finalUsername, room: finalRoom, userId: finalUserId });
console.log('Emitted joinRoom event:', { username: finalUsername, room: finalRoom, userId: finalUserId });

// Get room and users
socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Message from server
socket.on('message', (message) => {
  console.log(message);
  outputMessage(message);

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Handle disconnection
socket.on('disconnect', () => {
  outputMessage({
    username: 'System',
    text: 'You have been disconnected from the server.',
    time: new Date().toLocaleTimeString()
  });
});

// Message submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Get message text
  let msg = e.target.elements.msg.value;

  msg = msg.trim();

  if (!msg) {
    return false;
  }

  // Emit message to server
  socket.emit('chatMessage', msg);

  // Clear input
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

// Output message to DOM
function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = message.username;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  
  const para = document.createElement('p');
  para.classList.add('text');
  
  // Check if message contains a file
  if (message.file) {
    para.innerHTML = `
      ${message.text}
      <div class="file-message">
        <img src="${message.file.url}" alt="${message.file.originalname}" style="max-width: 300px; max-height: 200px; border-radius: 5px; margin-top: 5px;">
        <div class="file-info">
          <small>${message.file.originalname} (${formatFileSize(message.file.size)})</small>
        </div>
      </div>
    `;
  } else {
    para.innerText = message.text;
  }
  
  div.appendChild(para);
  document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
  roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.innerText = user.username;
    userList.appendChild(li);
  });
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

//Prompt the user before leave chat room
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('Are you sure you want to leave the chatroom?');
  if (leaveRoom) {
    socket.emit('chatMessage', '/exit');
    setTimeout(() => {
      window.location = 'index.html';
    }, 1000);
  }
});

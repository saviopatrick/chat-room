const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const userInfo = document.getElementById('user-info');

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(sessionStorage.getItem('chatUser') || 'null');
  
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  
  // Display user info
  if (userInfo) {
    userInfo.textContent = `Logged in as: ${user.username}`;
  }
});

// Get username and room from URL
const urlParams = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const username = urlParams.username;
const room = urlParams.room;

// Validate that we have username and room
if (!username || !room) {
  window.location.href = 'index.html';
}

const socket = io();

// Join chatroom
socket.emit('joinRoom', { username, room });

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

// File message from server
socket.on('fileMessage', (message) => {
  console.log('File message:', message);
  displayFileMessage(message);
  
  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector('.chat-messages').appendChild(div);
}

// Display file message in chat
function displayFileMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message', 'file-message');
  
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = message.username;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  
  const fileDiv = document.createElement('div');
  fileDiv.classList.add('file-content');
  
  if (message.data.mimetype.startsWith('image/')) {
    // Display image
    const img = document.createElement('img');
    img.src = `/uploads/${message.data.filename}`;
    img.alt = message.data.originalName;
    img.style.maxWidth = '300px';
    img.style.maxHeight = '200px';
    img.style.borderRadius = '8px';
    img.style.cursor = 'pointer';
    
    // Add click to view full size
    img.addEventListener('click', () => {
      window.open(`/uploads/${message.data.filename}`, '_blank');
    });
    
    fileDiv.appendChild(img);
  } else {
    // Display file link
    const fileLink = document.createElement('a');
    fileLink.href = `/uploads/${message.data.filename}`;
    fileLink.target = '_blank';
    fileLink.innerHTML = `<i class="fas fa-file"></i> ${message.data.originalName}`;
    fileDiv.appendChild(fileLink);
  }
  
  // Add file info
  const fileInfo = document.createElement('p');
  fileInfo.classList.add('file-info');
  fileInfo.textContent = `Size: ${formatFileSize(message.data.size)}`;
  fileDiv.appendChild(fileInfo);
  
  div.appendChild(fileDiv);
  document.querySelector('.chat-messages').appendChild(div);
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

//Prompt the user before leave chat room
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('Are you sure you want to leave the chatroom?');
  if (leaveRoom) {
    window.location = 'index.html';
  }
});

const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

// Get username, room, and role from URL
const urlParams = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const username = urlParams.username;
const room = urlParams.room;
const role = urlParams.role;

// Check if user is authenticated
if (!username || !room) {
  window.location.href = 'login.html';
}

const socket = io();

// Store user info for file uploads
const user = { username, room, role };
sessionStorage.setItem('user', JSON.stringify(user));

// Join chatroom
socket.emit('joinRoom', { username, room, role });

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
socket.on('fileMessage', (fileMessage) => {
  console.log('File message:', fileMessage);
  handleFileMessage(fileMessage);
});

// Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
  alert('Error: ' + error);
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

// Handle file upload
function initFileUpload() {
  const fileInput = document.getElementById('file-input');
  const fileUploadBtn = document.getElementById('file-upload-btn');
  
  if (!fileInput || !fileUploadBtn) return;
  
  fileUploadBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadFile(file);
    }
  });
}

function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('socketId', socket.id);
  
  // Show upload progress
  showUploadProgress(file.name);
  
  fetch('/upload', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    hideUploadProgress();
    if (data.success) {
      console.log('File uploaded successfully');
    } else {
      console.error('Upload failed:', data.error);
      alert('Upload failed: ' + data.error);
    }
  })
  .catch(error => {
    hideUploadProgress();
    console.error('Upload error:', error);
    alert('Upload failed: ' + error.message);
  });
}

function showUploadProgress(filename) {
  const progressDiv = document.createElement('div');
  progressDiv.id = 'upload-progress';
  progressDiv.innerHTML = `<p>Uploading ${filename}...</p>`;
  progressDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #333;
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 1000;
  `;
  document.body.appendChild(progressDiv);
}

function hideUploadProgress() {
  const progressDiv = document.getElementById('upload-progress');
  if (progressDiv) {
    progressDiv.remove();
  }
}

// Handle file messages from server
function handleFileMessage(fileMessage) {
  const div = document.createElement('div');
  div.classList.add('message');
  
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = fileMessage.username;
  p.innerHTML += `<span>${fileMessage.time}</span>`;
  div.appendChild(p);
  
  const fileDiv = document.createElement('div');
  fileDiv.classList.add('file-message');
  
  if (fileMessage.mimetype.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = `/uploads/${fileMessage.filename}`;
    img.alt = fileMessage.originalname;
    img.style.maxWidth = '300px';
    img.style.maxHeight = '200px';
    img.style.borderRadius = '5px';
    img.style.cursor = 'pointer';
    img.onclick = () => window.open(`/uploads/${fileMessage.filename}`, '_blank');
    fileDiv.appendChild(img);
  }
  
  const fileInfo = document.createElement('p');
  fileInfo.innerHTML = `
    <i class="fas fa-file"></i> 
    <a href="/uploads/${fileMessage.filename}" target="_blank">${fileMessage.originalname}</a>
    <span class="file-size">(${formatFileSize(fileMessage.size)})</span>
  `;
  fileDiv.appendChild(fileInfo);
  
  div.appendChild(fileDiv);
  document.querySelector('.chat-messages').appendChild(div);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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
    window.location = 'login.html';
  }
});

// Initialize file upload functionality
initFileUpload();

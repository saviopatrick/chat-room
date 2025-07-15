// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  
const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const fileInput = document.getElementById('file-input');
const fileUploadBtn = document.getElementById('file-upload-btn');
const filePreview = document.getElementById('file-preview');
const uploadButton = document.getElementById('upload-button');
const uploadProgress = document.getElementById('upload-progress');

// Get username and room from URL
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

// Check authentication
const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
console.log('Current user:', currentUser);
if (!currentUser) {
  window.location.href = 'login.html';
  return;
}

// Show admin commands if user is admin
if (currentUser && currentUser.role === 'admin') {
  console.log('User is admin, showing admin commands');
  const adminCommand = document.getElementById('admin-command');
  if (adminCommand) {
    adminCommand.style.display = 'block';
  }
}

const socket = io();

// Join chatroom
console.log('Joining room:', { username, room });
socket.emit('joinRoom', { username, room });

// Get room and users
socket.on('roomUsers', ({ room, users }) => {
  console.log('Room users event:', { room, users });
  outputRoomName(room);
  outputUsers(users);
});

// Message from server
socket.on('message', (message) => {
  console.log('Message event:', message);
  outputMessage(message);

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Handle file upload button
fileUploadBtn.addEventListener('click', () => {
  fileInput.click();
});

// Handle file selection
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    showFilePreview(file);
  }
});

// Handle file upload
uploadButton.addEventListener('click', () => {
  const file = fileInput.files[0];
  if (file) {
    uploadFile(file);
  }
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

// Show file preview
function showFilePreview(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const fileType = file.type;
    let previewHTML = '';

    if (fileType.startsWith('image/')) {
      previewHTML = `
        <div class="file-preview-item">
          <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 5px;">
          <p>${file.name} (${formatFileSize(file.size)})</p>
        </div>
      `;
    } else {
      previewHTML = `
        <div class="file-preview-item">
          <div class="file-icon"><i class="fas fa-file"></i></div>
          <p>${file.name} (${formatFileSize(file.size)})</p>
        </div>
      `;
    }

    filePreview.innerHTML = previewHTML;
    filePreview.style.display = 'block';
    uploadButton.style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
}

// Upload file
function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  uploadProgress.style.display = 'block';
  uploadProgress.value = 0;

  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Send file message
      socket.emit('fileMessage', {
        filename: data.file.filename,
        originalName: data.file.originalName,
        url: data.file.url,
        size: data.file.size,
        isImage: data.file.isImage
      });
      
      // Reset file input
      resetFileUpload();
    } else {
      alert('Upload failed: ' + data.message);
    }
    uploadProgress.style.display = 'none';
  })
  .catch(error => {
    console.error('Upload error:', error);
    alert('Upload failed. Please try again.');
    uploadProgress.style.display = 'none';
  });
}

// Reset file upload
function resetFileUpload() {
  fileInput.value = '';
  filePreview.innerHTML = '';
  filePreview.style.display = 'none';
  uploadButton.style.display = 'none';
}

// Format file size
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
  
  // Handle file messages
  if (message.isFile && message.file) {
    if (message.file.isImage) {
      para.innerHTML = `
        ${message.text}<br>
        <img src="${message.file.url}" alt="${message.file.originalName}" 
             style="max-width: 300px; max-height: 300px; border-radius: 5px; margin-top: 5px;" />
      `;
    } else {
      para.innerHTML = `
        ${message.text}<br>
        <a href="${message.file.url}" target="_blank" class="file-link">
          <i class="fas fa-download"></i> Download ${message.file.originalName}
        </a>
      `;
    }
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

// Prompt the user before leave chat room
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('Are you sure you want to leave the chatroom?');
  if (leaveRoom) {
    window.location = '../index.html';
  }
});

}); // End of DOMContentLoaded event handler

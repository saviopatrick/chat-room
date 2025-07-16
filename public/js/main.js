const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

// Verificar autenticação
let user = JSON.parse(localStorage.getItem('chatUser'));
if (!user) {
    window.location.href = 'login.html';
    throw new Error('Usuário não autenticado');
}

// Pega username e a sala para URL
const urlParams = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

// Variável para controlar se já foi autenticado
let isAuthenticated = false;

// Autenticar socket
socket.emit('authenticate', {
    username: user.username,
    password: user.password
});

// Eventos de autenticação
socket.on('authSuccess', (data) => {
    console.log('Autenticado com sucesso:', data.user);
    isAuthenticated = true;
    
    socket.emit('joinRoom', { 
        username: data.user.username, 
        room: urlParams.room || 'Geral' 
    });
});

socket.on('authError', (error) => {
    console.error('Erro de autenticação:', error);
    alert('Erro de autenticação: ' + error);
    localStorage.removeItem('chatUser');
    window.location.href = 'login.html';
});

// Get room and users
socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Message from server
socket.on('message', (message) => {
  console.log(message);
  outputMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Arquivo compartilhado
socket.on('fileShared', (data) => {
    outputFileMessage(data);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!isAuthenticated) {
    alert('Aguarde a autenticação...');
    return;
  }

  let msg = e.target.elements.msg.value;
  msg = msg.trim();

  if (!msg) {
    return false;
  }

  socket.emit('chatMessage', msg);
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

// Output file message
function outputFileMessage(data) {
    const div = document.createElement('div');
    div.classList.add('message', 'file-message');
    
    const p = document.createElement('p');
    p.classList.add('meta');
    p.innerText = data.user;
    p.innerHTML += `<span>${new Date().toLocaleTimeString()}</span>`;
    div.appendChild(p);
    
    const fileDiv = document.createElement('div');
    fileDiv.classList.add('file-content');
    
    // Se for imagem, mostrar preview
    if (data.file.mimetype.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = `/uploads/${data.file.filename}`;
        img.alt = data.file.originalName;
        img.style.maxWidth = '300px';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '5px';
        fileDiv.appendChild(img);
    }
    
    // Link para download
    const downloadLink = document.createElement('a');
    downloadLink.href = `/api/download/${data.file.filename}`;
    downloadLink.innerHTML = `<i class="fas fa-download"></i> ${data.file.originalName}`;
    downloadLink.style.display = 'block';
    downloadLink.style.marginTop = '5px';
    fileDiv.appendChild(downloadLink);
    
    div.appendChild(fileDiv);
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

// Leave room
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('Tem certeza que deseja sair da sala?');
  if (leaveRoom) {
    socket.emit('chatMessage', '/exit');
    localStorage.removeItem('chatUser');
    window.location = 'login.html';
  }
});

// Detectar desconexão
socket.on('disconnect', () => {
    console.log('Desconectado do servidor');
    alert('Conexão perdida. Redirecionando para login...');
    localStorage.removeItem('chatUser');
    window.location.href = 'login.html';
});
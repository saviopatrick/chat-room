# SALA DE BATE PAPO - Documentação do Sistema de Chat

## 1. Documentação Externa

### 1.1 Projeto: Visão Geral do Sistema

O **SALA DE BATE PAPO** é um sistema de chat em tempo real desenvolvido com Node.js, Socket.IO e JavaScript. O sistema permite que usuários autenticados se conectem a salas de chat específicas e troquem mensagens instantaneamente.

#### Principais Características:
- **Autenticação de usuários**: Sistema de login com validação
- **Salas de chat**: Múltiplas salas
- **Comunicação em tempo real**: Mensagens instantâneas via WebSockets
- **Comandos especiais**: Sistema de comandos para administração
- **Gerenciamento de usuários**: Controle de usuários online por sala

#### Arquitetura do Sistema:
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Utilitários   │
│                 │    │                 │    │                 │
│ • login.html    │◄──►│ • server.js     │◄──►│ • users.js      │
│ • index.html    │    │ • socket.io     │    │ • messages.js   │
│ • chat.html     │    │ • autenticação  │    │ • commands.js   │
│ • main.js       │    │ • rotas         │    │                 │
│ • style.css     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 Protocolo: Tipos e Sequência das Mensagens

#### Fluxo de Autenticação:
1. **Cliente → Servidor**: `authenticate` 
   ```javascript
   socket.emit('authenticate', {
       username: user.username,
       password: user.password
   });
   ```

2. **Servidor → Cliente**: `authSuccess` ou `authError`
   ```javascript
   // Sucesso
   socket.emit('authSuccess', { user: authenticatedUser });
   
   // Erro
   socket.emit('authError', 'Mensagem de erro');
   ```

#### Fluxo de Entrada na Sala:
1. **Cliente → Servidor**: `joinRoom`
   ```javascript
   socket.emit('joinRoom', { 
       username: user.username, 
       room: 'NomeDaSala' 
   });
   ```

2. **Servidor → Cliente**: `message` (boas-vindas)
   ```javascript
   socket.emit('message', {
       username: 'ChatBot',
       text: 'Bem-vindo à sala!',
       time: '10:30'
   });
   ```

3. **Servidor → Todos na Sala**: `roomUsers`
   ```javascript
   io.to(room).emit('roomUsers', {
       room: 'NomeDaSala',
       users: [array_de_usuarios]
   });
   ```

#### Fluxo de Mensagens:
1. **Cliente → Servidor**: `chatMessage`
   ```javascript
   socket.emit('chatMessage', 'Texto da mensagem');
   ```

2. **Servidor → Todos na Sala**: `message`
   ```javascript
   io.to(room).emit('message', {
       username: 'NomeUsuario',
       text: 'Texto da mensagem',
       time: '10:35'
   });
   ```

#### Comandos Especiais:
- `/help` - Mostra ajuda
- `/users` - Lista usuários online
- `/exit` ou `/quit` - Sair da sala
- `/shutdown` - Desligar servidor (apenas admin)

#### Eventos de Desconexão:
- **disconnect**: Usuário sai da sala
- **authError**: Erro de autenticação
- **roomUsers**: Atualização da lista de usuários

### 1.3 Testes: Capturas de Tela

#### Tela de Login
![Login Screen](login-screen.png)
*Tela de autenticação com campos de usuário e senha*

#### Seleção de Sala
![Room Selection](room-selection.png)
*Interface para seleção de sala de chat*

#### Chat Principal
![Chat Interface](chat-interface.png)
*Interface principal do chat com mensagens em tempo real*

#### Lista de Usuários
![User List](user-list.png)
*Sidebar mostrando usuários online na sala*

#### Comandos do Sistema
![System Commands](system-commands.png)
*Demonstração dos comandos especiais disponíveis*

## 2. Documentação dos Programas

### 2.1 Estrutura do Projeto

```
chat-room/
├── public/
│   ├── css/
│   │   └── style.css          # Estilos da aplicação
│   ├── js/
│   │   └── main.js            # Lógica do frontend
│   ├── chat.html              # Interface do chat
│   ├── index.html             # Seleção de sala
│   └── login.html             # Tela de login
├── utils/
│   ├── commands.js            # Processamento de comandos
│   ├── messages.js            # Formatação de mensagens
│   └── users.js               # Gerenciamento de usuários
├── server.js                  # Servidor principal
└── package.json               # Dependências
```

### 2.2 Código Fonte Comentado

#### server.js - Servidor Principal
```javascript
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

// Importar utilitários
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');
const CommandHandler = require('./utils/commands');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Configurar pasta estática
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatBot';
const commandHandler = new CommandHandler(io);

// Conexão do Socket.IO
io.on('connection', (socket) => {
    console.log('Nova conexão WebSocket');
    
    // Evento de autenticação
    socket.on('authenticate', (credentials) => {
        // Validar credenciais do usuário
        // Implementar lógica de autenticação
    });
    
    // Evento de entrada na sala
    socket.on('joinRoom', ({ username, room }) => {
        // Adicionar usuário à sala
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);
        
        // Enviar mensagem de boas-vindas
        socket.emit('message', formatMessage(botName, `Bem-vindo à ${room}!`));
        
        // Notificar outros usuários
        socket.broadcast.to(user.room).emit('message', 
            formatMessage(botName, `${user.username} entrou na sala`)
        );
        
        // Atualizar lista de usuários
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });
    
    // Evento de mensagem
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);
        
        // Verificar se é um comando
        if (msg.startsWith('/')) {
            commandHandler.handleCommand(socket, msg, user);
        } else {
            // Enviar mensagem para todos na sala
            io.to(user.room).emit('message', 
                formatMessage(user.username, msg)
            );
        }
    });
    
    // Evento de desconexão
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        
        if (user) {
            // Notificar outros usuários
            io.to(user.room).emit('message', 
                formatMessage(botName, `${user.username} saiu da sala`)
            );
            
            // Atualizar lista de usuários
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
```

#### utils/users.js - Gerenciamento de Usuários
```javascript
const users = []; // Array para armazenar usuários conectados

// Adicionar usuário à sala
function userJoin(id, username, room) {
    const user = { id, username, room };
    users.push(user);
    return user;
}

// Obter usuário atual
function getCurrentUser(id) {
    return users.find(user => user.id === id);
}

// Remover usuário
function userLeave(id) {
    const index = users.findIndex(user => user.id === id);
    if (index !== -1) {
        return users.splice(index, 1)[0];
    }
}

// Obter usuários de uma sala
function getRoomUsers(room) {
    return users.filter(user => user.room === room);
}

module.exports = { userJoin, getCurrentUser, userLeave, getRoomUsers };
```

#### utils/messages.js - Formatação de Mensagens
```javascript
const moment = require('moment');

// Formatar mensagem com timestamp
function formatMessage(username, text) {
    return {
        username,
        text,
        time: moment().format('h:mm a')
    };
}

module.exports = formatMessage;
```

#### utils/commands.js - Processamento de Comandos
```javascript
const formatMessage = require('./messages');

class CommandHandler {
    constructor(io) {
        this.io = io;
    }
    
    // Processar comando
    handleCommand(socket, message, user) {
        const command = message.toLowerCase().split(' ')[0];
        
        switch(command) {
            case '/help':
                this.handleHelp(socket);
                break;
            case '/users':
                this.handleUsers(socket);
                break;
            case '/exit':
            case '/quit':
                this.handleExit(socket, user);
                break;
            case '/shutdown':
                this.handleShutdown(socket, user);
                break;
            default:
                socket.emit('message', formatMessage('Sistema', 'Comando não reconhecido'));
        }
    }
    
    // Mostrar ajuda
    handleHelp(socket) {
        const helpMessage = `
Comandos disponíveis:
/help - Mostra esta mensagem
/users - Lista usuários online
/exit ou /quit - Sair da sala
/shutdown - Desligar servidor (apenas admin)
        `;
        socket.emit('message', formatMessage('Sistema', helpMessage));
    }
    
    // Listar usuários
    handleUsers(socket) {
        const connectedUsers = Array.from(this.io.sockets.sockets.values())
            .filter(s => s.user)
            .map(s => s.user.username);
        
        const userList = connectedUsers.length > 0 
            ? `Usuários online: ${connectedUsers.join(', ')}`
            : 'Nenhum usuário online';
        
        socket.emit('message', formatMessage('Sistema', userList));
    }
    
    // Sair da sala
    handleExit(socket, user) {
        socket.emit('message', formatMessage('Sistema', 'Você saiu da sala.'));
        socket.disconnect();
    }
    
    // Desligar servidor (apenas admin)
    handleShutdown(socket, user) {
        if (user.role === 'admin') {
            this.io.emit('message', formatMessage('Sistema', 'Servidor será desligado em 5 segundos...'));
            setTimeout(() => process.exit(0), 5000);
        } else {
            socket.emit('message', formatMessage('Sistema', 'Acesso negado. Apenas administradores.'));
        }
    }
}

module.exports = CommandHandler;
```

#### public/js/main.js - Lógica do Frontend
```javascript
// Elementos DOM
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

// Conectar ao Socket.IO
const socket = io();
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
    
    // Entrar na sala
    const urlParams = Qs.parse(location.search, { ignoreQueryPrefix: true });
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

// Atualizar informações da sala
socket.on('roomUsers', ({ room, users }) => {
    outputRoomName(room);
    outputUsers(users);
});

// Receber mensagens
socket.on('message', (message) => {
    outputMessage(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Enviar mensagem
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
        alert('Aguarde a autenticação...');
        return;
    }
    
    const msg = e.target.elements.msg.value.trim();
    if (!msg) return false;
    
    socket.emit('chatMessage', msg);
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

// Exibir mensagem no DOM
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
    
    chatMessages.appendChild(div);
}

// Exibir nome da sala
function outputRoomName(room) {
    roomName.innerText = room;
}

// Exibir usuários online
function outputUsers(users) {
    userList.innerHTML = '';
    users.forEach((user) => {
        const li = document.createElement('li');
        li.innerText = user.username;
        userList.appendChild(li);
    });
}

// Sair da sala
document.getElementById('leave-btn').addEventListener('click', () => {
    const leaveRoom = confirm('Tem certeza que deseja sair da sala?');
    if (leaveRoom) {
        socket.emit('chatMessage', '/exit');
        localStorage.removeItem('chatUser');
        window.location = 'login.html';
    }
});

// Tratar desconexão
socket.on('disconnect', () => {
    console.log('Desconectado do servidor');
    alert('Conexão perdida. Redirecionando para login...');
    localStorage.removeItem('chatUser');
    window.location.href = 'login.html';
});
```

### 2.3 Instalação e Execução

#### Dependências (package.json):
```json
{
  "name": "chatcord",
  "version": "1.0.0",
  "description": "Sistema de chat em tempo real",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.17.1",
    "socket.io": "^4.0.0",
    "moment": "^2.29.1"
  },
  "devDependencies": {
    "nodemon": "^2.0.7"
  }
}
```

#### Comandos para executar:
```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Executar em produção
npm start
```

O servidor estará disponível em `http://localhost:3000`

---

**Desenvolvido por**: Savio Patrick  
**Tecnologias**: Node.js, Socket.IO, Express, JavaScript, HTML5, CSS3  
**Data**: Julho 2025
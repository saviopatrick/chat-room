const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const AuthManager = require("./utils/auth");
const CommandHandler = require("./utils/commands");
const FileHandler = require("./utils/fileHandler");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middlewares
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Instanciar gerenciadores
const authManager = new AuthManager();
const commandHandler = new CommandHandler(io, authManager);
const fileHandler = new FileHandler();

const botName = "ChatCord Bot";
const MAX_CLIENTS = 10;
let connectedClients = 0;

// Rota para página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

// Rota para autenticação
app.post('/api/auth', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password são obrigatórios' });
  }

  const user = authManager.authenticateUser(username, password);
  if (user) {
    res.json({ success: true, user: user });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// Rota para upload de arquivos
app.post('/api/upload', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  const username = authHeader.replace('Bearer ', '');
  if (!authManager.userExists(username)) {
    return res.status(401).json({ error: 'Usuário não encontrado' });
  }

  const user = { username };
  fileHandler.handleFileUpload(req, res, io, user);
});

// Rota para download de arquivos
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = fileHandler.getFilePath(filename);
  
  if (!fileHandler.fileExists(filename)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  res.download(filePath);
});

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexões Socket.IO
io.on("connection", (socket) => {
  console.log(`Nova conexão: ${socket.id}`);

  // Verificar limite de clientes
  if (connectedClients >= MAX_CLIENTS) {
    socket.emit('message', formatMessage('Sistema', 'Servidor lotado. Tente novamente mais tarde.'));
    socket.disconnect();
    return;
  }

  // Autenticação do socket
  socket.on('authenticate', (credentials) => {
    console.log('Tentativa de autenticação:', credentials.username);
    
    const user = authManager.authenticateUser(credentials.username, credentials.password);
    
    if (!user) {
      console.log('Falha na autenticação para:', credentials.username);
      socket.emit('authError', 'Credenciais inválidas');
      return;
    }

    // Verificar se usuário já está conectado
    const existingUser = Array.from(io.sockets.sockets.values())
      .find(s => s.user && s.user.username === user.username);
    
    if (existingUser) {
      console.log('Usuário já conectado:', user.username);
      socket.emit('authError', 'Usuário já está conectado');
      return;
    }

    socket.user = user;
    connectedClients++;
    
    console.log(`Usuário ${user.username} autenticado com sucesso`);
    socket.emit('authSuccess', { user: user });
  });

  // Entrar na sala
  socket.on("joinRoom", ({ username, room }) => {
    if (!socket.user) {
      console.log('Tentativa de entrar na sala sem autenticação');
      socket.emit('authError', 'Usuário não autenticado');
      return;
    }

    console.log(`${socket.user.username} entrando na sala ${room}`);
    
    const user = userJoin(socket.id, socket.user.username, room);
    socket.join(user.room);

    // Mensagem de boas-vindas
    socket.emit("message", formatMessage(botName, `Bem-vindo à sala ${room}!`));

    // Notificar outros usuários
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} entrou na sala`)
      );

    // Enviar informações da sala
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Processar mensagens
  socket.on("chatMessage", (msg) => {
    if (!socket.user) {
      socket.emit('authError', 'Usuário não autenticado');
      return;
    }

    const user = getCurrentUser(socket.id);
    if (!user) {
      console.log('Usuário não encontrado na lista de usuários');
      return;
    }

    // Verificar se é um comando
    if (msg.startsWith('/')) {
      const isCommand = commandHandler.processCommand(socket, user, msg);
      if (isCommand) return;
    }

    // Enviar mensagem normal
    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Desconexão
  socket.on("disconnect", () => {
    console.log(`Usuário desconectado: ${socket.id}`);
    
    if (socket.user) {
      connectedClients--;
      
      const user = userLeave(socket.id);
      if (user) {
        io.to(user.room).emit(
          "message",
          formatMessage(botName, `${user.username} saiu da sala`)
        );

        // Atualizar lista de usuários
        io.to(user.room).emit("roomUsers", {
          room: user.room,
          users: getRoomUsers(user.room),
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log(`Máximo de clientes simultâneos: ${MAX_CLIENTS}`);
});
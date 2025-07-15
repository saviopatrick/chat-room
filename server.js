const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const { validateUser, isAdmin } = require("./utils/auth");
const { processCommand, isCommand, initiateShutdown } = require("./utils/commands");
const { upload, getFileInfo } = require("./utils/fileHandler");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const botName = "ChatCord Bot";
const MAX_CLIENTS = 10;
let connectedClients = 0;

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  const user = validateUser(username, password);
  if (user) {
    res.json({ 
      success: true, 
      user: { 
        id: user.id,
        username: user.username,
        role: user.role 
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileInfo = getFileInfo(req.file);
  res.json({ success: true, file: fileInfo });
});

// Redirect root to login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Run when client connects
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  
  // Check connection limit
  if (connectedClients >= MAX_CLIENTS) {
    socket.emit("message", formatMessage(botName, "Server is full. Maximum 10 clients allowed."));
    socket.disconnect();
    return;
  }

  connectedClients++;
  console.log(`Client connected. Total clients: ${connectedClients}`);

  socket.on("joinRoom", ({ username, room, userId }) => {
    console.log("joinRoom event received:", { username, room, userId });
    const user = userJoin(socket.id, username, room, userId);
    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));
    socket.emit("message", formatMessage(botName, "Type /exit or /quit to leave the chat" + (isAdmin(username) ? ", /shutdown to shutdown server" : "")));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    if (!user) return;

    // Check if message is a command
    if (isCommand(msg)) {
      const commandResult = processCommand(msg, user, socket, io);
      
      switch (commandResult.type) {
        case 'disconnect':
          socket.emit("message", formatMessage(botName, "Goodbye!"));
          socket.disconnect();
          break;
        case 'shutdown':
          io.emit("message", formatMessage(botName, commandResult.message));
          initiateShutdown(io, server);
          break;
        case 'error':
        case 'invalid':
          socket.emit("message", formatMessage(botName, commandResult.message));
          break;
      }
    } else {
      // Regular message
      io.to(user.room).emit("message", formatMessage(user.username, msg));
    }
  });

  // Listen for file messages
  socket.on("fileMessage", (data) => {
    const user = getCurrentUser(socket.id);
    if (!user) return;

    const message = formatMessage(user.username, data.message);
    message.file = data.file;
    
    io.to(user.room).emit("message", message);
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    connectedClients--;
    console.log(`Client disconnected. Total clients: ${connectedClients}`);
    
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const { validateCredentials } = require("./utils/auth");
const { processCommand, executeShutdown } = require("./utils/commands");
const { upload, getFileInfo } = require("./utils/fileHandler");
// const createAdapter = require("@socket.io/redis-adapter").createAdapter;
// const redis = require("redis");
require("dotenv").config();
// const { createClient } = redis;
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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const botName = "ChatCord Bot";

// Track connected clients (max 10)
let connectedClients = 0;
const MAX_CLIENTS = 10;

// Authentication route
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }
  
  const authResult = validateCredentials(username, password);
  
  if (authResult.isValid) {
    res.json({ success: true, user: authResult.user });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// File upload route
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  const fileInfo = getFileInfo(req.file.filename);
  if (fileInfo) {
    res.json({ 
      success: true, 
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileInfo.url,
        size: fileInfo.size,
        isImage: fileInfo.isImage
      }
    });
  } else {
    res.status(500).json({ success: false, message: 'File upload failed' });
  }
});

// Redirect root to login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Redis adapter setup - commented out for now
// (async () => {
//   pubClient = createClient({ url: "redis://127.0.0.1:6379" });
//   await pubClient.connect();
//   subClient = pubClient.duplicate();
//   io.adapter(createAdapter(pubClient, subClient));
// })();

// Run when client connects
io.on("connection", (socket) => {
  // Check client limit
  if (connectedClients >= MAX_CLIENTS) {
    socket.emit("message", formatMessage(botName, "Server is full. Maximum 10 clients allowed."));
    socket.disconnect();
    return;
  }
  
  connectedClients++;
  console.log(`Client connected. Total clients: ${connectedClients}`);
  
  // Handle authentication
  socket.on("authenticate", (credentials) => {
    const authResult = validateCredentials(credentials.username, credentials.password);
    
    if (authResult.isValid) {
      socket.authenticated = true;
      socket.userInfo = authResult.user;
      socket.emit("authSuccess", authResult.user);
    } else {
      socket.emit("authFailed", "Invalid credentials");
      socket.disconnect();
    }
  });
  
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage(botName, "Welcome to ChatCord!"));

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
    if (msg.startsWith('/')) {
      const commandResult = processCommand(msg, user.username, socket, io);
      
      switch (commandResult.type) {
        case 'disconnect':
          // Send custom leave message
          socket.broadcast.to(user.room).emit("message", formatMessage(botName, commandResult.message));
          socket.disconnect();
          break;
        case 'shutdown':
          executeShutdown(io);
          break;
        case 'help':
        case 'error':
        case 'unknown':
          socket.emit("message", formatMessage(botName, commandResult.message));
          break;
      }
    } else {
      // Regular message
      io.to(user.room).emit("message", formatMessage(user.username, msg));
    }
  });

  // Listen for file messages
  socket.on("fileMessage", (fileData) => {
    const user = getCurrentUser(socket.id);
    if (!user) return;

    const fileMessage = {
      username: user.username,
      text: fileData.isImage ? `📷 Image: ${fileData.originalName}` : `📁 File: ${fileData.originalName}`,
      time: formatMessage(user.username, '').time,
      file: fileData,
      isFile: true
    };

    io.to(user.room).emit("message", fileMessage);
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

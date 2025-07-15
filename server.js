const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const multer = require("multer");
const formatMessage = require("./utils/messages");
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
require("dotenv").config();
const { createClient } = redis;
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");
const { validateUser, isAdmin } = require("./utils/auth");
const { processCommand, startShutdownCountdown } = require("./utils/commands");
const { saveFile, isImage } = require("./utils/fileHandler");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Configuration
const MAX_CLIENTS = 10;
let connectedClients = 0;

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
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
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const fileData = saveFile(req.file, 'user'); // You might want to pass actual username
    res.json({
      success: true,
      filename: fileData.filename,
      originalName: fileData.originalName,
      mimetype: fileData.mimetype,
      size: fileData.size
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Redirect root to login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

const botName = "ChatCord Bot";

(async () => {
  try {
    pubClient = createClient({ url: "redis://127.0.0.1:6379" });
    await pubClient.connect();
    subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis adapter connected");
  } catch (error) {
    console.log("Redis not available, using default adapter");
  }
})();

// Run when client connects
io.on("connection", (socket) => {
  console.log('Client connected:', socket.id);
  
  // Check connection limit
  if (connectedClients >= MAX_CLIENTS) {
    socket.emit("message", formatMessage("System", "Server is full. Please try again later."));
    socket.disconnect();
    return;
  }
  
  connectedClients++;
  console.log(`Connected clients: ${connectedClients}/${MAX_CLIENTS}`);

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
      const command = processCommand(msg.substring(1), user, io);
      
      if (command) {
        switch (command.type) {
          case 'disconnect':
            // Send custom disconnect message
            socket.broadcast.to(user.room).emit(
              "message", 
              formatMessage(botName, command.message)
            );
            socket.disconnect();
            break;
          case 'shutdown':
            // Admin shutdown command
            io.emit("message", formatMessage(botName, command.message));
            startShutdownCountdown(io);
            break;
          case 'error':
            // Send error message only to the user
            socket.emit("message", formatMessage(botName, command.message));
            break;
        }
        return;
      }
    }

    // Regular message
    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Listen for file messages
  socket.on("fileMessage", (fileData) => {
    const user = getCurrentUser(socket.id);
    if (!user) return;

    const message = {
      username: user.username,
      type: 'file',
      data: fileData,
      time: new Date().toLocaleTimeString()
    };

    io.to(user.room).emit("fileMessage", message);
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    console.log('Client disconnected:', socket.id);
    connectedClients--;
    console.log(`Connected clients: ${connectedClients}/${MAX_CLIENTS}`);
    
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

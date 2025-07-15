const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const { authenticateUser } = require("./utils/auth");
const { processCommand } = require("./utils/commands");
const { upload, handleFileUpload } = require("./utils/fileHandler");
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
require("dotenv").config();
const { createClient } = redis;
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  isRoomFull,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  const user = getCurrentUser(req.body.socketId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  handleFileUpload(req, res, io, user);
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
  console.log("New client connected");
  
  // Handle authentication
  socket.on("authenticate", ({ username, password, room }) => {
    const authResult = authenticateUser(username, password);
    
    if (!authResult.authenticated) {
      socket.emit("authResponse", {
        success: false,
        message: authResult.message
      });
      return;
    }
    
    // Check if room is full
    if (isRoomFull()) {
      socket.emit("roomFull");
      return;
    }
    
    // Join user to room
    const user = userJoin(socket.id, username, room, authResult.role);
    
    if (!user) {
      socket.emit("authResponse", {
        success: false,
        message: "Room is full. Maximum 10 users allowed."
      });
      return;
    }
    
    socket.emit("authResponse", {
      success: true,
      user: { ...user, room }
    });
  });
  
  socket.on("joinRoom", ({ username, room, role }) => {
    const user = userJoin(socket.id, username, room, role);
    
    if (!user) {
      socket.emit("error", "Room is full");
      return;
    }

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
    
    if (!user) {
      socket.emit("error", "User not found");
      return;
    }
    
    // Check if message is a command
    if (processCommand(msg, user, socket, io)) {
      return; // Command was processed, don't send as regular message
    }

    // Send regular message
    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} saiu da sala`)
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

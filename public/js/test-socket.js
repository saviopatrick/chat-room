// Simple test to verify Socket.IO connection
const socket = io();

console.log('Socket.IO script loaded');

socket.on('connect', () => {
  console.log('Socket connected with ID:', socket.id);
  
  // Test direct room join
  socket.emit('joinRoom', { 
    username: 'TestUser', 
    room: 'TestRoom', 
    role: 'user' 
  });
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('message', (message) => {
  console.log('Received message:', message);
});

socket.on('roomUsers', (data) => {
  console.log('Room users:', data);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

// Test message sending
setTimeout(() => {
  socket.emit('chatMessage', 'Test message from client');
}, 3000);
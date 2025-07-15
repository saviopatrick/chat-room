// Simple test to verify socket connection
console.log('Starting socket test...');

// Check if socket.io is loaded
if (typeof io === 'undefined') {
  console.error('Socket.io not loaded');
} else {
  console.log('Socket.io loaded successfully');
  
  const socket = io();
  
  socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    
    // Test join room
    socket.emit('joinRoom', { username: 'test', room: 'JavaScript', userId: 1 });
    console.log('Emitted joinRoom event');
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
  
  socket.on('message', (message) => {
    console.log('Received message:', message);
  });
  
  socket.on('roomUsers', (data) => {
    console.log('Received roomUsers:', data);
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });
}
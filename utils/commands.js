const { isAdmin } = require('./auth');

// Process special commands
function processCommand(message, user, socket, io) {
  // Check if message is a command (starts with /)
  if (!message.startsWith('/')) {
    return false; // Not a command
  }

  const command = message.slice(1).toLowerCase().trim();
  
  switch (command) {
    case 'exit':
    case 'quit':
      handleExitCommand(user, socket, io);
      return true;
    
    case 'shutdown':
      handleShutdownCommand(user, socket, io);
      return true;
    
    case 'help':
      handleHelpCommand(user, socket);
      return true;
    
    case 'users':
      handleUsersCommand(user, socket);
      return true;
    
    default:
      socket.emit('message', {
        username: 'System',
        text: `Unknown command: ${command}. Type /help for available commands.`,
        time: new Date().toLocaleTimeString()
      });
      return true;
  }
}

function handleExitCommand(user, socket, io) {
  socket.emit('message', {
    username: 'System',
    text: 'Goodbye! You will be disconnected in 2 seconds.',
    time: new Date().toLocaleTimeString()
  });
  
  setTimeout(() => {
    socket.disconnect();
  }, 2000);
}

function handleShutdownCommand(user, socket, io) {
  if (!isAdmin(user)) {
    socket.emit('message', {
      username: 'System',
      text: 'You do not have permission to shutdown the server.',
      time: new Date().toLocaleTimeString()
    });
    return;
  }
  
  // Warn all users
  io.emit('message', {
    username: 'System',
    text: 'Server will shutdown in 10 seconds! Please save your work.',
    time: new Date().toLocaleTimeString()
  });
  
  setTimeout(() => {
    io.emit('message', {
      username: 'System',
      text: 'Server shutting down now...',
      time: new Date().toLocaleTimeString()
    });
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }, 10000);
}

function handleHelpCommand(user, socket) {
  const commands = [
    '/help - Show available commands',
    '/users - Show users in current room',
    '/exit or /quit - Leave the chat room',
  ];
  
  if (isAdmin(user)) {
    commands.push('/shutdown - Shutdown server (Admin only)');
  }
  
  socket.emit('message', {
    username: 'System',
    text: `Available commands:\n${commands.join('\n')}`,
    time: new Date().toLocaleTimeString()
  });
}

function handleUsersCommand(user, socket) {
  const { getRoomUsers } = require('./users');
  const roomUsers = getRoomUsers(user.room);
  
  const userList = roomUsers.map(u => u.username).join(', ');
  socket.emit('message', {
    username: 'System',
    text: `Users in ${user.room}: ${userList}`,
    time: new Date().toLocaleTimeString()
  });
}

module.exports = {
  processCommand
};
const { isAdmin } = require('./auth');

// Process chat commands
const processCommand = (command, username, socket, io) => {
  const cmd = command.toLowerCase().trim();
  
  switch (cmd) {
    case '/exit':
    case '/quit':
      return {
        type: 'disconnect',
        message: `${username} left the chat using ${cmd} command`
      };
    
    case '/shutdown':
      if (isAdmin(username)) {
        return {
          type: 'shutdown',
          message: 'Admin initiated server shutdown'
        };
      } else {
        return {
          type: 'error',
          message: 'Only administrators can use the shutdown command'
        };
      }
    
    case '/help':
      return {
        type: 'help',
        message: `Available commands:
        /exit or /quit - Leave the chat
        /help - Show this help message
        ${isAdmin(username) ? '/shutdown - Shutdown the server (Admin only)' : ''}`
      };
    
    default:
      return {
        type: 'unknown',
        message: `Unknown command: ${command}. Type /help for available commands.`
      };
  }
};

// Execute server shutdown with countdown
const executeShutdown = (io) => {
  let countdown = 10;
  
  const shutdownTimer = setInterval(() => {
    io.emit('message', {
      username: 'System',
      text: `Server shutting down in ${countdown} seconds...`,
      time: new Date().toLocaleTimeString()
    });
    
    countdown--;
    
    if (countdown < 0) {
      clearInterval(shutdownTimer);
      io.emit('message', {
        username: 'System',
        text: 'Server is shutting down now!',
        time: new Date().toLocaleTimeString()
      });
      
      // Disconnect all clients
      io.disconnectSockets();
      
      // Exit the process after a brief delay
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }
  }, 1000);
};

module.exports = {
  processCommand,
  executeShutdown
};
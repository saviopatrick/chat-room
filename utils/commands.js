const { isAdmin } = require('./auth');

/**
 * Process chat commands
 * @param {string} message - The message to process
 * @param {Object} user - User object
 * @param {Function} socket - Socket instance
 * @param {Function} io - Socket.IO instance
 * @returns {Object} - Command result
 */
function processCommand(message, user, socket, io) {
  const command = message.toLowerCase().trim();
  
  switch (command) {
    case '/exit':
    case '/quit':
      return {
        type: 'disconnect',
        message: `${user.username} has left the chat`,
        disconnect: true
      };
    
    case '/shutdown':
      if (isAdmin(user.username)) {
        return {
          type: 'shutdown',
          message: 'Server shutdown initiated by admin. Disconnecting all users in 10 seconds...',
          shutdown: true
        };
      } else {
        return {
          type: 'error',
          message: 'You do not have permission to shutdown the server.',
          error: true
        };
      }
    
    default:
      return {
        type: 'invalid',
        message: 'Invalid command. Available commands: /exit, /quit' + (isAdmin(user.username) ? ', /shutdown' : ''),
        error: true
      };
  }
}

/**
 * Check if message is a command
 * @param {string} message - Message to check
 * @returns {boolean} - True if command, false otherwise
 */
function isCommand(message) {
  return message.startsWith('/');
}

/**
 * Initialize server shutdown sequence
 * @param {Function} io - Socket.IO instance
 * @param {Function} server - HTTP server instance
 */
function initiateShutdown(io, server) {
  let countdown = 10;
  
  const countdownInterval = setInterval(() => {
    io.emit('message', {
      username: 'System',
      text: `Server shutting down in ${countdown} seconds...`,
      time: new Date().toLocaleTimeString()
    });
    
    countdown--;
    
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      io.emit('message', {
        username: 'System',
        text: 'Server is shutting down now.',
        time: new Date().toLocaleTimeString()
      });
      
      // Disconnect all clients
      io.disconnectSockets();
      
      // Close server
      setTimeout(() => {
        server.close(() => {
          console.log('Server has been shut down.');
          process.exit(0);
        });
      }, 1000);
    }
  }, 1000);
}

module.exports = {
  processCommand,
  isCommand,
  initiateShutdown
};
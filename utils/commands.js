const { isAdmin } = require('./auth');

// Process chat commands
function processCommand(message, user, io) {
  const command = message.trim().toLowerCase();
  
  switch (command) {
    case 'exit':
    case 'quit':
      return {
        type: 'disconnect',
        message: `${user.username} has left the chat voluntarily`
      };
    
    case 'shutdown':
      if (isAdmin(user.username)) {
        return {
          type: 'shutdown',
          message: 'System shutdown initiated by admin'
        };
      } else {
        return {
          type: 'error',
          message: 'You do not have permission to shutdown the server'
        };
      }
    
    default:
      return null; // Not a command
  }
}

// Start shutdown countdown
function startShutdownCountdown(io) {
  let countdown = 10;
  
  const countdownInterval = setInterval(() => {
    if (countdown > 0) {
      io.emit('message', {
        username: 'System',
        text: `Server shutting down in ${countdown} seconds...`,
        time: new Date().toLocaleTimeString()
      });
      countdown--;
    } else {
      clearInterval(countdownInterval);
      io.emit('message', {
        username: 'System',
        text: 'Server is shutting down now.',
        time: new Date().toLocaleTimeString()
      });
      // Give clients time to receive the message before shutdown
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }
  }, 1000);
}

module.exports = {
  processCommand,
  startShutdownCountdown
};
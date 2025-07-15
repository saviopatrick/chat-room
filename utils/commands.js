const formatMessage = require('./messages');

class CommandHandler {
  constructor(io, authManager) {
    this.io = io;
    this.authManager = authManager;
    this.shutdownTimer = null;
  }

  processCommand(socket, user, message) {
    const trimmedMessage = message.trim().toLowerCase();
    
    // Comando exit/quit
    if (trimmedMessage === '/exit' || trimmedMessage === '/quit') {
      this.handleExit(socket, user);
      return true;
    }
    
    // Comando shutdown (apenas admin)
    if (trimmedMessage === '/shutdown' && this.authManager.isAdmin(user.username)) {
      this.handleShutdown(socket, user);
      return true;
    }
    
    // Comando help
    if (trimmedMessage === '/help') {
      this.handleHelp(socket);
      return true;
    }
    
    // Comando users (listar usuários online)
    if (trimmedMessage === '/users') {
      this.handleUsers(socket);
      return true;
    }
    
    return false;
  }

  handleExit(socket, user) {
    socket.emit('message', formatMessage('Sistema', 'Você saiu da sala.'));
    socket.disconnect();
  }

  handleShutdown(socket, user) {
    if (this.shutdownTimer) {
      socket.emit('message', formatMessage('Sistema', 'Shutdown já está em andamento.'));
      return;
    }

    // Avisar todos os clientes
    this.io.emit('message', formatMessage('Sistema', 'ATENÇÃO: Servidor será desligado em 10 segundos!'));
    
    let countdown = 10;
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        this.io.emit('message', formatMessage('Sistema', `Servidor será desligado em ${countdown} segundos...`));
      } else {
        clearInterval(countdownInterval);
        this.io.emit('message', formatMessage('Sistema', 'Servidor desligando...'));
        
        // Desconectar todos os clientes
        setTimeout(() => {
          this.io.disconnectSockets();
          process.exit(0);
        }, 1000);
      }
    }, 1000);

    this.shutdownTimer = countdownInterval;
  }

  handleHelp(socket) {
    const helpMessage = `
Comandos disponíveis:
/help - Mostra esta mensagem
/users - Lista usuários online
/exit ou /quit - Sair da sala
/shutdown - Desligar servidor (apenas admin)
    `;
    socket.emit('message', formatMessage('Sistema', helpMessage));
  }

  handleUsers(socket) {
    // Implementar listagem de usuários online
    const connectedUsers = Array.from(this.io.sockets.sockets.values())
      .filter(s => s.user)
      .map(s => s.user.username);
    
    const userList = connectedUsers.length > 0 
      ? `Usuários online: ${connectedUsers.join(', ')}`
      : 'Nenhum usuário online';
    
    socket.emit('message', formatMessage('Sistema', userList));
  }
}

module.exports = CommandHandler;
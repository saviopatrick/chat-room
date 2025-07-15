const fs = require('fs');
const path = require('path');

class AuthManager {
  constructor() {
    this.usersFile = path.join(__dirname, '../database/users.json');
    this.loadUsers();
  }

  loadUsers() {
    try {
      const data = fs.readFileSync(this.usersFile, 'utf8');
      this.users = JSON.parse(data).users;
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      this.users = [];
    }
  }

  authenticateUser(username, password) {
    const user = this.users.find(u => u.username === username && u.password === password);
    if (user) {
      return {
        id: user.id,
        username: user.username,
        role: user.role
      };
    }
    return null;
  }

  isAdmin(username) {
    const user = this.users.find(u => u.username === username);
    return user && user.role === 'admin';
  }

  userExists(username) {
    return this.users.some(u => u.username === username);
  }
}

module.exports = AuthManager;
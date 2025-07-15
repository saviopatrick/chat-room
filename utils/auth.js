const fs = require('fs');
const path = require('path');

// Load users from JSON file
function loadUsers() {
  try {
    const usersPath = path.join(__dirname, '../database/users.json');
    const data = fs.readFileSync(usersPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading users:', error);
    return { users: [] };
  }
}

// Authenticate user
function authenticateUser(username, password) {
  const userData = loadUsers();
  const user = userData.users.find(u => u.username === username && u.password === password);
  
  if (user) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      authenticated: true
    };
  }
  
  return {
    authenticated: false,
    message: 'Invalid username or password'
  };
}

// Check if user is admin
function isAdmin(user) {
  return user && user.role === 'admin';
}

// Check if user is moderator or admin
function isModerator(user) {
  return user && (user.role === 'moderator' || user.role === 'admin');
}

module.exports = {
  authenticateUser,
  isAdmin,
  isModerator
};
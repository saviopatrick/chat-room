const fs = require('fs');
const path = require('path');

// Load users from JSON file
function loadUsers() {
  const usersPath = path.join(__dirname, '../database/users.json');
  const data = fs.readFileSync(usersPath, 'utf8');
  return JSON.parse(data);
}

// Validate user credentials
function validateUser(username, password) {
  const usersData = loadUsers();
  const user = usersData.users.find(u => u.username === username && u.password === password);
  return user || null;
}

// Check if user is admin
function isAdmin(username) {
  const usersData = loadUsers();
  const user = usersData.users.find(u => u.username === username);
  return user && user.role === 'admin';
}

// Get user by username
function getUserByUsername(username) {
  const usersData = loadUsers();
  return usersData.users.find(u => u.username === username);
}

module.exports = {
  validateUser,
  isAdmin,
  getUserByUsername
};
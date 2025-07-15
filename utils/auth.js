const fs = require('fs');
const path = require('path');

// Load users from JSON file
const usersPath = path.join(__dirname, '../database/users.json');
let users = [];

try {
  const data = fs.readFileSync(usersPath, 'utf8');
  users = JSON.parse(data);
} catch (error) {
  console.error('Error loading users database:', error.message);
}

/**
 * Validate user credentials
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Object|null} - User object if valid, null if invalid
 */
function validateUser(username, password) {
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Object|null} - User object if found, null if not found
 */
function getUserByUsername(username) {
  return users.find(u => u.username === username) || null;
}

/**
 * Check if user is admin
 * @param {string} username - Username
 * @returns {boolean} - True if admin, false otherwise
 */
function isAdmin(username) {
  const user = getUserByUsername(username);
  return user ? user.role === 'admin' : false;
}

module.exports = {
  validateUser,
  getUserByUsername,
  isAdmin
};
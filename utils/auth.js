const fs = require('fs');
const path = require('path');

// Load users from JSON file
const getUsersFromFile = () => {
  try {
    const usersFile = path.join(__dirname, '../database/users.json');
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading users:', error);
    return { users: [] };
  }
};

// Validate user credentials
const validateCredentials = (username, password) => {
  const userData = getUsersFromFile();
  const user = userData.users.find(u => u.username === username && u.password === password);
  
  if (user) {
    return {
      isValid: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  }
  
  return {
    isValid: false,
    user: null
  };
};

// Check if user is admin
const isAdmin = (username) => {
  const userData = getUsersFromFile();
  const user = userData.users.find(u => u.username === username);
  return user && user.role === 'admin';
};

// Get user by username
const getUserByUsername = (username) => {
  const userData = getUsersFromFile();
  const user = userData.users.find(u => u.username === username);
  return user || null;
};

module.exports = {
  validateCredentials,
  isAdmin,
  getUserByUsername
};
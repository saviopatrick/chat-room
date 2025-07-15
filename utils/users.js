const users = [];
const MAX_USERS = 10;

// Join user to chat
function userJoin(id, username, room, role = 'user') {
  // Check if room is at capacity
  if (users.length >= MAX_USERS) {
    return null;
  }
  
  const user = { id, username, room, role };

  users.push(user);

  return user;
}

// Get current user
function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

// User leaves chat
function userLeave(id) {
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

// Get room users
function getRoomUsers(room) {
  return users.filter(user => user.room === room);
}

// Get total number of users
function getTotalUsers() {
  return users.length;
}

// Check if room is full
function isRoomFull() {
  return users.length >= MAX_USERS;
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  getTotalUsers,
  isRoomFull
};

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Allowed file types
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'text/plain', 'application/pdf'];
const maxFileSize = 5 * 1024 * 1024; // 5MB

// Generate unique filename
function generateFilename(originalName) {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  return `${hash}${ext}`;
}

// Validate file
function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  if (file.size > maxFileSize) {
    return { valid: false, error: 'File size too large (max 5MB)' };
  }
  
  return { valid: true };
}

// Save file to uploads directory
function saveFile(file, username) {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const filename = generateFilename(file.originalname);
  const filepath = path.join(__dirname, '../uploads', filename);
  
  fs.writeFileSync(filepath, file.buffer);
  
  return {
    filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    uploadedBy: username,
    uploadedAt: new Date().toISOString()
  };
}

// Get file info
function getFileInfo(filename) {
  const filepath = path.join(__dirname, '../uploads', filename);
  
  if (!fs.existsSync(filepath)) {
    return null;
  }
  
  const stats = fs.statSync(filepath);
  return {
    filename,
    size: stats.size,
    uploadedAt: stats.mtime
  };
}

// Check if file is image
function isImage(mimetype) {
  return mimetype && mimetype.startsWith('image/');
}

module.exports = {
  saveFile,
  getFileInfo,
  isImage,
  validateFile
};
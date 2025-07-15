const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and common file types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Handle file upload
function handleFileUpload(req, res, io, user) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileInfo = {
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    uploadedBy: user.username,
    uploadedAt: new Date().toISOString()
  };
  
  // Save file info to a log
  const logPath = path.join(__dirname, '../uploads/files.log');
  fs.appendFileSync(logPath, JSON.stringify(fileInfo) + '\n');
  
  // Emit file message to all users in the room
  io.to(user.room).emit('fileMessage', {
    username: user.username,
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    time: new Date().toLocaleTimeString()
  });
  
  res.json({ 
    success: true, 
    filename: req.file.filename,
    originalname: req.file.originalname 
  });
}

// Get file info
function getFileInfo(filename) {
  const filePath = path.join(__dirname, '../uploads', filename);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const stats = fs.statSync(filePath);
  return {
    filename: filename,
    size: stats.size,
    created: stats.birthtime
  };
}

// Check if file is an image
function isImage(mimetype) {
  return mimetype.startsWith('image/');
}

module.exports = {
  upload,
  handleFileUpload,
  getFileInfo,
  isImage
};
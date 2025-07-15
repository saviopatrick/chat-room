const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Criar diretório de uploads se não existir
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

class FileHandler {
  constructor() {
    this.uploadMiddleware = upload.single('file');
  }

  handleFileUpload(req, res, io, user) {
    this.uploadMiddleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const fileInfo = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedBy: user.username,
        uploadedAt: new Date().toISOString()
      };

      // Enviar informação do arquivo para todos os clientes
      io.emit('fileShared', {
        user: user.username,
        file: fileInfo,
        message: `${user.username} compartilhou um arquivo: ${fileInfo.originalName}`
      });

      res.json({ 
        success: true, 
        message: 'Arquivo enviado com sucesso!',
        file: fileInfo 
      });
    });
  }

  getFilePath(filename) {
    return path.join(uploadsDir, filename);
  }

  fileExists(filename) {
    return fs.existsSync(this.getFilePath(filename));
  }
}

module.exports = FileHandler;
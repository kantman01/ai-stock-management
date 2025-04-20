const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');


const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'products');


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    
    const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFileName);
  }
});


const fileFilter = (req, file, cb) => {
  
  const allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP formats are accepted.'), false);
  }
};


const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 5 * 1024 * 1024 
  }
});


exports.uploadProductImage = [
  upload.single('image'), 
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Please select an image.' });
      }
      
      
      const fileRelativePath = `/uploads/products/${req.file.filename}`;
      
      
      const serverPort = process.env.PORT || 3000;
      const serverBaseUrl = process.env.API_BASE_URL || `http://localhost:${serverPort}`;
      
      
      const fullImageUrl = `${serverBaseUrl}${fileRelativePath}`;
      
      
      res.json({
        imageUrl: fileRelativePath, 
        fullImageUrl: fullImageUrl, 
        message: 'Image uploaded successfully.'
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: 'An error occurred while uploading the image.' });
    }
  }
];


exports.handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum 5MB allowed.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  
  
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  
  next();
}; 
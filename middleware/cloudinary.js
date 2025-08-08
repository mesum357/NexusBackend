const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate Cloudinary configuration
const validateCloudinaryConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  
  if (!cloud_name || cloud_name === 'your_cloudinary_cloud_name_here') {
    throw new Error('CLOUDINARY_CLOUD_NAME is not properly configured');
  }
  if (!api_key || api_key === 'your_cloudinary_api_key_here') {
    throw new Error('CLOUDINARY_API_KEY is not properly configured');
  }
  if (!api_secret || api_secret === 'your_cloudinary_api_secret_here') {
    throw new Error('CLOUDINARY_API_SECRET is not properly configured');
  }
  
  return true;
};

// Configure storage for different types of uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // Different folders for different types of images
    let folder = 'pak-nexus/general';
    let transformation = [{ quality: 'auto', fetch_format: 'auto' }];
    
    if (file.fieldname === 'gallery') {
      folder = 'pak-nexus/gallery';
      transformation = [
        { width: 1200, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
      ];
    } else if (file.fieldname === 'image' || file.fieldname === 'facultyImages') {
      folder = 'pak-nexus/faculty';
      transformation = [
        { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }
      ];
    } else if (file.fieldname === 'logo') {
      folder = 'pak-nexus/logos';
      transformation = [
        { width: 200, height: 200, crop: 'fit', quality: 'auto', fetch_format: 'auto' }
      ];
    } else if (file.fieldname === 'banner') {
      folder = 'pak-nexus/banners';
      transformation = [
        { width: 1200, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto' }
      ];
    }
    
    return {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: transformation,
      public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    };
  },
});

// Create upload middleware with error handling
let upload;
try {
  // Validate configuration before creating upload middleware
  validateCloudinaryConfig();
  
  upload = multer({ 
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  });
  
  console.log('✅ Cloudinary configured successfully');
} catch (error) {
  console.error('❌ Cloudinary configuration error:', error.message);
  
  // Create fallback local storage
  const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../uploads');
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const path = require('path');
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  
  upload = multer({ 
    storage: localStorage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(require('path').extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'));
      }
    }
  });
  
  console.log('⚠️  Using local storage fallback due to Cloudinary configuration issues');
}

module.exports = { upload, cloudinary, validateCloudinaryConfig };

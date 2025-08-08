const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a local file to Cloudinary
 * @param {string} localPath - Path to local file
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} Cloudinary URL
 */
const uploadLocalFileToCloudinary = async (localPath, folder = 'pak-nexus') => {
  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder: folder,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

/**
 * Check if a URL is a Cloudinary URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
const isCloudinaryUrl = (url) => {
  return url && (url.includes('cloudinary.com') || url.includes('res.cloudinary.com'));
};

/**
 * Check if a path is a local uploads path
 * @param {string} path - Path to check
 * @returns {boolean}
 */
const isLocalUploadsPath = (path) => {
  return path && path.startsWith('/uploads/');
};

module.exports = {
  uploadLocalFileToCloudinary,
  isCloudinaryUrl,
  isLocalUploadsPath
};

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Institute = require('../models/Institute');
const Review = require('../models/Review');
const { ensureAuthenticated } = require('../middleware/auth');
const { upload, cloudinary, validateCloudinaryConfig } = require('../middleware/cloudinary');
const StudentApplication = require('../models/StudentApplication');
const InstituteNotification = require('../models/InstituteNotification');
const InstituteMessage = require('../models/InstituteMessage');
const InstituteTask = require('../models/InstituteTask');
const PatientApplication = require('../models/PatientApplication');

// File filter for image uploads
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Configure upload with cloudinary and file filter
const uploadWithFilter = multer({
  storage: upload.storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Create new institute
router.post('/create', (req, res, next) => {
  console.log('POST /create route hit');
  console.log('User authenticated:', req.isAuthenticated());
  console.log('User:', req.user);
  next();
}, ensureAuthenticated, uploadWithFilter.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
  { name: 'facultyImages', maxCount: 20 }
]), async (req, res) => {
  try {
    console.log('Institute creation request received');
    console.log('Files:', req.files);
    console.log('Body:', req.body);

    const {
      name,
      type,
      city,
      province,
      description,
      specialization,
      phone,
      email,
      website,
      address,
      facebook,
      instagram,
      twitter,
      linkedin,
      courses,
      faculty,
      totalStudents,
      totalCourses,
      admissionStatus,
      establishedYear,
      accreditation,
      facilities,
      ownerName,
      ownerEmail,
      ownerPhone
    } = req.body;

    // Validate required fields
    if (!name || !type || !city || !province) {
      return res.status(400).json({ error: 'Name, type, city, and province are required' });
    }

    // Parse JSON fields with better error handling
    let parsedCourses = [];
    let parsedFaculty = [];
    let parsedAccreditation = [];
    let parsedFacilities = [];

    console.log('Raw courses from request:', courses);
    console.log('Raw faculty from request:', faculty);
    console.log('Raw accreditation from request:', accreditation);
    console.log('Raw facilities from request:', facilities);
    console.log('Courses type:', typeof courses);
    console.log('Courses length:', courses ? courses.length : 'undefined');

    // Helper function to safely parse JSON
    const safeJsonParse = (value, fieldName) => {
      if (!value || value.trim() === '') {
        return [];
      }
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error(`Error parsing ${fieldName}:`, error);
        console.error(`${fieldName} value:`, value);
        return [];
      }
    };

    parsedCourses = safeJsonParse(courses, 'courses');
    parsedFaculty = safeJsonParse(faculty, 'faculty');
    parsedAccreditation = safeJsonParse(accreditation, 'accreditation');
    parsedFacilities = safeJsonParse(facilities, 'facilities');

    console.log('Parsed courses:', parsedCourses);
    console.log('Parsed faculty:', parsedFaculty);
    console.log('Parsed accreditation:', parsedAccreditation);
    console.log('Parsed facilities:', parsedFacilities);

    // Handle file uploads
    let logoPath = '';
    let bannerPath = '';
    let galleryPaths = [];

    if (req.files.logo) {
      logoPath = req.files.logo[0].path; // Cloudinary URL
    }

    if (req.files.banner) {
      bannerPath = req.files.banner[0].path; // Cloudinary URL
    }

    if (req.files.gallery) {
      galleryPaths = req.files.gallery.map(file => file.path); // Cloudinary URLs
    }

    // Process faculty images
    const facultyImages = req.files.facultyImages || [];
    const updatedFaculty = parsedFaculty || [];

    // Create institute data
    const instituteData = {
      name,
      type,
      location: address || `${city}, ${province}`, // Use address as location or create from city/province
      city,
      province,
      description: description || '',
      specialization: specialization || '',
      logo: logoPath,
      banner: bannerPath,
      gallery: galleryPaths,
      phone: phone || '',
      email: email || '',
      website: website || '',
      address: address || '',
      facebook: facebook || '',
      instagram: instagram || '',
      twitter: twitter || '',
      linkedin: linkedin || '',
      courses: parsedCourses,
      faculty: updatedFaculty,
      totalStudents: totalStudents || '0',
      totalCourses: totalCourses || '0',
      admissionStatus: admissionStatus || 'Open',
      establishedYear: establishedYear ? parseInt(establishedYear) : null,
      accreditation: parsedAccreditation,
      facilities: parsedFacilities,
      owner: req.user._id,
      ownerName: req.user.username || req.user.email || '',
      ownerEmail: req.user.email || '',
      ownerPhone: req.user.phone || '',
      verified: false,
      rating: 4.5,
      totalReviews: 0
    };
    // Allow frontend to set domain; default to education
    if (req.body.domain && ['education','healthcare'].includes(req.body.domain)) {
      instituteData.domain = req.body.domain;
    }

    console.log('Creating institute with data:', instituteData);

    let savedInstitute;
    try {
      // Create and save the institute
      const institute = new Institute(instituteData);
      savedInstitute = await institute.save();

      console.log('Institute created successfully:', savedInstitute._id);
    } catch (saveError) {
      console.error('Error saving institute:', saveError);
      return res.status(400).json({ 
        error: 'Failed to save institute', 
        details: saveError.message 
      });
    }

    res.status(201).json({
      success: true,
      message: 'Institute created successfully and is pending admin approval',
      institute: savedInstitute
    });

  } catch (error) {
    console.error('Error creating institute:', error);
    res.status(500).json({
      error: 'Failed to create institute',
      details: error.message
    });
  }
});

// Get all institutes
router.get('/all', async (req, res) => {
  try {
    // Filter by optional domain query param: education (default) or healthcare
    const { domain } = req.query;
    const query = { approvalStatus: 'approved' }; // Only show approved institutes
    if (domain === 'education') {
      query.domain = 'education';
    } else if (domain === 'healthcare') {
      query.domain = 'healthcare';
    }
    const institutes = await Institute.find(query);
    res.json({ institutes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get institutes owned by current user
router.get('/my-institutes', ensureAuthenticated, async (req, res) => {
  try {
    const institutes = await Institute.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ institutes });
  } catch (error) {
    console.error('Error fetching user institutes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending institutes for current user
router.get('/my-pending-institutes', ensureAuthenticated, async (req, res) => {
  try {
    const pendingInstitutes = await Institute.find({ 
      owner: req.user._id, 
      approvalStatus: 'pending' 
    }).sort({ createdAt: -1 });
    res.json({ pendingInstitutes });
  } catch (error) {
    console.error('Error fetching pending institutes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single institute by ID
router.get('/:id', async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    
    // Check if user is owner or admin, or if institute is approved
    const isOwner = req.isAuthenticated() && institute.owner.toString() === req.user._id.toString();
    const isAdmin = req.isAuthenticated() && req.user.isAdmin;
    
    if (!isOwner && !isAdmin && institute.approvalStatus !== 'approved') {
      return res.status(404).json({ error: 'Institute not found' });
    }
    
    res.json({ institute });
  } catch (error) {
    console.error('Error fetching institute:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get gallery images
router.get('/:id/gallery', async (req, res) => {
  try {
    console.log('GET /gallery route hit for institute ID:', req.params.id);
    
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid ObjectId format:', req.params.id);
      return res.status(400).json({ error: 'Invalid institute ID format' });
    }
    
    const institute = await Institute.findById(req.params.id);
    console.log('Institute found:', institute ? institute.name : 'null');
    
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    
    return res.status(200).json({ gallery: institute.gallery || [] });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    console.error('Error details:', error.message);
    return res.status(500).json({ error: 'Failed to fetch gallery', details: error.message });
  }
});



// Add gallery images (owner only) - supports multiple files
const galleryUpload = upload.array('gallery', 10);
router.post('/:id/gallery', ensureAuthenticated, (req, res, next) => {
  galleryUpload(req, res, function (err) {
    if (err) {
      console.error('Error during image upload middleware:', err);
      return res.status(500).json({ error: 'Image upload failed', details: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('POST /gallery route hit for institute ID:', req.params.id);
    console.log('Request files:', req.files);
    console.log('Request body:', req.body);
    console.log('Authenticated user:', req.user);

    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid ObjectId format:', req.params.id);
      return res.status(400).json({ error: 'Invalid institute ID format' });
    }

    const institute = await Institute.findById(req.params.id);
    console.log('Institute found:', institute ? institute.name : 'null');
    
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    
    if (!req.user || String(institute.owner) !== String(req.user._id)) {
      console.log('Authorization failed. Institute owner:', institute.owner, 'User ID:', req.user ? req.user._id : 'null');
      return res.status(403).json({ error: 'You are not authorized to modify this institute' });
    }

    console.log('Files received:', req.files);
    const newImages = (req.files || []).map(f => {
      console.log('Processing file:', f.originalname, 'Path:', f.path);
      
      // Check if using Cloudinary or local storage
      let imagePath = f.path;
      if (imagePath && !imagePath.startsWith('http')) {
        const filename = require('path').basename(imagePath);
        imagePath = `/uploads/${filename}`;
        console.log('Using local storage URL:', imagePath);
      } else {
        console.log('Using Cloudinary URL:', imagePath);
      }
      
      return imagePath;
    });
    
    if (!newImages.length) {
      console.log('No images provided in request');
      return res.status(400).json({ error: 'No images provided' });
    }
    
    console.log('Adding images to gallery:', newImages);
    institute.gallery = [...(institute.gallery || []), ...newImages];
    await institute.save();
    
    console.log('Gallery updated successfully');
    return res.status(200).json({ success: true, images: newImages, gallery: institute.gallery });
  } catch (error) {
    console.error('Error adding gallery images:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Failed to add images to gallery', details: error.message });
  }
});

// Remove gallery image by URL (owner only)
router.delete('/:id/gallery', ensureAuthenticated, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    console.log('DELETE /gallery route hit for institute ID:', req.params.id);
    console.log('Image URL to delete:', imageUrl);
    
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    if (!req.user || String(institute.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to modify this institute' });
    }
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // Delete from Cloudinary if it's a Cloudinary URL
    if (imageUrl.includes('cloudinary.com')) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split('.')[0];
        
        console.log('Deleting from Cloudinary, public_id:', publicId);
        await cloudinary.uploader.destroy(`pak-nexus/gallery/${publicId}`);
        console.log('Successfully deleted from Cloudinary');
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue anyway - remove from database even if Cloudinary deletion fails
      }
    }
    
    // Remove from database
    institute.gallery = (institute.gallery || []).filter(img => img !== imageUrl);
    await institute.save();
    
    console.log('Image removed from gallery successfully');
    return res.status(200).json({ success: true, gallery: institute.gallery });
  } catch (error) {
    console.error('Error removing gallery image:', error);
    return res.status(500).json({ error: 'Failed to remove image from gallery' });
  }
});

// Get faculty members
router.get('/:id/faculty', async (req, res) => {
  try {
    console.log('GET /faculty route hit for institute ID:', req.params.id);
    
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid ObjectId format:', req.params.id);
      return res.status(400).json({ error: 'Invalid institute ID format' });
    }
    
    const institute = await Institute.findById(req.params.id);
    console.log('Institute found:', institute ? institute.name : 'null');
    
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    
    return res.status(200).json({ faculty: institute.faculty || [] });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    console.error('Error details:', error.message);
    return res.status(500).json({ error: 'Failed to fetch faculty', details: error.message });
  }
});

// Add faculty (owner only). Accepts multipart with optional image file named 'image'
router.post('/:id/faculty', ensureAuthenticated, upload.single('image'), async (req, res) => {
  try {
    console.log('POST /faculty route hit for institute ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('Authenticated user:', req.user);

    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid ObjectId format:', req.params.id);
      return res.status(400).json({ error: 'Invalid institute ID format' });
    }

    const institute = await Institute.findById(req.params.id);
    console.log('Institute found:', institute ? institute.name : 'null');
    
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    
    if (!req.user || String(institute.owner) !== String(req.user._id)) {
      console.log('Authorization failed. Institute owner:', institute.owner, 'User ID:', req.user ? req.user._id : 'null');
      return res.status(403).json({ error: 'You are not authorized to modify this institute' });
    }

    const { name, position, qualification, experience } = req.body;
    console.log('Faculty data:', { name, position, qualification, experience });
    
    if (!name || !position || !qualification || !experience) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const image = req.file ? req.file.path : '';
    const newFaculty = { name, position, qualification, experience, image };
    
    console.log('Adding new faculty:', newFaculty);
    institute.faculty = [...(institute.faculty || []), newFaculty];
    await institute.save();

    const created = institute.faculty[institute.faculty.length - 1];
    console.log('Faculty added successfully:', created);
    return res.status(201).json({ success: true, faculty: created, facultyList: institute.faculty });
  } catch (error) {
    console.error('Error adding faculty:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Failed to add faculty member', details: error.message });
  }
});

// Remove faculty by subdocument id (owner only)
router.delete('/:id/faculty/:facultyId', ensureAuthenticated, async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    if (!req.user || String(institute.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to modify this institute' });
    }

    const { facultyId } = req.params;
    const before = (institute.faculty || []).length;
    institute.faculty = (institute.faculty || []).filter(f => String(f._id) !== String(facultyId));
    if (institute.faculty.length === before) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }
    await institute.save();
    return res.status(200).json({ success: true, facultyList: institute.faculty });
  } catch (error) {
    console.error('Error removing faculty:', error);
    return res.status(500).json({ error: 'Failed to remove faculty member' });
  }
});

// Update institute (owner only)
router.put('/:id', ensureAuthenticated, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
  { name: 'facultyImages', maxCount: 20 }
]), async (req, res) => {
  try {
    console.log('Update institute request received')
    console.log('Institute ID:', req.params.id)
    console.log('User:', req.user)
    console.log('Request body:', req.body)
    console.log('Request files:', req.files)
    
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
      console.log('Institute not found')
      return res.status(404).json({ error: 'Institute not found' });
    }
    console.log('Institute found:', institute.name)
    console.log('Institute owner:', institute.owner)
    console.log('Current user:', req.user._id)
    
    if (!req.user || String(institute.owner) !== String(req.user._id)) {
      console.log('Authorization failed')
      return res.status(403).json({ error: 'You are not authorized to update this institute' });
    }
    // Handle file uploads and update data
    if (req.files && req.files.logo) {
      institute.logo = req.files.logo[0].path; // Cloudinary URL
    }
    if (req.files && req.files.banner) {
      institute.banner = req.files.banner[0].path; // Cloudinary URL
    }
    if (req.files && req.files.gallery) {
      institute.gallery = req.files.gallery.map(file => file.path); // Cloudinary URLs
    }
    // Update other fields
    console.log('Updating institute with body:', req.body)
    
    // Clean and validate the data before updating
    const updateData = { ...req.body }
    
    // Convert numeric fields to strings if needed
    if (updateData.totalStudents && typeof updateData.totalStudents === 'number') {
      updateData.totalStudents = updateData.totalStudents.toString()
    }
    if (updateData.totalCourses && typeof updateData.totalCourses === 'number') {
      updateData.totalCourses = updateData.totalCourses.toString()
    }
    
    // Ensure admissionStatus is valid
    if (updateData.admissionStatus && !['Open', 'Closed', 'Coming Soon'].includes(updateData.admissionStatus)) {
      updateData.admissionStatus = 'Open'
    }
    
    // Remove fields that shouldn't be updated
    delete updateData._id
    delete updateData.__v
    delete updateData.owner
    delete updateData.createdAt
    delete updateData.updatedAt
    delete updateData.courses // Remove courses field as we're using specialization
    
    // Handle array fields that might be sent as empty strings or JSON strings
    if (updateData.faculty === '' || updateData.faculty === '[]') {
      updateData.faculty = []
    }
    if (updateData.gallery === '' || updateData.gallery === '[]') {
      updateData.gallery = []
    }
    if (updateData.accreditation === '' || updateData.accreditation === '[]') {
      updateData.accreditation = []
    }
    if (updateData.facilities === '' || updateData.facilities === '[]') {
      updateData.facilities = []
    }
    
    console.log('Cleaned update data:', updateData)
    Object.assign(institute, updateData);
    console.log('Institute after update:', institute)
    await institute.save();
    console.log('Institute saved successfully')
    res.json({ success: true, message: 'Institute updated successfully', institute });
  } catch (error) {
    console.error('Error updating institute:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ error: error.message });
  }
});

// Delete institute (owner only)
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    
    // Check if user is the owner
    if (!req.user || String(institute.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to delete this institute' });
    }
    
    // Delete all reviews associated with this institute
    await Review.deleteMany({ institute: req.params.id });
    
    // Delete the institute
    await Institute.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Institute deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting institute:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reviews for an institute
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ institute: req.params.id })
      .populate('reviewer', 'username fullName email profileImage city')
      .sort({ createdAt: -1 });
    
    res.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a review to an institute
router.post('/:id/reviews', ensureAuthenticated, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || !comment) {
      return res.status(400).json({ error: 'Rating and comment are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if user already reviewed this institute
    const existingReview = await Review.findOne({
      institute: req.params.id,
      reviewer: req.user._id
    });
    
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this institute' });
    }
    
    const review = new Review({
      institute: req.params.id,
      reviewer: req.user._id,
      rating,
      comment
    });
    
    await review.save();
    
    // Update institute's average rating
    const institute = await Institute.findById(req.params.id);
    if (institute) {
      const allReviews = await Review.find({ institute: req.params.id });
      const totalRating = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
      institute.rating = totalRating / allReviews.length;
      institute.totalReviews = allReviews.length;
      await institute.save();
    }
    
    // Populate reviewer info for response
    await review.populate('reviewer', 'username fullName email profileImage city');
    
    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a review
router.put('/:id/reviews/:reviewId', ensureAuthenticated, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (String(review.reviewer) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only edit your own reviews' });
    }
    
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    
    await review.save();
    
    // Update institute's average rating
    const institute = await Institute.findById(req.params.id);
    if (institute) {
      const allReviews = await Review.find({ institute: req.params.id });
      const totalRating = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
      institute.rating = totalRating / allReviews.length;
      await institute.save();
    }
    
    await review.populate('reviewer', 'username fullName email profileImage city');
    
    res.json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a review
router.delete('/:id/reviews/:reviewId', ensureAuthenticated, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (String(review.reviewer) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }
    
    await Review.findByIdAndDelete(req.params.reviewId);
    
    // Update institute's average rating
    const institute = await Institute.findById(req.params.id);
    if (institute) {
      const allReviews = await Review.find({ institute: req.params.id });
      if (allReviews.length > 0) {
        const totalRating = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
        institute.rating = totalRating / allReviews.length;
      } else {
        institute.rating = 0;
      }
      institute.totalReviews = allReviews.length;
      await institute.save();
    }
    
    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to debug gallery upload issues
router.post('/:id/gallery-test', ensureAuthenticated, async (req, res) => {
  try {
    console.log('POST /gallery-test route hit');
    console.log('Authenticated user:', req.user);
    return res.status(200).json({ success: true, message: 'Authentication working' });
  } catch (error) {
    console.error('Error in gallery-test:', error);
    return res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Test endpoint with upload middleware
router.post('/:id/gallery-upload-test', ensureAuthenticated, upload.array('gallery', 10), async (req, res) => {
  try {
    console.log('POST /gallery-upload-test route hit');
    console.log('Authenticated user:', req.user);
    console.log('Files:', req.files);
    return res.status(200).json({ 
      success: true, 
      message: 'Upload middleware working',
      filesCount: req.files ? req.files.length : 0
    });
  } catch (error) {
    console.error('Error in gallery-upload-test:', error);
    return res.status(500).json({ error: 'Upload test failed', details: error.message });
  }
});

module.exports = router; 
 
// Apply Now: submit a student application with optional profile image
router.post('/:id/apply', ensureAuthenticated, upload.single('profileImage'), async (req, res) => {
  try {
    const instituteId = req.params.id;
    const { studentName, fatherName, cnic, city, courseName, courseDuration } = req.body;

    if (!studentName || !fatherName || !cnic || !city || !courseName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate institute exists
    const institute = await Institute.findById(instituteId);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    const applicationData = {
      institute: instituteId,
      user: req.user?._id,
      studentName,
      fatherName,
      cnic,
      city,
      courseName,
      courseDuration: courseDuration || '',
      profileImage: req.file ? req.file.path : '',
    };

    const application = await StudentApplication.create(applicationData);
    return res.status(201).json({ success: true, application });
  } catch (error) {
    console.error('Error submitting application:', error);
    return res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get current user's applications
router.get('/:id/applications/me', ensureAuthenticated, async (req, res) => {
  try {
    const instituteId = req.params.id;
    const apps = await StudentApplication.find({ institute: instituteId, user: req.user._id }).sort({ createdAt: -1 });
    return res.json({ applications: apps });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get all applications for current user across all institutes
router.get('/applications/my', ensureAuthenticated, async (req, res) => {
  try {
    const applications = await StudentApplication.find({ user: req.user._id })
      .populate('institute', 'name logo city type')
      .sort({ createdAt: -1 });
    
    return res.json({ applications });
  } catch (error) {
    console.error('Error fetching user applications:', error);
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get all applications for an institute (admin only)
router.get('/:id/applications', ensureAuthenticated, async (req, res) => {
  try {
    const instituteId = req.params.id;
    
    // Check if user is the owner of the institute
    const institute = await Institute.findById(instituteId);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    
    if (String(institute.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized: Only institute owner can view applications' });
    }
    
    const applications = await StudentApplication.find({ institute: instituteId })
      .populate('user', 'username email profileImage')
      .sort({ createdAt: -1 });
    
    return res.json({ applications });
  } catch (error) {
    console.error('Error fetching institute applications:', error);
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Update application status (approve/reject) - admin only
router.put('/:id/applications/:applicationId/status', ensureAuthenticated, async (req, res) => {
  try {
    const { id: instituteId, applicationId } = req.params;
    const { status } = req.body;
    
    if (!['accepted', 'rejected', 'review'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be accepted, rejected, or review' });
    }
    
    // Check if user is the owner of the institute
    const institute = await Institute.findById(instituteId);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }
    
    if (String(institute.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized: Only institute owner can update applications' });
    }
    
    // Update the application status
    const updatedApplication = await StudentApplication.findByIdAndUpdate(
      applicationId,
      { status },
      { new: true }
    ).populate('user', 'username email profileImage');
    
    if (!updatedApplication) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    return res.json({ 
      success: true, 
      application: updatedApplication,
      message: `Application ${status} successfully` 
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    return res.status(500).json({ error: 'Failed to update application status' });
  }
});

// Notifications: create and list
router.post('/:id/notifications', ensureAuthenticated, async (req, res) => {
  try {
    const instituteId = req.params.id;
    const { message, title } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const institute = await Institute.findById(instituteId);
    if (!institute) return res.status(404).json({ error: 'Institute not found' });
    if (String(institute.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Unauthorized' });
    const notification = await InstituteNotification.create({ institute: instituteId, message, title: title || '' });
    return res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return res.status(500).json({ error: 'Failed to create notification' });
  }
});

router.get('/:id/notifications', async (req, res) => {
  try {
    const instituteId = req.params.id;
    const items = await InstituteNotification.find({ institute: instituteId }).sort({ createdAt: -1 }).limit(50);
    return res.json({ notifications: items });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Messages: create and list
router.post('/:id/messages', ensureAuthenticated, async (req, res) => {
  try {
    const instituteId = req.params.id;
    const { senderName, message } = req.body;
    if (!senderName || !message) return res.status(400).json({ error: 'senderName and message are required' });
    const institute = await Institute.findById(instituteId);
    if (!institute) return res.status(404).json({ error: 'Institute not found' });
    if (String(institute.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Unauthorized' });
    const created = await InstituteMessage.create({ institute: instituteId, senderName, message });
    return res.status(201).json({ success: true, message: created });
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({ error: 'Failed to create message' });
  }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const instituteId = req.params.id;
    const items = await InstituteMessage.find({ institute: instituteId }).sort({ createdAt: -1 }).limit(50);
    return res.json({ messages: items });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Helper to normalize date as YYYY-MM-DD
const getYYYYMMDD = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Tasks: create today's class task (owner only)
router.post('/:id/tasks', ensureAuthenticated, async (req, res) => {
  try {
    const instituteId = req.params.id;
    const { title, description, type, date } = req.body;
    if (!title || !description || !type) {
      return res.status(400).json({ error: 'title, description and type are required' });
    }

    const institute = await Institute.findById(instituteId);
    if (!institute) return res.status(404).json({ error: 'Institute not found' });
    if (String(institute.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Unauthorized' });

    const normalizedDate = date && /\d{4}-\d{2}-\d{2}/.test(date) ? date : getYYYYMMDD();

    const created = await InstituteTask.create({
      institute: instituteId,
      title: title.trim(),
      description: description.trim(),
      type: String(type).toLowerCase(),
      date: normalizedDate
    });
    return res.status(201).json({ success: true, task: created });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

// Tasks: list tasks for a given date (default today) for an institute
router.get('/:id/tasks', async (req, res) => {
  try {
    const instituteId = req.params.id;
    const date = req.query.date && /\d{4}-\d{2}-\d{2}/.test(String(req.query.date))
      ? String(req.query.date)
      : getYYYYMMDD();
    const items = await InstituteTask.find({ institute: instituteId, date }).sort({ createdAt: -1 });
    return res.json({ tasks: items, date });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Tasks: list today's tasks across all institutes the current user applied to
router.get('/tasks/my/today', ensureAuthenticated, async (req, res) => {
  try {
    const applications = await StudentApplication.find({ user: req.user._id }).select('institute');
    let instituteIds = [...new Set(applications.map(a => String(a.institute)))];
    if (instituteIds.length === 0) {
      return res.json({ tasks: [] });
    }
    // Optional domain filter
    const { domain } = req.query;
    if (domain === 'education' || domain === 'healthcare') {
      const allowed = await Institute.find({ _id: { $in: instituteIds }, domain }).select('_id');
      instituteIds = allowed.map(i => String(i._id));
      if (instituteIds.length === 0) {
        return res.json({ tasks: [], date: getYYYYMMDD() });
      }
    }
    const date = getYYYYMMDD();
    const tasks = await InstituteTask
      .find({ institute: { $in: instituteIds }, date })
      .populate('institute', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    return res.json({ tasks, date });
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Tasks: update a task (owner only)
router.put('/:id/tasks/:taskId', ensureAuthenticated, async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const institute = await Institute.findById(id);
    if (!institute) return res.status(404).json({ error: 'Institute not found' });
    if (String(institute.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Unauthorized' });

    const updates = {};
    const allowedFields = ['title', 'description', 'type', 'date'];
    for (const key of allowedFields) {
      if (key in req.body && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.title) updates.title = String(updates.title).trim();
    if (updates.description) updates.description = String(updates.description).trim();
    if (updates.type) updates.type = String(updates.type).toLowerCase();

    const task = await InstituteTask.findOneAndUpdate(
      { _id: taskId, institute: id },
      { $set: updates },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.json({ success: true, task });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

// Tasks: delete a task (owner only)
router.delete('/:id/tasks/:taskId', ensureAuthenticated, async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const institute = await Institute.findById(id);
    if (!institute) return res.status(404).json({ error: 'Institute not found' });
    if (String(institute.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Unauthorized' });

    const result = await InstituteTask.deleteOne({ _id: taskId, institute: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Task not found' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get notifications for all institutes the current user has applied to
router.get('/notifications/my', ensureAuthenticated, async (req, res) => {
  try {
    const applications = await StudentApplication.find({ user: req.user._id }).select('institute');
    let instituteIds = [...new Set(applications.map(a => String(a.institute)))];

    if (instituteIds.length === 0) {
      return res.json({ notifications: [] });
    }

    // Optional domain filter
    const { domain } = req.query;
    if (domain === 'education' || domain === 'healthcare') {
      const allowed = await Institute.find({ _id: { $in: instituteIds }, domain }).select('_id');
      instituteIds = allowed.map(i => String(i._id));
      if (instituteIds.length === 0) {
        return res.json({ notifications: [] });
      }
    }

    const notifications = await InstituteNotification
      .find({ institute: { $in: instituteIds } })
      .populate('institute', 'name')
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({ notifications });
  } catch (error) {
    console.error('Error fetching my notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get messages for all institutes the current user has applied to
router.get('/messages/my', ensureAuthenticated, async (req, res) => {
  try {
    const applications = await StudentApplication.find({ user: req.user._id }).select('institute');
    let instituteIds = [...new Set(applications.map(a => String(a.institute)))];

    if (instituteIds.length === 0) {
      return res.json({ messages: [] });
    }

    // Optional domain filter
    const { domain } = req.query;
    if (domain === 'education' || domain === 'healthcare') {
      const allowed = await Institute.find({ _id: { $in: instituteIds }, domain }).select('_id');
      instituteIds = allowed.map(i => String(i._id));
      if (instituteIds.length === 0) {
        return res.json({ messages: [] });
      }
    }

    const messages = await InstituteMessage
      .find({ institute: { $in: instituteIds } })
      .populate('institute', 'name')
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({ messages });
  } catch (error) {
    console.error('Error fetching my messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Patient Applications: submit new patient registration (for hospitals)
router.post('/:id/patient-apply', ensureAuthenticated, async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const { patientName, fatherName, cnic, city, department } = req.body;
    
    if (!patientName || !fatherName || !cnic || !city || !department) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hospital = await Institute.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    if (hospital.domain !== 'healthcare') return res.status(400).json({ error: 'This endpoint is for healthcare institutes only' });

    // Check if patient already applied
    const existingApplication = await PatientApplication.findOne({ 
      hospital: hospitalId, 
      cnic: cnic 
    });
    
    if (existingApplication) {
      return res.status(400).json({ error: 'Patient with this CNIC has already applied' });
    }

    const application = await PatientApplication.create({
      hospital: hospitalId,
      user: req.user._id,
      patientName: patientName.trim(),
      fatherName: fatherName.trim(),
      cnic: cnic.trim(),
      city: city.trim(),
      department: department.trim(),
      profileImage: req.user.profileImage || null
    });

    return res.status(201).json({ 
      success: true, 
      application,
      message: 'Patient registration submitted successfully' 
    });
  } catch (error) {
    console.error('Error submitting patient application:', error);
    return res.status(500).json({ error: 'Failed to submit patient application' });
  }
});

// Patient Applications: get all applications for a hospital (admin only)
router.get('/:id/patient-applications', ensureAuthenticated, async (req, res) => {
  try {
    const hospitalId = req.params.id;
    
    const hospital = await Institute.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    if (String(hospital.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Unauthorized' });

    const applications = await PatientApplication.find({ hospital: hospitalId })
      .populate('user', 'username email profileImage')
      .sort({ createdAt: -1 });

    return res.json({ applications });
  } catch (error) {
    console.error('Error fetching patient applications:', error);
    return res.status(500).json({ error: 'Failed to fetch patient applications' });
  }
});

// Patient Applications: update application status (admin only)
router.put('/:id/patient-applications/:applicationId', ensureAuthenticated, async (req, res) => {
  try {
    const { id, applicationId } = req.params;
    const { status, notes } = req.body;
    
    if (!status || !['submitted', 'review', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const hospital = await Institute.findById(id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    if (String(hospital.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Unauthorized' });

    const application = await PatientApplication.findOneAndUpdate(
      { _id: applicationId, hospital: id },
      { 
        $set: { 
          status, 
          notes: notes || '',
          updatedAt: new Date()
        } 
      },
      { new: true }
    ).populate('user', 'username email profileImage');

    if (!application) return res.status(404).json({ error: 'Application not found' });

    return res.json({ 
      success: true, 
      application,
      message: `Application ${status} successfully` 
    });
  } catch (error) {
    console.error('Error updating patient application:', error);
    return res.status(500).json({ error: 'Failed to update patient application' });
  }
});

// Patient Applications: get my applications (for patients)
router.get('/patient-applications/my', ensureAuthenticated, async (req, res) => {
  try {
    const applications = await PatientApplication.find({ user: req.user._id })
      .populate('hospital', 'name city type specialization')
      .sort({ createdAt: -1 });

    return res.json({ applications });
  } catch (error) {
    console.error('Error fetching my patient applications:', error);
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
});
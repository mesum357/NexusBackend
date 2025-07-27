const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Institute = require('../models/Institute');
const Review = require('../models/Review');
const ensureAuthenticated = (req, res, next) => {
  console.log('ensureAuthenticated middleware called');
  console.log('req.isAuthenticated():', req.isAuthenticated());
  console.log('req.user:', req.user);
  if (req.isAuthenticated()) return next();
  console.log('Authentication failed, sending 401');
  res.status(401).json({ error: 'Not authenticated' });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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

const upload = multer({
  storage: storage,
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
}, ensureAuthenticated, upload.fields([
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
      logoPath = `/uploads/${req.files.logo[0].filename}`;
    }

    if (req.files.banner) {
      bannerPath = `/uploads/${req.files.banner[0].filename}`;
    }

    if (req.files.gallery) {
      galleryPaths = req.files.gallery.map(file => `/uploads/${file.filename}`);
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
      message: 'Institute created successfully',
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
    const institutes = await Institute.find();
    res.json({ institutes });
  } catch (error) {
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
    res.json({ institute });
  } catch (error) {
    console.error('Error fetching institute:', error);
    res.status(500).json({ error: error.message });
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
      institute.logo = `/uploads/${req.files.logo[0].filename}`;
    }
    if (req.files && req.files.banner) {
      institute.banner = `/uploads/${req.files.banner[0].filename}`;
    }
    if (req.files && req.files.gallery) {
      institute.gallery = req.files.gallery.map(file => `/uploads/${file.filename}`);
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
      .populate('reviewer', 'username email')
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
    await review.populate('reviewer', 'username email');
    
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
    
    await review.populate('reviewer', 'username email');
    
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

module.exports = router; 
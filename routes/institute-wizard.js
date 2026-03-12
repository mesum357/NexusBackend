const express = require('express');
const router = express.Router();
const Institute = require('../models/Institute');
const { ensureAuthenticated } = require('../middleware/auth');
const { generateInstituteAgentId } = require('../utils/agentIdGenerator');
const mongoose = require('mongoose'); // Added for MongoDB connection status check

// Create institute from wizard data (JSON) - for use after payment
router.post('/create-from-wizard', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🏫 Institute wizard creation from JSON request received');
    console.log('🏫 Request body:', req.body);
    console.log('🏫 Request headers:', req.headers);
    console.log('🏫 User authenticated:', req.user._id);
    
    // Debug data types
    console.log('🏫 Data type debugging:');
    console.log('  - courses type:', typeof req.body.courses);
    console.log('  - courses value:', req.body.courses);
    console.log('  - faculty type:', typeof req.body.faculty);
    console.log('  - faculty value:', req.body.faculty);
    console.log('  - accreditation type:', typeof req.body.accreditation);
    console.log('  - facilities type:', typeof req.body.facilities);
    console.log('  - totalCourses type:', typeof req.body.totalCourses);
    console.log('  - totalCourses value:', req.body.totalCourses);
    console.log('  - totalStudents type:', typeof req.body.totalStudents);
    console.log('  - totalStudents value:', req.body.totalStudents);
    console.log('  - establishedYear type:', typeof req.body.establishedYear);
    console.log('  - establishedYear value:', req.body.establishedYear);
    
    // Debug user authentication
    console.log('🏫 User authentication debugging:');
    console.log('  - req.user exists:', !!req.user);
    console.log('  - req.user._id:', req.user?._id);
    console.log('  - req.user._id type:', typeof req.user?._id);
    console.log('  - req.user.username:', req.user?.username);
    console.log('  - req.user.email:', req.user?.email);
    
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
      domain,
      agentId,
      area,
      approvalStatus
    } = req.body;

    console.log('🏫 Extracted fields:');
    console.log('  - name:', name);
    console.log('  - type:', type);
    console.log('  - city:', city);
    console.log('  - province:', province);
    console.log('  - description:', description);
    console.log('  - courses:', courses);
    console.log('  - logo:', req.body.logo);
    console.log('  - banner:', req.body.banner);

    // Validate required fields
    if (!name || !type || !city || !province) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({ 
        error: 'Name, type, city, and province are required' 
      });
    }

    // Parse JSON fields if they're strings, otherwise use as-is
    let parsedCourses = [];
    let parsedFaculty = [];
    let parsedAccreditation = [];
    let parsedFacilities = [];

    try {
      // Handle courses - could be string or array
      if (courses) {
        if (typeof courses === 'string') {
          try {
            parsedCourses = JSON.parse(courses);
          } catch (parseError) {
            console.warn('🏫 Could not parse courses as JSON, treating as string:', parseError.message);
            parsedCourses = [{ name: courses, description: '', duration: '', fee: null, category: '' }];
          }
        } else if (Array.isArray(courses)) {
          parsedCourses = courses;
        } else {
          console.warn('🏫 Courses is neither string nor array, using empty array');
          parsedCourses = [];
        }
      }
      
      // Handle faculty - could be string or array
      if (faculty) {
        if (typeof faculty === 'string') {
          try {
            parsedFaculty = JSON.parse(faculty);
          } catch (parseError) {
            console.warn('🏫 Could not parse faculty as JSON, treating as string:', parseError.message);
            parsedFaculty = [{ name: faculty, position: '', qualification: '', experience: '', image: '' }];
          }
        } else if (Array.isArray(faculty)) {
          parsedFaculty = faculty;
        } else {
          console.warn('🏫 Faculty is neither string nor array, using empty array');
          parsedFaculty = [];
        }
      }
      
      // Handle accreditation - could be string or array
      if (accreditation) {
        if (typeof accreditation === 'string') {
          try {
            parsedAccreditation = JSON.parse(accreditation);
          } catch (parseError) {
            console.warn('🏫 Could not parse accreditation as JSON, treating as string:', parseError.message);
            parsedAccreditation = [accreditation];
          }
        } else if (Array.isArray(accreditation)) {
          parsedAccreditation = accreditation;
        } else {
          console.warn('🏫 Accreditation is neither string nor array, using empty array');
          parsedAccreditation = [];
        }
      }
      
      // Handle facilities - could be string or array
      if (facilities) {
        if (typeof facilities === 'string') {
          try {
            parsedFacilities = JSON.parse(facilities);
          } catch (parseError) {
            console.warn('🏫 Could not parse facilities as JSON, treating as string:', parseError.message);
            parsedFacilities = [facilities];
          }
        } else if (Array.isArray(facilities)) {
          parsedFacilities = facilities;
        } else {
          console.warn('🏫 Facilities is neither string nor array, using empty array');
          parsedFacilities = [];
        }
      }
      
      console.log('🏫 Parsed data:');
      console.log('  - courses:', parsedCourses);
      console.log('  - faculty:', parsedFaculty);
      console.log('  - accreditation:', parsedAccreditation);
      console.log('  - facilities:', parsedFacilities);
      
      // Validate courses structure
      if (parsedCourses && parsedCourses.length > 0) {
        console.log('🏫 Validating courses structure...');
        parsedCourses.forEach((course, index) => {
          console.log(`  - Course ${index}:`, course);
          if (!course.name) {
            console.warn(`  - Warning: Course ${index} missing name field`);
          }
          
          // Check if course matches expected schema
          const expectedFields = ['name', 'description', 'duration', 'fee', 'category'];
          const actualFields = Object.keys(course);
          console.log(`  - Course ${index} fields:`, actualFields);
          console.log(`  - Expected fields:`, expectedFields);
          
          // Validate required field
          if (!course.name) {
            console.error(`  - ERROR: Course ${index} missing required 'name' field`);
          }
        });
      }
      
      // Validate faculty structure
      if (parsedFaculty && parsedFaculty.length > 0) {
        console.log('🏫 Validating faculty structure...');
        parsedFaculty.forEach((faculty, index) => {
          console.log(`  - Faculty ${index}:`, faculty);
          if (!faculty.name) {
            console.warn(`  - Warning: Faculty ${index} missing name field`);
          }
        });
      }
      
    } catch (parseError) {
      console.error('🏫 Error processing fields:', parseError);
      // Don't return error, just use empty arrays as fallback
      parsedCourses = [];
      parsedFaculty = [];
      parsedAccreditation = [];
      parsedFacilities = [];
    }

    // Process image URLs - use provided URLs or fallback to placeholders
    const logoUrl = req.body.logo || 'https://picsum.photos/200/200?random=1';
    const bannerUrl = req.body.banner || 'https://picsum.photos/800/400?random=2';
    const galleryUrls = req.body.gallery || ['https://picsum.photos/400/300?random=3'];

    console.log('🏫 Image data validation:');
    console.log('  - Logo URL type:', typeof logoUrl);
    console.log('  - Logo URL length:', logoUrl.length);
    console.log('  - Logo URL starts with data:', logoUrl.startsWith('data:'));
    console.log('  - Banner URL type:', typeof bannerUrl);
    console.log('  - Banner URL length:', bannerUrl.length);
    console.log('  - Banner URL starts with data:', bannerUrl.startsWith('data:'));

    // Create institute data
    const instituteData = {
      name,
      type,
      location: address || `${city}, ${province}`, // Ensure location is set
      city,
      province,
      description: description || '',
      specialization: specialization || '',
      logo: logoUrl,
      banner: bannerUrl,
      gallery: galleryUrls,
      phone: phone || '',
      email: email || '',
      website: website || '',
      address: address || '',
      facebook: facebook || '',
      instagram: instagram || '',
      twitter: twitter || '',
      linkedin: linkedin || '',
      courses: parsedCourses,
      faculty: parsedFaculty,
      totalStudents: totalStudents || '0',
      totalCourses: totalCourses || '0',
      admissionStatus: admissionStatus || 'Open',
      establishedYear: establishedYear ? parseInt(establishedYear) : null,
      accreditation: parsedAccreditation,
      facilities: parsedFacilities,
      domain: domain || 'education',
      owner: req.user._id,
      ownerName: req.user.fullName || req.user.username || req.user.email || '',
      ownerEmail: req.user.email || '',
      ownerPhone: req.user.phone || '',
      verified: false,
      rating: 4.5,
      totalReviews: 0,
      area: area || '',
      agentId: agentId || generateInstituteAgentId(name),
      approvalStatus: approvalStatus || 'pending' // Start with pending status
    };

    // Final validation check
    console.log('🏫 Final validation check:');
    const requiredFields = ['name', 'type', 'location', 'city', 'province', 'owner'];
    const missingFields = requiredFields.filter(field => !instituteData[field]);
    
    if (missingFields.length > 0) {
      console.error('🏫 Missing required fields:', missingFields);
      return res.status(400).json({
        error: 'Missing required fields',
        details: `Missing: ${missingFields.join(', ')}`
      });
    }
    
    console.log('🏫 All required fields present ✓');

    console.log('🏫 Creating institute with data:', instituteData);
    console.log('🏫 Generated Agent ID:', instituteData.agentId);
    console.log('🏫 Location field value:', instituteData.location);
    console.log('🏫 Required fields check:');
    console.log('  - name:', !!instituteData.name);
    console.log('  - type:', !!instituteData.type);
    console.log('  - location:', !!instituteData.location);
    console.log('  - city:', !!instituteData.city);
    console.log('  - province:', !!instituteData.province);
    console.log('  - owner:', !!instituteData.owner);
    
    // Debug the final data structure
    console.log('🏫 Final instituteData structure:');
    console.log('  - courses length:', instituteData.courses?.length);
    console.log('  - faculty length:', instituteData.faculty?.length);
    console.log('  - accreditation length:', instituteData.accreditation?.length);
    console.log('  - facilities length:', instituteData.facilities?.length);
    console.log('  - totalCourses:', instituteData.totalCourses);
    console.log('  - totalStudents:', instituteData.totalStudents);
    console.log('  - establishedYear:', instituteData.establishedYear);
    console.log('  - logo URL:', instituteData.logo?.substring(0, 50) + '...');
    console.log('  - banner URL:', instituteData.banner?.substring(0, 50) + '...');

    // Create and save the institute
    console.log('🏫 Attempting to save institute to database...');
    
    // Test if the model can be created with this data
    try {
      const testInstitute = new Institute(instituteData);
      console.log('🏫 Model validation passed, test institute created successfully');
    } catch (validationError) {
      console.error('🏫 Model validation failed:', validationError);
      console.error('🏫 Validation error details:', validationError.errors);
      
      // Log each validation error in detail
      if (validationError.errors) {
        Object.keys(validationError.errors).forEach(field => {
          const error = validationError.errors[field];
          console.error(`🏫 Field '${field}' validation error:`, {
            kind: error.kind,
            value: error.value,
            message: error.message,
            path: error.path
          });
        });
      }
      
      return res.status(400).json({
        error: 'Institute data validation failed',
        details: validationError.message,
        validationErrors: validationError.errors
      });
    }
    
    // Check MongoDB connection status
    const dbState = mongoose.connection.readyState;
    console.log('🏫 MongoDB connection state:', dbState);
    console.log('🏫 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting');
    
    if (dbState !== 1) {
      console.error('🏫 MongoDB not connected, current state:', dbState);
      return res.status(500).json({
        error: 'Database connection not available',
        details: 'MongoDB connection state: ' + dbState
      });
    }
    
    const institute = new Institute(instituteData);
    const savedInstitute = await institute.save();

    console.log('🏫 Institute created successfully with ID:', savedInstitute._id);
    console.log('🏫 Initial approval status:', savedInstitute.approvalStatus);
    console.log('🏫 Institute will be visible after admin approval');
    console.log('🏫 Full saved institute data:', JSON.stringify(savedInstitute, null, 2));

    res.status(201).json({
      success: true,
      message: 'Institute created successfully and is pending admin approval',
      institute: savedInstitute
    });

  } catch (error) {
    console.error('🏫 Error creating institute from wizard:', error);
    console.error('🏫 Error stack:', error.stack);
    console.error('🏫 Error name:', error.name);
    console.error('🏫 Error message:', error.message);
    
    // If it's a Mongoose validation error, log the details
    if (error.name === 'ValidationError') {
      console.error('🏫 Mongoose validation errors:', error.errors);
    }
    
    res.status(500).json({
      error: 'Failed to create institute',
      details: error.message
    });
  }
});

// Test endpoint to debug institute creation
router.post('/test-institute', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🧪 TEST: Creating test institute...');

    const testInstitute = {
      name: 'Test Institute',
      type: 'University',
      city: 'Test City',
      province: 'Test Province',
      location: 'Test City, Test Province',
      description: 'Test institute for debugging',
      logo: 'https://picsum.photos/200/200?random=1',
      banner: 'https://picsum.photos/800/400?random=2',
      gallery: ['https://picsum.photos/400/300?random=3'],
      courses: [
        {
          name: 'Test Course 1',
          description: 'Test description 1',
          duration: '4 years',
          fee: 50000,
          category: 'Engineering'
        }
      ],
      faculty: [
        {
          name: 'Test Faculty 1',
          position: 'Professor',
          qualification: 'PhD',
          experience: '10 years',
          image: 'https://picsum.photos/100/100?random=4'
        }
      ],
      owner: req.user._id,
      ownerName: req.user.fullName || req.user.username || req.user.email || '',
      ownerEmail: req.user.email || '',
      ownerPhone: req.user.phone || '',
      agentId: generateInstituteAgentId('Test Institute'),
      approvalStatus: 'pending'
    };

    console.log('🧪 TEST: Test institute data:', testInstitute);

    const institute = new Institute(testInstitute);
    const savedInstitute = await institute.save();

    console.log('🧪 TEST: Institute created successfully:', savedInstitute._id);

    res.status(201).json({
      success: true,
      message: 'Test institute created successfully',
      institute: savedInstitute
    });

  } catch (error) {
    console.error('🧪 TEST: Error creating test institute:', error);
    console.error('🧪 TEST: Error stack:', error.stack);
    console.error('🧪 TEST: Error name:', error.name);
    console.error('🧪 TEST: Error message:', error.message);
    
    if (error.name === 'ValidationError') {
      console.error('🧪 TEST: Mongoose validation errors:', error.errors);
    }
    
    res.status(500).json({
      error: 'Failed to create test institute',
      details: error.message
    });
  }
});

// Test endpoint with minimal required fields only
router.post('/test-minimal', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🧪 MINIMAL TEST: Creating institute with minimal fields...');

    const minimalInstitute = {
      name: 'Minimal Test Institute',
      type: 'University',
      city: 'Test City',
      province: 'Test Province',
      location: 'Test City, Test Province',
      owner: req.user._id,
      ownerName: req.user.fullName || req.user.username || req.user.email || '',
      ownerEmail: req.user.email || '',
      ownerPhone: req.user.phone || '',
      agentId: generateInstituteAgentId('Minimal Test Institute'),
      approvalStatus: 'pending'
    };

    console.log('🧪 MINIMAL TEST: Minimal institute data:', minimalInstitute);

    const institute = new Institute(minimalInstitute);
    const savedInstitute = await institute.save();

    console.log('🧪 MINIMAL TEST: Minimal institute created successfully:', savedInstitute._id);

    res.status(201).json({
      success: true,
      message: 'Minimal institute created successfully',
      institute: savedInstitute
    });

  } catch (error) {
    console.error('🧪 MINIMAL TEST: Error creating minimal institute:', error);
    console.error('🧪 MINIMAL TEST: Error stack:', error.stack);
    console.error('🧪 MINIMAL TEST: Error name:', error.name);
    console.error('🧪 MINIMAL TEST: Error message:', error.message);
    
    if (error.name === 'ValidationError') {
      console.error('🧪 MINIMAL TEST: Mongoose validation errors:', error.errors);
    }
    
    res.status(500).json({
      error: 'Failed to create minimal institute',
      details: error.message
    });
  }
});

// Simple test endpoint without authentication
router.post('/test-simple', async (req, res) => {
  try {
    console.log('🧪 SIMPLE TEST: Testing Institute model...');
    
    // Test if we can even create an Institute instance
    const Institute = require('../models/Institute');
    console.log('🧪 SIMPLE TEST: Institute model loaded successfully');
    
    // Test basic model creation
    const testData = {
      name: 'Simple Test Institute',
      type: 'University',
      city: 'Test City',
      province: 'Test Province',
      location: 'Test City, Test Province',
      owner: '507f1f77bcf86cd799439011' // Dummy ObjectId
    };
    
    console.log('🧪 SIMPLE TEST: Test data:', testData);
    
    const testInstance = new Institute(testData);
    console.log('🧪 SIMPLE TEST: Institute instance created successfully');
    
    res.json({
      success: true,
      message: 'Institute model test passed',
      testData: testData
    });
    
  } catch (error) {
    console.error('🧪 SIMPLE TEST: Error:', error);
    res.status(500).json({
      error: 'Institute model test failed',
      details: error.message
    });
  }
});

module.exports = router;

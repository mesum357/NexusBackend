const express = require('express');
const router = express.Router();
const Institute = require('../models/Institute');
const { ensureAuthenticated } = require('../middleware/auth');
const { generateInstituteAgentId } = require('../utils/agentIdGenerator');

// Create institute from wizard data (JSON) - for use after payment
router.post('/create-from-wizard', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🏫 Institute wizard creation from JSON request received');
    console.log('🏫 Request body:', req.body);
    
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
      approvalStatus
    } = req.body;

    // Validate required fields
    if (!name || !type || !city || !province) {
      return res.status(400).json({ 
        error: 'Name, type, city, and province are required' 
      });
    }

    // Parse JSON fields if they're strings
    let parsedCourses = [];
    let parsedFaculty = [];
    let parsedAccreditation = [];
    let parsedFacilities = [];

    try {
      if (courses && typeof courses === 'string') {
        parsedCourses = JSON.parse(courses);
      } else if (Array.isArray(courses)) {
        parsedCourses = courses;
      }
      
      if (faculty && typeof faculty === 'string') {
        parsedFaculty = JSON.parse(faculty);
      } else if (Array.isArray(faculty)) {
        parsedFaculty = faculty;
      }
      
      if (accreditation && typeof accreditation === 'string') {
        parsedAccreditation = JSON.parse(accreditation);
      } else if (Array.isArray(accreditation)) {
        parsedAccreditation = accreditation;
      }
      
      if (facilities && typeof facilities === 'string') {
        parsedFacilities = JSON.parse(facilities);
      } else if (Array.isArray(facilities)) {
        parsedFacilities = facilities;
      }
    } catch (parseError) {
      console.error('🏫 Error parsing JSON fields:', parseError);
      return res.status(400).json({ 
        error: 'Invalid JSON format in form fields' 
      });
    }

    // Process image URLs - use provided URLs or fallback to placeholders
    const logoUrl = req.body.logo || 'https://picsum.photos/200/200?random=1';
    const bannerUrl = req.body.banner || 'https://picsum.photos/800/400?random=2';
    const galleryUrls = req.body.gallery || ['https://picsum.photos/400/300?random=3'];

    // Create institute data
    const instituteData = {
      name,
      type,
      location: address || `${city}, ${province}`,
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
      ownerName: req.user.username || req.user.email || '',
      ownerEmail: req.user.email || '',
      ownerPhone: req.user.phone || '',
      verified: false,
      rating: 4.5,
      totalReviews: 0,
      agentId: agentId || generateInstituteAgentId(name),
      approvalStatus: approvalStatus || 'pending' // Start with pending status
    };

    console.log('🏫 Creating institute with data:', instituteData);
    console.log('🏫 Generated Agent ID:', instituteData.agentId);

    // Create and save the institute
    const institute = new Institute(instituteData);
    const savedInstitute = await institute.save();

    console.log('🏫 Institute created successfully with ID:', savedInstitute._id);
    console.log('🏫 Initial approval status:', savedInstitute.approvalStatus);
    console.log('🏫 Institute will be visible after admin approval');

    res.status(201).json({
      success: true,
      message: 'Institute created successfully and is pending admin approval',
      institute: savedInstitute
    });

  } catch (error) {
    console.error('🏫 Error creating institute from wizard:', error);
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
      ownerName: req.user.username || req.user.email || '',
      ownerEmail: req.user.email || '',
      ownerPhone: req.user.phone || '',
      agentId: generateInstituteAgentId('Test Institute'),
      approvalStatus: 'pending'
    };

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
    res.status(500).json({
      error: 'Failed to create test institute',
      details: error.message
    });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const { ensureAuthenticated } = require('../middleware/auth');
const { generateHospitalAgentId } = require('../utils/agentIdGenerator');

// Create hospital from wizard data (JSON) - for use after payment
router.post('/create-from-wizard', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🏥 Hospital wizard creation from JSON request received');
    console.log('🏥 Request body:', req.body);
    
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
      emergencyContact,
      facebook,
      instagram,
      twitter,
      linkedin,
      departments,
      doctors,
      totalPatients,
      totalDoctors,
      admissionStatus,
      establishedYear,
      accreditation,
      facilities,
      insuranceAccepted,
      emergencyServices,
      ambulanceService,
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
    let parsedDepartments = [];
    let parsedDoctors = [];
    let parsedAccreditation = [];
    let parsedFacilities = [];
    let parsedInsuranceAccepted = [];

    try {
      if (departments && typeof departments === 'string') {
        parsedDepartments = JSON.parse(departments);
      } else if (Array.isArray(departments)) {
        parsedDepartments = departments;
      }
      
      if (doctors && typeof doctors === 'string') {
        parsedDoctors = JSON.parse(doctors);
      } else if (Array.isArray(doctors)) {
        parsedDoctors = doctors;
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
      
      if (insuranceAccepted && typeof insuranceAccepted === 'string') {
        parsedInsuranceAccepted = JSON.parse(insuranceAccepted);
      } else if (Array.isArray(insuranceAccepted)) {
        parsedInsuranceAccepted = insuranceAccepted;
      }
    } catch (parseError) {
      console.error('🏥 Error parsing JSON fields:', parseError);
      return res.status(400).json({ 
        error: 'Invalid JSON format in form fields' 
      });
    }

    // Process image URLs - use provided URLs or fallback to placeholders
    const logoUrl = req.body.logo || 'https://picsum.photos/200/200?random=1';
    const bannerUrl = req.body.banner || 'https://picsum.photos/800/400?random=2';
    const galleryUrls = req.body.gallery || ['https://picsum.photos/400/300?random=3'];

    // Create hospital data
    const hospitalData = {
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
      emergencyContact: emergencyContact || '',
      facebook: facebook || '',
      instagram: instagram || '',
      twitter: twitter || '',
      linkedin: linkedin || '',
      departments: parsedDepartments,
      doctors: parsedDoctors,
      totalPatients: totalPatients || '0',
      totalDoctors: totalDoctors || '0',
      admissionStatus: admissionStatus || 'Open',
      establishedYear: establishedYear ? parseInt(establishedYear) : null,
      accreditation: parsedAccreditation,
      facilities: parsedFacilities,
      insuranceAccepted: parsedInsuranceAccepted,
      emergencyServices: emergencyServices !== undefined ? emergencyServices : true,
      ambulanceService: ambulanceService !== undefined ? ambulanceService : false,
      owner: req.user._id,
      ownerName: req.user.username || req.user.email || '',
      ownerEmail: req.user.email || '',
      ownerPhone: req.user.phone || '',
      verified: false,
      rating: 4.5,
      totalReviews: 0,
      agentId: agentId || generateHospitalAgentId(name),
      approvalStatus: approvalStatus || 'pending' // Start with pending status
    };

    console.log('🏥 Creating hospital with data:', hospitalData);
    console.log('🏥 Generated Agent ID:', hospitalData.agentId);

    // Create and save the hospital
    const hospital = new Hospital(hospitalData);
    const savedHospital = await hospital.save();

    console.log('🏥 Hospital created successfully with ID:', savedHospital._id);
    console.log('🏥 Initial approval status:', savedHospital.approvalStatus);
    console.log('🏥 Hospital will be visible after admin approval');

    res.status(201).json({
      success: true,
      message: 'Hospital created successfully and is pending admin approval',
      hospital: savedHospital
    });

  } catch (error) {
    console.error('🏥 Error creating hospital from wizard:', error);
    res.status(500).json({
      error: 'Failed to create hospital',
      details: error.message
    });
  }
});

// Test endpoint to debug hospital creation
router.post('/test-hospital', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🧪 TEST: Creating test hospital...');

    const testHospital = {
      name: 'Test Hospital',
      type: 'General',
      city: 'Test City',
      province: 'Test Province',
      description: 'Test hospital for debugging',
      logo: 'https://picsum.photos/200/200?random=1',
      banner: 'https://picsum.photos/800/400?random=2',
      gallery: ['https://picsum.photos/400/300?random=3'],
      departments: [
        {
          name: 'Test Department 1',
          description: 'Test department description',
          headDoctor: 'Dr. Test',
          contactNumber: '1234567890',
          image: 'https://picsum.photos/150/150?random=4'
        }
      ],
      doctors: [
        {
          name: 'Dr. Test Doctor',
          specialization: 'General Medicine',
          qualification: 'MBBS',
          experience: '5 years',
          image: 'https://picsum.photos/100/100?random=5',
          contactNumber: '1234567890',
          email: 'doctor@test.com'
        }
      ],
      owner: req.user._id,
      ownerName: req.user.username || req.user.email || '',
      ownerEmail: req.user.email || '',
      ownerPhone: req.user.phone || '',
      agentId: generateHospitalAgentId('Test Hospital'),
      approvalStatus: 'pending'
    };

    const hospital = new Hospital(testHospital);
    const savedHospital = await hospital.save();

    console.log('🧪 TEST: Hospital created successfully:', savedHospital._id);

    res.status(201).json({
      success: true,
      message: 'Test hospital created successfully',
      hospital: savedHospital
    });

  } catch (error) {
    console.error('🧪 TEST: Error creating test hospital:', error);
    res.status(500).json({
      error: 'Failed to create test hospital',
      details: error.message
    });
  }
});

module.exports = router;

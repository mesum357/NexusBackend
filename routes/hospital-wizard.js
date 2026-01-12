const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const { ensureAuthenticated } = require('../middleware/auth');
const { generateHospitalAgentId } = require('../utils/agentIdGenerator');
const mongoose = require('mongoose'); // Added for MongoDB connection status

// Create hospital from wizard data (JSON) - for use after payment
router.post('/create-from-wizard', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🏥 Hospital wizard creation from JSON request received');
    console.log('🏥 Request body:', req.body);
    console.log('🏥 Request headers:', req.headers);
    console.log('🏥 User authenticated:', req.user._id);
    
    // Debug data types
    console.log('🏥 Data type debugging:');
    console.log('  - departments type:', typeof req.body.departments);
    console.log('  - departments value:', req.body.departments);
    console.log('  - doctors type:', typeof req.body.doctors);
    console.log('  - doctors value:', req.body.doctors);
    console.log('  - accreditation type:', typeof req.body.accreditation);
    console.log('  - facilities type:', typeof req.body.facilities);
    console.log('  - insuranceAccepted type:', typeof req.body.insuranceAccepted);
    console.log('  - totalPatients type:', typeof req.body.totalPatients);
    console.log('  - totalDoctors type:', typeof req.body.totalDoctors);
    console.log('  - establishedYear type:', typeof req.body.establishedYear);
    
    // Debug user authentication
    console.log('🏥 User authentication debugging:');
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

    // Parse JSON fields if they're strings, otherwise use as-is
    let parsedDepartments = [];
    let parsedDoctors = [];
    let parsedAccreditation = [];
    let parsedFacilities = [];
    let parsedInsuranceAccepted = [];

    try {
      // Handle departments - could be string or array
      if (departments) {
        if (typeof departments === 'string') {
          try {
            parsedDepartments = JSON.parse(departments);
          } catch (parseError) {
            console.warn('🏥 Could not parse departments as JSON, treating as string:', parseError.message);
            parsedDepartments = [{ name: departments, description: '', headDoctor: '', contactNumber: '', image: '' }];
          }
        } else if (Array.isArray(departments)) {
          parsedDepartments = departments;
        } else {
          console.warn('🏥 Departments is neither string nor array, using empty array');
          parsedDepartments = [];
        }
      }
      
      // Handle doctors - could be string or array
      if (doctors) {
        if (typeof doctors === 'string') {
          try {
            parsedDoctors = JSON.parse(doctors);
          } catch (parseError) {
            console.warn('🏥 Could not parse doctors as JSON, treating as string:', parseError.message);
            parsedDoctors = [{ name: doctors, specialization: '', qualification: '', experience: '', image: '', contactNumber: '', email: '' }];
          }
        } else if (Array.isArray(doctors)) {
          parsedDoctors = doctors;
        } else {
          console.warn('🏥 Doctors is neither string nor array, using empty array');
          parsedDoctors = [];
        }
      }
      
      // Handle accreditation - could be string or array
      if (accreditation) {
        if (typeof accreditation === 'string') {
          try {
            parsedAccreditation = JSON.parse(accreditation);
          } catch (parseError) {
            console.warn('🏥 Could not parse accreditation as JSON, treating as string:', parseError.message);
            parsedAccreditation = [accreditation];
          }
        } else if (Array.isArray(accreditation)) {
          parsedAccreditation = accreditation;
        } else {
          console.warn('🏥 Accreditation is neither string nor array, using empty array');
          parsedAccreditation = [];
        }
      }
      
      // Handle facilities - could be string or array
      if (facilities) {
        if (typeof facilities === 'string') {
          try {
            parsedFacilities = JSON.parse(facilities);
          } catch (parseError) {
            console.warn('🏥 Could not parse facilities as JSON, treating as string:', parseError.message);
            parsedFacilities = [facilities];
          }
        } else if (Array.isArray(facilities)) {
          parsedFacilities = facilities;
        } else {
          console.warn('🏥 Facilities is neither string nor array, using empty array');
          parsedFacilities = [];
        }
      }
      
      // Handle insuranceAccepted - could be string or array
      if (insuranceAccepted) {
        if (typeof insuranceAccepted === 'string') {
          try {
            parsedInsuranceAccepted = JSON.parse(insuranceAccepted);
          } catch (parseError) {
            console.warn('🏥 Could not parse insuranceAccepted as JSON, treating as string:', parseError.message);
            parsedInsuranceAccepted = [insuranceAccepted];
          }
        } else if (Array.isArray(insuranceAccepted)) {
          parsedInsuranceAccepted = insuranceAccepted;
        } else {
          console.warn('🏥 InsuranceAccepted is neither string nor array, using empty array');
          parsedInsuranceAccepted = [];
        }
      }
      
      console.log('🏥 Parsed data:');
      console.log('  - departments:', parsedDepartments);
      console.log('  - doctors:', parsedDoctors);
      console.log('  - accreditation:', parsedAccreditation);
      console.log('  - facilities:', parsedFacilities);
      console.log('  - insuranceAccepted:', parsedInsuranceAccepted);
      
    } catch (parseError) {
      console.error('🏥 Error processing fields:', parseError);
      // Don't return error, just use empty arrays as fallback
      parsedDepartments = [];
      parsedDoctors = [];
      parsedAccreditation = [];
      parsedFacilities = [];
      parsedInsuranceAccepted = [];
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
      ownerName: req.user.fullName || req.user.username || req.user.email || '',
      ownerEmail: req.user.email || '',
      ownerPhone: req.user.phone || '',
      verified: false,
      rating: 4.5,
      totalReviews: 0,
      agentId: agentId || generateHospitalAgentId(name),
      approvalStatus: approvalStatus || 'pending' // Start with pending status
    };

    // Final validation check
    console.log('🏥 Final validation check:');
    const requiredFields = ['name', 'type', 'location', 'city', 'province', 'owner'];
    const missingFields = requiredFields.filter(field => !hospitalData[field]);
    
    if (missingFields.length > 0) {
      console.error('🏥 Missing required fields:', missingFields);
      return res.status(400).json({
        error: 'Missing required fields',
        details: `Missing: ${missingFields.join(', ')}`
      });
    }
    
    console.log('🏥 All required fields present ✓');

    console.log('🏥 Creating hospital with data:', hospitalData);
    console.log('🏥 Generated Agent ID:', hospitalData.agentId);
    console.log('🏥 Location field value:', hospitalData.location);
    console.log('🏥 Required fields check:');
    console.log('  - name:', !!hospitalData.name);
    console.log('  - type:', !!hospitalData.type);
    console.log('  - location:', !!hospitalData.location);
    console.log('  - city:', !!hospitalData.city);
    console.log('  - province:', !!hospitalData.province);
    console.log('  - owner:', !!hospitalData.owner);
    
    // Debug the final data structure
    console.log('🏥 Final hospitalData structure:');
    console.log('  - departments length:', hospitalData.departments?.length);
    console.log('  - doctors length:', hospitalData.doctors?.length);
    console.log('  - accreditation length:', hospitalData.accreditation?.length);
    console.log('  - facilities length:', hospitalData.facilities?.length);
    console.log('  - totalPatients:', hospitalData.totalPatients);
    console.log('  - totalDoctors:', hospitalData.totalDoctors);
    console.log('  - establishedYear:', hospitalData.establishedYear);
    console.log('  - logo URL:', hospitalData.logo?.substring(0, 50) + '...');
    console.log('  - banner URL:', hospitalData.banner?.substring(0, 50) + '...');

    // Create and save the hospital
    console.log('🏥 Attempting to save hospital to database...');
    
    // Test if the model can be created with this data
    try {
      const testHospital = new Hospital(hospitalData);
      console.log('🏥 Model validation passed, test hospital created successfully');
    } catch (validationError) {
      console.error('🏥 Model validation failed:', validationError);
      console.error('🏥 Validation error details:', validationError.errors);
      
      // Log each validation error in detail
      if (validationError.errors) {
        Object.keys(validationError.errors).forEach(field => {
          const error = validationError.errors[field];
          console.error(`🏥 Field '${field}' validation error:`, {
            kind: error.kind,
            value: error.value,
            message: error.message,
            path: error.path
          });
        });
      }
      
      return res.status(400).json({
        error: 'Hospital data validation failed',
        details: validationError.message,
        validationErrors: validationError.errors
      });
    }
    
    // Check MongoDB connection status
    const dbState = mongoose.connection.readyState;
    console.log('🏥 MongoDB connection state:', dbState);
    console.log('🏥 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting');

    if (dbState !== 1) {
      console.error('🏥 MongoDB not connected, current state:', dbState);
      return res.status(500).json({
        error: 'Database connection not available',
        details: 'MongoDB connection state: ' + dbState
      });
    }

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

// Test endpoint with minimal required fields only
router.post('/test-minimal', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🧪 MINIMAL TEST: Creating hospital with minimal fields...');

    const minimalHospital = {
      name: 'Minimal Test Hospital',
      type: 'General',
      city: 'Test City',
      province: 'Test Province',
      location: 'Test City, Test Province',
      owner: req.user._id,
      ownerName: req.user.fullName || req.user.username || req.user.email || '',
      ownerEmail: req.user.email || '',
      ownerPhone: req.user.phone || '',
      agentId: generateHospitalAgentId('Minimal Test Hospital'),
      approvalStatus: 'pending'
    };

    console.log('🧪 MINIMAL TEST: Minimal hospital data:', minimalHospital);

    const hospital = new Hospital(minimalHospital);
    const savedHospital = await hospital.save();

    console.log('🧪 MINIMAL TEST: Minimal hospital created successfully:', savedHospital._id);

    res.status(201).json({
      success: true,
      message: 'Minimal hospital created successfully',
      hospital: savedHospital
    });

  } catch (error) {
    console.error('🧪 MINIMAL TEST: Error creating minimal hospital:', error);
    console.error('🧪 MINIMAL TEST: Error stack:', error.stack);
    console.error('🧪 MINIMAL TEST: Error name:', error.name);
    console.error('🧪 MINIMAL TEST: Error message:', error.message);
    
    if (error.name === 'ValidationError') {
      console.error('🧪 MINIMAL TEST: Mongoose validation errors:', error.errors);
    }
    
    res.status(500).json({
      error: 'Failed to create minimal hospital',
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
      ownerName: req.user.fullName || req.user.username || req.user.email || '',
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

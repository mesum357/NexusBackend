const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Hospital = require('../models/Hospital');
const Review = require('../models/Review');
const InstituteNotification = require('../models/InstituteNotification');
const InstituteMessage = require('../models/InstituteMessage');
const InstituteTask = require('../models/InstituteTask');
const { ensureAuthenticated } = require('../middleware/auth');
const { upload, cloudinary, validateCloudinaryConfig } = require('../middleware/cloudinary');
const { generateHospitalAgentId } = require('../utils/agentIdGenerator');
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

// Create new hospital
router.post('/create', (req, res, next) => {
  console.log('POST /create route hit');
  console.log('User authenticated:', req.isAuthenticated());
  console.log('User:', req.user);
  next();
}, ensureAuthenticated, uploadWithFilter.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
  { name: 'doctorImages', maxCount: 20 }
]), async (req, res) => {
  try {
    console.log('Hospital creation request received');
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
      ownerName,
      ownerEmail,
      ownerPhone
    } = req.body;

    // Validate required fields
    if (!name || !type || !city || !province) {
      return res.status(400).json({ error: 'Name, type, city, and province are required' });
    }

    // Parse JSON fields with better error handling
    let parsedDepartments = [];
    let parsedDoctors = [];
    let parsedAccreditation = [];
    let parsedFacilities = [];
    let parsedInsuranceAccepted = [];

    console.log('Raw departments from request:', departments);
    console.log('Raw doctors from request:', doctors);
    console.log('Raw accreditation from request:', accreditation);
    console.log('Raw facilities from request:', facilities);
    console.log('Raw insuranceAccepted from request:', insuranceAccepted);

    try {
      if (departments && departments !== 'undefined') {
        parsedDepartments = JSON.parse(departments);
      }
      if (doctors && doctors !== 'undefined') {
        parsedDoctors = JSON.parse(doctors);
      }
      if (accreditation && accreditation !== 'undefined') {
        parsedAccreditation = JSON.parse(accreditation);
      }
      if (facilities && facilities !== 'undefined') {
        parsedFacilities = JSON.parse(facilities);
      }
      if (insuranceAccepted && insuranceAccepted !== 'undefined') {
        parsedInsuranceAccepted = JSON.parse(insuranceAccepted);
      }
    } catch (parseError) {
      console.error('Error parsing JSON fields:', parseError);
      return res.status(400).json({ error: 'Invalid JSON format in form fields' });
    }

    // Generate agent ID
    const agentId = generateHospitalAgentId(name);

    // Prepare hospital data
    const hospitalData = {
      name,
      type,
      location: req.body.location || city,
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
      departments: parsedDepartments,
      doctors: parsedDoctors,
      totalPatients: totalPatients || '0',
      totalDoctors: totalDoctors || '0',
      admissionStatus: admissionStatus || 'Open',
      establishedYear: establishedYear ? parseInt(establishedYear) : undefined,
      accreditation: parsedAccreditation,
      facilities: parsedFacilities,
      insuranceAccepted: parsedInsuranceAccepted,
      emergencyServices: emergencyServices === 'true',
      ambulanceService: ambulanceService === 'true',
      agentId,
      owner: req.user._id,
      ownerName: ownerName || req.user.fullName || req.user.username,
      ownerEmail: ownerEmail || req.user.email,
      ownerPhone: ownerPhone || req.user.mobile
    };

    console.log('👤 Hospital data prepared:', hospitalData);

    // Handle file uploads
    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        hospitalData.logo = req.files.logo[0].path;
        console.log('📸 Logo added:', req.files.logo[0].path);
      }
      if (req.files.banner && req.files.banner[0]) {
        hospitalData.banner = req.files.banner[0].path;
        console.log('📸 Banner added:', req.files.banner[0].path);
      }
      if (req.files.gallery) {
        hospitalData.gallery = req.files.gallery.map(file => file.path);
        console.log('📸 Gallery added:', hospitalData.gallery.length, 'images');
      }
    }

    // Create hospital
    const hospital = new Hospital(hospitalData);
    const savedHospital = await hospital.save();

    console.log('✅ Hospital created successfully:', savedHospital._id);

    res.status(201).json({
      success: true,
      message: 'Hospital created successfully!',
      hospital: savedHospital
    });

  } catch (error) {
    console.error('❌ Hospital creation error:', error);
    res.status(500).json({ error: 'Failed to create hospital' });
  }
});

// Get all hospitals
router.get('/all', async (req, res) => {
  try {
    const { city, type, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { approvalStatus: 'approved' };

    if (city && city !== 'all') {
      query.city = { $regex: city, $options: 'i' };
    }

    if (type && type !== 'all') {
      query.type = { $regex: type, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [hospitals, total] = await Promise.all([
      Hospital.find(query)
        .populate('owner', 'username fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Hospital.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      hospitals,
      totalPages,
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// Get single hospital by ID
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate('owner', 'username fullName email profileImage');

    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    res.json({ hospital });
  } catch (error) {
    console.error('Error fetching hospital:', error);
    res.status(500).json({ error: 'Failed to fetch hospital' });
  }
});

// Update hospital
router.put('/:id', ensureAuthenticated, uploadWithFilter.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update fields
    const updateData = { ...req.body };

    // Handle file uploads
    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        updateData.logo = req.files.logo[0].path;
      }
      if (req.files.banner && req.files.banner[0]) {
        updateData.banner = req.files.banner[0].path;
      }
      if (req.files.gallery) {
        updateData.gallery = req.files.gallery.map(file => file.path);
      }
    }

    const updatedHospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('owner', 'username fullName email');

    res.json({ hospital: updatedHospital });
  } catch (error) {
    console.error('Error updating hospital:', error);
    res.status(500).json({ error: 'Failed to update hospital' });
  }
});

// Delete hospital
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Hospital.findByIdAndDelete(req.params.id);
    res.json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    console.error('Error deleting hospital:', error);
    res.status(500).json({ error: 'Failed to delete hospital' });
  }
});

// Patient Applications: submit new patient registration
router.post('/:id/patient-application', ensureAuthenticated, async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const { patientName, patientAge, patientGender, contactNumber, emergencyContact, medicalHistory, symptoms, preferredDate } = req.body;

    if (!patientName || !patientAge || !contactNumber) {
      return res.status(400).json({ error: 'Patient name, age, and contact number are required' });
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const application = new PatientApplication({
      hospital: hospitalId,
      patient: req.user._id,
      patientName,
      patientAge,
      patientGender,
      contactNumber,
      emergencyContact,
      medicalHistory,
      symptoms,
      preferredDate,
      status: 'pending'
    });

    await application.save();
    res.status(201).json({ message: 'Patient application submitted successfully' });
  } catch (error) {
    console.error('Error submitting patient application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Patient Applications: get all applications for a hospital (admin only)
router.get('/:id/patient-applications', ensureAuthenticated, async (req, res) => {
  try {
    const hospitalId = req.params.id;
    
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    if (String(hospital.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Unauthorized' });

    const applications = await PatientApplication.find({ hospital: hospitalId })
      .populate('patient', 'username fullName email')
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch (error) {
    console.error('Error fetching patient applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Update patient application status
router.put('/:id/patient-applications/:applicationId', ensureAuthenticated, async (req, res) => {
  try {
    const { id, applicationId } = req.params;
    const { status, notes } = req.body;

    const hospital = await Hospital.findById(id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    if (String(hospital.owner) !== String(req.user._id)) return res.status(403).json({ error: 'Unauthorized' });

    const application = await PatientApplication.findOneAndUpdate(
      { _id: applicationId, hospital: id },
      { status, notes, updatedAt: new Date() },
      { new: true }
    ).populate('patient', 'username fullName email');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ application });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Get patient applications for current user
router.get('/patient/applications', ensureAuthenticated, async (req, res) => {
  try {
    const applications = await PatientApplication.find({ patient: req.user._id })
      .populate('hospital', 'name city type specialization')
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch (error) {
    console.error('Error fetching patient applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get hospital reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ entityId: req.params.id, entityType: 'hospital' })
      .populate('user', 'username fullName')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create hospital review
router.post('/:id/reviews', ensureAuthenticated, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const review = new Review({
      user: req.user._id,
      entityId: req.params.id,
      entityType: 'hospital',
      rating,
      comment
    });

    await review.save();
    await review.populate('user', 'username fullName');

    res.status(201).json({ review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Get hospital gallery
router.get('/:id/gallery', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    res.json({ gallery: hospital.gallery || [] });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

// Add image to hospital gallery
router.post('/:id/gallery', ensureAuthenticated, uploadWithFilter.array('gallery', 10), async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
      hospital.gallery = [...(hospital.gallery || []), ...newImages];
      await hospital.save();
    }

    res.json({ gallery: hospital.gallery });
  } catch (error) {
    console.error('Error adding to gallery:', error);
    res.status(500).json({ error: 'Failed to add to gallery' });
  }
});

// Remove image from hospital gallery
router.delete('/:id/gallery', ensureAuthenticated, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    hospital.gallery = hospital.gallery.filter(img => img !== imageUrl);
    await hospital.save();

    res.json({ gallery: hospital.gallery });
  } catch (error) {
    console.error('Error removing from gallery:', error);
    res.status(500).json({ error: 'Failed to remove from gallery' });
  }
});

// Get hospital doctors
router.get('/:id/doctors', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    res.json({ doctors: hospital.doctors || [] });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Add doctor to hospital
router.post('/:id/doctors', ensureAuthenticated, uploadWithFilter.single('image'), async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const doctorData = {
      name: req.body.name,
      specialization: req.body.specialization,
      qualification: req.body.qualification,
      experience: req.body.experience,
      contactNumber: req.body.contactNumber,
      email: req.body.email,
      image: req.file ? req.file.path : undefined
    };

    hospital.doctors.push(doctorData);
    await hospital.save();

    res.json({ doctors: hospital.doctors });
  } catch (error) {
    console.error('Error adding doctor:', error);
    res.status(500).json({ error: 'Failed to add doctor' });
  }
});

// Remove doctor from hospital
router.delete('/:id/doctors/:doctorId', ensureAuthenticated, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    hospital.doctors = hospital.doctors.filter(doctor => doctor._id.toString() !== req.params.doctorId);
    await hospital.save();

    res.json({ doctors: hospital.doctors });
  } catch (error) {
    console.error('Error removing doctor:', error);
    res.status(500).json({ error: 'Failed to remove doctor' });
  }
});

// Get hospital notifications
router.get('/:id/notifications', async (req, res) => {
  try {
    const notifications = await InstituteNotification.find({ institute: req.params.id })
      .sort({ createdAt: -1 });

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Create hospital notification
router.post('/:id/notifications', ensureAuthenticated, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const notification = new InstituteNotification({
      institute: req.params.id,
      title: req.body.title,
      message: req.body.message
    });

    await notification.save();
    res.status(201).json({ notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Get hospital messages
router.get('/:id/messages', async (req, res) => {
  try {
    const messages = await InstituteMessage.find({ institute: req.params.id })
      .sort({ createdAt: -1 });

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create hospital message
router.post('/:id/messages', ensureAuthenticated, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const message = new InstituteMessage({
      institute: req.params.id,
      senderName: req.body.senderName,
      message: req.body.message
    });

    await message.save();
    res.status(201).json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Get hospital tasks
router.get('/:id/tasks', async (req, res) => {
  try {
    const tasks = await InstituteTask.find({ institute: req.params.id })
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create hospital task
router.post('/:id/tasks', ensureAuthenticated, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const task = new InstituteTask({
      institute: req.params.id,
      title: req.body.title,
      description: req.body.description,
      type: req.body.type
    });

    await task.save();
    res.status(201).json({ task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update hospital task
router.put('/:id/tasks/:taskId', ensureAuthenticated, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const task = await InstituteTask.findOneAndUpdate(
      { _id: req.params.taskId, institute: req.params.id },
      { title: req.body.title, description: req.body.description, type: req.body.type },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete hospital task
router.delete('/:id/tasks/:taskId', ensureAuthenticated, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    if (String(hospital.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const task = await InstituteTask.findOneAndDelete({ _id: req.params.taskId, institute: req.params.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get user's hospital messages
router.get('/messages/my', ensureAuthenticated, async (req, res) => {
  try {
    const messages = await InstituteMessage.find({})
      .populate('institute', 'name')
      .sort({ createdAt: -1 });

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching user messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get user's hospital notifications
router.get('/notifications/my', ensureAuthenticated, async (req, res) => {
  try {
    const notifications = await InstituteNotification.find({})
      .populate('institute', 'name')
      .sort({ createdAt: -1 });

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get user's hospital tasks for today
router.get('/tasks/my/today', ensureAuthenticated, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await InstituteTask.find({
      createdAt: { $gte: today, $lt: tomorrow }
    }).populate('institute', 'name');

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching today\'s tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

module.exports = router;

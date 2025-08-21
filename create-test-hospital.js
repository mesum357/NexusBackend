/**
 * Script to create test hospitals with Agent IDs for testing hospital functionality
 */

const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
const Users = require('./models/User');
const { generateHospitalAgentId } = require('./utils/agentIdGenerator');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ahmed357:pDliM118811357@cluster0.vtangzf.mongodb.net/pakistan_Online?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createTestHospitals() {
  try {
    console.log('🔄 Creating test hospitals with Agent IDs...\n');

    // First, check if we have any users
    const users = await Users.find({}).limit(1);
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    const testUser = users[0];
    console.log('Using user:', {
      id: testUser._id,
      username: testUser.username,
      email: testUser.email
    });

    // Create test hospitals
    const testHospitals = [
      {
        name: 'City General Hospital',
        type: 'General',
        location: 'Downtown Area',
        city: 'Karachi',
        province: 'Sindh',
        description: 'A comprehensive general hospital providing quality healthcare services',
        specialization: 'General Medicine, Surgery, Emergency Care',
        phone: '+92-21-1234567',
        email: 'info@citygeneral.com',
        website: 'www.citygeneral.com',
        address: '123 Main Street, Karachi',
        emergencyContact: '+92-21-1234568',
        totalPatients: '5000',
        totalDoctors: '50',
        admissionStatus: 'Open',
        establishedYear: 1995,
        accreditation: ['PMDC', 'ISO 9001'],
        facilities: ['Emergency Room', 'ICU', 'Operation Theater', 'Laboratory'],
        insuranceAccepted: ['State Life', 'EFU', 'Jubilee'],
        emergencyServices: true,
        ambulanceService: true,
        departments: [
          {
            name: 'Emergency Department',
            description: '24/7 emergency medical services',
            headDoctor: 'Dr. Ahmed Khan',
            contactNumber: '+92-21-1234569'
          },
          {
            name: 'Cardiology',
            description: 'Heart and cardiovascular care',
            headDoctor: 'Dr. Fatima Ali',
            contactNumber: '+92-21-1234570'
          }
        ],
        doctors: [
          {
            name: 'Dr. Ahmed Khan',
            specialization: 'Emergency Medicine',
            qualification: 'MBBS, FCPS',
            experience: '15 years',
            contactNumber: '+92-300-1234567',
            email: 'ahmed.khan@citygeneral.com'
          },
          {
            name: 'Dr. Fatima Ali',
            specialization: 'Cardiology',
            qualification: 'MBBS, MD',
            experience: '12 years',
            contactNumber: '+92-300-1234568',
            email: 'fatima.ali@citygeneral.com'
          }
        ],
        owner: testUser._id,
        ownerName: testUser.username || testUser.email,
        ownerEmail: testUser.email,
        ownerPhone: testUser.mobile || '',
        approvalStatus: 'pending',
        agentId: generateHospitalAgentId('City General Hospital')
      },
      {
        name: 'Specialized Medical Center',
        type: 'Specialized',
        location: 'Gulberg Area',
        city: 'Lahore',
        province: 'Punjab',
        description: 'Specialized medical center focusing on advanced treatments',
        specialization: 'Neurology, Oncology, Orthopedics',
        phone: '+92-42-1234567',
        email: 'info@specializedmc.com',
        website: 'www.specializedmc.com',
        address: '456 Gulberg Road, Lahore',
        emergencyContact: '+92-42-1234568',
        totalPatients: '3000',
        totalDoctors: '35',
        admissionStatus: 'Open',
        establishedYear: 2000,
        accreditation: ['PMDC', 'JCI'],
        facilities: ['MRI Center', 'Chemotherapy Unit', 'Rehabilitation Center'],
        insuranceAccepted: ['State Life', 'EFU'],
        emergencyServices: true,
        ambulanceService: false,
        departments: [
          {
            name: 'Neurology',
            description: 'Brain and nervous system disorders',
            headDoctor: 'Dr. Sara Ahmed',
            contactNumber: '+92-42-1234569'
          },
          {
            name: 'Oncology',
            description: 'Cancer treatment and care',
            headDoctor: 'Dr. Muhammad Hassan',
            contactNumber: '+92-42-1234570'
          }
        ],
        doctors: [
          {
            name: 'Dr. Sara Ahmed',
            specialization: 'Neurology',
            qualification: 'MBBS, MD Neurology',
            experience: '18 years',
            contactNumber: '+92-300-1234569',
            email: 'sara.ahmed@specializedmc.com'
          },
          {
            name: 'Dr. Muhammad Hassan',
            specialization: 'Oncology',
            qualification: 'MBBS, FCPS Oncology',
            experience: '20 years',
            contactNumber: '+92-300-1234570',
            email: 'muhammad.hassan@specializedmc.com'
          }
        ],
        owner: testUser._id,
        ownerName: testUser.username || testUser.email,
        ownerEmail: testUser.email,
        ownerPhone: testUser.mobile || '',
        approvalStatus: 'pending',
        agentId: generateHospitalAgentId('Specialized Medical Center')
      },
      {
        name: 'Community Health Clinic',
        type: 'Clinic',
        location: 'Residential Area',
        city: 'Islamabad',
        province: 'Federal',
        description: 'Community-focused health clinic providing primary care',
        specialization: 'Primary Care, Pediatrics, Gynecology',
        phone: '+92-51-1234567',
        email: 'info@communityclinic.com',
        website: 'www.communityclinic.com',
        address: '789 Community Street, Islamabad',
        emergencyContact: '+92-51-1234568',
        totalPatients: '1500',
        totalDoctors: '15',
        admissionStatus: 'Open',
        establishedYear: 2010,
        accreditation: ['PMDC'],
        facilities: ['Consultation Rooms', 'Pharmacy', 'Vaccination Center'],
        insuranceAccepted: ['State Life'],
        emergencyServices: false,
        ambulanceService: false,
        departments: [
          {
            name: 'Primary Care',
            description: 'General health consultations',
            headDoctor: 'Dr. Ayesha Khan',
            contactNumber: '+92-51-1234569'
          },
          {
            name: 'Pediatrics',
            description: 'Child healthcare services',
            headDoctor: 'Dr. Ali Raza',
            contactNumber: '+92-51-1234570'
          }
        ],
        doctors: [
          {
            name: 'Dr. Ayesha Khan',
            specialization: 'Family Medicine',
            qualification: 'MBBS, MCPS',
            experience: '10 years',
            contactNumber: '+92-300-1234571',
            email: 'ayesha.khan@communityclinic.com'
          },
          {
            name: 'Dr. Ali Raza',
            specialization: 'Pediatrics',
            qualification: 'MBBS, FCPS Pediatrics',
            experience: '8 years',
            contactNumber: '+92-300-1234572',
            email: 'ali.raza@communityclinic.com'
          }
        ],
        owner: testUser._id,
        ownerName: testUser.username || testUser.email,
        ownerEmail: testUser.email,
        ownerPhone: testUser.mobile || '',
        approvalStatus: 'pending',
        agentId: generateHospitalAgentId('Community Health Clinic')
      }
    ];

    console.log('📊 Creating test hospitals...');
    for (const hospitalData of testHospitals) {
      const hospital = new Hospital(hospitalData);
      const savedHospital = await hospital.save();
      console.log(`✅ Created hospital: "${savedHospital.name}" with Agent ID: ${savedHospital.agentId}`);
    }

    console.log('\n🎉 Test hospitals created successfully!');
    console.log('📋 Summary:');
    console.log(`   - Created ${testHospitals.length} test hospitals`);
    console.log('🔍 You can now check the admin panel to see Hospital Agent IDs displayed');

  } catch (error) {
    console.error('❌ Error creating test hospitals:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  createTestHospitals();
}

module.exports = { createTestHospitals };

const mongoose = require('mongoose');
const Institute = require('../models/Institute');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const checkInstituteImages = async () => {
  try {
    console.log('Checking institute images...');
    
    const institutes = await Institute.find({});
    console.log(`Found ${institutes.length} institutes`);
    
    for (const institute of institutes) {
      console.log(`\n--- Institute: ${institute.name} ---`);
      console.log(`Logo: ${institute.logo || 'No logo'}`);
      console.log(`Banner: ${institute.banner || 'No banner'}`);
      console.log(`Gallery: ${institute.gallery ? institute.gallery.length : 0} images`);
      
      if (institute.gallery && institute.gallery.length > 0) {
        institute.gallery.forEach((img, index) => {
          console.log(`  Gallery ${index + 1}: ${img}`);
        });
      }
      
      // Check if images are local or cloudinary
      const isLocalLogo = institute.logo && institute.logo.startsWith('/uploads/');
      const isLocalBanner = institute.banner && institute.banner.startsWith('/uploads/');
      const isCloudinaryLogo = institute.logo && institute.logo.includes('cloudinary.com');
      const isCloudinaryBanner = institute.banner && institute.banner.includes('cloudinary.com');
      
      console.log(`Logo type: ${isLocalLogo ? 'LOCAL' : isCloudinaryLogo ? 'CLOUDINARY' : 'NONE'}`);
      console.log(`Banner type: ${isLocalBanner ? 'LOCAL' : isCloudinaryBanner ? 'CLOUDINARY' : 'NONE'}`);
    }
    
    console.log('\n=== SUMMARY ===');
    const localImages = institutes.filter(i => 
      (i.logo && i.logo.startsWith('/uploads/')) || 
      (i.banner && i.banner.startsWith('/uploads/'))
    );
    const cloudinaryImages = institutes.filter(i => 
      (i.logo && i.logo.includes('cloudinary.com')) || 
      (i.banner && i.banner.includes('cloudinary.com'))
    );
    
    console.log(`Institutes with local images: ${localImages.length}`);
    console.log(`Institutes with Cloudinary images: ${cloudinaryImages.length}`);
    
  } catch (error) {
    console.error('Error checking images:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkInstituteImages();

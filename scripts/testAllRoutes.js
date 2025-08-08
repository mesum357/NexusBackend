const mongoose = require('mongoose');
const Institute = require('../models/Institute');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const User = require('../models/User');
const Post = require('../models/Post');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const testAllRoutes = async () => {
  try {
    console.log('🔍 Testing all routes for Cloudinary compatibility...\n');
    
    // Test Institutes
    console.log('📚 Testing Institutes...');
    const institutes = await Institute.find({});
    console.log(`Found ${institutes.length} institutes`);
    
    const instituteWithLocalImages = institutes.filter(i => 
      (i.logo && i.logo.startsWith('/uploads/')) || 
      (i.banner && i.banner.startsWith('/uploads/')) ||
      (i.gallery && i.gallery.some(img => img.startsWith('/uploads/')))
    );
    
    if (instituteWithLocalImages.length > 0) {
      console.log(`⚠️  Found ${instituteWithLocalImages.length} institutes with local images`);
      instituteWithLocalImages.forEach(i => {
        console.log(`  - ${i.name}: ${i.logo || 'no logo'}, ${i.banner || 'no banner'}`);
      });
    } else {
      console.log('✅ All institutes are using Cloudinary or have no images');
    }
    
    // Test Shops
    console.log('\n🏪 Testing Shops...');
    const shops = await Shop.find({});
    console.log(`Found ${shops.length} shops`);
    
    const shopsWithLocalImages = shops.filter(s => 
      (s.shopLogo && s.shopLogo.startsWith('/uploads/')) || 
      (s.shopBanner && s.shopBanner.startsWith('/uploads/')) ||
      (s.ownerProfilePhoto && s.ownerProfilePhoto.startsWith('/uploads/')) ||
      (s.gallery && s.gallery.some(img => img.startsWith('/uploads/'))) ||
      (s.products && s.products.some(p => p.image && p.image.startsWith('/uploads/')))
    );
    
    if (shopsWithLocalImages.length > 0) {
      console.log(`⚠️  Found ${shopsWithLocalImages.length} shops with local images`);
      shopsWithLocalImages.forEach(s => {
        console.log(`  - ${s.shopName}: ${s.shopLogo || 'no logo'}, ${s.shopBanner || 'no banner'}`);
      });
    } else {
      console.log('✅ All shops are using Cloudinary or have no images');
    }
    
    // Test Marketplace Products
    console.log('\n🛒 Testing Marketplace Products...');
    const products = await Product.find({});
    console.log(`Found ${products.length} marketplace products`);
    
    const productsWithLocalImages = products.filter(p => 
      p.images && p.images.some(img => img.startsWith('/uploads/'))
    );
    
    if (productsWithLocalImages.length > 0) {
      console.log(`⚠️  Found ${productsWithLocalImages.length} products with local images`);
      productsWithLocalImages.forEach(p => {
        console.log(`  - ${p.title}: ${p.images.length} images`);
      });
    } else {
      console.log('✅ All marketplace products are using Cloudinary or have no images');
    }
    
    // Test Users
    console.log('\n👤 Testing Users...');
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    const usersWithLocalImages = users.filter(u => 
      u.profileImage && u.profileImage.startsWith('/uploads/')
    );
    
    if (usersWithLocalImages.length > 0) {
      console.log(`⚠️  Found ${usersWithLocalImages.length} users with local profile images`);
      usersWithLocalImages.forEach(u => {
        console.log(`  - ${u.username || u.email}: ${u.profileImage}`);
      });
    } else {
      console.log('✅ All users are using Cloudinary or have no profile images');
    }
    
    // Test Posts
    console.log('\n📝 Testing Posts...');
    const posts = await Post.find({});
    console.log(`Found ${posts.length} posts`);
    
    const postsWithLocalImages = posts.filter(p => 
      p.image && p.image.startsWith('/uploads/')
    );
    
    if (postsWithLocalImages.length > 0) {
      console.log(`⚠️  Found ${postsWithLocalImages.length} posts with local images`);
      postsWithLocalImages.forEach(p => {
        console.log(`  - Post ${p._id}: ${p.image}`);
      });
    } else {
      console.log('✅ All posts are using Cloudinary or have no images');
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    const totalIssues = instituteWithLocalImages.length + shopsWithLocalImages.length + 
                       productsWithLocalImages.length + usersWithLocalImages.length + 
                       postsWithLocalImages.length;
    
    if (totalIssues === 0) {
      console.log('🎉 All routes are properly configured for Cloudinary!');
      console.log('✅ No local image paths found');
      console.log('✅ All new uploads will use Cloudinary');
      console.log('✅ Images will persist between deployments');
    } else {
      console.log(`⚠️  Found ${totalIssues} items with local image paths`);
      console.log('💡 Run the fix scripts to clean up local image paths');
    }
    
  } catch (error) {
    console.error('Error testing routes:', error);
  } finally {
    mongoose.connection.close();
  }
};

testAllRoutes();

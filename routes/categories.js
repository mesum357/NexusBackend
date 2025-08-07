const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { ensureAuthenticated } = require('../middleware/auth');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ section: 1, order: 1, label: 1 });
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get categories by section
router.get('/section/:section', async (req, res) => {
  try {
    const categories = await Category.find({ 
      section: req.params.section, 
      isActive: true 
    }).sort({ order: 1, label: 1 });
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories by section:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create a new category (Admin only)
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { value, label, icon, section, order } = req.body;
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ value });
    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' });
    }
    
    const category = new Category({
      value,
      label,
      icon,
      section,
      order: order || 0
    });
    
    await category.save();
    res.status(201).json({ category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a category (Admin only)
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { value, label, icon, section, order, isActive } = req.body;
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { value, label, icon, section, order, isActive },
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category (Admin only)
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Initialize categories with default data
router.post('/initialize', ensureAuthenticated, async (req, res) => {
  try {
    const defaultCategories = [
      // Food & Beverages
      { value: "Restaurants & Cafes", label: "Restaurants & Cafes", icon: "🍽️", section: "Food & Beverages", order: 1 },
      { value: "Fast Food", label: "Fast Food", icon: "🍔", section: "Food & Beverages", order: 2 },
      { value: "Bakery & Pastries", label: "Bakery & Pastries", icon: "🥐", section: "Food & Beverages", order: 3 },
      { value: "Coffee & Tea", label: "Coffee & Tea", icon: "☕", section: "Food & Beverages", order: 4 },
      { value: "Ice Cream & Desserts", label: "Ice Cream & Desserts", icon: "🍦", section: "Food & Beverages", order: 5 },
      { value: "Street Food", label: "Street Food", icon: "🌮", section: "Food & Beverages", order: 6 },
      { value: "Catering Services", label: "Catering Services", icon: "🍱", section: "Food & Beverages", order: 7 },
      { value: "Food Delivery", label: "Food Delivery", icon: "🚚", section: "Food & Beverages", order: 8 },

      // Fashion & Clothing
      { value: "Men's Clothing", label: "Men's Clothing", icon: "👔", section: "Fashion & Clothing", order: 1 },
      { value: "Women's Clothing", label: "Women's Clothing", icon: "👗", section: "Fashion & Clothing", order: 2 },
      { value: "Kids & Baby Clothing", label: "Kids & Baby Clothing", icon: "👶", section: "Fashion & Clothing", order: 3 },
      { value: "Shoes & Footwear", label: "Shoes & Footwear", icon: "👟", section: "Fashion & Clothing", order: 4 },
      { value: "Jewelry & Accessories", label: "Jewelry & Accessories", icon: "💍", section: "Fashion & Clothing", order: 5 },
      { value: "Bags & Handbags", label: "Bags & Handbags", icon: "👜", section: "Fashion & Clothing", order: 6 },
      { value: "Watches", label: "Watches", icon: "⌚", section: "Fashion & Clothing", order: 7 },
      { value: "Traditional Wear", label: "Traditional Wear", icon: "👘", section: "Fashion & Clothing", order: 8 },

      // Electronics & Technology
      { value: "Mobile Phones", label: "Mobile Phones", icon: "📱", section: "Electronics & Technology", order: 1 },
      { value: "Computers & Laptops", label: "Computers & Laptops", icon: "💻", section: "Electronics & Technology", order: 2 },
      { value: "Gaming & Consoles", label: "Gaming & Consoles", icon: "🎮", section: "Electronics & Technology", order: 3 },
      { value: "Audio & Speakers", label: "Audio & Speakers", icon: "🔊", section: "Electronics & Technology", order: 4 },
      { value: "Cameras & Photography", label: "Cameras & Photography", icon: "📷", section: "Electronics & Technology", order: 5 },
      { value: "TV & Home Entertainment", label: "TV & Home Entertainment", icon: "📺", section: "Electronics & Technology", order: 6 },
      { value: "Smart Home Devices", label: "Smart Home Devices", icon: "🏠", section: "Electronics & Technology", order: 7 },
      { value: "Computer Accessories", label: "Computer Accessories", icon: "🖱️", section: "Electronics & Technology", order: 8 },

      // Home & Garden
      { value: "Furniture", label: "Furniture", icon: "🪑", section: "Home & Garden", order: 1 },
      { value: "Home Decor", label: "Home Decor", icon: "🖼️", section: "Home & Garden", order: 2 },
      { value: "Kitchen & Dining", label: "Kitchen & Dining", icon: "🍴", section: "Home & Garden", order: 3 },
      { value: "Bedding & Bath", label: "Bedding & Bath", icon: "🛏️", section: "Home & Garden", order: 4 },
      { value: "Garden & Outdoor", label: "Garden & Outdoor", icon: "🌱", section: "Home & Garden", order: 5 },
      { value: "Lighting", label: "Lighting", icon: "💡", section: "Home & Garden", order: 6 },
      { value: "Storage & Organization", label: "Storage & Organization", icon: "📦", section: "Home & Garden", order: 7 },
      { value: "Tools & Hardware", label: "Tools & Hardware", icon: "🔧", section: "Home & Garden", order: 8 },

      // Beauty & Personal Care
      { value: "Skincare", label: "Skincare", icon: "🧴", section: "Beauty & Personal Care", order: 1 },
      { value: "Makeup & Cosmetics", label: "Makeup & Cosmetics", icon: "💄", section: "Beauty & Personal Care", order: 2 },
      { value: "Hair Care", label: "Hair Care", icon: "💇‍♀️", section: "Beauty & Personal Care", order: 3 },
      { value: "Fragrances", label: "Fragrances", icon: "🌸", section: "Beauty & Personal Care", order: 4 },
      { value: "Beauty Tools", label: "Beauty Tools", icon: "✂️", section: "Beauty & Personal Care", order: 5 },
      { value: "Salon Services", label: "Salon Services", icon: "💅", section: "Beauty & Personal Care", order: 6 },
      { value: "Spa & Wellness", label: "Spa & Wellness", icon: "🧖‍♀️", section: "Beauty & Personal Care", order: 7 },
      { value: "Personal Hygiene", label: "Personal Hygiene", icon: "🧼", section: "Beauty & Personal Care", order: 8 },

      // Sports & Outdoors
      { value: "Sports Equipment", label: "Sports Equipment", icon: "⚽", section: "Sports & Outdoors", order: 1 },
      { value: "Fitness & Gym", label: "Fitness & Gym", icon: "💪", section: "Sports & Outdoors", order: 2 },
      { value: "Outdoor Recreation", label: "Outdoor Recreation", icon: "🏕️", section: "Sports & Outdoors", order: 3 },
      { value: "Cycling", label: "Cycling", icon: "🚴", section: "Sports & Outdoors", order: 4 },
      { value: "Swimming", label: "Swimming", icon: "🏊", section: "Sports & Outdoors", order: 5 },
      { value: "Hiking & Camping", label: "Hiking & Camping", icon: "⛰️", section: "Sports & Outdoors", order: 6 },
      { value: "Water Sports", label: "Water Sports", icon: "🏄", section: "Sports & Outdoors", order: 7 },
      { value: "Winter Sports", label: "Winter Sports", icon: "⛷️", section: "Sports & Outdoors", order: 8 },

      // Books & Media
      { value: "Books & Literature", label: "Books & Literature", icon: "📚", section: "Books & Media", order: 1 },
      { value: "Magazines & Newspapers", label: "Magazines & Newspapers", icon: "📰", section: "Books & Media", order: 2 },
      { value: "Music & Instruments", label: "Music & Instruments", icon: "🎵", section: "Books & Media", order: 3 },
      { value: "Movies & DVDs", label: "Movies & DVDs", icon: "🎬", section: "Books & Media", order: 4 },
      { value: "Educational Materials", label: "Educational Materials", icon: "📖", section: "Books & Media", order: 5 },
      { value: "Art Supplies", label: "Art Supplies", icon: "🎨", section: "Books & Media", order: 6 },
      { value: "Stationery", label: "Stationery", icon: "✏️", section: "Books & Media", order: 7 },
      { value: "Gaming & Toys", label: "Gaming & Toys", icon: "🧸", section: "Books & Media", order: 8 },

      // Automotive
      { value: "Cars & Vehicles", label: "Cars & Vehicles", icon: "🚗", section: "Automotive", order: 1 },
      { value: "Motorcycles", label: "Motorcycles", icon: "🏍️", section: "Automotive", order: 2 },
      { value: "Auto Parts", label: "Auto Parts", icon: "🔧", section: "Automotive", order: 3 },
      { value: "Auto Services", label: "Auto Services", icon: "🔧", section: "Automotive", order: 4 },
      { value: "Car Wash", label: "Car Wash", icon: "🚿", section: "Automotive", order: 5 },
      { value: "Fuel Stations", label: "Fuel Stations", icon: "⛽", section: "Automotive", order: 6 },
      { value: "Tires & Wheels", label: "Tires & Wheels", icon: "🛞", section: "Automotive", order: 7 },
      { value: "Auto Accessories", label: "Auto Accessories", icon: "🎵", section: "Automotive", order: 8 },

      // Health & Wellness
      { value: "Pharmacy", label: "Pharmacy", icon: "💊", section: "Health & Wellness", order: 1 },
      { value: "Medical Equipment", label: "Medical Equipment", icon: "🏥", section: "Health & Wellness", order: 2 },
      { value: "Health Supplements", label: "Health Supplements", icon: "💊", section: "Health & Wellness", order: 3 },
      { value: "Fitness & Nutrition", label: "Fitness & Nutrition", icon: "🥗", section: "Health & Wellness", order: 4 },
      { value: "Mental Health", label: "Mental Health", icon: "🧠", section: "Health & Wellness", order: 5 },
      { value: "Alternative Medicine", label: "Alternative Medicine", icon: "🌿", section: "Health & Wellness", order: 6 },
      { value: "Dental Care", label: "Dental Care", icon: "🦷", section: "Health & Wellness", order: 7 },
      { value: "Optical Services", label: "Optical Services", icon: "👓", section: "Health & Wellness", order: 8 },

      // Education & Training
      { value: "Schools & Universities", label: "Schools & Universities", icon: "🎓", section: "Education & Training", order: 1 },
      { value: "Tutoring Services", label: "Tutoring Services", icon: "📝", section: "Education & Training", order: 2 },
      { value: "Language Learning", label: "Language Learning", icon: "🗣️", section: "Education & Training", order: 3 },
      { value: "Online Courses", label: "Online Courses", icon: "💻", section: "Education & Training", order: 4 },
      { value: "Vocational Training", label: "Vocational Training", icon: "🔨", section: "Education & Training", order: 5 },
      { value: "Music Lessons", label: "Music Lessons", icon: "🎼", section: "Education & Training", order: 6 },
      { value: "Art Classes", label: "Art Classes", icon: "🎨", section: "Education & Training", order: 7 },
      { value: "Sports Training", label: "Sports Training", icon: "⚽", section: "Education & Training", order: 8 },

      // Professional Services
      { value: "Legal Services", label: "Legal Services", icon: "⚖️", section: "Professional Services", order: 1 },
      { value: "Accounting & Tax", label: "Accounting & Tax", icon: "💰", section: "Professional Services", order: 2 },
      { value: "Consulting", label: "Consulting", icon: "💼", section: "Professional Services", order: 3 },
      { value: "Real Estate", label: "Real Estate", icon: "🏠", section: "Professional Services", order: 4 },
      { value: "Insurance", label: "Insurance", icon: "🛡️", section: "Professional Services", order: 5 },
      { value: "Banking & Finance", label: "Banking & Finance", icon: "🏦", section: "Professional Services", order: 6 },
      { value: "Marketing & Advertising", label: "Marketing & Advertising", icon: "📢", section: "Professional Services", order: 7 },
      { value: "IT & Software", label: "IT & Software", icon: "💻", section: "Professional Services", order: 8 },

      // Entertainment
      { value: "Cinemas & Theaters", label: "Cinemas & Theaters", icon: "🎭", section: "Entertainment", order: 1 },
      { value: "Gaming Centers", label: "Gaming Centers", icon: "🎮", section: "Entertainment", order: 2 },
      { value: "Amusement Parks", label: "Amusement Parks", icon: "🎢", section: "Entertainment", order: 3 },
      { value: "Event Planning", label: "Event Planning", icon: "🎉", section: "Entertainment", order: 4 },
      { value: "Photography Services", label: "Photography Services", icon: "📸", section: "Entertainment", order: 5 },
      { value: "DJ & Music", label: "DJ & Music", icon: "🎧", section: "Entertainment", order: 6 },
      { value: "Party Supplies", label: "Party Supplies", icon: "🎈", section: "Entertainment", order: 7 },
      { value: "Karaoke", label: "Karaoke", icon: "🎤", section: "Entertainment", order: 8 },

      // Travel & Tourism
      { value: "Hotels & Accommodation", label: "Hotels & Accommodation", icon: "🏨", section: "Travel & Tourism", order: 1 },
      { value: "Travel Agencies", label: "Travel Agencies", icon: "✈️", section: "Travel & Tourism", order: 2 },
      { value: "Tourist Attractions", label: "Tourist Attractions", icon: "🗺️", section: "Travel & Tourism", order: 3 },
      { value: "Transportation", label: "Transportation", icon: "🚌", section: "Travel & Tourism", order: 4 },
      { value: "Car Rental", label: "Car Rental", icon: "🚗", section: "Travel & Tourism", order: 5 },
      { value: "Tour Guides", label: "Tour Guides", icon: "👥", section: "Travel & Tourism", order: 6 },
      { value: "Adventure Tours", label: "Adventure Tours", icon: "🧗", section: "Travel & Tourism", order: 7 },
      { value: "Cultural Tours", label: "Cultural Tours", icon: "🏛️", section: "Travel & Tourism", order: 8 },

      // Pet Services
      { value: "Pet Food & Supplies", label: "Pet Food & Supplies", icon: "🐕", section: "Pet Services", order: 1 },
      { value: "Pet Grooming", label: "Pet Grooming", icon: "✂️", section: "Pet Services", order: 2 },
      { value: "Veterinary Services", label: "Veterinary Services", icon: "🐾", section: "Pet Services", order: 3 },
      { value: "Pet Training", label: "Pet Training", icon: "🎾", section: "Pet Services", order: 4 },
      { value: "Pet Boarding", label: "Pet Boarding", icon: "🏠", section: "Pet Services", order: 5 },
      { value: "Pet Accessories", label: "Pet Accessories", icon: "🦴", section: "Pet Services", order: 6 },
      { value: "Aquarium & Fish", label: "Aquarium & Fish", icon: "🐠", section: "Pet Services", order: 7 },
      { value: "Bird Supplies", label: "Bird Supplies", icon: "🦜", section: "Pet Services", order: 8 },

      // Religious & Cultural
      { value: "Religious Items", label: "Religious Items", icon: "🕯️", section: "Religious & Cultural", order: 1 },
      { value: "Islamic Centers", label: "Islamic Centers", icon: "🕌", section: "Religious & Cultural", order: 2 },
      { value: "Cultural Events", label: "Cultural Events", icon: "🎭", section: "Religious & Cultural", order: 3 },
      { value: "Traditional Crafts", label: "Traditional Crafts", icon: "🧵", section: "Religious & Cultural", order: 4 },
      { value: "Religious Services", label: "Religious Services", icon: "🙏", section: "Religious & Cultural", order: 5 },
      { value: "Cultural Workshops", label: "Cultural Workshops", icon: "🎨", section: "Religious & Cultural", order: 6 },
      { value: "Festival Supplies", label: "Festival Supplies", icon: "🎊", section: "Religious & Cultural", order: 7 },
      { value: "Traditional Clothing", label: "Traditional Clothing", icon: "👘", section: "Religious & Cultural", order: 8 },

      // Miscellaneous
      { value: "Gift Shops", label: "Gift Shops", icon: "🎁", section: "Miscellaneous", order: 1 },
      { value: "Antiques & Collectibles", label: "Antiques & Collectibles", icon: "🏺", section: "Miscellaneous", order: 2 },
      { value: "Thrift Stores", label: "Thrift Stores", icon: "🛍️", section: "Miscellaneous", order: 3 },
      { value: "Repair Services", label: "Repair Services", icon: "🔧", section: "Miscellaneous", order: 4 },
      { value: "Cleaning Services", label: "Cleaning Services", icon: "🧹", section: "Miscellaneous", order: 5 },
      { value: "Security Services", label: "Security Services", icon: "🔒", section: "Miscellaneous", order: 6 },
      { value: "Printing & Copying", label: "Printing & Copying", icon: "🖨️", section: "Miscellaneous", order: 7 },
      { value: "Other", label: "Other", icon: "📋", section: "Miscellaneous", order: 8 }
    ];

    // Clear existing categories
    await Category.deleteMany({});
    
    // Insert default categories
    const insertedCategories = await Category.insertMany(defaultCategories);
    
    res.json({ 
      message: 'Categories initialized successfully', 
      count: insertedCategories.length 
    });
  } catch (error) {
    console.error('Error initializing categories:', error);
    res.status(500).json({ error: 'Failed to initialize categories' });
  }
});

module.exports = router;

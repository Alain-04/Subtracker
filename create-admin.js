// Script to create the first admin user
// Run with: node create-admin.js

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/subtrack';

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get username from command line or use default
    const username = process.argv[2] || 'admin';
    
    // Check if user exists
    let user = await User.findOne({ username });
    
    if (user) {
      // Update existing user to admin
      user.role = 'admin';
      await user.save();
      console.log(`✅ User "${username}" is now an admin!`);
    } else {
      console.log(`❌ User "${username}" not found.`);
      console.log('Please create the user first through the signup page, then run this script again.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();


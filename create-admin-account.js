// Script to create an admin account
// Run with: node create-admin-account.js

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/subtrack';

async function createAdminAccount() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const username = 'admin123';
    const password = 'adminpass2520';
    const email = 'admin123@subtrack.com'; // Using a default email since it's required

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (user) {
      // Update existing user to admin
      user.username = username;
      user.password = password; // Will be hashed by the pre-save hook
      user.email = email;
      user.role = 'admin';
      user.subscriptionPlan = 'standard'; // Admin gets standard plan
      user.isActive = true;
      await user.save();
      console.log(`✅ Updated user "${username}" to admin!`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: admin`);
    } else {
      // Create new admin user
      user = new User({
        username: username,
        email: email,
        password: password, // Will be hashed by the pre-save hook
        role: 'admin',
        subscriptionPlan: 'standard', // Admin gets standard plan
        isActive: true
      });
      
      await user.save();
      console.log(`✅ Admin account created successfully!`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Email: ${email}`);
      console.log(`   Role: admin`);
    }

    console.log('\n🎉 You can now login with:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('\n📊 After login, go to Profile page and click "Admin Dashboard" to see all stats!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   A user with this username or email already exists.');
    }
    process.exit(1);
  }
}

createAdminAccount();


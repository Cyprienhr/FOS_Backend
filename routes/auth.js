const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Utility function to generate OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// In production, use a service like Twilio to send SMS
// For now, we'll log it to console and store in database
function sendOTP(phoneNumber, otp) {
  console.log(`[OTP SENT] Phone: ${phoneNumber}, OTP: ${otp}`);
  // In production: implement actual SMS sending
  return otp;
}

// Register Farmer
router.post('/register-farmer', async (req, res) => {
  try {
    const { phoneNumber, fullName, landArea, email } = req.body;

    // Validate input
    if (!phoneNumber || !fullName || !landArea) {
      return res.status(400).json({ message: 'Phone, name, and land area are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Create new farmer user
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const user = new User({
      phoneNumber,
      fullName,
      landArea,
      email,
      userType: 'farmer',
      isVerified: true, // Auto-verify for mocked OTP in development
      otp: {
        code: otp,
        expiresAt: otpExpiry,
        attempts: 0
      }
    });

    await user.save();

    // Send OTP (logged to console for now)
    sendOTP(phoneNumber, otp);

    // Generate JWT token for immediate login
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber, userType: user.userType },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful. You are now logged in.',
      userId: user._id,
      token: token, // Provide immediate login token
      otp: otp, // For testing/development only
      otpExpiry: otpExpiry,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        userType: user.userType,
        landArea: user.landArea
      },
      devNote: 'User auto-verified in development mode. OTP displayed for reference.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP and Login
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check OTP expiry
    if (!user.otp || new Date() > user.otp.expiresAt) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    // Check attempts
    if (user.otp.attempts >= 3) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (user.otp.code !== otp) {
      user.otp.attempts += 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Mark user as verified and clear OTP
    user.isVerified = true;
    user.otp = { code: '', expiresAt: new Date(), attempts: 0 };
    await user.save();

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber, userType: user.userType },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        userType: user.userType,
        landArea: user.landArea
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Request new OTP
router.post('/request-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: 'Phone number not registered' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otp = {
      code: otp,
      expiresAt: otpExpiry,
      attempts: 0
    };

    await user.save();

    // Send OTP
    sendOTP(phoneNumber, otp);

    res.json({
      message: 'New OTP sent to your phone',
      otp: otp, // For testing/development only
      otpExpiry: otpExpiry,
      devNote: 'OTP displayed here for testing. In production, this would be sent via SMS.'
    });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Login (hardcoded credentials as per requirements)
router.post('/admin-login', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    const ADMIN_PHONE = '25078815000';
    const ADMIN_OTP = '0001';

    if (phoneNumber !== ADMIN_PHONE || otp !== ADMIN_OTP) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if admin exists, if not create
    let admin = await User.findOne({ phoneNumber: ADMIN_PHONE });

    if (!admin) {
      admin = new User({
        phoneNumber: ADMIN_PHONE,
        fullName: 'System Admin',
        userType: 'admin',
        isVerified: true
      });
      await admin.save();
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: admin._id, phoneNumber: admin.phoneNumber, userType: 'admin' },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      user: {
        id: admin._id,
        phoneNumber: admin.phoneNumber,
        fullName: admin.fullName,
        userType: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

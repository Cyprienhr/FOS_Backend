const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^\+?[0-9]{7,15}$/,
    trim: true
  },
  fullName: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['farmer', 'admin'],
    required: true
  },
  email: {
    type: String,
    sparse: true
  },
  landArea: {
    type: Number,
    required: function() {
      return this.userType === 'farmer';
    }
  },
  otp: {
    code: String,
    expiresAt: Date,
    attempts: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);

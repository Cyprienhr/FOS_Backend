const mongoose = require('mongoose');

const fertilizerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  ratePerHectare: {
    type: Number,
    required: true,
    description: 'Rate per hectare of land'
  },
  unit: {
    type: String,
    default: 'kg',
    description: 'Unit of fertilizer (kg, bags, etc.)'
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedByAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Fertilizer', fertilizerSchema);

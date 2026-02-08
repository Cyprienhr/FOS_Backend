const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmerName: {
    type: String,
    required: true
  },
  landArea: {
    type: Number,
    required: true
  },
  fertilizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fertilizer',
    required: true
  },
  fertilizerName: {
    type: String,
    required: true
  },
  ratePerUnit: {
    type: Number,
    required: true
  },
  quantityRequired: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending'
  },
  remarks: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
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

module.exports = mongoose.model('Order', orderSchema);

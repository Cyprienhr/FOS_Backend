const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Fertilizer = require('../models/Fertilizer');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Middleware to verify farmer
const verifyFarmer = (req, res, next) => {
  if (req.user.userType !== 'farmer') {
    return res.status(403).json({ message: 'Access denied. Farmers only.' });
  }
  next();
};

// Submit fertilizer order
router.post('/submit-order', authMiddleware, verifyFarmer, async (req, res) => {
  try {
    const { fertilizerId } = req.body;
    const farmerId = req.user.userId;

    // Get farmer details
    const farmer = await User.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Get fertilizer details
    const fertilizer = await Fertilizer.findById(fertilizerId);
    if (!fertilizer) {
      return res.status(404).json({ message: 'Fertilizer not found' });
    }

    // Calculate required quantity: landArea * ratePerHectare
    const quantityRequired = farmer.landArea * fertilizer.ratePerHectare;

    // Create order
    const order = new Order({
      farmerId,
      farmerName: farmer.fullName,
      landArea: farmer.landArea,
      fertilizerId,
      fertilizerName: fertilizer.name,
      ratePerUnit: fertilizer.ratePerHectare,
      quantityRequired,
      status: 'pending'
    });

    await order.save();

    res.status(201).json({
      message: 'Order submitted successfully',
      order: {
        id: order._id,
        fertilizer: fertilizer.name,
        quantity: quantityRequired,
        unit: fertilizer.unit,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Order submission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get farmer's orders
router.get('/my-orders', authMiddleware, verifyFarmer, async (req, res) => {
  try {
    const farmerId = req.user.userId;

    const orders = await Order.find({ farmerId })
      .populate('fertilizerId', 'name unit')
      .sort({ createdAt: -1 });

    res.json({
      orders: orders.map(order => ({
        id: order._id,
        fertilizer: order.fertilizerName,
        quantity: order.quantityRequired,
        unit: 'kg',
        ratePerUnit: order.ratePerUnit,
        status: order.status,
        remarks: order.remarks,
        createdAt: order.createdAt,
        approvedAt: order.approvedAt
      }))
    });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available fertilizers (for order form)
router.get('/fertilizers', authMiddleware, verifyFarmer, async (req, res) => {
  try {
    const fertilizers = await Fertilizer.find({ isActive: true });

    res.json({
      fertilizers: fertilizers.map(f => ({
        id: f._id,
        name: f.name,
        ratePerHectare: f.ratePerHectare,
        unit: f.unit,
        description: f.description
      }))
    });
  } catch (error) {
    console.error('Fetch fertilizers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get farmer profile
router.get('/profile', authMiddleware, verifyFarmer, async (req, res) => {
  try {
    const farmer = await User.findById(req.user.userId).select('-otp');

    res.json({
      farmer: {
        id: farmer._id,
        phoneNumber: farmer.phoneNumber,
        fullName: farmer.fullName,
        landArea: farmer.landArea,
        email: farmer.email,
        isVerified: farmer.isVerified
      }
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

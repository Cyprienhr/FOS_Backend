const express = require('express');
const Fertilizer = require('../models/Fertilizer');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Middleware to verify admin
const verifyAdmin = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};

// Get all orders with filters
router.get('/orders', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = status ? { status } : {};

    const orders = await Order.find(filter)
      .populate('farmerId', 'fullName phoneNumber landArea')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalOrders = await Order.countDocuments(filter);

    res.json({
      orders: orders.map(order => ({
        id: order._id,
        farmerName: order.farmerName,
        farmerPhone: order.farmerId?.phoneNumber,
        landArea: order.landArea,
        fertilizer: order.fertilizerName,
        quantity: order.quantityRequired,
        ratePerUnit: order.ratePerUnit,
        status: order.status,
        remarks: order.remarks,
        createdAt: order.createdAt,
        approvedAt: order.approvedAt
      })),
      pagination: {
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page
      }
    });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve order
router.post('/approve-order/:orderId', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { remarks = '' } = req.body;
    const adminId = req.user.userId;

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status: 'approved',
        remarks,
        approvedBy: adminId,
        approvedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      message: 'Order approved successfully',
      order: {
        id: order._id,
        status: order.status,
        approvedAt: order.approvedAt
      }
    });
  } catch (error) {
    console.error('Approve order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Decline order
router.post('/decline-order/:orderId', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { remarks = '' } = req.body;
    const adminId = req.user.userId;

    if (!remarks) {
      return res.status(400).json({ message: 'Remarks are required for declining an order' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status: 'declined',
        remarks,
        approvedBy: adminId,
        approvedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      message: 'Order declined successfully',
      order: {
        id: order._id,
        status: order.status,
        remarks: order.remarks
      }
    });
  } catch (error) {
    console.error('Decline order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard metrics
router.get('/metrics', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const approvedOrders = await Order.countDocuments({ status: 'approved' });
    const declinedOrders = await Order.countDocuments({ status: 'declined' });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    // Get weekly stats
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyOrders = await Order.countDocuments({ createdAt: { $gte: weekAgo } });

    // Calculate rates as percentages (two decimal places)
    const approvalRate = totalOrders > 0 ? ((approvedOrders / totalOrders) * 100).toFixed(2) : '0.00';
    const declinedRate = totalOrders > 0 ? ((declinedOrders / totalOrders) * 100).toFixed(2) : '0.00';
    const pendingRate = totalOrders > 0 ? ((pendingOrders / totalOrders) * 100).toFixed(02) : '0.00';

    res.json({
      metrics: {
        totalOrders,
        approvedOrders,
        declinedOrders,
        pendingOrders,
        weeklyOrders,
        approvalRate,
        declinedRate,
        pendingRate
      }
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Manage fertilizer rates - Get all
router.get('/fertilizers', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const fertilizers = await Fertilizer.find().sort({ createdAt: -1 });

    res.json({
      fertilizers: fertilizers.map(f => ({
        id: f._id,
        name: f.name,
        ratePerHectare: f.ratePerHectare,
        unit: f.unit,
        description: f.description,
        isActive: f.isActive,
        updatedAt: f.updatedAt
      }))
    });
  } catch (error) {
    console.error('Fetch fertilizers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add new fertilizer
router.post('/fertilizers', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { name, ratePerHectare, unit = 'kg', description = '' } = req.body;

    if (!name || !ratePerHectare) {
      return res.status(400).json({ message: 'Name and rate are required' });
    }

    const existingFertilizer = await Fertilizer.findOne({ name });
    if (existingFertilizer) {
      return res.status(400).json({ message: 'Fertilizer already exists' });
    }

    const fertilizer = new Fertilizer({
      name,
      ratePerHectare,
      unit,
      description,
      updatedByAdmin: req.user.userId
    });

    await fertilizer.save();

    res.status(201).json({
      message: 'Fertilizer added successfully',
      fertilizer: {
        id: fertilizer._id,
        name: fertilizer.name,
        ratePerHectare: fertilizer.ratePerHectare,
        unit: fertilizer.unit
      }
    });
  } catch (error) {
    console.error('Add fertilizer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update fertilizer rate
router.put('/fertilizers/:fertilizerId', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { ratePerHectare, description, isActive } = req.body;

    const fertilizer = await Fertilizer.findByIdAndUpdate(
      req.params.fertilizerId,
      {
        ...(ratePerHectare && { ratePerHectare }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        updatedByAdmin: req.user.userId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!fertilizer) {
      return res.status(404).json({ message: 'Fertilizer not found' });
    }

    res.json({
      message: 'Fertilizer updated successfully',
      fertilizer: {
        id: fertilizer._id,
        name: fertilizer.name,
        ratePerHectare: fertilizer.ratePerHectare,
        unit: fertilizer.unit,
        isActive: fertilizer.isActive
      }
    });
  } catch (error) {
    console.error('Update fertilizer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

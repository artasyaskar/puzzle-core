const express = require('express');
const { query } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all users (for team member selection)
router.get('/', auth, [
  query('search').optional().trim().escape(),
  query('role').optional().isIn(['admin', 'manager', 'developer', 'tester']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { isActive: true };

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { username: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }

    if (req.query.role) {
      filter.role = req.query.role;
    }

    const users = await User.find(filter)
      .select('username firstName lastName email role avatar lastLogin')
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' },
          roles: {
            $push: {
              role: '$_id',
              count: '$count'
            }
          }
        }
      }
    ]);

    const result = stats[0] || { total: 0, roles: [] };

    res.json({
      totalUsers: result.total,
      roleDistribution: result.roles
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get single user (for team member details)
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username firstName lastName email role avatar isActive lastLogin')
      .populate('projects', 'name status progress');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;

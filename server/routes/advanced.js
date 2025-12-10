const express = require('express');
const { query } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Prime number calculation endpoint
router.get('/primes', auth, [
  query('limit').optional().isInt({ min: 1, max: 10000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const limit = parseInt(req.query.limit) || 100;
    
    // Simple prime number calculation
    const isPrime = (n) => {
      if (n <= 1) return false;
      if (n <= 3) return true;
      if (n % 2 === 0 || n % 3 === 0) return false;
      for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
      }
      return true;
    };

    const primes = [];
    let num = 2;
    
    while (primes.length < limit) {
      if (isPrime(num)) {
        primes.push(num);
      }
      num++;
    }

    res.json({
      primes,
      limit,
      count: primes.length,
      maxPrime: Math.max(...primes)
    });
  } catch (error) {
    console.error('Prime calculation error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Project statistics endpoint
router.get('/stats', auth, [
  query('projectId').optional().isMongoId(),
  query('timeRange').optional().isIn(['week', 'month', 'quarter', 'year'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { projectId, timeRange } = req.query;
    
    // Build date filter based on time range
    let dateFilter = {};
    if (timeRange) {
      const now = new Date();
      let startDate;
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      if (startDate) {
        dateFilter.createdAt = { $gte: startDate };
      }
    }

    // Build project filter
    let projectFilter = {};
    if (projectId) {
      projectFilter._id = projectId;
    } else {
      // Get projects user has access to
      const userProjects = await Project.find({
        $or: [
          { owner: req.userId },
          { 'team.user': req.userId }
        ]
      }).select('_id');
      projectFilter._id = { $in: userProjects.map(p => p._id) };
    }

    // Get task statistics
    const taskStats = await Task.aggregate([
      { $match: { project: projectFilter._id, ...dateFilter } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgEstimatedHours: { $avg: '$estimatedHours' },
          avgActualHours: { $avg: '$actualHours' }
        }
      }
    ]);

    // Get project statistics
    const projectStats = await Project.aggregate([
      { $match: projectFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$progress' },
          totalBudget: { $sum: '$budget.allocated' },
          totalSpent: { $sum: '$budget.spent' }
        }
      }
    ]);

    // Get user workload statistics
    const workloadStats = await Task.aggregate([
      { $match: { project: projectFilter._id, assignee: { $exists: true } } },
      {
        $group: {
          _id: '$assignee',
          taskCount: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalEstimatedHours: { $sum: '$estimatedHours' },
          totalActualHours: { $sum: '$actualHours' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          taskCount: 1,
          completedTasks: 1,
          completionRate: {
            $cond: [
              { $eq: ['$taskCount', 0] },
              0,
              { $multiply: [{ $divide: ['$completedTasks', '$taskCount'] }, 100] }
            ]
          },
          totalEstimatedHours: 1,
          totalActualHours: 1,
          efficiency: {
            $cond: [
              { $eq: ['$totalActualHours', 0] },
              null,
              { $multiply: [{ $divide: ['$totalEstimatedHours', '$totalActualHours'] }, 100] }
            ]
          }
        }
      },
      { $sort: { taskCount: -1 } }
    ]);

    res.json({
      taskStatistics: taskStats,
      projectStatistics: projectStats,
      workloadStatistics: workloadStats,
      filters: {
        projectId,
        timeRange
      }
    });
  } catch (error) {
    console.error('Statistics calculation error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Advanced search endpoint
router.get('/search', auth, [
  query('q').notEmpty().trim().escape(),
  query('type').optional().isIn(['tasks', 'projects', 'users', 'all']),
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

    const { q, type = 'all', limit = 20 } = req.query;
    const searchRegex = new RegExp(q, 'i');
    const results = {};

    // Get user's accessible projects
    const userProjects = await Project.find({
      $or: [
        { owner: req.userId },
        { 'team.user': req.userId }
      ]
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);

    if (type === 'tasks' || type === 'all') {
      const tasks = await Task.find({
        project: { $in: projectIds },
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      })
      .populate('project', 'name')
      .populate('assignee', 'username firstName lastName')
      .limit(limit);

      results.tasks = tasks;
    }

    if (type === 'projects' || type === 'all') {
      const projects = await Project.find({
        _id: { $in: projectIds },
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      })
      .populate('owner', 'username firstName lastName')
      .populate('team.user', 'username firstName lastName')
      .limit(limit);

      results.projects = projects;
    }

    if (type === 'users' || type === 'all') {
      const users = await User.find({
        isActive: true,
        $or: [
          { username: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ]
      })
      .select('username firstName lastName email role avatar')
      .limit(limit);

      results.users = users;
    }

    res.json({
      query: q,
      type,
      results
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Performance metrics endpoint
router.get('/performance', auth, [
  query('timeRange').optional().isIn(['week', 'month', 'quarter', 'year'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { timeRange = 'month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    let groupFormat;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        groupFormat = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        break;
    }

    // Get user's accessible projects
    const userProjects = await Project.find({
      $or: [
        { owner: req.userId },
        { 'team.user': req.userId }
      ]
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);

    // Task completion trends
    const completionTrends = await Task.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupFormat,
          created: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Team productivity
    const teamProductivity = await Task.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          assignee: { $exists: true },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$assignee',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          avgCompletionTime: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$completedDate', null] }, { $ne: ['$createdAt', null] }] },
                { $divide: [{ $subtract: ['$completedDate', '$createdAt'] }, 1000 * 60 * 60 * 24] },
                null
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          totalTasks: 1,
          completedTasks: 1,
          completionRate: {
            $cond: [
              { $eq: ['$totalTasks', 0] },
              0,
              { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] }
            ]
          },
          avgCompletionTime: { $round: ['$avgCompletionTime', 2] }
        }
      },
      { $sort: { completedTasks: -1 } }
    ]);

    res.json({
      timeRange,
      completionTrends,
      teamProductivity
    });
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;

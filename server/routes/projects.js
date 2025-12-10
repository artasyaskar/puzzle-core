const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all projects (with filtering and pagination)
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['planning', 'in-progress', 'testing', 'completed', 'on-hold']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
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
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {
      $or: [
        { owner: req.userId },
        { 'team.user': req.userId }
      ]
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const projects = await Project.find(filter)
      .populate('owner', 'username firstName lastName')
      .populate('team.user', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Project.countDocuments(filter);

    res.json({
      projects,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'username firstName lastName email')
      .populate('team.user', 'username firstName lastName email role')
      .populate('milestones');

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user has access to this project
    const hasAccess = project.owner._id.toString() === req.userId ||
      project.team.some(member => member.user._id.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Get project tasks
    const tasks = await Task.find({ project: project._id })
      .populate('assignee', 'username firstName lastName')
      .populate('reporter', 'username firstName lastName');

    res.json({
      project: {
        ...project.toObject(),
        tasks
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Create new project
router.post('/', auth, [
  body('name').notEmpty().trim().escape(),
  body('description').notEmpty().trim().escape(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('endDate').optional().isISO8601().toDate(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, description, priority, endDate, tags } = req.body;

    const project = new Project({
      name,
      description,
      priority: priority || 'medium',
      endDate,
      tags: tags || [],
      owner: req.userId,
      team: [{ user: req.userId, role: 'lead' }]
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'username firstName lastName')
      .populate('team.user', 'username firstName lastName');

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Update project
router.put('/:id', auth, [
  body('name').optional().notEmpty().trim().escape(),
  body('description').optional().notEmpty().trim().escape(),
  body('status').optional().isIn(['planning', 'in-progress', 'testing', 'completed', 'on-hold']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('endDate').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user is owner or team lead
    const isOwner = project.owner.toString() === req.userId;
    const isTeamLead = project.team.some(member => 
      member.user.toString() === req.userId && member.role === 'lead'
    );

    if (!isOwner && !isTeamLead) {
      return res.status(403).json({
        error: 'Access denied. Only owner or team lead can update project'
      });
    }

    const { name, description, status, priority, endDate } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (endDate) updateData.endDate = endDate;

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'username firstName lastName')
     .populate('team.user', 'username firstName lastName');

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Add team member
router.post('/:id/team', auth, [
  body('userId').notEmpty().isMongoId(),
  body('role').optional().isIn(['lead', 'developer', 'tester', 'designer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user is owner or team lead
    const isOwner = project.owner.toString() === req.userId;
    const isTeamLead = project.team.some(member => 
      member.user.toString() === req.userId && member.role === 'lead'
    );

    if (!isOwner && !isTeamLead) {
      return res.status(403).json({
        error: 'Access denied. Only owner or team lead can add team members'
      });
    }

    const { userId, role } = req.body;
    project.addTeamMember(userId, role || 'developer');
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'username firstName lastName')
      .populate('team.user', 'username firstName lastName');

    res.json({
      message: 'Team member added successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Only owner can delete project
    if (project.owner.toString() !== req.userId) {
      return res.status(403).json({
        error: 'Access denied. Only owner can delete project'
      });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ project: project._id });

    // Delete project
    await Project.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;

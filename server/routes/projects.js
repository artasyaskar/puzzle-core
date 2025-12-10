const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.userId },
        { 'team.user': req.userId }
      ]
    }).populate('owner', 'username firstName lastName');

    res.json({
      projects,
      pagination: { page: 1, limit: 10, total: projects.length }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'username firstName lastName')
      .populate('team.user', 'username firstName lastName');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check access
    const hasAccess = project.owner._id.toString() === req.userId ||
                   project.team.some(member => member.user._id.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// Create project
router.post('/', auth, [
  body('name').notEmpty().withMessage('Project name is required'),
  body('description').notEmpty().withMessage('Project description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const { name, description, priority, tags, endDate } = req.body;

    const project = new Project({
      name,
      description,
      owner: req.userId,
      priority: priority || 'medium',
      tags: tags || [],
      endDate: endDate || null,
      team: [{ user: req.userId, role: 'lead' }]
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'username firstName lastName');

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

module.exports = router;

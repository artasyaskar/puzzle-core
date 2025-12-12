const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

const router = express.Router();

// Get tasks
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [
        { assignee: req.userId },
        { reporter: req.userId }
      ]
    }).populate('project', 'name');

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name')
      .populate('assignee', 'username firstName lastName')
      .populate('reporter', 'username firstName lastName');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// Create task
router.post('/', auth, [
  body('title').notEmpty().withMessage('Task title is required'),
  body('description').notEmpty().withMessage('Task description is required'),
  body('project').notEmpty().withMessage('Project is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const { title, description, project, priority, type, estimatedHours } = req.body;

    // Check if project exists
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const task = new Task({
      title,
      description,
      project,
      assignee: req.userId,
      reporter: req.userId,
      priority: priority || 'medium',
      type: type || 'feature',
      estimatedHours
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('project', 'name')
      .populate('assignee', 'username firstName lastName')
      .populate('reporter', 'username firstName lastName');

    res.status(201).json({
      message: 'Task created successfully',
      task: populatedTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', auth, [
  body('title').optional().notEmpty().withMessage('Task title is required'),
  body('description').optional().notEmpty().withMessage('Task description is required'),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'testing', 'completed', 'blocked']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee').optional().isMongoId(),
  body('estimatedHours').optional().isInt({ min: 0, max: 1000 }),
  body('actualHours').optional().isInt({ min: 0 }),
  body('dueDate').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const task = await Task.findById(req.params.id).populate('project');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has access to this task's project
    const hasAccess = task.project.owner.toString() === req.userId ||
      task.project.team.some(member => member.user.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, description, status, priority, assignee, estimatedHours, actualHours, dueDate } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (actualHours !== undefined) updateData.actualHours = actualHours;
    if (dueDate) updateData.dueDate = dueDate;

    // Handle status transition
    if (status) {
      const canTransition = task.updateStatus(status);
      if (!canTransition) {
        return res.status(400).json({ error: `Invalid status transition from ${task.status} to ${status}` });
      }
      updateData.status = status;
    }

    // Update assignee
    if (assignee) {
      updateData.assignee = assignee;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('project', 'name')
     .populate('assignee', 'username firstName lastName')
     .populate('reporter', 'username firstName lastName');

    // Update project progress
    await task.project.updateProgress();

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to task
router.post('/:id/comments', auth, [
  body('text').notEmpty().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const task = await Task.findById(req.params.id).populate('project');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has access to this task's project
    const hasAccess = task.project.owner.toString() === req.userId ||
      task.project.team.some(member => member.user.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { text } = req.body;
    await task.addComment(text, req.userId);

    const updatedTask = await Task.findById(task._id)
      .populate('comments.author', 'username firstName lastName');

    res.json({
      message: 'Comment added successfully',
      comments: updatedTask.comments
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add subtask
router.post('/:id/subtasks', auth, [
  body('title').notEmpty().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const task = await Task.findById(req.params.id).populate('project');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has access to this task's project
    const hasAccess = task.project.owner.toString() === req.userId ||
      task.project.team.some(member => member.user.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title } = req.body;
    task.subtasks.push({ title });
    await task.save();

    res.json({
      message: 'Subtask added successfully',
      subtasks: task.subtasks
    });
  } catch (error) {
    console.error('Add subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle subtask completion
router.put('/:id/subtasks/:subtaskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has access to this task's project
    const hasAccess = task.project.owner.toString() === req.userId ||
      task.project.team.some(member => member.user.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    subtask.completed = !subtask.completed;
    await task.save();

    res.json({
      message: 'Subtask updated successfully',
      subtasks: task.subtasks
    });
  } catch (error) {
    console.error('Toggle subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user is project owner or task reporter
    const isOwner = task.project.owner.toString() === req.userId;
    const isReporter = task.reporter.toString() === req.userId;

    if (!isOwner && !isReporter) {
      return res.status(403).json({ error: 'Access denied. Only project owner or task reporter can delete task' });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Update project progress
    await task.project.updateProgress();

    res.json({
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

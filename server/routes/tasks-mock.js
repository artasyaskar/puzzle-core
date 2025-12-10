const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Mock task storage
let tasks = [];

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all tasks
router.get('/', auth, (req, res) => {
  const userTasks = tasks.filter(t => t.assignee === req.userId || t.reporter === req.userId);
  res.json({ tasks: userTasks });
});

// Create task
router.post('/', auth, (req, res) => {
  const { title, description, project } = req.body;

  if (!title || !description || !project) {
    return res.status(400).json({ error: 'Validation failed' });
  }

  const newTask = {
    id: Date.now().toString(),
    title,
    description,
    project,
    assignee: req.userId,
    reporter: req.userId,
    createdAt: new Date()
  };

  tasks.push(newTask);

  res.status(201).json({
    message: 'Task created successfully',
    task: newTask
  });
});

module.exports = router;

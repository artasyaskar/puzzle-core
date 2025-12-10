const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Mock project storage
let projects = [];

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

// Get all projects
router.get('/', auth, (req, res) => {
  const userProjects = projects.filter(p => p.owner === req.userId);
  res.json({
    projects: userProjects,
    pagination: { page: 1, limit: 10, total: userProjects.length }
  });
});

// Create project
router.post('/', auth, (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: 'Validation failed' });
  }

  const newProject = {
    id: Date.now().toString(),
    name,
    description,
    owner: req.userId,
    createdAt: new Date()
  };

  projects.push(newProject);

  res.status(201).json({
    message: 'Project created successfully',
    project: newProject
  });
});

module.exports = router;

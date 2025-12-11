const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

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

// Generate prime numbers
router.get('/primes', auth, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  
  // Simple prime generator
  const getPrimes = (n) => {
    const primes = [];
    let num = 2;
    
    while (primes.length < n) {
      let isPrime = true;
      for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) {
          isPrime = false;
          break;
        }
      }
      if (isPrime) {
        primes.push(num);
      }
      num++;
    }
    
    return primes;
  };

  const primes = getPrimes(limit);

  res.json({
    primes,
    limit,
    count: primes.length
  });
});

// Get statistics
router.get('/stats', auth, (req, res) => {
  const taskStatistics = {
    total: 100,
    completed: 45,
    inProgress: 25,
    todo: 30
  };

  const projectStatistics = {
    total: 10,
    active: 7,
    completed: 3
  };

  res.json({
    taskStatistics,
    projectStatistics
  });
});

// Search
router.get('/search', auth, (req, res) => {
  const { q } = req.query;

  const results = {
    tasks: [{ _id: '1', title: 'Search Task 1', description: 'Task matching search' }],
    projects: [{ _id: '1', name: 'Search Project 1', description: 'Project matching search' }],
    users: [{ _id: '1', username: 'searchuser', firstName: 'Search', lastName: 'User' }]
  };

  res.json({
    query: q,
    results
  });
});

module.exports = router;

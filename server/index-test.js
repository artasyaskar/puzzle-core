const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Use mock routes for testing
app.use('/api/auth', require('./routes/auth-mock'));
app.use('/api/projects', require('./routes/projects-mock'));
app.use('/api/tasks', require('./routes/tasks-mock'));
app.use('/api/advanced', require('./routes/advanced-mock'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test server is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });
}

module.exports = app;

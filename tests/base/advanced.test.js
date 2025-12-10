const request = require('supertest');
const app = require('../../server/index');
const User = require('../../server/models/User');
const Project = require('../../server/models/Project');
const Task = require('../../server/models/Task');

describe('Advanced Endpoints', () => {
  let token;
  let user;
  let project;

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});

    // Create test user
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'developer'
    });
    await user.save();

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    token = loginResponse.body.token;

    // Create test project
    project = new Project({
      name: 'Test Project',
      description: 'A test project',
      owner: user._id,
      team: [{ user: user._id, role: 'lead' }]
    });
    await project.save();
  });

  describe('GET /api/advanced/primes', () => {
    it('should generate prime numbers successfully', async () => {
      const response = await request(app)
        .get('/api/advanced/primes?limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.primes).toBeDefined();
      expect(response.body.primes).toHaveLength(10);
      expect(response.body.limit).toBe(10);
      expect(response.body.count).toBe(10);
      expect(response.body.primes[0]).toBe(2);
      expect(response.body.primes[1]).toBe(3);
      expect(response.body.primes[2]).toBe(5);
    });

    it('should return default limit when not specified', async () => {
      const response = await request(app)
        .get('/api/advanced/primes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.primes).toHaveLength(100);
      expect(response.body.limit).toBe(100);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/advanced/primes?limit=15000')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/advanced/primes')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /api/advanced/stats', () => {
    beforeEach(async () => {
      // Create test tasks with different statuses
      await Task.create([
        {
          title: 'Task 1',
          description: 'First task',
          project: project._id,
          assignee: user._id,
          reporter: user._id,
          status: 'todo',
          priority: 'medium',
          estimatedHours: 8,
          actualHours: 6
        },
        {
          title: 'Task 2',
          description: 'Second task',
          project: project._id,
          assignee: user._id,
          reporter: user._id,
          status: 'in-progress',
          priority: 'high',
          estimatedHours: 12,
          actualHours: 8
        },
        {
          title: 'Task 3',
          description: 'Third task',
          project: project._id,
          assignee: user._id,
          reporter: user._id,
          status: 'completed',
          priority: 'low',
          estimatedHours: 4,
          actualHours: 5
        }
      ]);
    });

    it('should get statistics successfully', async () => {
      const response = await request(app)
        .get('/api/advanced/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.taskStatistics).toBeDefined();
      expect(response.body.projectStatistics).toBeDefined();
      expect(response.body.workloadStatistics).toBeDefined();
      expect(response.body.filters).toBeDefined();
    });

    it('should filter statistics by project', async () => {
      const response = await request(app)
        .get(`/api/advanced/stats?projectId=${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.taskStatistics).toBeDefined();
      expect(response.body.filters.projectId).toBe(project._id.toString());
    });

    it('should filter statistics by time range', async () => {
      const response = await request(app)
        .get('/api/advanced/stats?timeRange=week')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.taskStatistics).toBeDefined();
      expect(response.body.filters.timeRange).toBe('week');
    });

    it('should return error for invalid time range', async () => {
      const response = await request(app)
        .get('/api/advanced/stats?timeRange=invalid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/advanced/stats')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /api/advanced/search', () => {
    beforeEach(async () => {
      // Create test data for search
      await Task.create({
        title: 'Search Task',
        description: 'A task for testing search functionality',
        project: project._id,
        assignee: user._id,
        reporter: user._id,
        status: 'todo',
        priority: 'medium',
        tags: ['search', 'test']
      });

      await Project.create({
        name: 'Search Project',
        description: 'A project for testing search',
        owner: user._id,
        team: [{ user: user._id, role: 'lead' }],
        tags: ['search', 'testing']
      });
    });

    it('should search across all types successfully', async () => {
      const response = await request(app)
        .get('/api/advanced/search?q=search')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.query).toBe('search');
      expect(response.body.type).toBe('all');
      expect(response.body.results.tasks).toBeDefined();
      expect(response.body.results.projects).toBeDefined();
      expect(response.body.results.users).toBeDefined();
    });

    it('should search only tasks', async () => {
      const response = await request(app)
        .get('/api/advanced/search?q=search&type=tasks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.type).toBe('tasks');
      expect(response.body.results.tasks).toBeDefined();
      expect(response.body.results.projects).toBeUndefined();
      expect(response.body.results.users).toBeUndefined();
    });

    it('should return empty results for non-matching query', async () => {
      const response = await request(app)
        .get('/api/advanced/search?q=nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.results.tasks).toHaveLength(0);
      expect(response.body.results.projects).toHaveLength(0);
      expect(response.body.results.users).toHaveLength(0);
    });

    it('should validate search query parameter', async () => {
      const response = await request(app)
        .get('/api/advanced/search')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/advanced/search?q=test')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /api/advanced/performance', () => {
    beforeEach(async () => {
      // Create test tasks with different dates
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      await Task.create([
        {
          title: 'Recent Task',
          description: 'A recent task',
          project: project._id,
          assignee: user._id,
          reporter: user._id,
          status: 'completed',
          priority: 'medium',
          createdAt: lastWeek,
          completedDate: now
        },
        {
          title: 'Old Task',
          description: 'An older task',
          project: project._id,
          assignee: user._id,
          reporter: user._id,
          status: 'in-progress',
          priority: 'low',
          createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
      ]);
    });

    it('should get performance metrics successfully', async () => {
      const response = await request(app)
        .get('/api/advanced/performance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.timeRange).toBe('month');
      expect(response.body.completionTrends).toBeDefined();
      expect(response.body.teamProductivity).toBeDefined();
    });

    it('should filter performance by time range', async () => {
      const response = await request(app)
        .get('/api/advanced/performance?timeRange=week')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.timeRange).toBe('week');
      expect(response.body.completionTrends).toBeDefined();
      expect(response.body.teamProductivity).toBeDefined();
    });

    it('should return error for invalid time range', async () => {
      const response = await request(app)
        .get('/api/advanced/performance?timeRange=invalid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/advanced/performance')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });
  });
});

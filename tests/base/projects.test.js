const request = require('supertest');
const app = require('../../server/index');
const User = require('../../server/models/User');
const Project = require('../../server/models/Project');

describe('Projects Endpoints', () => {
  let token;
  let user;
  let project;

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});

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

  describe('GET /api/projects', () => {
    it('should get projects for authenticated user', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].name).toBe('Test Project');
      expect(response.body.pagination).toBeDefined();
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });

    it('should filter projects by status', async () => {
      // Create another project with different status
      const project2 = new Project({
        name: 'Completed Project',
        description: 'A completed project',
        status: 'completed',
        owner: user._id,
        team: [{ user: user._id, role: 'lead' }]
      });
      await project2.save();

      const response = await request(app)
        .get('/api/projects?status=completed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].name).toBe('Completed Project');
    });

    it('should filter projects by priority', async () => {
      // Create another project with different priority
      const project2 = new Project({
        name: 'High Priority Project',
        description: 'A high priority project',
        priority: 'high',
        owner: user._id,
        team: [{ user: user._id, role: 'lead' }]
      });
      await project2.save();

      const response = await request(app)
        .get('/api/projects?priority=high')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].name).toBe('High Priority Project');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get single project by ID', async () => {
      const response = await request(app)
        .get(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.project.name).toBe('Test Project');
      expect(response.body.project.owner.username).toBe('testuser');
    });

    it('should return error for non-existent project', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBe('Project not found');
    });

    it('should return error for project user does not have access to', async () => {
      // Create another user
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123',
        firstName: 'Other',
        lastName: 'User'
      });
      await otherUser.save();

      // Login as other user
      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'password123'
        });

      const otherToken = otherLoginResponse.body.token;

      // Try to access first user's project
      const response = await request(app)
        .get(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('POST /api/projects', () => {
    it('should create new project successfully', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A new project description',
        priority: 'high',
        endDate: '2024-12-31',
        tags: ['frontend', 'backend']
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData)
        .expect(201);

      expect(response.body.message).toBe('Project created successfully');
      expect(response.body.project.name).toBe('New Project');
      expect(response.body.project.priority).toBe('high');
      expect(response.body.project.tags).toEqual(['frontend', 'backend']);
    });

    it('should return error without authentication', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A new project description'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });

    it('should return error for missing required fields', async () => {
      const projectData = {
        description: 'A project without name'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return error for invalid priority', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A new project description',
        priority: 'invalid'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project successfully as owner', async () => {
      const updateData = {
        name: 'Updated Project',
        status: 'in-progress',
        priority: 'critical'
      };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Project updated successfully');
      expect(response.body.project.name).toBe('Updated Project');
      expect(response.body.project.status).toBe('in-progress');
      expect(response.body.project.priority).toBe('critical');
    });

    it('should return error for non-existent project', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        name: 'Updated Project'
      };

      const response = await request(app)
        .put(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Project not found');
    });

    it('should return error for invalid status', async () => {
      const updateData = {
        status: 'invalid-status'
      };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/projects/:id/team', () => {
    let otherUser;
    let otherToken;

    beforeEach(async () => {
      // Create another user to add to team
      otherUser = new User({
        username: 'teammate',
        email: 'teammate@example.com',
        password: 'password123',
        firstName: 'Team',
        lastName: 'Mate'
      });
      await otherUser.save();
    });

    it('should add team member successfully as owner', async () => {
      const memberData = {
        userId: otherUser._id.toString(),
        role: 'developer'
      };

      const response = await request(app)
        .post(`/api/projects/${project._id}/team`)
        .set('Authorization', `Bearer ${token}`)
        .send(memberData)
        .expect(200);

      expect(response.body.message).toBe('Team member added successfully');
      expect(response.body.project.team).toHaveLength(2);
    });

    it('should return error for non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011';
      const memberData = {
        userId: fakeUserId,
        role: 'developer'
      };

      const response = await request(app)
        .post(`/api/projects/${project._id}/team`)
        .set('Authorization', `Bearer ${token}`)
        .send(memberData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return error for invalid role', async () => {
      const memberData = {
        userId: otherUser._id.toString(),
        role: 'invalid-role'
      };

      const response = await request(app)
        .post(`/api/projects/${project._id}/team`)
        .set('Authorization', `Bearer ${token}`)
        .send(memberData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project successfully as owner', async () => {
      const response = await request(app)
        .delete(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Project deleted successfully');

      // Verify project is deleted
      const deletedProject = await Project.findById(project._id);
      expect(deletedProject).toBeNull();
    });

    it('should return error for non-existent project', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBe('Project not found');
    });
  });
});

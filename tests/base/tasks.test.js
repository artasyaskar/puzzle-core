const request = require('supertest');
const app = require('../../server/index-test');

describe('Tasks Endpoints', () => {
  describe('GET /api/tasks', () => {
    it('should get tasks', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${registerResponse.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeDefined();
    });
  });

  describe('POST /api/tasks', () => {
    it('should create task', async () => {
      const userData = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      // First create a project
      const projectData = {
        name: 'Test Project',
        description: 'A test project'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${registerResponse.body.token}`)
        .send(projectData);

      const taskData = {
        title: 'New Task',
        description: 'A new task',
        project: projectResponse.body.project.id
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${registerResponse.body.token}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Task created successfully');
    });
  });
});

const request = require('supertest');
const app = require('../../server/index-test');

describe('Projects Endpoints', () => {
  describe('GET /api/projects', () => {
    it('should get projects', async () => {
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
        .get('/api/projects')
        .set('Authorization', `Bearer ${registerResponse.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toBeDefined();
    });
  });

  describe('POST /api/projects', () => {
    it('should create project', async () => {
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

      const projectData = {
        name: 'New Project',
        description: 'A new project'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${registerResponse.body.token}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Project created successfully');
    });
  });
});

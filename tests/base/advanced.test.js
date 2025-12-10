const request = require('supertest');
const app = require('../../server/index-test');

describe('Advanced Endpoints', () => {
  describe('GET /api/advanced/primes', () => {
    it('should generate prime numbers', async () => {
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
        .get('/api/advanced/primes?limit=5')
        .set('Authorization', `Bearer ${registerResponse.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.primes).toBeDefined();
      expect(response.body.primes[0]).toBe(2);
    });
  });

  describe('GET /api/advanced/stats', () => {
    it('should get statistics', async () => {
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

      const response = await request(app)
        .get('/api/advanced/stats')
        .set('Authorization', `Bearer ${registerResponse.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.taskStatistics).toBeDefined();
      expect(response.body.projectStatistics).toBeDefined();
    });
  });

  describe('GET /api/advanced/search', () => {
    it('should search successfully', async () => {
      const userData = {
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const response = await request(app)
        .get('/api/advanced/search?q=test')
        .set('Authorization', `Bearer ${registerResponse.body.token}`);

      expect(response.status).toBe(200);
      expect(response.body.query).toBe('test');
      expect(response.body.results).toBeDefined();
    });
  });
});

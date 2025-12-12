const request = require('supertest');
const app = require('../../server/index-test');

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
      const userData = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test2@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.message).toBe('Login successful');
      expect(loginResponse.body.token).toBeDefined();
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile with valid token', async () => {
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

      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${registerResponse.body.token}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.user.email).toBe('test3@example.com');
    });
  });
});

const request = require('supertest');
const app = require('../../server/index');
const User = require('../../server/models/User');
const Project = require('../../server/models/Project');
const Task = require('../../server/models/Task');

describe('Tasks Endpoints', () => {
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

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create test tasks
      const task1 = new Task({
        title: 'Task 1',
        description: 'First task',
        project: project._id,
        assignee: user._id,
        reporter: user._id,
        status: 'todo',
        priority: 'medium'
      });
      await task1.save();

      const task2 = new Task({
        title: 'Task 2',
        description: 'Second task',
        project: project._id,
        assignee: user._id,
        reporter: user._id,
        status: 'in-progress',
        priority: 'high'
      });
      await task2.save();
    });

    it('should get tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.tasks).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=todo')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].status).toBe('todo');
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].priority).toBe('high');
    });

    it('should filter tasks by project', async () => {
      const response = await request(app)
        .get(`/api/tasks?project=${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.tasks).toHaveLength(2);
    });
  });

  describe('GET /api/tasks/:id', () => {
    let task;

    beforeEach(async () => {
      task = new Task({
        title: 'Test Task',
        description: 'A test task',
        project: project._id,
        assignee: user._id,
        reporter: user._id,
        status: 'todo',
        priority: 'medium'
      });
      await task.save();
    });

    it('should get single task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.task.title).toBe('Test Task');
      expect(response.body.task.project.name).toBe('Test Project');
    });

    it('should return error for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('POST /api/tasks', () => {
    it('should create new task successfully', async () => {
      const taskData = {
        title: 'New Task',
        description: 'A new task description',
        project: project._id.toString(),
        priority: 'high',
        type: 'bug',
        estimatedHours: 8,
        dueDate: '2024-12-31'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData)
        .expect(201);

      expect(response.body.message).toBe('Task created successfully');
      expect(response.body.task.title).toBe('New Task');
      expect(response.body.task.priority).toBe('high');
      expect(response.body.task.type).toBe('bug');
      expect(response.body.task.estimatedHours).toBe(8);
    });

    it('should return error without authentication', async () => {
      const taskData = {
        title: 'New Task',
        description: 'A new task description',
        project: project._id.toString()
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });

    it('should return error for missing required fields', async () => {
      const taskData = {
        description: 'A task without title'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should return error for non-existent project', async () => {
      const fakeProjectId = '507f1f77bcf86cd799439011';
      const taskData = {
        title: 'New Task',
        description: 'A new task description',
        project: fakeProjectId
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData)
        .expect(404);

      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let task;

    beforeEach(async () => {
      task = new Task({
        title: 'Test Task',
        description: 'A test task',
        project: project._id,
        assignee: user._id,
        reporter: user._id,
        status: 'todo',
        priority: 'medium'
      });
      await task.save();
    });

    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated Task',
        status: 'in-progress',
        priority: 'high',
        actualHours: 6
      };

      const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Task updated successfully');
      expect(response.body.task.title).toBe('Updated Task');
      expect(response.body.task.status).toBe('in-progress');
      expect(response.body.task.priority).toBe('high');
      expect(response.body.task.actualHours).toBe(6);
    });

    it('should return error for invalid status transition', async () => {
      const updateData = {
        status: 'completed'
      };

      const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toContain('Invalid status transition');
    });

    it('should return error for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        title: 'Updated Task'
      };

      const response = await request(app)
        .put(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('POST /api/tasks/:id/comments', () => {
    let task;

    beforeEach(async () => {
      task = new Task({
        title: 'Test Task',
        description: 'A test task',
        project: project._id,
        assignee: user._id,
        reporter: user._id,
        status: 'todo',
        priority: 'medium'
      });
      await task.save();
    });

    it('should add comment successfully', async () => {
      const commentData = {
        text: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/tasks/${task._id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send(commentData)
        .expect(200);

      expect(response.body.message).toBe('Comment added successfully');
      expect(response.body.comments).toHaveLength(1);
      expect(response.body.comments[0].text).toBe('This is a test comment');
    });

    it('should return error for empty comment', async () => {
      const commentData = {
        text: ''
      };

      const response = await request(app)
        .post(`/api/tasks/${task._id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send(commentData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/tasks/:id/subtasks', () => {
    let task;

    beforeEach(async () => {
      task = new Task({
        title: 'Test Task',
        description: 'A test task',
        project: project._id,
        assignee: user._id,
        reporter: user._id,
        status: 'todo',
        priority: 'medium'
      });
      await task.save();
    });

    it('should add subtask successfully', async () => {
      const subtaskData = {
        title: 'Test Subtask'
      };

      const response = await request(app)
        .post(`/api/tasks/${task._id}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send(subtaskData)
        .expect(200);

      expect(response.body.message).toBe('Subtask added successfully');
      expect(response.body.subtasks).toHaveLength(1);
      expect(response.body.subtasks[0].title).toBe('Test Subtask');
      expect(response.body.subtasks[0].completed).toBe(false);
    });

    it('should return error for empty subtask title', async () => {
      const subtaskData = {
        title: ''
      };

      const response = await request(app)
        .post(`/api/tasks/${task._id}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .send(subtaskData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/tasks/:id/subtasks/:subtaskId', () => {
    let task;
    let subtaskId;

    beforeEach(async () => {
      task = new Task({
        title: 'Test Task',
        description: 'A test task',
        project: project._id,
        assignee: user._id,
        reporter: user._id,
        status: 'todo',
        priority: 'medium',
        subtasks: [{ title: 'Test Subtask', completed: false }]
      });
      await task.save();
      subtaskId = task.subtasks[0]._id;
    });

    it('should toggle subtask completion', async () => {
      const response = await request(app)
        .put(`/api/tasks/${task._id}/subtasks/${subtaskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Subtask updated successfully');
      expect(response.body.subtasks[0].completed).toBe(true);
    });

    it('should return error for non-existent subtask', async () => {
      const fakeSubtaskId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/tasks/${task._id}/subtasks/${fakeSubtaskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBe('Subtask not found');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let task;

    beforeEach(async () => {
      task = new Task({
        title: 'Test Task',
        description: 'A test task',
        project: project._id,
        assignee: user._id,
        reporter: user._id,
        status: 'todo',
        priority: 'medium'
      });
      await task.save();
    });

    it('should delete task successfully as reporter', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Task deleted successfully');

      // Verify task is deleted
      const deletedTask = await Task.findById(task._id);
      expect(deletedTask).toBeNull();
    });

    it('should return error for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBe('Task not found');
    });
  });
});

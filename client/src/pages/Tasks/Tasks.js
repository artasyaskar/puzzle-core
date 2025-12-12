import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Tasks = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    assignee: '',
    priority: 'medium',
    type: 'feature',
    estimatedHours: '',
    dueDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignee: ''
  });

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['tasks', currentPage, filters],
    async () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.assignee && { assignee: filters.assignee })
      });
      const response = await api.get(`/tasks?${params}`);
      return response.data;
    }
  );

  const { data: projects } = useQuery(
    'projects',
    async () => {
      const response = await api.get('/projects');
      return response.data.projects;
    }
  );

  const { data: users } = useQuery(
    'users',
    async () => {
      const response = await api.get('/users');
      return response.data.users;
    }
  );

  const createTaskMutation = useMutation(
    async (taskData) => {
      const response = await api.post('/tasks', taskData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          project: '',
          assignee: '',
          priority: 'medium',
          type: 'feature',
          estimatedHours: '',
          dueDate: ''
        });
        toast.success('Task created successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create task');
      }
    }
  );

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
    setCurrentPage(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const taskData = {
      ...formData,
      estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
      dueDate: formData.dueDate || undefined
    };
    createTaskMutation.mutate(taskData);
  };

  if (isLoading) return <div className="loading"><div className="spinner"></div></div>;
  if (error) return <div>Error loading tasks</div>;

  return (
    <div>
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-subtitle">Manage your tasks</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Task
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">Filters</h3>
        </div>
        <div className="d-flex gap-3">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select name="status" className="form-control" value={filters.status} onChange={handleFilterChange}>
              <option value="">All Status</option>
              <option value="todo">Todo</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="testing">Testing</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select name="priority" className="form-control" value={filters.priority} onChange={handleFilterChange}>
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assignee</label>
            <select name="assignee" className="form-control" value={filters.assignee} onChange={handleFilterChange}>
              <option value="">All Assignees</option>
              {users?.map(user => (
                <option key={user._id} value={user._id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="task-board">
        {['todo', 'in-progress', 'review', 'testing', 'completed', 'blocked'].map(status => (
          <div key={status} className="task-column">
            <div className="task-column-header">
              <h3 className="task-column-title">{status.replace('-', ' ')}</h3>
              <span className="task-column-count">
                {data?.tasks?.filter(task => task.status === status).length}
              </span>
            </div>
            <div>
              {data?.tasks?.filter(task => task.status === status).map(task => (
                <Link key={task._id} to={`/tasks/${task._id}`} className="task-card">
                  <div className={`task-card priority-${task.priority}`}>
                    <div className="task-card-title">{task.title}</div>
                    <div className="task-card-meta">
                      <span className="task-card-assignee">
                        {task.assignee?.firstName} {task.assignee?.lastName}
                      </span>
                      <span className={`badge priority-${task.priority}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="task-card-meta">
                      <span className="text-muted">
                        {task.project?.name}
                      </span>
                      {task.dueDate && (
                        <span className="text-muted">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <button 
              className="modal-close"
              onClick={() => setShowCreateModal(false)}
            >
              ×
            </button>
            <h2>Create New Task</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  name="title"
                  className="form-control"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-control"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="3"
                />
              </div>
              <div className="d-flex gap-2">
                <div className="form-group flex-1">
                  <label className="form-label">Project</label>
                  <select name="project" className="form-control" value={formData.project} onChange={handleChange} required>
                    <option value="">Select Project</option>
                    {projects?.map(project => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Assignee</label>
                  <select name="assignee" className="form-control" value={formData.assignee} onChange={handleChange}>
                    <option value="">Unassigned</option>
                    {users?.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="d-flex gap-2">
                <div className="form-group flex-1">
                  <label className="form-label">Priority</label>
                  <select name="priority" className="form-control" value={formData.priority} onChange={handleChange}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Type</label>
                  <select name="type" className="form-control" value={formData.type} onChange={handleChange}>
                    <option value="feature">Feature</option>
                    <option value="bug">Bug</option>
                    <option value="improvement">Improvement</option>
                    <option value="documentation">Documentation</option>
                    <option value="testing">Testing</option>
                  </select>
                </div>
              </div>
              <div className="d-flex gap-2">
                <div className="form-group flex-1">
                  <label className="form-label">Estimated Hours</label>
                  <input
                    type="number"
                    name="estimatedHours"
                    className="form-control"
                    value={formData.estimatedHours}
                    onChange={handleChange}
                    min="0"
                    max="1000"
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="form-control"
                    value={formData.dueDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={createTaskMutation.isLoading}>
                  {createTaskMutation.isLoading ? 'Creating...' : 'Create Task'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;

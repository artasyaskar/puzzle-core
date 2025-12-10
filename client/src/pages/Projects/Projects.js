import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Projects = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    endDate: '',
    tags: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    priority: ''
  });

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['projects', currentPage, filters],
    async () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority })
      });
      const response = await api.get(`/projects?${params}`);
      return response.data;
    }
  );

  const createProjectMutation = useMutation(
    async (projectData) => {
      const response = await api.post('/projects', projectData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          priority: 'medium',
          endDate: '',
          tags: ''
        });
        toast.success('Project created successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create project');
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
    const projectData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    };
    createProjectMutation.mutate(projectData);
  };

  if (isLoading) return <div className="loading"><div className="spinner"></div></div>;
  if (error) return <div>Error loading projects</div>;

  return (
    <div>
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">Manage your projects</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Project
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
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="testing">Testing</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select name="priority" className="form-control" value={filters.priority} onChange={handleFilterChange}>
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      <div className="project-grid">
        {data?.projects?.map(project => (
          <Link key={project._id} to={`/projects/${project._id}`} className="project-card">
            <div className={`project-card priority-${project.priority}`}>
              <div className="project-card-header">
                <div className="project-card-title">{project.name}</div>
                <div className="project-card-description">{project.description}</div>
              </div>
              <div className="project-card-meta">
                <div className="project-card-team">
                  <span className={`badge status-${project.status}`}>
                    {project.status}
                  </span>
                </div>
                <div className="project-card-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{project.progress}%</span>
                </div>
              </div>
            </div>
          </Link>
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
            <h2>Create New Project</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={formData.name}
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
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select name="priority" className="form-control" value={formData.priority} onChange={handleChange}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  className="form-control"
                  value={formData.endDate}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  name="tags"
                  className="form-control"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="frontend, backend, mobile"
                />
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={createProjectMutation.isLoading}>
                  {createProjectMutation.isLoading ? 'Creating...' : 'Create Project'}
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

export default Projects;

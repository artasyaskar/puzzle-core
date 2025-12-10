import React from 'react';
import { useQuery } from 'react-query';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    async () => {
      const response = await api.get('/advanced/stats');
      return response.data;
    }
  );

  const { data: recentTasks, isLoading: tasksLoading } = useQuery(
    'recent-tasks',
    async () => {
      const response = await api.get('/tasks?limit=5');
      return response.data.tasks;
    }
  );

  const { data: recentProjects, isLoading: projectsLoading } = useQuery(
    'recent-projects',
    async () => {
      const response = await api.get('/projects?limit=5');
      return response.data.projects;
    }
  );

  if (statsLoading || tasksLoading || projectsLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const taskStats = stats?.taskStatistics || [];
  const projectStats = stats?.projectStatistics || [];
  const workloadStats = stats?.workloadStatistics || [];

  const getStatValue = (statsArray, status) => {
    const stat = statsArray.find(s => s._id === status);
    return stat ? stat.count : 0;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, {user?.firstName}!</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{getStatValue(taskStats, 'todo')}</div>
          <div className="stat-label">Todo Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{getStatValue(taskStats, 'in-progress')}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{getStatValue(taskStats, 'completed')}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{getStatValue(projectStats, 'in-progress')}</div>
          <div className="stat-label">Active Projects</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Recent Tasks</h2>
            </div>
            <div className="task-list">
              {recentTasks?.map(task => (
                <div key={task._id} className="task-card priority-medium">
                  <div className="task-card-title">{task.title}</div>
                  <div className="task-card-meta">
                    <span className={`badge status-${task.status}`}>
                      {task.status}
                    </span>
                    <span className={`badge priority-${task.priority}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Recent Projects</h2>
            </div>
            <div className="project-list">
              {recentProjects?.map(project => (
                <div key={project._id} className={`project-card priority-${project.priority}`}>
                  <div className="project-card-header">
                    <div className="project-card-title">{project.name}</div>
                    <div className="project-card-description">
                      {project.description.substring(0, 100)}...
                    </div>
                  </div>
                  <div className="project-card-meta">
                    <div className="project-card-team">
                      <div className="team-avatar">
                        {project.owner?.firstName?.charAt(0)}
                      </div>
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

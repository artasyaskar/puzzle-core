import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ProjectDetail = () => {
  const { id } = useParams();
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberData, setMemberData] = useState({
    userId: '',
    role: 'developer'
  });

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['project', id],
    async () => {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    }
  );

  const { data: users } = useQuery(
    'users',
    async () => {
      const response = await api.get('/users');
      return response.data.users;
    }
  );

  const addTeamMemberMutation = useMutation(
    async (memberData) => {
      const response = await api.post(`/projects/${id}/team`, memberData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project', id]);
        setShowAddMemberModal(false);
        setMemberData({ userId: '', role: 'developer' });
        toast.success('Team member added successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to add team member');
      }
    }
  );

  const handleAddMember = (e) => {
    e.preventDefault();
    addTeamMemberMutation.mutate(memberData);
  };

  if (isLoading) return <div className="loading"><div className="spinner"></div></div>;
  if (error) return <div>Error loading project</div>;

  const project = data?.project;

  return (
    <div>
      <div className="detail-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="detail-title">{project?.name}</h1>
            <div className="detail-meta">
              <div className="detail-meta-item">
                <span className="detail-meta-label">Status</span>
                <span className={`badge status-${project?.status}`}>
                  {project?.status}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Priority</span>
                <span className={`badge priority-${project?.priority}`}>
                  {project?.priority}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Progress</span>
                <span className="detail-meta-value">{project?.progress}%</span>
              </div>
            </div>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddMemberModal(true)}
          >
            Add Team Member
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-main">
          <div className="detail-section">
            <h2 className="detail-section-title">Description</h2>
            <p>{project?.description}</p>
          </div>

          <div className="detail-section">
            <h2 className="detail-section-title">Tasks</h2>
            <div className="task-board">
              {['todo', 'in-progress', 'testing', 'completed'].map(status => (
                <div key={status} className="task-column">
                  <div className="task-column-header">
                    <h3 className="task-column-title">{status.replace('-', ' ')}</h3>
                    <span className="task-column-count">
                      {project?.tasks?.filter(task => task.status === status).length}
                    </span>
                  </div>
                  <div>
                    {project?.tasks?.filter(task => task.status === status).map(task => (
                      <div key={task._id} className={`task-card priority-${task.priority}`}>
                        <div className="task-card-title">{task.title}</div>
                        <div className="task-card-meta">
                          <span className="task-card-assignee">
                            {task.assignee?.firstName} {task.assignee?.lastName}
                          </span>
                          <span className={`badge priority-${task.priority}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Team Members</h3>
            </div>
            <div>
              {project?.team?.map(member => (
                <div key={member.user._id} className="d-flex align-items-center gap-2 mb-3">
                  <div className="team-avatar">
                    {member.user.firstName.charAt(0)}{member.user.lastName.charAt(0)}
                  </div>
                  <div>
                    <div className="fw-bold">
                      {member.user.firstName} {member.user.lastName}
                    </div>
                    <div className="text-muted small">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Project Info</h3>
            </div>
            <div className="detail-meta">
              <div className="detail-meta-item">
                <span className="detail-meta-label">Owner</span>
                <span className="detail-meta-value">
                  {project?.owner?.firstName} {project?.owner?.lastName}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Created</span>
                <span className="detail-meta-value">
                  {new Date(project?.createdAt).toLocaleDateString()}
                </span>
              </div>
              {project?.endDate && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">End Date</span>
                  <span className="detail-meta-value">
                    {new Date(project.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddMemberModal && (
        <div className="modal-overlay">
          <div className="modal">
            <button 
              className="modal-close"
              onClick={() => setShowAddMemberModal(false)}
            >
              ×
            </button>
            <h2>Add Team Member</h2>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">User</label>
                <select
                  name="userId"
                  className="form-control"
                  value={memberData.userId}
                  onChange={(e) => setMemberData({...memberData, userId: e.target.value})}
                  required
                >
                  <option value="">Select a user</option>
                  {users?.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  name="role"
                  className="form-control"
                  value={memberData.role}
                  onChange={(e) => setMemberData({...memberData, role: e.target.value})}
                >
                  <option value="developer">Developer</option>
                  <option value="tester">Tester</option>
                  <option value="designer">Designer</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={addTeamMemberMutation.isLoading}>
                  {addTeamMemberMutation.isLoading ? 'Adding...' : 'Add Member'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMemberModal(false)}>
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

export default ProjectDetail;

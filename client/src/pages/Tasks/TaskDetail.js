import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TaskDetail = () => {
  const { id } = useParams();
  const [newComment, setNewComment] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['task', id],
    async () => {
      const response = await api.get(`/tasks/${id}`);
      return response.data;
    }
  );

  const updateTaskMutation = useMutation(
    async (updateData) => {
      const response = await api.put(`/tasks/${id}`, updateData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['task', id]);
        toast.success('Task updated successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update task');
      }
    }
  );

  const addCommentMutation = useMutation(
    async (commentData) => {
      const response = await api.post(`/tasks/${id}/comments`, commentData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['task', id]);
        setNewComment('');
        toast.success('Comment added successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to add comment');
      }
    }
  );

  const handleStatusChange = (newStatus) => {
    updateTaskMutation.mutate({ status: newStatus });
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate({ text: newComment });
    }
  };

  const toggleSubtask = (subtaskId) => {
    const task = data?.task;
    const subtask = task?.subtasks?.id(subtaskId);
    if (subtask) {
      // This would need a proper API endpoint for updating subtasks
      // For now, we'll just show the UI
      subtask.completed = !subtask.completed;
    }
  };

  if (isLoading) return <div className="loading"><div className="spinner"></div></div>;
  if (error) return <div>Error loading task</div>;

  const task = data?.task;

  return (
    <div>
      <div className="detail-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="detail-title">{task?.title}</h1>
            <div className="detail-meta">
              <div className="detail-meta-item">
                <span className="detail-meta-label">Status</span>
                <select 
                  className="form-control"
                  value={task?.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="todo">Todo</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="testing">Testing</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Priority</span>
                <span className={`badge priority-${task?.priority}`}>
                  {task?.priority}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Type</span>
                <span className="badge badge-secondary">
                  {task?.type}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-main">
          <div className="detail-section">
            <h2 className="detail-section-title">Description</h2>
            <p>{task?.description}</p>
          </div>

          {task?.subtasks && task.subtasks.length > 0 && (
            <div className="detail-section">
              <h2 className="detail-section-title">Subtasks</h2>
              <div className="subtask-list">
                {task.subtasks.map(subtask => (
                  <div key={subtask._id} className="d-flex align-items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={() => toggleSubtask(subtask._id)}
                      className="form-check-input"
                    />
                    <span className={subtask.completed ? 'text-decoration-line-through text-muted' : ''}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h2 className="detail-section-title">Comments</h2>
            <div className="comment-list">
              {task?.comments?.map(comment => (
                <div key={comment._id} className="comment-item">
                  <div className="comment-avatar">
                    {comment.author.firstName.charAt(0)}{comment.author.lastName.charAt(0)}
                  </div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">
                        {comment.author.firstName} {comment.author.lastName}
                      </span>
                      <span className="comment-date">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="comment-text">
                      {comment.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form className="comment-form" onSubmit={handleAddComment}>
              <textarea
                className="form-control comment-textarea"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows="3"
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={addCommentMutation.isLoading || !newComment.trim()}
              >
                {addCommentMutation.isLoading ? 'Adding...' : 'Add Comment'}
              </button>
            </form>
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Task Details</h3>
            </div>
            <div className="detail-meta">
              <div className="detail-meta-item">
                <span className="detail-meta-label">Project</span>
                <span className="detail-meta-value">{task?.project?.name}</span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Assignee</span>
                <span className="detail-meta-value">
                  {task?.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Reporter</span>
                <span className="detail-meta-value">
                  {task?.reporter?.firstName} {task?.reporter?.lastName}
                </span>
              </div>
              {task?.estimatedHours && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Estimated Hours</span>
                  <span className="detail-meta-value">{task.estimatedHours}h</span>
                </div>
              )}
              {task?.actualHours && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Actual Hours</span>
                  <span className="detail-meta-value">{task.actualHours}h</span>
                </div>
              )}
              {task?.dueDate && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Due Date</span>
                  <span className="detail-meta-value">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="detail-meta-item">
                <span className="detail-meta-label">Created</span>
                <span className="detail-meta-value">
                  {new Date(task?.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {task?.tags && task.tags.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Tags</h3>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {task.tags.map((tag, index) => (
                  <span key={index} className="badge badge-info">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;

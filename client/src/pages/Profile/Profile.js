import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    avatar: user?.avatar || ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await updateProfile(formData);
    
    if (result.success) {
      toast.success('Profile updated successfully!');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const getUserInitials = () => {
    if (!user) return '';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account settings</p>
      </div>

      <div className="dashboard-grid">
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Profile Information</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={user?.username}
                  disabled
                />
                <small className="text-muted">Username cannot be changed</small>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={user?.email}
                  disabled
                />
                <small className="text-muted">Email cannot be changed</small>
              </div>

              <div className="d-flex gap-2">
                <div className="form-group flex-1">
                  <label htmlFor="firstName" className="form-label">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    className="form-control"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="lastName" className="form-label">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    className="form-control"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="avatar" className="form-label">Avatar URL</label>
                <input
                  type="url"
                  id="avatar"
                  name="avatar"
                  className="form-control"
                  value={formData.avatar}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.jpg"
                />
                <small className="text-muted">Optional: URL to your profile picture</small>
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <input
                  type="text"
                  className="form-control"
                  value={user?.role}
                  disabled
                />
                <small className="text-muted">Role is assigned by administrators</small>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Account Summary</h2>
            </div>
            <div className="text-center mb-3">
              {formData.avatar ? (
                <img 
                  src={formData.avatar} 
                  alt="Profile" 
                  className="rounded-circle mb-3"
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                />
              ) : (
                <div className="user-avatar mx-auto mb-3" style={{ 
                  width: '100px', 
                  height: '100px', 
                  fontSize: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getUserInitials()}
                </div>
              )}
              <h4>{user?.firstName} {user?.lastName}</h4>
              <p className="text-muted">@{user?.username}</p>
              <span className={`badge badge-${user?.role === 'admin' ? 'danger' : user?.role === 'manager' ? 'warning' : 'info'}`}>
                {user?.role}
              </span>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Account Activity</h2>
            </div>
            <div className="detail-meta">
              <div className="detail-meta-item">
                <span className="detail-meta-label">Member Since</span>
                <span className="detail-meta-value">
                  {new Date(user?.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Last Login</span>
                <span className="detail-meta-value">
                  {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Account Status</span>
                <span className="badge badge-success">
                  {user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

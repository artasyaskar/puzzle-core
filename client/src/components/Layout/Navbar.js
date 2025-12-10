import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (!user) return '';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center">
          <Link to="/dashboard" className="navbar-brand">
            TaskMaster Pro
          </Link>
          
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted">
              Welcome, {user?.firstName}!
            </span>
            
            <div className="dropdown">
              <button
                className="btn btn-outline d-flex align-items-center gap-2"
                type="button"
                id="userDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div className="user-avatar">
                  {getUserInitials()}
                </div>
                {user?.username}
              </button>
              
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                <li>
                  <Link className="dropdown-item" to="/profile">
                    Profile
                  </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

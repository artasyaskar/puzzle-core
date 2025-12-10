import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: '📊'
    },
    {
      path: '/projects',
      label: 'Projects',
      icon: '📁'
    },
    {
      path: '/tasks',
      label: 'Tasks',
      icon: '✅'
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: '👤'
    }
  ];

  return (
    <aside className="sidebar">
      <ul className="sidebar-nav">
        {menuItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;

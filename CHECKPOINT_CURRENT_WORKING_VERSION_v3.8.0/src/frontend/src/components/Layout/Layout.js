import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNotification } from '../../providers/NotificationProvider';
import { useCache } from '../../providers/CacheProvider';
import './Layout.css';

const Layout = ({ children, user, signOut }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { notifications, clearNotifications } = useNotification();
  const { isOnline, cacheStats } = useCache();

  const navigation = [
    { name: 'Analysis', href: '/', icon: '📊' },
    { name: 'Dashboard', href: '/dashboard', icon: '📈' },
    { name: 'Settings', href: '/settings', icon: '⚙️' }
  ];

  const isActive = (path) => location.pathname === path;

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      signOut();
    }
  };

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-content">
          <div className="header-left">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <h1 className="app-title">AWS Opportunity Analysis</h1>
          </div>
          
          <div className="header-right">
            {/* Connection Status */}
            <div className="connection-status">
              <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? '🟢' : '🔴'}
              </span>
              <span className="status-text">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="notifications-badge">
                <button
                  className="notifications-button"
                  onClick={clearNotifications}
                  aria-label={`${notifications.length} notifications`}
                >
                  🔔 {notifications.length}
                </button>
              </div>
            )}
            
            {/* User Menu */}
            <div className="user-menu">
              <span className="user-name">
                {user?.attributes?.given_name || user?.username || 'User'}
              </span>
              <button
                className="sign-out-button"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`nav-item ${isActive(item.href) ? 'nav-item-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
            </Link>
          ))}
        </nav>
        
        {/* Cache Stats */}
        <div className="sidebar-footer">
          <div className="cache-stats">
            <h4>Cache Status</h4>
            <div className="cache-stat">
              <span>Cached Items:</span>
              <span>{cacheStats.itemCount}</span>
            </div>
            <div className="cache-stat">
              <span>Cache Size:</span>
              <span>{(cacheStats.size / 1024).toFixed(1)}KB</span>
            </div>
            <div className="cache-stat">
              <span>Hit Rate:</span>
              <span>{(cacheStats.hitRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="notifications-container">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification notification-${notification.type}`}
              >
                <div className="notification-content">
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                </div>
                <button
                  className="notification-close"
                  onClick={() => clearNotifications([notification.id])}
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        {children}
      </main>
    </div>
  );
};

export default Layout;
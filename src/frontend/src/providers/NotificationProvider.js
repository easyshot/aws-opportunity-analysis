import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Default notification duration (in milliseconds)
const DEFAULT_DURATION = 5000;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Generate unique ID for notifications
  const generateId = () => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Add notification
  const addNotification = useCallback((notification) => {
    const id = generateId();
    const newNotification = {
      id,
      type: NOTIFICATION_TYPES.INFO,
      title: '',
      message: '',
      duration: DEFAULT_DURATION,
      persistent: false,
      actions: [],
      ...notification,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration (unless persistent)
    if (!newNotification.persistent && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Clear specific notifications
  const clearNotifications = useCallback((ids = null) => {
    if (ids && Array.isArray(ids)) {
      setNotifications(prev => prev.filter(notification => !ids.includes(notification.id)));
    } else {
      setNotifications([]);
    }
  }, []);

  // Update notification
  const updateNotification = useCallback((id, updates) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, ...updates, timestamp: Date.now() }
          : notification
      )
    );
  }, []);

  // Convenience methods for different notification types
  const showSuccess = useCallback((title, message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((title, message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      title,
      message,
      persistent: true, // Errors should be persistent by default
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((title, message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      title,
      message,
      duration: 7000, // Warnings should stay longer
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((title, message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.INFO,
      title,
      message,
      ...options
    });
  }, [addNotification]);

  // Show progress notification (for long-running operations)
  const showProgress = useCallback((title, message, progress = 0) => {
    return addNotification({
      type: NOTIFICATION_TYPES.INFO,
      title,
      message,
      persistent: true,
      progress,
      showProgress: true
    });
  }, [addNotification]);

  // Update progress notification
  const updateProgress = useCallback((id, progress, message = null) => {
    updateNotification(id, {
      progress,
      ...(message && { message })
    });
  }, [updateNotification]);

  // Complete progress notification
  const completeProgress = useCallback((id, successMessage = 'Completed successfully') => {
    updateNotification(id, {
      type: NOTIFICATION_TYPES.SUCCESS,
      message: successMessage,
      persistent: false,
      duration: 3000,
      showProgress: false
    });
  }, [updateNotification]);

  // Fail progress notification
  const failProgress = useCallback((id, errorMessage = 'Operation failed') => {
    updateNotification(id, {
      type: NOTIFICATION_TYPES.ERROR,
      message: errorMessage,
      persistent: true,
      showProgress: false
    });
  }, [updateNotification]);

  // Show confirmation notification with actions
  const showConfirmation = useCallback((title, message, onConfirm, onCancel = null) => {
    return addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      title,
      message,
      persistent: true,
      actions: [
        {
          label: 'Confirm',
          action: () => {
            onConfirm();
            // The notification will be removed by the action
          },
          primary: true
        },
        {
          label: 'Cancel',
          action: () => {
            if (onCancel) onCancel();
            // The notification will be removed by the action
          },
          secondary: true
        }
      ]
    });
  }, [addNotification]);

  // Show retry notification for failed operations
  const showRetry = useCallback((title, message, onRetry) => {
    return addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      title,
      message,
      persistent: true,
      actions: [
        {
          label: 'Retry',
          action: onRetry,
          primary: true
        },
        {
          label: 'Dismiss',
          action: () => {}, // Will be handled by the notification component
          secondary: true
        }
      ]
    });
  }, [addNotification]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);

  // Check if there are any error notifications
  const hasErrors = useCallback(() => {
    return notifications.some(notification => notification.type === NOTIFICATION_TYPES.ERROR);
  }, [notifications]);

  // Check if there are any unread notifications
  const hasUnread = useCallback(() => {
    return notifications.length > 0;
  }, [notifications]);

  const contextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    updateNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showProgress,
    updateProgress,
    completeProgress,
    failProgress,
    showConfirmation,
    showRetry,
    getNotificationsByType,
    hasErrors,
    hasUnread,
    NOTIFICATION_TYPES
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};
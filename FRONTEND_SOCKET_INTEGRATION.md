# Frontend Socket.io Integration Guide

## Overview
When an admin creates an invoice, the customer receives a real-time notification via Socket.io. This guide explains how to integrate Socket.io on the frontend to receive these notifications.

## Installation

### React/Next.js
```bash
npm install socket.io-client
```

### Vue.js
```bash
npm install socket.io-client
```

### Vanilla JavaScript
```html
<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
```

## Basic Integration

### 1. Create Socket Service (React Example)

```javascript
// utils/socketService.js
import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (token) => {
  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }

  // Connect to backend with authentication
  socket = io('http://localhost:5000', {
    auth: {
      token: token // JWT token from login
    },
    // Alternative: pass token in query
    // query: {
    //   token: token
    // },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('✅ Connected to server');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected from server:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

### 2. React Hook for Notifications

```javascript
// hooks/useNotifications.js
import { useEffect, useState, useCallback } from 'react';
import { initializeSocket, getSocket, disconnectSocket } from '../utils/socketService';
import { getMyNotifications } from '../services/notificationService'; // Your API service

export const useNotifications = (token) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    // Initialize socket connection
    const socket = initializeSocket(token);

    // Listen for real-time notifications
    socket.on('notification', (notification) => {
      console.log('📢 New notification received:', notification);
      
      // Add notification to state
      setNotifications(prev => [notification, ...prev]);
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification (optional)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/notification-icon.png'
        });
      }
    });

    // Connection status
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Socket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Socket disconnected');
    });

    // Load existing notifications from API
    const loadNotifications = async () => {
      try {
        const response = await getMyNotifications();
        if (response.success) {
          setNotifications(response.data);
          // Calculate unread count
          const unread = response.data.filter(n => !n.read).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();

    // Cleanup on unmount
    return () => {
      socket.off('notification');
      socket.off('connect');
      socket.off('disconnect');
      disconnectSocket();
    };
  }, [token]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const socket = getSocket();
      if (socket) {
        // Emit socket event to mark as read
        socket.emit('mark_notification_read', { notificationId });
      }
      
      // Also call API to mark as read
      // await markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead
  };
};
```

### 3. React Component Example

```javascript
// components/NotificationBell.jsx
import React, { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import './NotificationBell.css';

const NotificationBell = ({ token }) => {
  const { notifications, unreadCount, isConnected, markAsRead } = useNotifications(token);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="notification-container">
      {/* Connection Status Indicator */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢' : '🔴'}
      </div>

      {/* Notification Bell */}
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-time">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                  {notification.type === 'invoice_created' && (
                    <div className="notification-data">
                      Invoice: {notification.data.invoice_number} - 
                      Amount: ${notification.data.amount}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
```

### 4. App Integration (React)

```javascript
// App.jsx or _app.js (Next.js)
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth'; // Your auth hook
import NotificationBell from './components/NotificationBell';

function App() {
  const { token, user } = useAuth();

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="App">
      <header>
        <h1>StorageUp</h1>
        {token && <NotificationBell token={token} />}
      </header>
      
      {/* Your app content */}
    </div>
  );
}

export default App;
```

## Vue.js Example

```javascript
// composables/useNotifications.js
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

export function useNotifications(token) {
  const notifications = ref([]);
  const unreadCount = ref(0);
  const isConnected = ref(false);
  let socket = null;

  onMounted(() => {
    if (!token) return;

    socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      isConnected.value = true;
    });

    socket.on('disconnect', () => {
      isConnected.value = false;
    });

    socket.on('notification', (notification) => {
      notifications.value.unshift(notification);
      unreadCount.value++;
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message
        });
      }
    });
  });

  onUnmounted(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  return {
    notifications,
    unreadCount,
    isConnected
  };
}
```

## Vanilla JavaScript Example

```javascript
// socket.js
let socket = null;

function connectSocket(token) {
  socket = io('http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus(true);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
  });

  socket.on('notification', (notification) => {
    console.log('New notification:', notification);
    displayNotification(notification);
    updateNotificationBadge();
  });
}

function displayNotification(notification) {
  // Create notification element
  const notificationEl = document.createElement('div');
  notificationEl.className = 'notification';
  notificationEl.innerHTML = `
    <h4>${notification.title}</h4>
    <p>${notification.message}</p>
    <small>${new Date(notification.createdAt).toLocaleString()}</small>
  `;
  
  // Add to notification container
  document.getElementById('notifications').prepend(notificationEl);
  
  // Show browser notification
  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message
    });
  }
}

function updateNotificationBadge() {
  // Update badge count
  const badge = document.querySelector('.notification-badge');
  if (badge) {
    const count = document.querySelectorAll('.notification.unread').length;
    badge.textContent = count;
  }
}

function updateConnectionStatus(connected) {
  const statusEl = document.getElementById('connection-status');
  if (statusEl) {
    statusEl.textContent = connected ? '🟢 Connected' : '🔴 Disconnected';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token'); // Get token from storage
  if (token) {
    connectSocket(token);
  }
  
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});
```

## API Service Example

```javascript
// services/notificationService.js
const API_BASE_URL = 'http://localhost:5000/api/client';

export const getMyNotifications = async (page = 1, limit = 20) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/notifications?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

export const getUnreadCount = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

export const markNotificationAsRead = async (notificationId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

export const markAllNotificationsAsRead = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
```

## Flow Diagram

```
1. User logs in → Receives JWT token
2. Frontend connects to Socket.io with token
3. Backend authenticates token → User joins room: user_<userId>
4. Admin creates invoice → Backend emits notification to user_<userId> room
5. Frontend receives notification → Updates UI + Shows browser notification
6. User clicks notification → Marks as read via Socket.io or API
```

## Important Notes

1. **Authentication**: Always pass the JWT token when connecting to Socket.io
2. **Reconnection**: Socket.io automatically reconnects if connection is lost
3. **Browser Notifications**: Request permission on app load
4. **Token Refresh**: Reconnect socket when token is refreshed
5. **Cleanup**: Disconnect socket on logout

## Testing

1. Login as a customer
2. Open browser console to see socket connection
3. Login as admin in another tab
4. Create an invoice for that customer
5. Customer should receive notification immediately!



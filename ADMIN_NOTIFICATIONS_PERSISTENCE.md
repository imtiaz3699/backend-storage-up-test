# Admin Notifications - Database Persistence

## ✅ Problem Solved

Admin notifications are now **persisted in the database**, so they survive page refreshes and can be retrieved later via REST API endpoints.

---

## 📊 Database Model

**Model**: `AdminNotification`

**Schema**:
- `type`: Notification type (customer_signup, payment_received, payment_failed, etc.)
- `title`: Notification title
- `message`: Notification message
- `priority`: Priority level (high, medium, low)
- `data`: Additional data object
- `read_by`: Array of admin IDs who have read this notification
- `createdAt`, `updatedAt`: Timestamps

**Key Feature**: Each notification tracks which admins have read it (per-admin read status).

---

## 🔌 How It Works

### 1. **Notification Creation** (Backend)

When an event occurs (payment, signup, etc.), the system:

1. Creates notification in database via `AdminNotification.create()`
2. Emits socket notification to connected admins with database ID
3. All admins receive real-time notification

```javascript
// In utils/socketService.js
export const emitNotificationToAdmin = async (notification) => {
  // Store in database
  const storedNotification = await AdminNotification.create({...});
  
  // Emit to connected admins with database ID
  io.to('admin').emit('admin_notification', {
    id: storedNotification._id.toString(),
    ...notification
  });
};
```

### 2. **Real-Time Delivery** (Socket.io)

Connected admins receive notifications instantly via socket with:
- Database `id` for marking as read
- All notification data
- `is_read: false` (for current admin)

### 3. **Persistence** (Database)

All notifications are stored permanently in MongoDB, accessible via REST API.

---

## 📡 REST API Endpoints

### Get All Notifications

**GET** `/api/admin/notifications`

**Query Parameters**:
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `unread` (optional, "true" to filter unread only)
- `priority` (optional, "high", "medium", or "low")
- `type` (optional, filter by notification type)

**Response**:
```json
{
  "success": true,
  "count": 10,
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "type": "payment_received",
      "title": "Payment Received",
      "message": "John Doe paid $150.00 for invoice INV_001",
      "priority": "high",
      "data": {...},
      "is_read": false,
      "read_at": null,
      "createdAt": "2025-12-18T10:30:00.000Z",
      "updatedAt": "2025-12-18T10:30:00.000Z"
    }
  ]
}
```

---

### Get Unread Count

**GET** `/api/admin/notifications/unread-count`

**Response**:
```json
{
  "success": true,
  "unread_count": 15
}
```

---

### Mark Notification as Read

**PUT** `/api/admin/notifications/:id/read`

**Response**:
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {...}
}
```

---

### Mark All as Read

**PUT** `/api/admin/notifications/read-all`

**Response**:
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "count": 15
}
```

---

### Delete Notification

**DELETE** `/api/admin/notifications/:id`

**Response**:
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## 🔄 Frontend Integration Pattern

### On Page Load

```javascript
// 1. Fetch stored notifications from API
const response = await fetch('/api/admin/notifications?page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
const { data: notifications } = await response.json();

// 2. Display notifications
setNotifications(notifications);

// 3. Get unread count
const unreadResponse = await fetch('/api/admin/notifications/unread-count', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const { unread_count } = await unreadResponse.json();
setUnreadCount(unread_count);
```

### Real-Time Updates (Socket)

```javascript
// Connect to socket
const socket = io('http://localhost:5000', {
  auth: { token: adminToken }
});

// Listen for new notifications
socket.on('admin_notification', (notification) => {
  // Add to notifications array (prepend)
  setNotifications(prev => [notification, ...prev]);
  
  // Update unread count
  setUnreadCount(prev => prev + 1);
  
  // Show toast/alert
  showNotification(notification);
});
```

### Mark as Read

```javascript
// Mark single notification as read
const markAsRead = async (notificationId) => {
  await fetch(`/api/admin/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  // Update local state
  setNotifications(prev => prev.map(n => 
    n._id === notificationId ? { ...n, is_read: true } : n
  ));
  setUnreadCount(prev => Math.max(0, prev - 1));
};

// Mark all as read
const markAllAsRead = async () => {
  await fetch('/api/admin/notifications/read-all', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  // Update local state
  setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  setUnreadCount(0);
};
```

---

## 🎯 Complete React Hook Example

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const adminToken = localStorage.getItem('adminToken');

  // Fetch notifications on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [notificationsRes, countRes] = await Promise.all([
          fetch('/api/admin/notifications?page=1&limit=50', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
          }),
          fetch('/api/admin/notifications/unread-count', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
          })
        ]);

        const { data: notifs } = await notificationsRes.json();
        const { unread_count } = await countRes.json();

        setNotifications(notifs);
        setUnreadCount(unread_count);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [adminToken]);

  // Connect to socket for real-time updates
  useEffect(() => {
    if (!adminToken) return;

    const socket = io('http://localhost:5000', {
      auth: { token: adminToken }
    });

    socket.on('admin_notification', (notification) => {
      // Prepend new notification
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => socket.disconnect();
  }, [adminToken]);

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/admin/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      setNotifications(prev => prev.map(n =>
        n._id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/admin/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  };
}
```

---

## ✅ Benefits

1. **Persistent**: Notifications survive page refreshes
2. **Real-Time**: Instant delivery via Socket.io
3. **Per-Admin Read Status**: Each admin's read status is tracked separately
4. **Queryable**: Filter by priority, type, read status
5. **Pagination**: Handle large notification lists
6. **Historical**: View past notifications

---

## 🔒 Security

- All endpoints require admin authentication (`tokenMiddleware` + `protectAdmin`)
- Only admins/moderators can access notifications
- Read status is tracked per admin (not global)

---

## 📚 Related Documentation

- `ADMIN_NOTIFICATIONS.md` - Full notification documentation
- `ADMIN_NOTIFICATIONS_QUICK_REFERENCE.md` - Quick reference guide



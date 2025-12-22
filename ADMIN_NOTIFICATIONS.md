# Admin Notifications - Integration Guide

This document provides complete integration instructions for admin notifications in the StorageUp backend. Admin notifications are sent in real-time via Socket.io to all connected admin users.

## Overview

Admin notifications are sent when important events occur in the system:
- **Customer Signup**: New customer registration
- **Payment Events**: Successful payments and payment failures
- **Invoice Events**: Invoice creation, updates, and overdue status
- **User Account Updates**: Important changes to user accounts

---

## Socket.io Setup

### 1. Connection

Connect to the Socket.io server with authentication:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-admin-jwt-token' // Get from admin login
  },
  // Alternative: pass token in query or headers
  query: {
    token: 'your-admin-jwt-token'
  },
  // Or use Authorization header:
  extraHeaders: {
    Authorization: 'Bearer your-admin-jwt-token'
  }
});
```

### 2. Authentication

The socket connection is authenticated using JWT tokens. The token can be provided via:
- `auth.token` (recommended)
- `query.token`
- `Authorization` header (`Bearer <token>`)
- Cookie (`adminToken` cookie)

### 3. Listen for Admin Notifications

Once connected and authenticated as admin, listen for notifications:

```javascript
socket.on('admin_notification', (notification) => {
  console.log('Admin notification received:', notification);
  
  // notification structure:
  // {
  //   type: 'payment_received' | 'payment_failed' | 'customer_signup' | 'invoice_created' | 'invoice_updated' | 'invoice_overdue' | 'user_updated',
  //   title: string,
  //   message: string,
  //   priority: 'high' | 'medium' | 'low',
  //   timestamp: ISO 8601 date string,
  //   data: { ... }
  // }
});
```

### 4. Connection Status

Handle connection events:

```javascript
socket.on('connect', () => {
  console.log('Connected to server');
  // Admin automatically joins 'admin' room upon connection
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

---

## Notification Types

### 1. Customer Signup (`customer_signup`)

**Trigger**: When a new customer registers via `/api/auth/signup`

**Priority**: `medium`

**Example**:
```json
{
  "type": "customer_signup",
  "title": "New Customer Signup",
  "message": "John Doe (john@example.com) just signed up",
  "priority": "medium",
  "timestamp": "2025-12-18T10:30:00.000Z",
  "data": {
    "user_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+1234567890",
    "signup_date": "2025-12-18T10:30:00.000Z"
  }
}
```

---

### 2. Payment Received (`payment_received`)

**Trigger**: When a customer successfully pays an invoice via Stripe

**Priority**: `high`

**Example**:
```json
{
  "type": "payment_received",
  "title": "Payment Received",
  "message": "John Doe paid $150.00 for invoice INV_001",
  "priority": "high",
  "timestamp": "2025-12-18T10:30:00.000Z",
  "data": {
    "invoice_id": "507f1f77bcf86cd799439012",
    "invoice_number": "INV_001",
    "customer_id": "507f1f77bcf86cd799439011",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "amount": 150.00,
    "paid_at": "2025-12-18T10:30:00.000Z",
    "payment_method": "stripe"
  }
}
```

---

### 3. Payment Failed (`payment_failed`)

**Trigger**: When a Stripe payment fails

**Priority**: `high`

**Example**:
```json
{
  "type": "payment_failed",
  "title": "Payment Failed",
  "message": "Payment failed for invoice INV_002 - John Doe",
  "priority": "high",
  "timestamp": "2025-12-18T10:30:00.000Z",
  "data": {
    "invoice_id": "507f1f77bcf86cd799439013",
    "invoice_number": "INV_002",
    "customer_id": "507f1f77bcf86cd799439011",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "amount": 150.00,
    "failure_reason": "insufficient_funds",
    "failed_at": "2025-12-18T10:30:00.000Z"
  }
}
```

---

### 4. Invoice Created (`invoice_created`)

**Trigger**: When an admin creates a new invoice via `/api/admin/invoices`

**Priority**: `medium`

**Example**:
```json
{
  "type": "invoice_created",
  "title": "New Invoice Created",
  "message": "Invoice INV_003 created for John Doe - $200.00",
  "priority": "medium",
  "timestamp": "2025-12-18T10:30:00.000Z",
  "data": {
    "invoice_id": "507f1f77bcf86cd799439014",
    "invoice_number": "INV_003",
    "customer_id": "507f1f77bcf86cd799439011",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "amount": 200.00,
    "due_date": "2025-12-25T00:00:00.000Z",
    "status": "pending",
    "created_at": "2025-12-18T10:30:00.000Z"
  }
}
```

---

### 5. Invoice Updated (`invoice_updated`)

**Trigger**: When an admin updates an invoice (status change, amount, due date)

**Priority**: `medium`

**Example**:
```json
{
  "type": "invoice_updated",
  "title": "Invoice Updated",
  "message": "Invoice INV_003 updated - Status: pending → overdue",
  "priority": "medium",
  "timestamp": "2025-12-18T10:30:00.000Z",
  "data": {
    "invoice_id": "507f1f77bcf86cd799439014",
    "invoice_number": "INV_003",
    "customer_id": "507f1f77bcf86cd799439011",
    "customer_name": "John Doe",
    "old_status": "pending",
    "new_status": "overdue",
    "amount": 200.00,
    "due_date": "2025-12-25T00:00:00.000Z",
    "updated_at": "2025-12-18T10:30:00.000Z"
  }
}
```

---

### 6. Invoice Overdue Batch (`invoice_overdue`)

**Trigger**: When daily processing job marks invoices as overdue

**Priority**: `high`

**Example**:
```json
{
  "type": "invoice_overdue",
  "title": "Invoices Marked Overdue",
  "message": "5 invoices marked as overdue. Total amount: $1,250.00",
  "priority": "high",
  "timestamp": "2025-12-18T10:30:00.000Z",
  "data": {
    "count": 5,
    "total_amount": 1250.00,
    "processing_date": "2025-12-18",
    "invoices": [
      {
        "invoice_id": "INV_001",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "amount": 250.00,
        "due_date": "2025-12-15T00:00:00.000Z",
        "days_overdue": 3
      }
      // ... up to 10 invoices
    ]
  }
}
```

---

### 7. User Updated (`user_updated`)

**Trigger**: When an admin updates important user fields (email, phone, roles, name)

**Priority**: `medium`

**Example**:
```json
{
  "type": "user_updated",
  "title": "User Account Updated",
  "message": "User John Doe account updated. Changed: email, roles",
  "priority": "medium",
  "timestamp": "2025-12-18T10:30:00.000Z",
  "data": {
    "user_id": "507f1f77bcf86cd799439011",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "changed_fields": ["email", "roles"],
    "updated_by": "Admin User",
    "updated_at": "2025-12-18T10:30:00.000Z",
    "changes": {
      "email": {
        "old": "oldemail@example.com",
        "new": "john@example.com"
      },
      "roles": {
        "old": ["user"],
        "new": ["user", "premium"]
      }
    }
  }
}
```

---

## Frontend Integration Example

### React Example

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './auth-context'; // Your auth context

function AdminNotificationHandler() {
  const { adminToken } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!adminToken) return;

    // Connect to socket
    const socket = io('http://localhost:5000', {
      auth: { token: adminToken }
    });

    // Handle connection
    socket.on('connect', () => {
      console.log('✅ Connected to admin notifications');
    });

    // Listen for admin notifications
    socket.on('admin_notification', (notification) => {
      console.log('📢 Admin notification:', notification);
      
      // Add to notifications array
      setNotifications(prev => [notification, ...prev]);
      
      // Show toast/alert based on priority
      if (notification.priority === 'high') {
        // Show urgent notification
        showUrgentNotification(notification);
      } else {
        // Show normal notification
        showNotification(notification);
      }
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [adminToken]);

  return (
    <div>
      {/* Render notifications */}
      {notifications.map((notif, index) => (
        <NotificationCard key={index} notification={notif} />
      ))}
    </div>
  );
}
```

### Vue.js Example

```javascript
import { onMounted, onUnmounted, ref } from 'vue';
import { io } from 'socket.io-client';

export function useAdminNotifications() {
  const notifications = ref([]);
  let socket = null;

  onMounted(() => {
    const adminToken = localStorage.getItem('adminToken');
    
    if (!adminToken) return;

    socket = io('http://localhost:5000', {
      auth: { token: adminToken }
    });

    socket.on('connect', () => {
      console.log('✅ Connected to admin notifications');
    });

    socket.on('admin_notification', (notification) => {
      notifications.value.unshift(notification);
      handleNotification(notification);
    });
  });

  onUnmounted(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  return { notifications };
}
```

---

## Priority Levels

- **`high`**: Requires immediate attention (payments, failures, overdue invoices)
- **`medium`**: Important but not urgent (signups, updates, invoice creation)
- **`low`**: Informational (not currently used, reserved for future)

---

## API Endpoints

Admin notifications are **socket-only** and do not have REST API endpoints. They are delivered in real-time via Socket.io.

However, if you need to fetch notification history, you can:

1. **Get all payments** - `/api/admin/payments` (if implemented)
2. **Get all invoices** - `/api/admin/invoices`
3. **Get all users** - `/api/admin/users`
4. **Get daily processing results** - `/api/admin/daily-processing/results`

---

## Error Handling

```javascript
socket.on('connect_error', (error) => {
  if (error.message === 'Invalid authentication token') {
    // Token expired or invalid - redirect to login
    window.location.href = '/admin/login';
  } else {
    console.error('Connection error:', error);
    // Retry connection or show error message
  }
});
```

---

## Testing

### Test Socket Connection

```javascript
// Test connection
socket.on('connect', () => {
  console.log('✅ Socket connected');
  console.log('Socket ID:', socket.id);
});

// Test notification reception
socket.on('admin_notification', (notification) => {
  console.log('✅ Notification received:', notification);
});
```

### Trigger Test Notifications

1. **Customer Signup**: Register a new user at `/api/auth/signup`
2. **Payment Received**: Complete a Stripe payment
3. **Payment Failed**: Trigger a failed payment (use test card)
4. **Invoice Created**: Create invoice at `/api/admin/invoices`
5. **Invoice Updated**: Update invoice status at `/api/admin/invoices/:id`
6. **Invoice Overdue**: Run daily processing job at `/api/admin/daily-processing/generate`
7. **User Updated**: Update user at `/api/admin/users/:id`

---

## Troubleshooting

### Notifications not received?

1. **Check authentication**: Ensure admin token is valid
2. **Check connection**: Verify socket is connected (`socket.connected`)
3. **Check room**: Admin should automatically join `admin` room
4. **Check server logs**: Look for "📢 Admin notification sent" messages
5. **Check browser console**: Look for connection errors

### Multiple notifications?

Each admin connection receives all notifications. If multiple admin tabs are open, each will receive notifications independently.

---

## Security Notes

1. **Authentication Required**: Admin notifications require valid admin JWT token
2. **Room Isolation**: Only users with `admin` or `moderator` roles join the `admin` room
3. **No Data Storage**: Admin notifications are socket-only (not stored in database)
4. **HTTPS in Production**: Use secure WebSocket connections (`wss://`) in production

---

## Support

For issues or questions, check:
- Server logs for notification emission
- Socket.io connection status
- JWT token validity
- Admin role assignment in database



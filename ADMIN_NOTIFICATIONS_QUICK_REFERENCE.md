# Admin Notifications - Quick Reference

## ⚡ Socket Connection

### Base URL
```
ws://localhost:5000 (Development)
wss://your-domain.com (Production)
```

### Connection Code

```javascript
import { io } from 'socket.io-client';

// Get admin token from login response or localStorage
const adminToken = localStorage.getItem('adminToken'); // or from cookie

// Connect to socket
const socket = io('http://localhost:5000', {
  auth: {
    token: adminToken  // ✅ Recommended method
  },
  // Alternative methods:
  // query: { token: adminToken },
  // extraHeaders: { Authorization: `Bearer ${adminToken}` }
});

// Listen for admin notifications
socket.on('admin_notification', (notification) => {
  console.log('📢 Admin Notification:', notification);
  
  // Handle notification based on type
  switch(notification.type) {
    case 'payment_received':
      // Handle payment received
      break;
    case 'payment_failed':
      // Handle payment failed
      break;
    case 'customer_signup':
      // Handle new signup
      break;
    // ... other types
  }
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to admin notifications');
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  if (error.message === 'Invalid authentication token') {
    // Redirect to login
  }
});
```

---

## 📡 Socket Event Names

### Listen for Notifications
```javascript
socket.on('admin_notification', (notification) => { ... });
```

### Send Events (Optional)
```javascript
// Ping server to check connection
socket.emit('ping');
socket.on('pong', (data) => {
  console.log('Server response:', data);
});
```

---

## 🔐 Authentication

**Token Source**: Get JWT token from admin login endpoint:
- **Endpoint**: `POST /api/auth/admin/login`
- **Response**: Token stored in `adminToken` cookie or returned in response
- **Use**: Pass token in `auth.token` when connecting

**Requirements**:
- User must have `admin` or `moderator` role
- Token must be valid (not expired)
- Socket automatically joins `admin` room upon successful authentication

---

## 📋 Notification Types

| Type | Priority | Trigger Event |
|------|----------|---------------|
| `customer_signup` | `medium` | New customer registration |
| `payment_received` | `high` | Successful Stripe payment |
| `payment_failed` | `high` | Failed Stripe payment |
| `invoice_created` | `medium` | Admin creates invoice |
| `invoice_updated` | `medium` | Admin updates invoice |
| `invoice_overdue` | `high` | Daily processing marks invoices overdue |
| `user_updated` | `medium` | Admin updates user account |

---

## 📦 Notification Structure

```typescript
interface AdminNotification {
  type: 'payment_received' | 'payment_failed' | 'customer_signup' | 
        'invoice_created' | 'invoice_updated' | 'invoice_overdue' | 'user_updated';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string; // ISO 8601 format
  data: {
    // Type-specific data (see examples below)
    [key: string]: any;
  };
}
```

---

## 📝 Notification Examples

### 1. Payment Received
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

### 2. Payment Failed
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
    "customer_name": "John Doe",
    "amount": 150.00,
    "failure_reason": "insufficient_funds"
  }
}
```

### 3. Customer Signup
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

### 4. Invoice Created
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
    "customer_name": "John Doe",
    "amount": 200.00,
    "due_date": "2025-12-25T00:00:00.000Z",
    "status": "pending"
  }
}
```

### 5. Invoice Overdue (Batch)
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
        "amount": 250.00,
        "days_overdue": 3
      }
    ]
  }
}
```

---

## 🚫 REST API Endpoints

**Note**: Admin notifications are **socket-only**. There are **NO REST endpoints** for fetching admin notifications.

However, you can fetch related data via existing endpoints:

- **Payments**: Use payment/invoice endpoints to view payment history
- **Invoices**: `GET /api/admin/invoices` - View all invoices
- **Users**: `GET /api/admin/users` - View all users
- **Daily Processing**: `GET /api/admin/daily-processing/results` - View processing results

---

## 🔄 Complete React Example

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Get admin token (adjust based on your auth system)
    const adminToken = localStorage.getItem('adminToken');
    
    if (!adminToken) {
      console.warn('No admin token found');
      return;
    }

    // Initialize socket connection
    const newSocket = io('http://localhost:5000', {
      auth: { token: adminToken },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Admin notifications connected');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Admin notifications disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      if (error.message === 'Invalid authentication token') {
        // Handle token expiration
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      }
    });

    // Listen for admin notifications
    newSocket.on('admin_notification', (notification) => {
      console.log('📢 Admin notification received:', notification);
      
      // Add to notifications array
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
      
      // Optional: Show toast/alert
      if (notification.priority === 'high') {
        // Show urgent notification (e.g., toast, alert)
        showHighPriorityNotification(notification);
      }
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return { notifications, socket, connected };
}

// Usage in component
function AdminDashboard() {
  const { notifications, connected } = useAdminNotifications();

  return (
    <div>
      <div>Status: {connected ? '✅ Connected' : '❌ Disconnected'}</div>
      <div>Notifications: {notifications.length}</div>
      {notifications.map((notif, index) => (
        <div key={index} className={`notification ${notif.priority}`}>
          <strong>{notif.title}</strong>
          <p>{notif.message}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ Testing Checklist

1. ✅ Get admin token from login
2. ✅ Connect socket with token
3. ✅ Verify connection success
4. ✅ Listen for `admin_notification` event
5. ✅ Test notifications:
   - Create a new user (triggers `customer_signup`)
   - Process a payment (triggers `payment_received`)
   - Create an invoice (triggers `invoice_created`)
   - Run daily processing (triggers `invoice_overdue`)

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Not receiving notifications | Check admin token is valid |
| Connection refused | Verify server is running on correct port |
| "Invalid token" error | Token expired, re-login required |
| No notifications | Verify user has `admin` or `moderator` role |

---

## 📚 Full Documentation

See `ADMIN_NOTIFICATIONS.md` for complete documentation with all notification types and detailed examples.





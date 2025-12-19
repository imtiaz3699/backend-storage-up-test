/**
 * Socket Service - Centralized socket.io management
 * Provides utilities to emit notifications to specific users
 */

import { Server } from 'socket.io';

let io = null;

/**
 * Initialize Socket.io server
 * @param {http.Server} server - HTTP server instance
 */
export const initializeSocket = (server) => {
  if (io) {
    console.log('⚠️  Socket.io already initialized');
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps)
        if (!origin) {
          return callback(null, true);
        }

        const allowedOrigins = [
          "http://localhost:3000",
          "http://localhost:7000",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:7000",
          "https://storag-up-admin-64aa23516b44.herokuapp.com",
          "https://5a8385ef78c9.ngrok-free.app",
          "http://192.168.100.141:7000"
        ];

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // In development, allow localhost on any port
          if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        }
      },
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  console.log('✅ Socket.io initialized');
  return io;
};

/**
 * Get the Socket.io instance
 * @returns {Server|null} Socket.io server instance
 */
export const getIO = () => {
  if (!io) {
    console.warn('⚠️  Socket.io not initialized. Call initializeSocket() first.');
  }
  return io;
};

/**
 * Emit notification to a specific user
 * @param {string} userId - User ID (MongoDB ObjectId as string)
 * @param {Object} notification - Notification object
 * @param {string} notification.type - Notification type
 * @param {string} notification.title - Notification title
 * @param {string} notification.message - Notification message
 * @param {Object} notification.data - Additional data
 */
export const emitNotificationToUser = (userId, notification) => {
  if (!io) {
    return false;
  }
  if (!userId) {
    return false;
  }
  const userRoom = `user_${userId}`;
  io.to(userRoom).emit('notification', {
    ...notification,
    timestamp: new Date().toISOString()
  });
  return true;
};

/**
 * Emit notification to all connected users (admin broadcasts)
 * @param {Object} notification - Notification object
 */
export const emitNotificationToAll = (notification) => {
  if (!io) {
    console.warn('⚠️  Cannot emit notification: Socket.io not initialized');
    return false;
  }
  io.emit('notification', {
    ...notification,
    timestamp: new Date().toISOString()
  });
  console.log('📢 Notification broadcasted to all connected users');
  return true;
};

/**
 * Emit notification to all connected admins and store in database
 * @param {Object} notification - Notification object
 * @param {string} notification.type - Notification type (customer_signup, payment_received, payment_failed, invoice_created, invoice_updated, invoice_overdue, user_updated)
 * @param {string} notification.title - Notification title
 * @param {string} notification.message - Notification message
 * @param {Object} notification.data - Additional data
 * @param {string} notification.priority - Priority level ('high', 'medium', 'low'), defaults to 'medium'
 */
export const emitNotificationToAdmin = async (notification) => {
  if (!io) {
    console.warn('⚠️  Cannot emit admin notification: Socket.io not initialized');
    return false;
  }

  try {
    // Store notification in database
    const AdminNotification = (await import('../models/AdminNotification.js')).default;
    const storedNotification = await AdminNotification.create({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority || 'medium',
      data: notification.data || {}
    });

    // Emit to connected admins with database ID
    const notificationToEmit = {
      id: storedNotification._id.toString(),
      type: storedNotification.type,
      title: storedNotification.title,
      message: storedNotification.message,
      priority: storedNotification.priority,
      timestamp: storedNotification.createdAt.toISOString(),
      data: storedNotification.data,
      is_read: false
    };

    io.to('admin').emit('admin_notification', notificationToEmit);
    console.log(`📢 Admin notification sent and stored: ${notification.type || 'unknown'} (ID: ${storedNotification._id})`);
    return true;
  } catch (error) {
    console.error('❌ Error storing admin notification:', error.message);
    // Still emit to connected admins even if database save fails
    io.to('admin').emit('admin_notification', {
      ...notification,
      priority: notification.priority || 'medium',
      timestamp: new Date().toISOString()
    });
    return false;
  }
};


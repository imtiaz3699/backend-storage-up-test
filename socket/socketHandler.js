/**
 * Socket Handler - Manages socket connections and authentication
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getIO } from '../utils/socketService.js';

/**
 * Extract token from socket handshake (cookies, auth, query, or headers)
 * @param {Object} handshake - Socket handshake object
 * @returns {string|null} JWT token or null
 */
const extractTokenFromHandshake = (handshake) => {
  // Try auth.token first (recommended for Socket.io)
  if (handshake.auth?.token) {
    return handshake.auth.token;
  }

  // Try query.token
  if (handshake.query?.token) {
    return handshake.query.token;
  }

  // Try Authorization header
  if (handshake.headers?.authorization?.startsWith('Bearer ')) {
    return handshake.headers.authorization.split(' ')[1];
  }

  // Try parsing cookies (for browser-based connections)
  if (handshake.headers?.cookie) {
    const cookies = handshake.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    // Check for adminToken first, then token
    if (cookies.adminToken) {
      return cookies.adminToken;
    }
    if (cookies.token) {
      return cookies.token;
    }
  }

  return null;
};

/**
 * Authenticate socket connection using JWT token
 * @param {string} token - JWT token from handshake
 * @returns {Promise<Object|null>} User object if authenticated, null otherwise
 */
const authenticateSocket = async (token) => {
  try {
    if (!token) {
      return null;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID
    const user = await User.findById(decoded.userId).select('_id name email roles');
    
    if (!user) {
      return null;
    }

    return {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      roles: user.roles
    };
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    return null;
  }
};

/**
 * Initialize socket connection handlers
 * @param {Server} io - Socket.io server instance
 */
export const initializeSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      // Extract token from handshake (tries multiple sources)
      const token = extractTokenFromHandshake(socket.handshake);

      if (!token) {
        console.log('❌ Socket connection rejected: No token provided');
        return next(new Error('Authentication required'));
      }

      // Authenticate user
      const user = await authenticateSocket(token);
      
      if (!user) {
        console.log('❌ Socket connection rejected: Invalid token');
        return next(new Error('Invalid authentication token'));
      }

      // Attach user info to socket
      socket.userId = user.userId;
      socket.user = user;
      
      console.log(`✅ Socket authenticated: User ${user.userId} (${user.name})`);
      next();
    } catch (error) {
      console.error('Socket middleware error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const userRoom = `user_${userId}`;

    // Join user's personal room for targeted notifications
    socket.join(userRoom);
    console.log(`👤 User ${userId} connected and joined room: ${userRoom}`);

    // Join admin room if user is admin
    if (socket.user?.roles?.includes('admin') || socket.user?.roles?.includes('moderator')) {
      socket.join('admin');
      console.log(`👑 Admin ${userId} joined admin room`);
    }

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`👋 User ${userId} disconnected: ${reason}`);
    });

    // Handle notification read status
    socket.on('mark_notification_read', async (data) => {
      try {
        const Notification = (await import('../models/Notification.js')).default;
        const { notificationId } = data;
        
        if (notificationId) {
          await Notification.findByIdAndUpdate(notificationId, {
            read: true,
            read_at: new Date()
          });
          
          console.log(`✅ Notification ${notificationId} marked as read by user ${userId}`);
        }
      } catch (error) {
        console.error('Error marking notification as read:', error.message);
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
  });

  console.log('✅ Socket handlers initialized');
};


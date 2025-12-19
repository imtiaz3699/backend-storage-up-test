import express from 'express';
import { 
  getMyNotifications, 
  getUnreadCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '../controllers/notificationController.js';
import { tokenMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All notification routes require authentication
router.use(tokenMiddleware);

// Notification routes
router.get('/', getMyNotifications); // Get all notifications for current user
router.get('/unread-count', getUnreadCount); // Get unread notifications count
router.put('/:id/read', markNotificationAsRead); // Mark notification as read
router.put('/read-all', markAllNotificationsAsRead); // Mark all notifications as read
router.delete('/:id', deleteNotification); // Delete a notification

export default router;


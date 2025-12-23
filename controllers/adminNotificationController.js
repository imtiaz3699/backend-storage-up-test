import AdminNotification from '../models/AdminNotification.js';

const buildPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Get all admin notifications with pagination
 */
export const getAdminNotifications = async (req, res) => {
  try {
    const adminId = req.userId; // From tokenMiddleware
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unread === 'true';
    const priority = req.query.priority; // Filter by priority (high, medium, low)
    const type = req.query.type; // Filter by notification type

    // Build filter
    const filter = {};
    
    // Filter for unread only (notifications not read by this admin)
    if (unreadOnly) {
      filter.$or = [
        { read_by: { $exists: false } },
        { read_by: { $size: 0 } },
        { 'read_by.admin_id': { $ne: adminId } }
      ];
    }

    // Filter by priority
    if (priority && ['high', 'medium', 'low'].includes(priority)) {
      filter.priority = priority;
    }

    // Filter by type
    if (type) {
      filter.type = type;
    }

    // Get notifications
    const [total, notifications] = await Promise.all([
      AdminNotification.countDocuments(filter),
      AdminNotification.find(filter)
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit)
    ]);

    // Add read status for each notification for this admin
    const notificationsWithReadStatus = notifications.map(notification => {
      const notificationObj = notification.toObject();
      notificationObj.is_read = notification.isReadBy(adminId);
      notificationObj.read_at = notification.read_by.find(r => r.admin_id.toString() === adminId.toString())?.read_at || null;
      return notificationObj;
    });

    res.status(200).json({
      success: true,
      count: notificationsWithReadStatus.length,
      pagination: buildPagination(page, limit, total),
      data: notificationsWithReadStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admin notifications',
      error: error.message
    });
  }
};

/**
 * Get unread admin notifications count
 */
export const getUnreadAdminNotificationsCount = async (req, res) => {
  try {
    const adminId = req.userId;

    const unreadCount = await AdminNotification.countDocuments({
      $or: [
        { read_by: { $exists: false } },
        { read_by: { $size: 0 } },
        { 'read_by.admin_id': { $ne: adminId } }
      ]
    });

    res.status(200).json({
      success: true,
      unread_count: unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
};

/**
 * Mark a notification as read by current admin
 */
export const markAdminNotificationAsRead = async (req, res) => {
  try {
    const adminId = req.userId;
    const notificationId = req.params.id;

    const notification = await AdminNotification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsReadBy(adminId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read by current admin
 */
export const markAllAdminNotificationsAsRead = async (req, res) => {
  try {
    const adminId = req.userId;

    // Get all unread notifications for this admin
    const unreadNotifications = await AdminNotification.find({
      $or: [
        { read_by: { $exists: false } },
        { read_by: { $size: 0 } },
        { 'read_by.admin_id': { $ne: adminId } }
      ]
    });

    // Mark each as read
    await Promise.all(
      unreadNotifications.map(notification => notification.markAsReadBy(adminId))
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      count: unreadNotifications.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message
    });
  }
};

/**
 * Delete an admin notification (admin only)
 */
export const deleteAdminNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await AdminNotification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
};





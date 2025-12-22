import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: ['customer_signup', 'payment_received', 'payment_failed', 'invoice_created', 'invoice_updated', 'invoice_overdue', 'user_updated', 'system'],
    default: 'system'
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Store additional data like invoice_id, amount, etc.
    default: {}
  },
  // Track which admins have read this notification
  read_by: [{
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    read_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries (priority + createdAt)
adminNotificationSchema.index({ priority: 1, createdAt: -1 });

// Index for unread notifications count per admin
adminNotificationSchema.index({ 'read_by.admin_id': 1 });

// Method to check if notification is read by a specific admin
adminNotificationSchema.methods.isReadBy = function(adminId) {
  return this.read_by.some(reader => reader.admin_id.toString() === adminId.toString());
};

// Method to mark as read by an admin
adminNotificationSchema.methods.markAsReadBy = function(adminId) {
  if (!this.isReadBy(adminId)) {
    this.read_by.push({
      admin_id: adminId,
      read_at: new Date()
    });
  }
  return this.save();
};

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

export default AdminNotification;



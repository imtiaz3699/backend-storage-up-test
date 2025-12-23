import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true // Index for faster queries
  },
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: ['invoice_created', 'invoice_paid', 'invoice_overdue', 'payment_reminder', 'lease_expiration', 'system'],
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
  data: {
    type: mongoose.Schema.Types.Mixed, // Store additional data like invoice_id, amount, etc.
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries (user_id + read status)
notificationSchema.index({ user_id: 1, read: 1, createdAt: -1 });

// Index for unread notifications count
notificationSchema.index({ user_id: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;





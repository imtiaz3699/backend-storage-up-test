import express from 'express';
import { getUserDashboard } from '../controllers/userDashboardController.js';
import { getUserInvoices } from '../controllers/userInvoiceController.js';
import { updateProfile } from '../controllers/userProfileController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Client-side routes - require regular user authentication
router.get('/my-rentals', protect, getUserDashboard);
router.get('/my-invoices', protect, getUserInvoices);
router.post('/profile', protect, updateProfile);

export default router;
import express from 'express';
import { getUserDashboard } from '../controllers/userDashboardController.js';
import { getUserInvoices } from '../controllers/userInvoiceController.js';
import { updateProfile } from '../controllers/userProfileController.js';
import {
  addPaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod
} from '../controllers/paymentMethodController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Client-side routes - require regular user authentication
router.get('/my-rentals', protect, getUserDashboard);
router.get('/my-invoices', protect, getUserInvoices);
router.post('/profile', protect, updateProfile);
router.post('/payment-methods', protect, addPaymentMethod);
router.get('/payment-methods', protect, getPaymentMethods);
router.put('/payment-methods/:paymentMethodId/default', protect, setDefaultPaymentMethod);
router.delete('/payment-methods/:paymentMethodId', protect, deletePaymentMethod);

export default router;
import express from 'express';
import { getUserDashboard } from '../controllers/userDashboardController.js';
import { getUserInvoices } from '../controllers/userInvoiceController.js';
import { updateProfile } from '../controllers/userProfileController.js';
import {
  addPaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  getPaymentDashboard
} from '../controllers/paymentMethodController.js';
import {
  createInvoiceCheckoutSession,
  getInvoicePaymentLink,
  getInvoicePaymentStatus,
  verifyPaymentSuccess
} from '../controllers/paymentController.js';
import {
  getMyPayments,
  getPaymentsByInvoiceId,
  getPaymentsByUserId
} from '../controllers/paymentRecordController.js';
import { protect, tokenMiddleware } from '../middleware/authMiddleware.js';
import { getTransactionsByUserId } from '../controllers/transactionController.js';

const router = express.Router();

// Client-side routes - require regular user authentication
router.get('/my-rentals', protect, getUserDashboard);
router.get('/my-invoices', protect, getUserInvoices);
router.post('/profile', protect, updateProfile);
router.post('/payment-methods', tokenMiddleware, addPaymentMethod);
router.get('/payment-dashboard/:userId', tokenMiddleware, getPaymentDashboard);
router.get('/payment-methods', protect, getPaymentMethods);
router.put('/payment-methods/:paymentMethodId/default', protect, setDefaultPaymentMethod);
router.delete('/payment-methods/:paymentMethodId', protect, deletePaymentMethod);

// Invoice Payment routes (client side)
router.post('/invoices/:invoiceId/payment/create-session', protect, createInvoiceCheckoutSession);
router.get('/invoices/:invoiceId/payment/link', protect, getInvoicePaymentLink);
router.get('/invoices/:invoiceId/payment/status', protect, getInvoicePaymentStatus);
router.get('/invoices/:invoiceId/payment/verify', verifyPaymentSuccess); // Public - called from success page with session_id

// Client Payment Records routes
router.get('/payments', protect, getMyPayments); // Get current user's payments
router.get('/invoices/:invoiceId/payments', protect, getPaymentsByInvoiceId); // Get payments for a specific invoice (user's own invoices only)
router.get("/users/:userId/payments", getPaymentsByUserId)

// Client Transaction routes
router.get('/transactions', protect, async (req, res) => {
  // Get current user's transactions
  const modifiedReq = {
    ...req,
    params: { userId: req.user._id.toString() },
    query: req.query
  };
  return getTransactionsByUserId(modifiedReq, res);
}); // Get current user's transactions

export default router;
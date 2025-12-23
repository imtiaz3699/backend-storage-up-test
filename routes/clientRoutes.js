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
  getPaymentsByInvoiceId
} from '../controllers/paymentRecordController.js';
import { protect, tokenMiddleware } from '../middleware/authMiddleware.js';
import { getTransactionsByUserId } from '../controllers/transactionController.js';
import {
  getFacilityMap,
  saveFacilityMap,
  updateUnitLayout,
  deleteFacilityMap
} from '../controllers/facilityMapController.js';

const router = express.Router();

// Client-side routes - require regular user authentication
router.get('/my-rentals', protect, getUserDashboard);
router.get('/my-invoices', protect, getUserInvoices);
router.post('/profile', protect, updateProfile);
router.post('/payment-methods', protect, addPaymentMethod);
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
router.get('/payment-dashboard', protect, getPaymentDashboard); // Get payment dashboard data (current balance, autopay status, payment methods)

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

// Facility Map routes (accessible to both clients and admins - singleton, only one map exists in the app)
router.get('/facility-map', tokenMiddleware, getFacilityMap);                              // Get the facility map
router.post('/facility-map', tokenMiddleware, saveFacilityMap);                            // Save/update facility map (upsert)
router.put('/facility-map/unit', tokenMiddleware, updateUnitLayout);                       // Update single unit position/layout
router.delete('/facility-map', tokenMiddleware, deleteFacilityMap);                        // Delete facility map

export default router;
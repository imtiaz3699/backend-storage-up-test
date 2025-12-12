import express from 'express';
import { getAllUsers, getUserById, updateUser, updateUserRentedUnits, updateUserRentedUnit, removeUserRentedUnit, deleteUser } from '../controllers/userController.js';
import {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation
} from '../controllers/locationController.js';
import {
  createUnit,
  getUnits,
  getUnitById,
  updateUnit,
  deleteUnit,
  assignUnitToUser,
  releaseUnit,
  searchUnits,
  multiplyUnits
} from '../controllers/unitController.js';


import {
  createUnitType,
  getUnitTypes,
  getUnitTypeById,
  updateUnitType,
  deleteUnitType
} from '../controllers/unitTypeController.js';
import {
  createAnalysisCode,
  getAnalysisCodes,
  getAnalysisCodeById,
  updateAnalysisCode,
  deleteAnalysisCode
} from '../controllers/analysisCodeController.js';
import {
  createReceiptAnalysisCode,
  getReceiptAnalysisCodes,
  getReceiptAnalysisCodeById,
  updateReceiptAnalysisCode,
  deleteReceiptAnalysisCode
} from '../controllers/receiptAnalysisCodeController.js';
import {
  createBillingPlan,
  getBillingPlans,
  getBillingPlanById,
  updateBillingPlan,
  deleteBillingPlan
} from '../controllers/billingPlanController.js';
import {
  createNoticeSetup,
  getNoticeSetups,
  getNoticeSetupById,
  updateNoticeSetup,
  updateNoticeDesign,
  createNoticeDesignOnly,
  createNoticeCharges,
  updateNoticeCharges,
  deleteNoticeSetup
} from '../controllers/noticeSetupController.js';
import {
  createNoticeCharge,
  getNoticeCharges,
  getNoticeChargeById,
  updateNoticeCharge,
  deleteNoticeCharge
} from '../controllers/noticeChargeController.js';
import {
  createInvoice,
  getInvoices,
  getInvoicesByCustomerId,
  getInvoiceById,
  getInvoiceByInvoiceId,
  updateInvoice,
  deleteInvoice
} from '../controllers/invoiceController.js';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction
} from '../controllers/transactionController.js';
import { getActivity } from '../controllers/userActivityController.js';
import { previewCharges } from '../controllers/chargesController.js';
import {
  getDailyProcessingStatus,
  runDailyProcessingJob,
  getDailyProcessingDashboard,
  getJobStats,
  getDailyProcessingJobs,
  runAllDailyProcessingJobs,
  getDailyProcessingResults
} from '../jobs/admin/jobController.js';
import { tokenMiddleware, protectAdmin } from '../middleware/authMiddleware.js';
import { uploadLocationImages } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Ensure every admin route requires a valid token and admin privileges
router.use(tokenMiddleware, protectAdmin);

// Admin User Management routes
router.get('/users', getAllUsers);           // Get all users with pagination
router.get('/users/:id', getUserById);       // Get user by ID
router.delete('/users/:id/rented-units/:unitId', removeUserRentedUnit);  // Remove a specific rented unit (MUST be before /rented-units route)
router.put('/users/:id/rented-units/:unitId', updateUserRentedUnit);  // Update a specific rented unit (MUST be before /rented-units route)
router.put('/users/:id/rented-units', updateUserRentedUnits);  // Update user's rented units (MUST be before /:id route)
router.put('/users/:id', updateUser);        // Update user
router.delete('/users/:id', deleteUser);     // Delete user

// Admin Location Management routes
router.post('/locations', uploadLocationImages, createLocation);      // Create location
router.get('/locations', getLocations);         // List locations
router.get('/locations/:id', getLocationById);  // Get location by ID
router.put('/locations/:id', uploadLocationImages, updateLocation);   // Update location
router.delete('/locations/:id', deleteLocation);// Delete location

// Admin Unit Management routes
router.post('/units', createUnit);             // Create unit
router.post('/units/multiply', multiplyUnits); // Multiply/create multiple units from source
router.get('/units/search', searchUnits);       // Search units by unit number (for dropdown)
router.get('/units', getUnits);                // List units
router.get('/units/:id', getUnitById);         // Get unit by ID
router.put('/units/:id', updateUnit);          // Update unit
router.delete('/units/:id', deleteUnit);       // Delete unit
router.post('/units/:unitId/assign', assignUnitToUser);  // Assign/rent unit to user
router.post('/units/:unitId/release', releaseUnit);     // Release/vacate unit

// Admin Unit Type Management routes
router.post('/unit-types', createUnitType);             // Create unit type
router.get('/unit-types', getUnitTypes);                // List unit types
router.get('/unit-types/:id', getUnitTypeById);         // Get unit type by ID
router.put('/unit-types/:id', updateUnitType);          // Update unit type
router.delete('/unit-types/:id', deleteUnitType);       // Delete unit type

// Admin Analysis Code Management routes
router.post('/analysis-codes', createAnalysisCode);             // Create analysis code
router.get('/analysis-codes', getAnalysisCodes);                // List analysis codes
router.get('/analysis-codes/:id', getAnalysisCodeById);         // Get analysis code by ID
router.put('/analysis-codes/:id', updateAnalysisCode);          // Update analysis code
router.delete('/analysis-codes/:id', deleteAnalysisCode);       // Delete analysis code

// Admin Receipt Analysis Code Management routes
router.post('/receipt-analysis-codes', createReceiptAnalysisCode);             // Create receipt analysis code
router.get('/receipt-analysis-codes', getReceiptAnalysisCodes);                // List receipt analysis codes
router.get('/receipt-analysis-codes/:id', getReceiptAnalysisCodeById);         // Get receipt analysis code by ID
router.put('/receipt-analysis-codes/:id', updateReceiptAnalysisCode);          // Update receipt analysis code
router.delete('/receipt-analysis-codes/:id', deleteReceiptAnalysisCode);       // Delete receipt analysis code

// Admin Billing Plan Management routes
router.post('/billing-plans', createBillingPlan);             // Create billing plan
router.get('/billing-plans', getBillingPlans);                // List billing plans
router.get('/billing-plans/:id', getBillingPlanById);         // Get billing plan by ID
router.put('/billing-plans/:id', updateBillingPlan);          // Update billing plan
router.delete('/billing-plans/:id', deleteBillingPlan);       // Delete billing plan

// Admin Notice Setup Management routes
router.post('/notice-setups/notice-design', createNoticeDesignOnly);// Create notice setup with notice_design only
router.post('/notice-setups/notice-charges', createNoticeCharges);// Create notice charges-only record
router.post('/notice-setups', createNoticeSetup);                 // Create notice setup
router.get('/notice-setups', getNoticeSetups);                    // List notice setups
router.get('/notice-setups/:id', getNoticeSetupById);             // Get notice setup by ID
router.put('/notice-setups/:id/notice-design', updateNoticeDesign);// Update notice design separately (MUST be before /:id route)
router.put('/notice-setups/:id/notice-charges', updateNoticeCharges);// Update notice charges separately
router.put('/notice-setups/:id', updateNoticeSetup);              // Update notice setup
router.delete('/notice-setups/:id', deleteNoticeSetup);           // Delete notice setup

// Admin Notice Charge Management routes
router.post('/notice-charges', createNoticeCharge);             // Create notice charge
router.get('/notice-charges', getNoticeCharges);                // List notice charges
router.get('/notice-charges/:id', getNoticeChargeById);         // Get notice charge by ID
router.put('/notice-charges/:id', updateNoticeCharge);          // Update notice charge
router.delete('/notice-charges/:id', deleteNoticeCharge);       // Delete notice charge

// Admin Invoice Management routes
router.post('/invoices', createInvoice);                       // Create invoice
router.get('/invoices', getInvoices);                          // List invoices
router.get('/invoices/by-customer/:customer_id', getInvoicesByCustomerId); // Get invoices by customer_id (MUST be before /:id route)
router.get('/invoices/by-id/:invoiceId', getInvoiceByInvoiceId);// Get invoice by invoice_id
router.get('/invoices/:id', getInvoiceById);                    // Get invoice by MongoDB ID
router.put('/invoices/:id', updateInvoice);                     // Update invoice
router.delete('/invoices/:id', deleteInvoice);                  // Delete invoice

// Admin Daily Processing Management routes
router.get('/daily-processing/jobs', getDailyProcessingJobs);              // List all available jobs (for frontend)
router.post('/daily-processing/generate', runAllDailyProcessingJobs);      // Run ALL jobs (Generate Daily Processing button)
router.get('/daily-processing/results', getDailyProcessingResults);        // Get processing results with invoices
router.get('/daily-processing/status', getDailyProcessingStatus);          // Get job status
router.get('/daily-processing/dashboard', getDailyProcessingDashboard);    // Get comprehensive dashboard
router.post('/daily-processing/run/:jobName', runDailyProcessingJob);      // Manually run specific job
router.get('/daily-processing/stats/:statType', getJobStats);              // Get specific statistics

// Admin Transaction Management routes
router.post('/transactions', createTransaction);                          // Create transaction
router.get('/transactions', getTransactions);                             // List transactions with pagination
router.get('/transactions/:id', getTransactionById);                      // Get transaction by ID
router.put('/transactions/:id', updateTransaction);                       // Update transaction
router.delete('/transactions/:id', deleteTransaction);                    // Delete transaction

// Admin Activity routes
router.get('/activity', getActivity);                                     // Get user activities (filterable)

// Admin Charges preview (non-persisted)
router.get('/charges/preview', previewCharges);                           // Preview rent/prorated charges for a date

export default router;




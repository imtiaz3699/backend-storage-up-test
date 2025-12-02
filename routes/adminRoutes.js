import express from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
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
  searchUnits
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
  createNoticeSetup,
  getNoticeSetups,
  getNoticeSetupById,
  updateNoticeSetup,
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
  getInvoiceById,
  getInvoiceByInvoiceId,
  updateInvoice,
  deleteInvoice
} from '../controllers/invoiceController.js';
import { tokenMiddleware, protectAdmin } from '../middleware/authMiddleware.js';
import { uploadLocationImages } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Ensure every admin route requires a valid token and admin privileges
router.use(tokenMiddleware, protectAdmin);

// Admin User Management routes
router.get('/users', getAllUsers);           // Get all users with pagination
router.get('/users/:id', getUserById);       // Get user by ID
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

// Admin Notice Setup Management routes
router.post('/notice-setups', createNoticeSetup);             // Create notice setup
router.get('/notice-setups', getNoticeSetups);                // List notice setups
router.get('/notice-setups/:id', getNoticeSetupById);         // Get notice setup by ID
router.put('/notice-setups/:id', updateNoticeSetup);          // Update notice setup
router.delete('/notice-setups/:id', deleteNoticeSetup);       // Delete notice setup

// Admin Notice Charge Management routes
router.post('/notice-charges', createNoticeCharge);             // Create notice charge
router.get('/notice-charges', getNoticeCharges);                // List notice charges
router.get('/notice-charges/:id', getNoticeChargeById);         // Get notice charge by ID
router.put('/notice-charges/:id', updateNoticeCharge);          // Update notice charge
router.delete('/notice-charges/:id', deleteNoticeCharge);       // Delete notice charge

// Admin Invoice Management routes
router.post('/invoices', createInvoice);                       // Create invoice
router.get('/invoices', getInvoices);                           // List invoices
router.get('/invoices/by-id/:invoiceId', getInvoiceByInvoiceId); // Get invoice by invoice_id
router.get('/invoices/:id', getInvoiceById);                     // Get invoice by MongoDB ID
router.put('/invoices/:id', updateInvoice);                     // Update invoice
router.delete('/invoices/:id', deleteInvoice);                  // Delete invoice

export default router;


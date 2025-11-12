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
  deleteUnit
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
import { tokenMiddleware, protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure every admin route requires a valid token and admin privileges
router.use(tokenMiddleware, protectAdmin);

// Admin User Management routes
router.get('/users', getAllUsers);           // Get all users with pagination
router.get('/users/:id', getUserById);       // Get user by ID
router.put('/users/:id', updateUser);        // Update user
router.delete('/users/:id', deleteUser);     // Delete user

// Admin Location Management routes
router.post('/locations', createLocation);      // Create location
router.get('/locations', getLocations);         // List locations
router.get('/locations/:id', getLocationById);  // Get location by ID
router.put('/locations/:id', updateLocation);   // Update location
router.delete('/locations/:id', deleteLocation);// Delete location

// Admin Unit Management routes
router.post('/units', createUnit);             // Create unit
router.get('/units', getUnits);                // List units
router.get('/units/:id', getUnitById);         // Get unit by ID
router.put('/units/:id', updateUnit);          // Update unit
router.delete('/units/:id', deleteUnit);       // Delete unit

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

export default router;


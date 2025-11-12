import express from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation
} from '../controllers/locationController.js';
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

export default router;


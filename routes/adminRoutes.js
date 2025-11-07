import express from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes are protected with protectAdmin middleware
// Admin User Management routes
router.get('/users', protectAdmin, getAllUsers);           // Get all users with pagination
router.get('/users/:id', protectAdmin, getUserById);       // Get user by ID
router.put('/users/:id', protectAdmin, updateUser);        // Update user
router.delete('/users/:id', protectAdmin, deleteUser);     // Delete user

// Additional admin routes can be added here
// router.get('/dashboard/stats', protectAdmin, getDashboardStats);
// router.get('/reports', protectAdmin, getReports);

export default router;


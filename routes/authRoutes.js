import express from 'express';
import { signup, login, logout, getMe, adminLogin, adminSignup } from '../controllers/authController.js';
import { tokenMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Client Authentication routes
router.post('/signup', signup);      // Register new user (client side)
router.post('/login', login);        // Login user (client side)
router.post('/logout', tokenMiddleware, logout);      // Logout user
router.get('/me', tokenMiddleware, getMe);            // Get current user (protected)

// Admin Authentication routes
router.post('/admin/signup', adminSignup);  // Register new admin user
router.post('/admin/login', adminLogin);    // Login admin user (admin side)

export default router;


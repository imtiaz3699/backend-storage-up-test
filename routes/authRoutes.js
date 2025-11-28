import express from 'express';
import {
  signup,
  login,
  logout,
  getMe,
  refreshToken,
  adminLogin,
  adminSignup,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  testEmail
} from '../controllers/authController.js';
import { tokenMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Request logging middleware for auth routes
router.use((req, res, next) => {
  console.log(`[auth-routes] ${req.method} ${req.path}`);
  console.log(`[auth-routes] Body:`, req.body);
  next();
});

// Client Authentication routes
router.post('/signup', signup);      // Register new user (client side)
router.post('/login', login);        // Login user (client side)
router.post('/logout', tokenMiddleware, logout);      // Logout user
router.get('/me', tokenMiddleware, getMe);            // Get current user (protected)
router.post('/refresh-token', refreshToken);         // Refresh expired token
router.post('/forgot-password', forgotPassword);      // Initiate password reset
router.post('/test-email', testEmail);                // Test email configuration (for debugging)
router.get('/reset-password/verify', verifyResetToken); // Verify password reset token
router.post('/reset-password', resetPassword);        // Reset password

// Admin Authentication routes
router.post('/admin/signup', adminSignup);  // Register new admin user
router.post('/admin/login', adminLogin);    // Login admin user (admin side)

export default router;


import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import adminRoutes from './adminRoutes.js';
import clientRoutes from './clientRoutes.js';
import { tokenMiddleware, authorize } from '../middleware/authMiddleware.js';
// import productRoutes from './productRoutes.js';

const router = express.Router();

// Route definitions
router.use('/auth', authRoutes);                                                        // Authentication routes (client & admin)
router.use('/users', tokenMiddleware, authorize('admin', 'moderator'), userRoutes);     // Protected user management routes
router.use('/admin', adminRoutes);                                                      // Additional admin-specific routes
router.use('/client', clientRoutes);                                                    // Client-side routes (regular users)
// router.use('/products', productRoutes);

// Example route
router.get('/', (req, res) => {
  res.json({
    message: 'API Routes',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        authAdmin: '/api/auth/admin',
        users: '/api/users',
        admin: '/api/admin',
        client: '/api/client'
        // products: '/api/products'
      }
  });
});

export default router;





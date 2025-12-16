import express from 'express';
import multer from 'multer';
import { createUser, getAllUsers, getUserById, updateUser, deleteUser, searchCustomers, updateUserCharges, undoUserCharges, getUserInvoicesById, addDefaultInvoicesForUser, addDefaultInvoicesForAllUsers, getUserRentedUnits } from '../controllers/userController.js';
import { uploadUserDocuments } from '../middleware/uploadMiddleware.js';

const router = express.Router();

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      code: 'UPLOAD_ERROR'
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
      code: 'UPLOAD_ERROR'
    });
  }
  next();
};

// User CRUD routes (admin protection applied via parent router)
router.post('/', createUser);           // Create user
router.get('/search', searchCustomers); // Search customers by name (for dropdown)
router.get('/', getAllUsers);           // Get all users
router.get('/:id/invoices', getUserInvoicesById);  // Get invoices by user ID (must be before /:id)
router.get('/:id/rented-units', getUserRentedUnits);  // Get rented units by user ID (must be before /:id)
router.post('/:id/invoices/default', addDefaultInvoicesForUser);  // Add default invoices for a user (admin only)
router.post('/invoices/default-all', addDefaultInvoicesForAllUsers);  // Add default invoices for all users (admin only)
router.put('/:id/charges', updateUserCharges);  // Update user charges only (must be before /:id)
router.delete('/:id/charges', undoUserCharges);  // Undo (clear) user charges (must be before /:id)
router.get('/:id', getUserById);        // Get user by ID
router.put('/:id', uploadUserDocuments, handleUploadError, updateUser);         // Update user (with file upload support)
router.delete('/:id', deleteUser);      // Delete user

export default router;


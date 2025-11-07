import express from 'express';
import { createUser, getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';

const router = express.Router();

// User CRUD routes (admin protection applied via parent router)
router.post('/', createUser);           // Create user
router.get('/', getAllUsers);           // Get all users
router.get('/:id', getUserById);        // Get user by ID
router.put('/:id', updateUser);         // Update user
router.delete('/:id', deleteUser);      // Delete user

export default router;


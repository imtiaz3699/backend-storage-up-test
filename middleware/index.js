// Export all middleware from here
import { tokenMiddleware, protect, protectAdmin, authorize } from './authMiddleware.js';
// import errorHandler from './errorHandler.js';

export {
  tokenMiddleware,
  protect,
  protectAdmin,
  authorize
  // errorHandler
};



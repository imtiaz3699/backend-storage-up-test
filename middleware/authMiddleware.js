import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const extractToken = (req) => {
  if (req.cookies?.adminToken) {
    return { token: req.cookies.adminToken, source: 'adminCookie' };
  }

  if (req.cookies?.token) {
    return { token: req.cookies.token, source: 'userCookie' };
  }

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return {
      token: req.headers.authorization.split(' ')[1],
      source: 'authorizationHeader'
    };
  }

  return { token: null, source: null };
};

const handleTokenError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

// Generic token middleware - verifies token and attaches user to request
export const tokenMiddleware = async (req, res, next) => {
  const { token, source } = extractToken(req);

  if (!token) {
    return handleTokenError(res, 401, 'Authentication token is missing');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return handleTokenError(res, 401, 'User no longer exists');
    }

    req.user = user;
    req.userId = user._id;
    req.tokenSource = source;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return handleTokenError(res, 401, 'Invalid token');
    }

    if (error.name === 'TokenExpiredError') {
      return handleTokenError(res, 401, 'Token expired');
    }

    return handleTokenError(res, 500, 'Error verifying token');
  }
};

// Protect routes - Require authenticated regular user access
export const protect = (req, res, next) => {
  tokenMiddleware(req, res, () => {
    const roles = req.user?.roles || [];
    const hasUserRole = roles.includes('user');
    const isElevatedRole = roles.includes('admin') || roles.includes('moderator');

    if (!hasUserRole || isElevatedRole) {
      return handleTokenError(res, 403, 'Access denied. Client credentials required.');
    }

    next();
  });
};

// Protect admin routes - Require admin/moderator role
export const protectAdmin = (req, res, next) => {
  tokenMiddleware(req, res, () => {
    const roles = req.user?.roles || [];
    const hasAdminAccess = roles.includes('admin') || roles.includes('moderator');

    if (!hasAdminAccess) {
      return handleTokenError(res, 403, 'Access denied. Admin privileges required.');
    }

    next();
  });
};

// Authorize roles - Check if user has required role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return handleTokenError(res, 401, 'Not authorized to access this route');
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return handleTokenError(
        res,
        403,
        `User role '${userRoles.join(', ')}' is not authorized to access this route. Required roles: ${roles.join(', ')}`
      );
    }

    next();
  };
};


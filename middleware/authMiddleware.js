import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const extractToken = (req) => {
  if (req?.cookies?.adminToken) {
    return { token: req.cookies.adminToken, source: 'adminCookie' };
  }

  if (req?.cookies?.token) {
    return { token: req.cookies.token, source: 'userCookie' };
  }

  if (req?.headers?.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return {
      token: req.headers.authorization.split(' ')[1],
      source: 'authorizationHeader'
    };
  }

  return { token: null, source: null };
};

const handleTokenError = (res, statusCode, message, code) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code
  });
};

// Generic token middleware - verifies token and attaches user to request
export const tokenMiddleware = async (req, res, next) => {
  const { token, source } = extractToken(req);
  if (!token) {
    return handleTokenError(res, 401, 'Authentication required. Please sign in.', 'AUTH_TOKEN_MISSING');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.userId) {
      return handleTokenError(res, 401, 'Invalid token format. Please log in again.', 'AUTH_TOKEN_INVALID');
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return handleTokenError(res, 401, 'Account no longer exists. Please contact support.', 'AUTH_ACCOUNT_NOT_FOUND');
    }

    // Ensure user has roles array
    if (!user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
      console.error(`User ${user._id} (${user.email}) has no roles assigned`);
      return handleTokenError(res, 403, 'User account is missing required role information. Please contact support.', 'AUTH_MISSING_ROLES');
    }

    req.user = user;
    req.userId = user._id;
    req.tokenSource = source;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return handleTokenError(res, 401, 'Invalid session. Please log in again.', 'AUTH_TOKEN_INVALID');
    }

    if (error.name === 'TokenExpiredError') {
      return handleTokenError(res, 401, 'Your session has expired. Please log in again.', 'AUTH_TOKEN_EXPIRED');
    }

    console.error('Token verification error:', error);
    return handleTokenError(res, 500, 'Unable to verify authentication token.', 'AUTH_TOKEN_VERIFICATION_FAILED');
  }
};

// Protect routes - Require authenticated regular user access
export const protect = (req, res, next) => {
  tokenMiddleware(req, res, () => {
    const roles = req?.user?.roles || [];
    const hasUserRole = roles.includes('user');
    const isElevatedRole = roles.includes('admin') || roles.includes('moderator');
    if (!hasUserRole || isElevatedRole) {
      return handleTokenError(
        res,
        403,
        'This action is available only to client users. Please use your client account.',
        'AUTH_FORBIDDEN_CLIENT_ONLY'
      );
    }
    next();
  });
};

// Protect admin routes - Require admin/moderator role
export const protectAdmin = (req, res, next) => {
  tokenMiddleware(req, res, () => {
    // Ensure user exists and has roles
    if (!req.user) {
      return handleTokenError(
        res,
        401,
        'User not found in session. Please log in again.',
        'AUTH_USER_NOT_FOUND'
      );
    }

    const roles = req?.user?.roles || [];
    
    // Log for debugging if roles are missing
    if (!roles || roles.length === 0) {
      console.error(`Admin access denied: User ${req.user._id} (${req.user.email}) has no roles`);
    }

    const hasAdminAccess = roles.includes('admin') || roles.includes('moderator');

    if (!hasAdminAccess) {
      console.error(`Admin access denied: User ${req.user._id} (${req.user.email}) has roles: [${roles.join(', ')}]`);
      return handleTokenError(
        res,
        403,
        'Administrator privileges are required to perform this action.',
        'AUTH_FORBIDDEN_ADMIN_ONLY'
      );
    }
    next();
  });
};

// Authorize roles - Check if user has required role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return handleTokenError(res, 401, 'Not authorized to access this route.', 'AUTH_NOT_AUTHENTICATED');
    }

    const userRoles = req?.user?.roles || [];
    const hasRole = roles?.some(role => userRoles.includes(role));

    if (!hasRole) {
      return handleTokenError(
        res,
        403,
        `Your roles (${userRoles?.length ? userRoles.join(', ') : 'none'}) do not permit this action. Required roles: ${roles?.join(', ')}.`,
        'AUTH_INSUFFICIENT_ROLE'
      );
    }

    next();
  };
};
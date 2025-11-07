# Project Update - StorageUp Backend

## Summary
Implemented complete user management system with CRUD operations and JWT-based authentication with cookie-based token storage.

## Completed Features

### 1. User CRUD Operations
- **Create User** - POST `/api/users`
- **Get All Users** - GET `/api/users` (with pagination support)
- **Get User by ID** - GET `/api/users/:id`
- **Update User** - PUT `/api/users/:id`
- **Delete User** - DELETE `/api/users/:id`

**Pagination Support:**
- Query parameters: `page` (default: 1) and `limit` (default: 10)
- Returns metadata: currentPage, totalPages, totalUsers, hasNextPage, hasPrevPage
- Users sorted by newest first

**User Model Fields:**
- `name` (required, 2-100 characters)
- `email` (required, unique, validated)
- `phoneNumber` (required, validated with regex pattern)
- `password` (required, min 6 characters, automatically hashed with bcrypt)
- `roles` (array, default: ['user'], options: 'user', 'admin', 'moderator')

### 2. Dual Authentication System (Client & Admin)

**Client-Side Authentication:**
- **Signup** - POST `/api/auth/signup` - Register new users (auto-assigned 'user' role)
- **Login** - POST `/api/auth/login` - Authenticate regular users only
- **Token:** Stored in `token` cookie

**Admin-Side Authentication:**
- **Admin Signup** - POST `/api/auth/admin/signup` - Register admin/moderator users
- **Admin Login** - POST `/api/auth/admin/login` - Authenticate admin users only
- **Token:** Stored in `adminToken` cookie

**Common Routes:**
- **Logout** - POST `/api/auth/logout` - Clear authentication token
- **Get Current User** - GET `/api/auth/me` - Get authenticated user info (protected route)

**Security Features:**
- JWT token generation and verification
- HttpOnly cookies for token storage (secure, prevents XSS attacks)
- Password hashing using bcrypt (salt rounds: 10)
- Token expiration (configurable, default: 7 days)
- Support for both cookie and Authorization header token validation

### 3. Middleware & Authorization
- **Protect Middleware** - Verifies JWT tokens for protected routes
- **Authorize Middleware** - Role-based access control (user, admin, moderator)

## Technical Implementation

### New Files Created
- `models/User.js` - User schema with password hashing
- `controllers/userController.js` - User CRUD operations (with pagination)
- `controllers/authController.js` - Authentication logic (client & admin)
- `routes/userRoutes.js` - User API endpoints
- `routes/authRoutes.js` - Authentication API endpoints (client & admin)
- `routes/adminRoutes.js` - Admin-only protected routes
- `middleware/authMiddleware.js` - JWT verification and authorization (protect & protectAdmin)
- `ADMIN_SETUP.md` - Comprehensive admin setup guide

### Dependencies Added
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation/verification
- `cookie-parser` - Cookie handling middleware

### Configuration Updates
- Added `JWT_SECRET` environment variable (required)
- Added `JWT_EXPIRE` environment variable (default: 7d)
- Added `CLIENT_URL` for CORS configuration
- Updated CORS to support credentials (for cookies)

## API Endpoints Summary

**Client Authentication:**
- `POST /api/auth/signup` - User registration (client side)
- `POST /api/auth/login` - User login (client side only)

**Admin Authentication:**
- `POST /api/auth/admin/signup` - Admin registration
- `POST /api/auth/admin/login` - Admin login (admin side only)

**Common:**
- `POST /api/auth/logout` - User/Admin logout
- `GET /api/auth/me` - Get current user (protected)

**Public User Routes:**
- `POST /api/users` - Create user
- `GET /api/users` - List all users (with pagination)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

**Admin Routes (Protected):**
- `GET /api/admin/users` - List all users (admin only, with pagination)
- `GET /api/admin/users/:id` - Get user by ID (admin only)
- `PUT /api/admin/users/:id` - Update user (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)

## Security Features
✅ Password hashing with bcrypt
✅ JWT token-based authentication
✅ **Dual authentication system** - Separate client and admin access
✅ **Role-based access control** - Users cannot login to admin panel
✅ HttpOnly cookie storage (XSS protection)
✅ Separate token cookies (`token` for clients, `adminToken` for admins)
✅ Secure flag in production (HTTPS only)
✅ Token expiration (configurable, default: 7d)
✅ Input validation and error handling
✅ Admin-only protected routes with `protectAdmin` middleware
✅ Pagination support for user lists

## Next Steps / Recommendations
1. Set up `.env` file with `JWT_SECRET` before running
2. **Create your first admin user** using `/api/auth/admin/signup` (see ADMIN_SETUP.md)
3. Configure separate frontend apps for client and admin sides
4. Consider adding rate limiting for authentication endpoints
5. Add email verification for signup (optional)
6. Implement password reset functionality (optional)
7. Add request validation middleware (e.g., express-validator)
8. Consider protecting admin signup endpoint in production

## Testing

### Prerequisites
- MongoDB running
- Environment variables configured in `.env`
- JWT_SECRET set

### Testing Client Authentication
1. Register a user: `POST /api/auth/signup`
2. Login as user: `POST /api/auth/login`
3. Try accessing admin endpoint (should fail): `GET /api/admin/users`

### Testing Admin Authentication
1. Register an admin: `POST /api/auth/admin/signup`
2. Login as admin: `POST /api/auth/admin/login`
3. Access admin endpoints: `GET /api/admin/users`
4. Try logging in as admin via client login (should fail): `POST /api/auth/login`

### Testing Separation
- Regular users **cannot** login to admin panel
- Admin users **cannot** login via client login endpoint
- Each side uses separate token cookies

## Important Notes

📌 **Two-App Architecture:**
- **Client App**: Uses `/api/auth/signup` and `/api/auth/login` 
- **Admin App**: Uses `/api/auth/admin/signup` and `/api/auth/admin/login`
- Token cookies are separate: `token` (client) vs `adminToken` (admin)

📌 **Role Enforcement:**
- Client signup: Auto-assigns 'user' role
- Admin signup: Assigns 'admin' or 'moderator' role
- Cross-access is prevented at the login level

📌 **Documentation:**
- Main API docs: `README.md`
- Admin setup guide: `ADMIN_SETUP.md`

---

**Status:** ✅ Complete and ready for testing with dual authentication


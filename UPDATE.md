# Project Update - StorageUp Backend

## Summary
Implemented complete user management system with CRUD operations, dual (client/admin) authentication, secure password reset via email links, and admin-managed storage location CRUD.

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

### 4. Password Reset Workflow
- **Forgot Password** - POST `/api/auth/forgot-password` sends email reset link
- **Verify Reset Token** - GET `/api/auth/reset-password/verify` ensures link is valid before showing form
- **Reset Password** - POST `/api/auth/reset-password` updates password once token is validated
- Secure tokens stored hashed in DB with expiry (`PASSWORD_RESET_TOKEN_EXPIRE_MINUTES`)
- Email notifications delivered via SMTP (`utils/emailService.js`) with automatic Ethereal fallback for development environments

### 5. Location, Unit & Unit-Type Management (Admin)
- **Create Location** - POST `/api/admin/locations` with detailed address, facilities, and media fields
- **List Locations** - GET `/api/admin/locations` with pagination metadata
- **Location Details** - GET `/api/admin/locations/:id`
- **Update Location** - PUT `/api/admin/locations/:id`
- **Delete Location** - DELETE `/api/admin/locations/:id`
- Comprehensive schema includes contact info, map link, facility amenities, operating hours, and gallery images
- **Create Unit** - POST `/api/admin/units` with unit details, dimensions, pricing, and maintenance notes
- **List Units / Unit Details / Update / Delete** - Full CRUD endpoints under `/api/admin/units`
- **Create Unit Type** - POST `/api/admin/unit-types` for reusable configuration of pricing and size data
- **List Unit Types / Details / Update / Delete** - Full CRUD endpoints under `/api/admin/unit-types`

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
- `utils/emailService.js` - SMTP email helper for password reset notifications
- `models/Location.js` - Schema for storage facility locations
- `controllers/locationController.js` - CRUD operations for locations

### Dependencies Added
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation/verification
- `cookie-parser` - Cookie handling middleware
- `nodemailer` - SMTP email delivery for password reset notifications

### Configuration Updates
- Added `JWT_SECRET` environment variable (required)
- Added `JWT_EXPIRE` environment variable (default: 7d)
- Added `CLIENT_URL` for CORS configuration
- Added SMTP configuration variables (`EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`)
- Added `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` for reset token expiry window
- Updated CORS to support credentials (for cookies)

## API Endpoints Summary

**Client Authentication:**
- `POST /api/auth/signup` - User registration (client side)
- `POST /api/auth/login` - User login (client side only)
- `POST /api/auth/forgot-password` - Request password reset link
- `GET /api/auth/reset-password/verify` - Validate reset token
- `POST /api/auth/reset-password` - Reset password with token

**Admin Authentication:**
- `POST /api/auth/admin/signup` - Admin registration
- `POST /api/auth/admin/login` - Admin login (admin side only)

**Common:**
- `POST /api/auth/logout` - User/Admin logout
- `GET /api/auth/me` - Get current user (protected)

**Admin Protected User Routes:**
- `POST /api/users` - Create user (admin only)
- `GET /api/users` - List all users (admin only, with pagination)
- `GET /api/users/:id` - Get user by ID (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

**Admin Location Routes:**
- `POST /api/admin/locations` - Create storage location
- `GET /api/admin/locations` - List locations (with pagination)
- `GET /api/admin/locations/:id` - Get location by ID
- `PUT /api/admin/locations/:id` - Update location
- `DELETE /api/admin/locations/:id` - Delete location

**Admin Unit Routes:**
- `POST /api/admin/units` - Create unit
- `GET /api/admin/units` - List units (with pagination)
- `GET /api/admin/units/:id` - Get unit by ID
- `PUT /api/admin/units/:id` - Update unit
- `DELETE /api/admin/units/:id` - Delete unit

**Admin Unit Type Routes:**
- `POST /api/admin/unit-types` - Create unit type
- `GET /api/admin/unit-types` - List unit types (with pagination)
- `GET /api/admin/unit-types/:id` - Get unit type by ID
- `PUT /api/admin/unit-types/:id` - Update unit type
- `DELETE /api/admin/unit-types/:id` - Delete unit type

**Admin Analysis Code Routes:**
- `POST /api/admin/analysis-codes` - Create analysis code
- `GET /api/admin/analysis-codes` - List analysis codes (with pagination)
- `GET /api/admin/analysis-codes/:id` - Get analysis code by ID
- `PUT /api/admin/analysis-codes/:id` - Update analysis code
- `DELETE /api/admin/analysis-codes/:id` - Delete analysis code

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
✅ Secure password reset tokens with email verification and expiry enforcement

## Next Steps / Recommendations
1. Set up `.env` file with `JWT_SECRET` before running
2. **Create your first admin user** using `/api/auth/admin/signup` (see ADMIN_SETUP.md)
3. Configure separate frontend apps for client and admin sides
4. Consider adding rate limiting for authentication endpoints
5. Add email verification for signup (optional)
6. Configure production-ready SMTP provider (SendGrid, SES, etc.)
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

### Testing Password Reset
1. Request reset link: `POST /api/auth/forgot-password` with a known user email
2. Copy the `token` value from the email (or logs during development)
3. Validate the token: `GET /api/auth/reset-password/verify?token=<token>`
4. Reset password: `POST /api/auth/reset-password` with `{ token, password, confirmPassword }`
5. Attempt login with new password to confirm success

### Testing Location Management
1. Authenticate as admin to obtain `adminToken`
2. Create a location: `POST /api/admin/locations` with full payload
3. List locations: `GET /api/admin/locations?page=1&limit=10`
4. Fetch details: `GET /api/admin/locations/:id`
5. Update record: `PUT /api/admin/locations/:id` with modified fields
6. Delete record: `DELETE /api/admin/locations/:id`

### Testing Unit Management
1. Authenticate as admin and note the `adminToken`
2. Create a unit type: `POST /api/admin/unit-types`
3. Create a unit: `POST /api/admin/units` (referencing the location/unit type as desired)
4. List units and unit types: `GET /api/admin/units`, `GET /api/admin/unit-types`
5. Update a unit & unit type: `PUT /api/admin/units/:id`, `PUT /api/admin/unit-types/:id`
6. Delete any test units/unit types when done: `DELETE /api/admin/units/:id`, `DELETE /api/admin/unit-types/:id`

### Testing Analysis Codes
1. Create analysis code: `POST /api/admin/analysis-codes`
2. List codes: `GET /api/admin/analysis-codes`
3. Retrieve by ID: `GET /api/admin/analysis-codes/:id`
4. Update details: `PUT /api/admin/analysis-codes/:id`
5. Delete code after testing: `DELETE /api/admin/analysis-codes/:id`

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
- Full endpoint breakdown: `API_REFERENCE.md`

---

**Status:** ✅ Complete and ready for testing with dual authentication


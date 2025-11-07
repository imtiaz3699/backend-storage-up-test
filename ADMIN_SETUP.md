# Admin Setup Guide

## Overview
This backend supports two separate authentication systems:
1. **Client Side** - Regular users who signup from the frontend
2. **Admin Side** - Admin users who manage the system

## Key Features

### Separation of Concerns
- Users who signup from the client side (`/api/auth/signup`) **cannot** login to the admin panel
- Regular users are assigned the `user` role
- Admin users have `admin` or `moderator` roles
- Each side uses separate tokens:
  - Client: `token` cookie
  - Admin: `adminToken` cookie

## Creating Your First Admin User

### Method 1: Using the Admin Signup Endpoint

```bash
POST /api/auth/admin/signup
Content-Type: application/json

{
  "name": "Super Admin",
  "email": "admin@yourcompany.com",
  "phoneNumber": "+1234567890",
  "password": "SecureAdminPassword123!",
  "role": "admin"
}
```

### Method 2: Direct Database Insert

If you need to create the first admin manually, you can use MongoDB:

```javascript
// In MongoDB shell or Compass
db.users.insertOne({
  name: "Super Admin",
  email: "admin@yourcompany.com",
  phoneNumber: "+1234567890",
  password: "$2b$10$hashedPasswordHere", // Use bcrypt to hash
  roles: ["admin"],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Authentication Flow

### Client Side Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "userpassword"
}
```
- Only accepts users with `user` role
- Sets `token` cookie
- Redirects to client dashboard

### Admin Side Login
```bash
POST /api/auth/admin/login
{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```
- Only accepts users with `admin` or `moderator` role
- Sets `adminToken` cookie
- Redirects to admin dashboard

## Role Permissions

### User Role
- Access to client-side features
- Can view/update their own profile
- Cannot access admin routes

### Moderator Role
- All user permissions
- Access to admin panel
- Can manage users
- Limited administrative features

### Admin Role
- Full system access
- Can manage all users
- Can create other admins/moderators
- Access to all features

## Protected Routes

### Client Routes
Protected with `protect` middleware - checks for `token` cookie:
- `GET /api/auth/me`
- Any client-specific protected routes

### Admin Routes
Protected with `protectAdmin` middleware - checks for `adminToken` cookie:
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`

## Security Best Practices

1. **Separate Tokens**: Client and admin use different cookie names
2. **Role Validation**: Each endpoint validates user roles
3. **HttpOnly Cookies**: Tokens stored in httpOnly cookies (XSS protection)
4. **Secure Flag**: Cookies use secure flag in production (HTTPS only)
5. **Password Hashing**: All passwords hashed with bcrypt (salt rounds: 10)

## Frontend Integration

### Client App
- Use `/api/auth/signup` for registration
- Use `/api/auth/login` for login
- Store and send `token` cookie with requests
- Handle 403 errors (redirect to login)

### Admin App
- Use `/api/auth/admin/signup` for admin registration (if allowed)
- Use `/api/auth/admin/login` for admin login
- Store and send `adminToken` cookie with requests
- Handle 403 errors (redirect to admin login)

## Example Admin Dashboard Request

```javascript
// Using fetch with credentials
fetch('http://localhost:5000/api/admin/users', {
  method: 'GET',
  credentials: 'include', // Important: sends cookies
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

## Troubleshooting

### "Access denied. Please use admin portal to login"
- User is trying to login to client side with admin credentials
- Use `/api/auth/admin/login` instead

### "Access denied. Admin privileges required"
- User is trying to login to admin side with regular user credentials
- Regular users cannot access admin panel

### "Not authorized to access this route"
- Token missing or invalid
- Token expired
- User deleted from database

## Environment Variables

Make sure these are set in your `.env` file:

```env
JWT_SECRET=your-very-secure-secret-key-here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=production
```

## Recommended Workflow

1. Set up your backend with proper environment variables
2. Create your first admin user using admin signup endpoint
3. Admin logs in via `/api/auth/admin/login`
4. Regular users signup via `/api/auth/signup`
5. Admin can manage all users via `/api/admin/*` routes
6. Regular users access client features via standard routes

---

**Security Note**: In production, you may want to:
- Disable or protect the admin signup endpoint
- Require admin invitation codes
- Add rate limiting to prevent brute force attacks
- Implement 2FA for admin accounts
- Add audit logging for admin actions


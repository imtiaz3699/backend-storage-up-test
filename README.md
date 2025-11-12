# StorageUp Backend

A Node.js backend API built with Express.js and MongoDB with full user management and authentication system.

## Features

- Express.js RESTful API
- MongoDB database integration with Mongoose
- **User CRUD Operations** - Complete user management system
- **JWT Authentication** - Secure token-based authentication
- **Cookie-based Token Storage** - HttpOnly cookies for enhanced security
- **Password Hashing** - Bcrypt encryption for secure password storage
- **Role-based Authorization** - User roles (user, admin, moderator)
- **Password Reset Flow** - Email-based password reset with secure token verification
- **Admin Location Management** - CRUD for storage facility locations with detailed metadata
- Environment variable configuration
- CORS enabled with credentials support
- Security middleware (Helmet)
- Request logging (Morgan)
- Error handling middleware
- Organized project structure
- Developer-friendly email testing (automatic Ethereal account when SMTP not configured)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Installation

1. Clone or navigate to the project directory:
   ```bash
   cd storageup-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `env.example` to `.env`
   - Update the MongoDB connection string in `.env`:
     ```
     MONGODB_URI=mongodb://localhost:27017/storageup
     ```
   - For MongoDB Atlas, use:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/storageup
     ```
   - Set JWT secret (required for authentication):
     ```
     JWT_SECRET=your-secret-key-here-change-this-in-production
     JWT_EXPIRE=7d
     CLIENT_URL=http://localhost:3000
     EMAIL_FROM="StorageUp <no-reply@storageup.com>"
     SMTP_HOST=smtp.yourprovider.com
     SMTP_PORT=587
     SMTP_SECURE=false
     SMTP_USER=your-smtp-username
     SMTP_PASS=your-smtp-password
     PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
     ```
   - If you leave SMTP values blank in development, the backend automatically uses a temporary Ethereal test inbox and logs the preview URL to the console.

## Running the Application

### Development Mode
```bash
npm run dev
```
This will start the server with nodemon for auto-reloading on file changes.

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in `.env`).

## API Endpoints

### Health Check
- `GET /api/health` - Check API and database status

### Root
- `GET /` - Welcome message

### Authentication Routes (`/api/auth`)

#### Client-Side Authentication

#### Signup (Client)
- **POST** `/api/auth/signup` - Register a new user (client side only)
  - **Body:**
    ```json
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "password": "password123"
    }
    ```
  - **Note:** Automatically assigns 'user' role. Cannot be used to create admin accounts.
  - **Response:** Returns user object and JWT token (stored in `token` cookie)

#### Login (Client)
- **POST** `/api/auth/login` - Authenticate user (client side only)
  - **Body:**
    ```json
    {
      "email": "john@example.com",
      "password": "password123"
    }
    ```
  - **Note:** Only allows users with 'user' role. Admin/moderator users cannot login here.
  - **Response:** Returns user object and JWT token (stored in `token` cookie)

#### Admin-Side Authentication

#### Admin Signup
- **POST** `/api/auth/admin/signup` - Register a new admin user
  - **Body:**
    ```json
    {
      "name": "Admin User",
      "email": "admin@example.com",
      "phoneNumber": "+1234567890",
      "password": "securepassword",
      "role": "admin" // Optional: "admin" or "moderator", defaults to "admin"
    }
    ```
  - **Response:** Returns admin user object and JWT token (stored in `adminToken` cookie)

#### Admin Login
- **POST** `/api/auth/admin/login` - Authenticate admin user (admin side only)
  - **Body:**
    ```json
    {
      "email": "admin@example.com",
      "password": "securepassword"
    }
    ```
  - **Note:** Only allows users with 'admin' or 'moderator' role. Regular users cannot login here.
  - **Response:** Returns admin user object and JWT token (stored in `adminToken` cookie)

#### Common Routes

#### Logout
- **POST** `/api/auth/logout` - Logout user (clears token cookie)
  - **Response:** Success message

#### Get Current User
- **GET** `/api/auth/me` - Get current authenticated user (Protected)
  - **Headers:** Requires valid JWT token in `token` or `adminToken` cookie or Authorization header
  - **Response:** Returns current user object

#### Forgot Password
- **POST** `/api/auth/forgot-password` - Request a password reset link
  - **Body:**
    ```json
    {
      "email": "john@example.com"
    }
    ```
  - **Response:** Always returns success message to avoid revealing valid emails

#### Verify Reset Token
- **GET** `/api/auth/reset-password/verify?token=<token>` - Validate reset token before showing reset form
  - **Response:** Returns basic user info when the token is valid

#### Reset Password
- **POST** `/api/auth/reset-password` - Reset password using the email link token
  - **Body:**
    ```json
    {
      "token": "reset-token-from-email",
      "password": "newPassword123!",
      "confirmPassword": "newPassword123!"
    }
    ```
  - **Response:** Success message indicating the password has been updated

### User Routes (`/api/users`)

**Note:** These routes are admin-protected and require a valid admin token (`adminToken` cookie or Bearer token with admin/moderator role).

#### Create User
- **POST** `/api/users` - Create a new user
  - **Body:**
    ```json
    {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phoneNumber": "+1234567890",
      "password": "password123",
      "roles": ["user"]
    }
    ```
  - **Response:** Returns created user object (password excluded)

#### Get All Users
- **GET** `/api/users` - Get all users with pagination
  - **Query Parameters:**
    - `page` (optional, default: 1) - Page number
    - `limit` (optional, default: 10) - Number of users per page
  - **Example:** `/api/users?page=2&limit=20`
  - **Response:** Returns paginated array of users (passwords excluded) with pagination metadata
    ```json
    {
      "success": true,
      "count": 10,
      "pagination": {
        "currentPage": 1,
        "totalPages": 5,
        "totalUsers": 50,
        "limit": 10,
        "hasNextPage": true,
        "hasPrevPage": false,
        "nextPage": 2,
        "prevPage": null
      },
      "data": [...]
    }
    ```

#### Get User by ID
- **GET** `/api/users/:id` - Get a specific user by ID
  - **Response:** Returns user object (password excluded)

#### Update User
- **PUT** `/api/users/:id` - Update user information
  - **Body:** (All fields optional)
    ```json
    {
      "name": "Updated Name",
      "email": "updated@example.com",
      "phoneNumber": "+0987654321",
      "password": "newpassword123",
      "roles": ["admin"]
    }
    ```
  - **Response:** Returns updated user object (password excluded)

#### Delete User
- **DELETE** `/api/users/:id` - Delete a user
  - **Response:** Success message

### Admin Management Routes (`/api/admin`)

**Note:** All admin routes require authentication with admin privileges (`adminToken` cookie)

#### Get All Users (Admin)
- **GET** `/api/admin/users` - Get all users with pagination (Admin only)
  - **Headers:** Requires valid admin JWT token
  - **Query Parameters:** 
    - `page` (optional, default: 1) - Page number
    - `limit` (optional, default: 10) - Number of users per page
  - **Response:** Paginated users list with metadata

#### Get User by ID (Admin)
- **GET** `/api/admin/users/:id` - Get specific user details (Admin only)
  - **Headers:** Requires valid admin JWT token
  - **Response:** User object (password excluded)

#### Update User (Admin)
- **PUT** `/api/admin/users/:id` - Update any user (Admin only)
  - **Headers:** Requires valid admin JWT token
  - **Body:** User fields to update (all optional)
    ```json
    {
      "name": "Updated Name",
      "email": "updated@example.com",
      "phoneNumber": "+0987654321",
      "password": "newpassword123",
      "roles": ["admin"]
    }
    ```
  - **Response:** Updated user object

#### Delete User (Admin)
- **DELETE** `/api/admin/users/:id` - Delete any user (Admin only)
  - **Headers:** Requires valid admin JWT token
  - **Response:** Success message

#### Create Location (Admin)
- **POST** `/api/admin/locations` - Create a new location record
  - **Headers:** Requires valid admin JWT token
  - **Body:**
    ```json
    {
      "locationDetails": {
        "locationName": "StorageUp Downtown",
        "locationCode": "DT-001",
        "emailAddress": "contact@storageup.com",
        "phoneNumber": "+1 555 123 4567",
        "manager": "Jane Manager"
      },
      "locationStatus": "active",
      "residentialAddress": {
        "addressLineOne": "123 Main Street",
        "addressLineTwo": "Suite 200",
        "city": "Metropolis",
        "stateProvince": "NY",
        "zip_code": "10001"
      },
      "locationMap": "https://maps.google.com/?q=123+Main+Street",
      "facilityInformation": {
        "totalUnits": 100,
        "availableUnits": 25,
        "squareFoot": "5000SQ",
        "climateControl": true,
        "24_7_security": true,
        "24_7_access": false,
        "parkingAvailable": true,
        "loadingDock": true,
        "elevatorAccess": false,
        "driveUpUnits": true,
        "truckRental": false,
        "movingSuppliers": true
      },
      "operatingHours": {
        "officeHours": "Mon-Fri 9am-6pm",
        "accessHours": "24/7"
      },
      "locationImages": [
        "https://cdn.storageup.com/locations/downtown/img-1.jpg"
      ]
    }
    ```
  - **Response:** Created location object

#### Get Locations (Admin)
- **GET** `/api/admin/locations` - List all locations with pagination
  - **Headers:** Requires valid admin JWT token
  - **Query Parameters:** Same as user listing (`page`, `limit`)
  - **Response:** Paginated locations list

#### Get Location by ID (Admin)
- **GET** `/api/admin/locations/:id` - Fetch a specific location
  - **Headers:** Requires valid admin JWT token
  - **Response:** Location object

#### Update Location (Admin)
- **PUT** `/api/admin/locations/:id` - Update location details
  - **Headers:** Requires valid admin JWT token
  - **Body:** Any subset of fields from the create payload
  - **Response:** Updated location object

#### Delete Location (Admin)
- **DELETE** `/api/admin/locations/:id` - Remove a location
  - **Headers:** Requires valid admin JWT token
  - **Response:** Success message

## Project Structure

```
storageup-backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/             # Request handlers
│   ├── authController.js    # Authentication logic (signup, login, logout)
│   ├── userController.js    # User CRUD operations
│   └── index.js             # Controller exports
├── middleware/              # Custom middleware
│   ├── authMiddleware.js    # JWT authentication & authorization middleware
│   └── index.js             # Middleware exports
├── models/                  # Mongoose models
│   ├── User.js              # User model with password hashing
│   └── index.js             # Model exports
├── routes/                  # API routes
│   ├── authRoutes.js        # Authentication routes
│   ├── userRoutes.js        # User CRUD routes
│   └── index.js             # Route definitions
├── .env                     # Environment variables (not in git - create from env.example)
├── env.example              # Example environment variables
├── .gitignore
├── package.json
├── README.md
└── server.js                # Main server file
```

## Adding New Features

### Creating a Model
1. Create a new file in `models/` directory
2. Define your Mongoose schema
3. Export the model

### Creating Routes
1. Create a new route file in `routes/` directory
2. Import and use it in `routes/index.js`

### Creating Controllers
1. Create a new controller file in `controllers/` directory
2. Export controller functions
3. Use them in your routes

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production)
- `MONGODB_URI` - MongoDB connection string

## License

ISC


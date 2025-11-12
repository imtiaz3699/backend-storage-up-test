# Complete API Reference

This document contains all API endpoints, request payloads, and response examples for the StorageUp Backend.

---

## 🔐 Authentication APIs

### 1. Client Signup
**Register a new user (Client side only)**

- **Method:** `POST`
- **Endpoint:** `/api/auth/signup`
- **Description:** Creates a new user with 'user' role. Users registered here cannot login to admin panel.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "password": "password123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890",
        "roles": ["user"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Cookie Set:** `token` (httpOnly, expires in 7 days)

---

### 2. Client Login
**Authenticate user (Client side only)**

- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Description:** Login for regular users only. Admin/moderator users will be denied.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890",
        "roles": ["user"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Cookie Set:** `token` (httpOnly, expires in 7 days)
- **Error (403 Forbidden):** If user has admin/moderator role
  ```json
  {
    "success": false,
    "message": "Access denied. Please use admin portal to login."
  }
  ```

---

### 3. Admin Signup
**Register a new admin user**

- **Method:** `POST`
- **Endpoint:** `/api/auth/admin/signup`
- **Description:** Creates a new admin or moderator user.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Request Body:**
  ```json
  {
    "name": "Admin User",
    "email": "admin@example.com",
    "phoneNumber": "+1234567890",
    "password": "adminpassword123",
    "role": "admin"
  }
  ```
  - **Note:** `role` is optional. Can be `"admin"` or `"moderator"`. Defaults to `"admin"`.
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Admin user registered successfully",
    "data": {
      "user": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Admin User",
        "email": "admin@example.com",
        "phoneNumber": "+1234567890",
        "roles": ["admin"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Cookie Set:** `adminToken` (httpOnly, expires in 7 days)

---

### 4. Admin Login
**Authenticate admin user (Admin side only)**

- **Method:** `POST`
- **Endpoint:** `/api/auth/admin/login`
- **Description:** Login for admin/moderator users only. Regular users will be denied.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Request Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "adminpassword123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Admin login successful",
    "data": {
      "user": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Admin User",
        "email": "admin@example.com",
        "phoneNumber": "+1234567890",
        "roles": ["admin"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Cookie Set:** `adminToken` (httpOnly, expires in 7 days)
- **Error (403 Forbidden):** If user doesn't have admin/moderator role
  ```json
  {
    "success": false,
    "message": "Access denied. Admin privileges required."
  }
  ```

---

### 5. Logout
**Logout user (Client or Admin)**

- **Method:** `POST`
- **Endpoint:** `/api/auth/logout`
- **Description:** Clears both client (`token`) and admin (`adminToken`) authentication cookies.
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <token>"
  }
  ```
  OR send `token` / `adminToken` cookies with the request (`credentials: 'include'`).
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
- **Cookie Cleared:** `token` and `adminToken`

---

### 6. Get Current User
**Get authenticated user information**

- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Description:** Returns the currently authenticated user (works for both client and admin).
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <token>"
  }
  ```
  OR
  - Cookie: `token` or `adminToken`
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "roles": ["user"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error (401 Unauthorized):**
  ```json
  {
    "success": false,
    "message": "Not authorized to access this route"
  }
  ```

---

### 7. Forgot Password
**Request password reset email**

- **Method:** `POST`
- **Endpoint:** `/api/auth/forgot-password`
- **Description:** Sends a password reset link to the user's email if the account exists.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Request Body:**
  ```json
  {
    "email": "john@example.com"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "If an account exists for that email, a reset link has been sent."
  }
  ```
- **Error (400 Bad Request):**
  ```json
  {
    "success": false,
    "message": "Please provide the email address associated with your account."
  }
  ```

---

### 8. Verify Reset Token
**Validate reset token before showing reset form**

- **Method:** `GET`
- **Endpoint:** `/api/auth/reset-password/verify`
- **Description:** Verifies the reset token passed as a query parameter.
- **Query Parameters:**
  - `token` (required) - Token from the reset email
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Reset token is valid.",
    "data": {
      "userId": "507f1f77bcf86cd799439011",
      "email": "john@example.com",
      "name": "John Doe"
    }
  }
  ```
- **Error (400 Bad Request):**
  ```json
  {
    "success": false,
    "message": "The reset link is invalid or has expired. Please request a new one."
  }
  ```

---

### 9. Reset Password
**Reset password using token**

- **Method:** `POST`
- **Endpoint:** `/api/auth/reset-password`
- **Description:** Resets the user's password with a valid token.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json"
  }
  ```
- **Request Body:**
  ```json
  {
    "token": "reset-token-from-email",
    "password": "newPassword123!",
    "confirmPassword": "newPassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password reset successfully. You can now log in with your new password."
  }
  ```
- **Error (400 Bad Request):**
  ```json
  {
    "success": false,
    "message": "Passwords do not match."
  }
  ```
- **Error (400 Bad Request - Invalid Token):**
  ```json
  {
    "success": false,
    "message": "The reset link is invalid or has expired. Please request a new one."
  }
  ```

---

## 👥 User Management APIs (Admin Protected)

### 10. Create User
**Create a new user (Admin only)**

- **Method:** `POST`
- **Endpoint:** `/api/users`
- **Description:** Creates a new user. Requires admin or moderator authentication.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phoneNumber": "+1234567890",
    "password": "password123",
    "roles": ["user"]
  }
  ```
  - **Note:** `roles` is optional, defaults to `["user"]`
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User created successfully",
    "data": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phoneNumber": "+1234567890",
      "roles": ["user"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error (400 Bad Request):** If email already exists
  ```json
  {
    "success": false,
    "message": "User with this email already exists"
  }
  ```

---

### 11. Get All Users (with Pagination)
**Get paginated list of all users (Admin only)**

- **Method:** `GET`
- **Endpoint:** `/api/users`
- **Description:** Returns paginated list of all users. Requires admin or moderator authentication.
- **Query Parameters:**
  - `page` (optional, default: 1) - Page number
  - `limit` (optional, default: 10) - Number of users per page
- **Example:** `/api/users?page=2&limit=20`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Request Body:** None
- **Response (200 OK):**
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
    "data": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890",
        "roles": ["user"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
      // ... more users
    ]
  }
  ```

---

### 12. Get User by ID
**Get a specific user by ID (Admin only)**

- **Method:** `GET`
- **Endpoint:** `/api/users/:id`
- **Description:** Returns a specific user by their ID.
- **URL Parameters:**
  - `id` - User MongoDB ObjectId
- **Example:** `/api/users/507f1f77bcf86cd799439011`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "roles": ["user"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error (404 Not Found):**
  ```json
  {
    "success": false,
    "message": "User not found"
  }
  ```

---

### 13. Update User
**Update user information (Admin only)**

- **Method:** `PUT`
- **Endpoint:** `/api/users/:id`
- **Description:** Updates user information. All fields are optional.
- **URL Parameters:**
  - `id` - User MongoDB ObjectId
- **Example:** `/api/users/507f1f77bcf86cd799439011`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Request Body:** (All fields optional)
  ```json
  {
    "name": "Updated Name",
    "email": "updated@example.com",
    "phoneNumber": "+0987654321",
    "password": "newpassword123",
    "roles": ["admin"]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User updated successfully",
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Updated Name",
      "email": "updated@example.com",
      "phoneNumber": "+0987654321",
      "roles": ["admin"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T01:00:00.000Z"
    }
  }
  ```
- **Error (400 Bad Request):** If email is already taken
  ```json
  {
    "success": false,
    "message": "Email is already taken by another user"
  }
  ```

---

### 14. Delete User
**Delete a user (Admin only)**

- **Method:** `DELETE`
- **Endpoint:** `/api/users/:id`
- **Description:** Deletes a user by ID.
- **URL Parameters:**
  - `id` - User MongoDB ObjectId
- **Example:** `/api/users/507f1f77bcf86cd799439011`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User deleted successfully",
    "data": {}
  }
  ```
- **Error (404 Not Found):**
  ```json
  {
    "success": false,
    "message": "User not found"
  }
  ```

---

## 🔧 Admin Management APIs (Protected)

**Note:** All admin routes require authentication with `adminToken` cookie or `Authorization: Bearer <token>` header.

### 15. Get All Users (Admin)
**Get paginated list of all users (Admin only)**

- **Method:** `GET`
- **Endpoint:** `/api/admin/users`
- **Description:** Returns paginated list of all users. Admin access required.
- **Query Parameters:**
  - `page` (optional, default: 1) - Page number
  - `limit` (optional, default: 10) - Number of users per page
- **Example:** `/api/admin/users?page=2&limit=20`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR
  - Cookie: `adminToken`
- **Request Body:** None
- **Response (200 OK):**
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
    "data": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890",
        "roles": ["user"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
      // ... more users
    ]
  }
  ```
- **Error (401 Unauthorized):**
  ```json
  {
    "success": false,
    "message": "Not authorized to access this route. Admin access required."
  }
  ```
- **Error (403 Forbidden):**
  ```json
  {
    "success": false,
    "message": "Access denied. Admin privileges required."
  }
  ```

---

### 16. Get User by ID (Admin)
**Get specific user details (Admin only)**

- **Method:** `GET`
- **Endpoint:** `/api/admin/users/:id`
- **Description:** Returns a specific user by ID. Admin access required.
- **URL Parameters:**
  - `id` - User MongoDB ObjectId
- **Example:** `/api/admin/users/507f1f77bcf86cd799439011`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR
  - Cookie: `adminToken`
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "roles": ["user"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 17. Update User (Admin)
**Update any user (Admin only)**

- **Method:** `PUT`
- **Endpoint:** `/api/admin/users/:id`
- **Description:** Updates any user's information. Admin access required.
- **URL Parameters:**
  - `id` - User MongoDB ObjectId
- **Example:** `/api/admin/users/507f1f77bcf86cd799439011`
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR
  - Cookie: `adminToken`
- **Request Body:** (All fields optional)
  ```json
  {
    "name": "Updated Name",
    "email": "updated@example.com",
    "phoneNumber": "+0987654321",
    "password": "newpassword123",
    "roles": ["admin"]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User updated successfully",
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Updated Name",
      "email": "updated@example.com",
      "phoneNumber": "+0987654321",
      "roles": ["admin"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T01:00:00.000Z"
    }
  }
  ```

---

### 18. Delete User (Admin)
**Delete any user (Admin only)**

- **Method:** `DELETE`
- **Endpoint:** `/api/admin/users/:id`
- **Description:** Deletes any user by ID. Admin access required.
- **URL Parameters:**
  - `id` - User MongoDB ObjectId
- **Example:** `/api/admin/users/507f1f77bcf86cd799439011`
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR
  - Cookie: `adminToken`
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User deleted successfully",
    "data": {}
  }
  ```

---

### 19. Create Location (Admin)
**Create a new location record**

- **Method:** `POST`
- **Endpoint:** `/api/admin/locations`
- **Description:** Adds a new storage facility location. Admin access required.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Request Body:** (Example)
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
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Location created successfully",
    "data": {
      "_id": "64f96e3f5c1d2b7f8c123456",
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
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error (400 Bad Request):**
  ```json
  {
    "success": false,
    "message": "Validation error",
    "errors": [
      "Location name is required"
    ]
  }
  ```

---

### 20. Get Locations (Admin)
**Get paginated list of locations (Admin only)**

- **Method:** `GET`
- **Endpoint:** `/api/admin/locations`
- **Description:** Returns paginated list of all locations. Admin access required.
- **Query Parameters:**
  - `page` (optional, default: 1) - Page number
  - `limit` (optional, default: 10) - Number of items per page
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 2,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 2,
      "limit": 10,
      "hasNextPage": false,
      "hasPrevPage": false,
      "nextPage": null,
      "prevPage": null
    },
    "data": [
      {
        "_id": "64f96e3f5c1d2b7f8c123456",
        "locationDetails": {
          "locationName": "StorageUp Downtown",
          "locationCode": "DT-001"
        },
        "locationStatus": "active",
        "residentialAddress": {
          "city": "Metropolis",
          "stateProvince": "NY"
        },
        "facilityInformation": {
          "totalUnits": 100,
          "availableUnits": 25
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 21. Get Location by ID (Admin)
**Get location details (Admin only)**

- **Method:** `GET`
- **Endpoint:** `/api/admin/locations/:id`
- **Description:** Returns a specific location by ID. Admin access required.
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "64f96e3f5c1d2b7f8c123456",
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
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error (404 Not Found):**
  ```json
  {
    "success": false,
    "message": "Location not found"
  }
  ```

---

### 22. Update Location (Admin)
**Update location details (Admin only)**

- **Method:** `PUT`
- **Endpoint:** `/api/admin/locations/:id`
- **Description:** Updates location information. Admin access required.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Request Body:** Any subset of fields from the create payload
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Location updated successfully",
    "data": {
      "_id": "64f96e3f5c1d2b7f8c123456",
      "locationStatus": "underMaintenance",
      "updatedAt": "2024-01-02T08:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 23. Delete Location (Admin)
**Delete a location (Admin only)**

- **Method:** `DELETE`
- **Endpoint:** `/api/admin/locations/:id`
- **Description:** Deletes a location by ID. Admin access required.
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Location deleted successfully",
    "data": {}
  }
  ```

---

## 📊 System APIs

### 16. Health Check
**Check API and database status**

- **Method:** `GET`
- **Endpoint:** `/api/health`
- **Description:** Returns API health status and database connection status.
- **Headers:** None required
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "database": "connected"
  }
  ```

---

### 17. Root/API Info
**Get API information**

- **Method:** `GET`
- **Endpoint:** `/api`
- **Description:** Returns available API endpoints.
- **Headers:** None required
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "message": "API Routes",
    "endpoints": {
      "health": "/api/health",
      "auth": "/api/auth",
      "authAdmin": "/api/auth/admin",
      "users": "/api/users",
      "admin": "/api/admin"
    }
  }
  ```

---

## 🔑 Authentication Methods

### Using Cookies (Recommended)
When using cookies, include `credentials: 'include'` in your fetch requests:

```javascript
fetch('http://localhost:5000/api/auth/me', {
  method: 'GET',
  credentials: 'include', // Important: sends cookies
  headers: {
    'Content-Type': 'application/json'
  }
})
```

### Using Authorization Header
Alternatively, you can send the token in the Authorization header:

```javascript
fetch('http://localhost:5000/api/auth/me', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <your-token-here>'
  }
})
```

---

## 📝 Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    "Name is required",
    "Email is required"
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error message (only in development)"
}
```

---

## 🎯 Quick Reference

### Client App Endpoints
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `GET /api/auth/reset-password/verify` - Validate reset token
- `POST /api/auth/reset-password` - Reset password

### Admin App Endpoints
- `POST /api/auth/admin/signup` - Register admin
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current admin
- `GET /api/users` - List all users (admin)
- `GET /api/users/:id` - Get user (admin)
- `PUT /api/users/:id` - Update user (admin)
- `DELETE /api/users/:id` - Delete user (admin)
- `GET /api/admin/users` - List all users (admin scoped endpoints)
- `GET /api/admin/users/:id` - Get user (admin scoped)
- `PUT /api/admin/users/:id` - Update user (admin scoped)
- `DELETE /api/admin/users/:id` - Delete user (admin scoped)

---

**Base URL:** `http://localhost:5000` (or your server URL)

**All timestamps are in ISO 8601 format (UTC)**


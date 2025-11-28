- **Note:** `type_code` values are stored uppercase automatically
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
  - **unit_status options:** `vacant`, `rented`, `reserved`, `company`, `repair`, `to clean`, `locked`, `on site`, `Unavailable`
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

### 24. Create Unit (Admin)
**Create a new storage unit**

- **Method:** `POST`
- **Endpoint:** `/api/admin/units`
- **Description:** Adds a storage unit record to the system. Admin access required.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer <adminToken>"
  }
  ```
  OR send `adminToken` cookie with the request (`credentials: 'include'`).
- **Request Body:** Example payload
  ```json
  {
    "unit_number": "A001",
    "location": "DT-001",
    "location_two": "Secondary Warehouse",
    "description": "Climate controlled 10x10 unit",
    "unit_details": {
      "unit_number": "A001",
      "unit_type": "Climate Controlled",
      "unit_size": "10x10",
      "door_size": "8ft roll-up",
        "unit_status": "vacant",
      "walk_order": "1",
      "building_location": "Building A"
    },
    "dimensions": {
      "length": "10ft",
      "width": "10ft",
      "area_size": "100 SQFT",
      "height": "9ft"
    },
    "unit_is": "vacant",
    "monthly_rate": 9000,
    "other_information": {
      "creation_date": "2024-01-01",
      "end_date": "",
      "last_su_sync": "2024-02-01"
    },
    "maintenance_comments": "Freshly painted and cleaned."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Unit created successfully",
    "data": {
      "_id": "64f96f3f5c1d2b7f8c654321",
      "unit_number": "A001",
      "location": "DT-001",
      "unit_is": "vacant",
      "monthly_rate": 9000,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 25. Get Units (Admin)
**Get paginated list of storage units (Admin only)**

- **Method:** `GET`
- **Endpoint:** `/api/admin/units`
- **Description:** Returns paginated list of units. Admin access required.
- **Query Parameters:** `page`, `limit`
- **Headers:** `Authorization: Bearer <adminToken>` or `adminToken` cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 10,
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 45,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false,
      "nextPage": 2,
      "prevPage": null
    },
    "data": [
      {
        "_id": "64f96f3f5c1d2b7f8c654321",
        "unit_number": "A001",
        "location": "DT-001",
        "unit_is": "vacant",
        "monthly_rate": 9000,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 26. Get Unit by ID (Admin)
**Get unit details (Admin only)**

- **Method:** `GET`
- **Endpoint:** `/api/admin/units/:id`
- **Description:** Returns a unit by ID. Admin access required.
- **Headers:** `Authorization: Bearer <adminToken>` or `adminToken` cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "64f96f3f5c1d2b7f8c654321",
      "unit_number": "A001",
      "location": "DT-001",
      "location_two": "Secondary Warehouse",
      "description": "Climate controlled 10x10 unit",
      "unit_details": {
        "unit_type": "Climate Controlled",
        "unit_size": "10x10",
        "door_size": "8ft roll-up",
        "unit_status": "vacant",
        "walk_order": "1",
        "building_location": "Building A"
      },
      "dimensions": {
        "length": "10ft",
        "width": "10ft",
        "area_size": "100 SQFT",
        "height": "9ft"
      },
      "unit_is": "vacant",
      "monthly_rate": 9000,
      "other_information": {
        "creation_date": "2024-01-01",
        "end_date": "",
        "last_su_sync": "2024-02-01"
      },
      "maintenance_comments": "Freshly painted and cleaned.",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 27. Update Unit (Admin)
**Update storage unit details (Admin only)**

- **Method:** `PUT`
- **Endpoint:** `/api/admin/units/:id`
- **Description:** Updates unit information. Admin access required.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or `adminToken` cookie
- **Request Body:** Any subset of unit fields
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Unit updated successfully",
    "data": {
      "_id": "64f96f3f5c1d2b7f8c654321",
      "unit_is": "rented",
      "monthly_rate": 9500,
      "updatedAt": "2024-01-05T10:15:00.000Z"
    }
  }
  ```

---

### 28. Delete Unit (Admin)
**Delete a storage unit (Admin only)**

- **Method:** `DELETE`
- **Endpoint:** `/api/admin/units/:id`
- **Description:** Deletes a unit by ID. Admin access required.
- **Headers:** `Authorization: Bearer <adminToken>` or `adminToken` cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Unit deleted successfully",
    "data": {}
  }
  ```

---

### 29. Create Unit Type (Admin)
**Create a new unit type definition**

- **Method:** `POST`
- **Endpoint:** `/api/admin/unit-types`
- **Description:** Adds a unit type configuration with pricing and size data. Admin access required.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:**
  ```json
  {
    "type_code": "CLIMATE10X10",
    "description": "Climate controlled 10x10 units",
    "unit_type_configuration": {
      "type_code": "CC-10",
      "sort_order": 1,
      "deposit": 200,
      "monthly_rate": 9000,
      "weekly_rate": 2500,
      "daily_rate": 400,
      "unit_type_and_size": {
        "length": 10,
        "width": 10,
        "area_size": 100,
        "height": 9,
        "length_is_variable": false
      }
    },
    "assignments": {
      "billing_plan": "Standard",
      "rental_analysis_code": "RAC-01",
      "organization_analysis_code": "OAC-02"
    }
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Unit type created successfully",
    "data": {
      "_id": "64fa70bf2c8d1a0012345678",
      "type_code": "CLIMATE10X10",
      "description": "Climate controlled 10x10 units",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 30. Get Unit Types (Admin)
**Get paginated list of unit types**

- **Method:** `GET`
- **Endpoint:** `/api/admin/unit-types`
- **Description:** Returns paginated list of all unit types. Admin access required.
- **Query Parameters:** `page`, `limit`
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
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
        "_id": "64fa70bf2c8d1a0012345678",
        "type_code": "CLIMATE10X10",
        "description": "Climate controlled 10x10 units",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 31. Get Unit Type by ID (Admin)
**Get unit type details (Admin only)**

- **Method:** `GET`
- **Endpoint:** `/api/admin/unit-types/:id`
- **Description:** Returns a unit type by ID. Admin access required.
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "64fa70bf2c8d1a0012345678",
      "type_code": "CLIMATE10X10",
      "description": "Climate controlled 10x10 units",
      "unit_type_configuration": {
        "type_code": "CC-10",
        "sort_order": 1,
        "deposit": 200,
        "monthly_rate": 9000,
        "weekly_rate": 2500,
        "daily_rate": 400,
        "unit_type_and_size": {
          "length": 10,
          "width": 10,
          "area_size": 100,
          "height": 9,
          "length_is_variable": false
        }
      },
      "assignments": {
        "billing_plan": "Standard",
        "rental_analysis_code": "RAC-01",
        "organization_analysis_code": "OAC-02"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 32. Update Unit Type (Admin)
**Update a unit type**

- **Method:** `PUT`
- **Endpoint:** `/api/admin/unit-types/:id`
- **Description:** Updates a unit type configuration. Admin access required.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:** Any subset of unit type fields
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Unit type updated successfully",
    "data": {
      "_id": "64fa70bf2c8d1a0012345678",
      "type_code": "CLIMATE10X10",
      "description": "Updated description",
      "updatedAt": "2024-01-05T10:15:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 33. Delete Unit Type (Admin)
**Delete a unit type**

- **Method:** `DELETE`
- **Endpoint:** `/api/admin/unit-types/:id`
- **Description:** Deletes a unit type by ID. Admin access required.
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Unit type deleted successfully",
    "data": {}
  }
  ```

---

### 34. Create Analysis Code (Admin)
**Create a new analysis code**

- **Method:** `POST`
- **Endpoint:** `/api/admin/analysis-codes`
- **Description:** Creates a new accounting analysis code. Admin access required.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:**
  ```json
  {
    "analysis_code": "LATEFEE",
    "sort_order": 1,
    "gl_acct_code": "GL1001",
    "description": "Late fee charges",
    "analysis_code_options": {
      "use_this_code": true,
      "available_for_sales": true,
      "taxable": false,
      "bill_on_move_in": false,
      "bill_on_move_out": true,
      "show_as_other_regular_charges": true,
      "show_code": "LF",
      "everywhere": "All",
      "keys_stats_category": "Fees",
      "analysis_category": "Late Fees",
      "special_options": "Notify accounting"
    },
    "analysis_code_setup": {
      "default_sell_amount": 25,
      "minimum_sell_amount": 10,
      "maximum_sell_amount": 50,
      "credit_percentage": 5,
      "standard_code_price": 20
    },
    "stock_control_settings": {
      "enable_online": false,
      "enable_stock_control": false
    }
  }
  ```
  - **Note:** `analysis_code` and `gl_acct_code` are automatically stored in uppercase
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Analysis code created successfully",
    "data": {
      "_id": "64fb80cf3d9e1a0012345678",
      "analysis_code": "LATEFEE",
      "sort_order": 1,
      "gl_acct_code": "GL1001",
      "description": "Late fee charges",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error (400 Bad Request):** If analysis_code already exists
  ```json
  {
    "success": false,
    "message": "Analysis code must be unique"
  }
  ```

---

### 35. Get Analysis Codes (Admin)
**Get paginated list of analysis codes**

- **Method:** `GET`
- **Endpoint:** `/api/admin/analysis-codes`
- **Description:** Returns paginated list of all analysis codes. Admin access required.
- **Query Parameters:** `page`, `limit`
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 5,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 5,
      "limit": 10,
      "hasNextPage": false,
      "hasPrevPage": false,
      "nextPage": null,
      "prevPage": null
    },
    "data": [
      {
        "_id": "64fb80cf3d9e1a0012345678",
        "analysis_code": "LATEFEE",
        "sort_order": 1,
        "gl_acct_code": "GL1001",
        "description": "Late fee charges",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 36. Get Analysis Code by ID (Admin)
**Get analysis code details**

- **Method:** `GET`
- **Endpoint:** `/api/admin/analysis-codes/:id`
- **Description:** Returns an analysis code by ID. Admin access required.
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "64fb80cf3d9e1a0012345678",
      "analysis_code": "LATEFEE",
      "sort_order": 1,
      "gl_acct_code": "GL1001",
      "description": "Late fee charges",
      "analysis_code_options": {
        "use_this_code": true,
        "available_for_sales": true,
        "taxable": false
      },
      "analysis_code_setup": {
        "default_sell_amount": 25,
        "minimum_sell_amount": 10,
        "maximum_sell_amount": 50
      },
      "stock_control_settings": {
        "enable_online": false,
        "enable_stock_control": false
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 37. Update Analysis Code (Admin)
**Update an analysis code**

- **Method:** `PUT`
- **Endpoint:** `/api/admin/analysis-codes/:id`
- **Description:** Updates an analysis code configuration. Admin access required.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:** Any subset of analysis code fields
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Analysis code updated successfully",
    "data": {
      "_id": "64fb80cf3d9e1a0012345678",
      "analysis_code": "LATEFEE",
      "description": "Updated description",
      "updatedAt": "2024-01-05T10:15:00.000Z"
    }
  }
  ```

---

### 38. Delete Analysis Code (Admin)
**Delete an analysis code**

- **Method:** `DELETE`
- **Endpoint:** `/api/admin/analysis-codes/:id`
- **Description:** Deletes an analysis code by ID. Admin access required.
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Analysis code deleted successfully",
    "data": {}
  }
  ```

---

### 39. Assign Unit to User (Admin)
**Assign/rent a unit to a user**

- **Method:** `POST`
- **Endpoint:** `/api/admin/units/:unitId/assign`
- **Description:** Assigns a unit to a user by setting customer_email and marking as rented. Admin access required.
- **URL Parameters:**
  - `unitId` - Unit MongoDB ObjectId
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:**
  ```json
  {
    "customer_email": "john@example.com"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Unit assigned to user successfully",
    "data": {
      "_id": "64f96f3f5c1d2b7f8c654321",
      "unit_number": "A001",
      "customer_email": "john@example.com",
      "unit_is": "rented",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
  ```
- **Error (400 Bad Request):** If unit is already rented to another user
  ```json
  {
    "success": false,
    "message": "Unit is already rented to another customer (jane@example.com)"
  }
  ```

---

### 40. Release Unit (Admin)
**Release/vacate a unit**

- **Method:** `POST`
- **Endpoint:** `/api/admin/units/:unitId/release`
- **Description:** Releases a unit by clearing customer_email and marking as vacant. Admin access required.
- **URL Parameters:**
  - `unitId` - Unit MongoDB ObjectId
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Unit released successfully",
    "data": {
      "_id": "64f96f3f5c1d2b7f8c654321",
      "unit_number": "A001",
      "customer_email": null,
      "unit_is": "vacant",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  }
  ```

---

### 41. Create Notice Setup (Admin)
**Create a new notice setup**

- **Method:** `POST`
- **Endpoint:** `/api/admin/notice-setups`
- **Description:** Creates a new notice plan configuration. Admin access required.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:**
  ```json
  {
    "notice_plan_number": 10,
    "name_of_this_notice": "Late Payment Notice",
    "send_this_notice": 5,
    "before_after": "after",
    "late_cycle_start_date": "2024-01-15T00:00:00.000Z",
    "notice_options": {
      "send_this_notice": true,
      "print_this_notice": false,
      "dont_need_this": false,
      "only_send_one": true,
      "only_send_this": false,
      "bill_next_rent": false,
      "dont_send_this_notice": false,
      "bill_fees_only": false,
      "exclude_from_late_cycle": false,
      "hide_notice": false,
      "use_the_days": true,
      "attach_statement": "statement.pdf",
      "new_attach_a_statement": "new_statement.pdf"
    },
    "access_control_triggers": {
      "suspend_customer_access": false,
      "flag_for_replacement": false,
      "flag_for_over_lock": true
    }
  }
  ```
  - **Note:** `before_after` must be either `"before"` or `"after"`
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Notice setup created successfully",
    "data": {
      "_id": "64fc90df4e0f2b0012345678",
      "notice_plan_number": 10,
      "name_of_this_notice": "Late Payment Notice",
      "send_this_notice": 5,
      "before_after": "after",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 42. Get Notice Setups (Admin)
**Get paginated list of notice setups**

- **Method:** `GET`
- **Endpoint:** `/api/admin/notice-setups`
- **Description:** Returns paginated list of all notice setups. Admin access required.
- **Query Parameters:** `page`, `limit`
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 3,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 3,
      "limit": 10,
      "hasNextPage": false,
      "hasPrevPage": false,
      "nextPage": null,
      "prevPage": null
    },
    "data": [
      {
        "_id": "64fc90df4e0f2b0012345678",
        "notice_plan_number": 10,
        "name_of_this_notice": "Late Payment Notice",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 43. Get Notice Setup by ID (Admin)
**Get notice setup details**

- **Method:** `GET`
- **Endpoint:** `/api/admin/notice-setups/:id`
- **Description:** Returns a notice setup by ID. Admin access required.
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "64fc90df4e0f2b0012345678",
      "notice_plan_number": 10,
      "name_of_this_notice": "Late Payment Notice",
      "send_this_notice": 5,
      "before_after": "after",
      "late_cycle_start_date": "2024-01-15T00:00:00.000Z",
      "notice_options": {
        "send_this_notice": true,
        "print_this_notice": false
      },
      "access_control_triggers": {
        "suspend_customer_access": false,
        "flag_for_replacement": false,
        "flag_for_over_lock": true
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 44. Update Notice Setup (Admin)
**Update a notice setup**

- **Method:** `PUT`
- **Endpoint:** `/api/admin/notice-setups/:id`
- **Description:** Updates a notice setup configuration. Admin access required.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:** Any subset of notice setup fields
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Notice setup updated successfully",
    "data": {
      "_id": "64fc90df4e0f2b0012345678",
      "name_of_this_notice": "Updated Notice Name",
      "updatedAt": "2024-01-05T10:15:00.000Z"
    }
  }
  ```

---

### 45. Delete Notice Setup (Admin)
**Delete a notice setup**

- **Method:** `DELETE`
- **Endpoint:** `/api/admin/notice-setups/:id`
- **Description:** Deletes a notice setup by ID. Admin access required.
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Notice setup deleted successfully",
    "data": {}
  }
  ```

---

### 46. Create Notice Charge (Admin)
**Create a new notice charge configuration**

- **Method:** `POST`
- **Endpoint:** `/api/admin/notice-charges`
- **Description:** Creates a new notice charge system configuration. Admin access required.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:**
  ```json
  {
    "simplified_charge_system": false,
    "minimum_charge": 10,
    "minimum_percentage": 10,
    "tiered_charge_system": false,
    "fee_options": {
      "notice_trigger": false,
      "fee_on_one_month": false,
      "charge_is_per_unit": false,
      "analysis_code": "Late fees"
    },
    "invoice_fee": {
      "fee_to_charge": 10,
      "analysis_code": "INV001"
    }
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Notice charge created successfully",
    "data": {
      "_id": "64fd91ef5f0g3c0012345678",
      "simplified_charge_system": false,
      "minimum_charge": 10,
      "minimum_percentage": 10,
      "tiered_charge_system": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 47. Get Notice Charges (Admin)
**Get paginated list of notice charges**

- **Method:** `GET`
- **Endpoint:** `/api/admin/notice-charges`
- **Description:** Returns paginated list of all notice charges. Admin access required.
- **Query Parameters:** `page`, `limit`
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
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
        "_id": "64fd91ef5f0g3c0012345678",
        "simplified_charge_system": false,
        "minimum_charge": 10,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 48. Get Notice Charge by ID (Admin)
**Get notice charge details**

- **Method:** `GET`
- **Endpoint:** `/api/admin/notice-charges/:id`
- **Description:** Returns a notice charge by ID. Admin access required.
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "64fd91ef5f0g3c0012345678",
      "simplified_charge_system": false,
      "minimum_charge": 10,
      "minimum_percentage": 10,
      "tiered_charge_system": false,
      "fee_options": {
        "notice_trigger": false,
        "fee_on_one_month": false,
        "charge_is_per_unit": false,
        "analysis_code": "Late fees"
      },
      "invoice_fee": {
        "fee_to_charge": 10,
        "analysis_code": "INV001"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

---

### 49. Update Notice Charge (Admin)
**Update a notice charge**

- **Method:** `PUT`
- **Endpoint:** `/api/admin/notice-charges/:id`
- **Description:** Updates a notice charge configuration. Admin access required.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:** Any subset of notice charge fields
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Notice charge updated successfully",
    "data": {
      "_id": "64fd91ef5f0g3c0012345678",
      "minimum_charge": 15,
      "updatedAt": "2024-01-05T10:15:00.000Z"
    }
  }
  ```

---

### 50. Delete Notice Charge (Admin)
**Delete a notice charge**

- **Method:** `DELETE`
- **Endpoint:** `/api/admin/notice-charges/:id`
- **Description:** Deletes a notice charge by ID. Admin access required.
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Notice charge deleted successfully",
    "data": {}
  }
  ```

---

### 51. Create Invoice (Admin)
**Create a new invoice**

- **Method:** `POST`
- **Endpoint:** `/api/admin/invoices`
- **Description:** Creates a new invoice. Invoice ID is auto-generated if not provided (INV_001, INV_002, etc.). Admin access required.
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:**
  ```json
  {
    "invoice_id": "",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "unit_number": "UNIT-001",
    "amount": 1500.00,
    "issue_date": "2024-01-15T00:00:00.000Z",
    "due_date": "2024-02-15T00:00:00.000Z",
    "status": "pending"
  }
  ```
  - **Note:** `invoice_id` is optional. If empty or not provided, it will be auto-generated (INV_001, INV_002, etc.)
  - **Note:** `status` must be one of: `pending`, `paid`, `overdue`, `cancelled` (default: `pending`)
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Invoice created successfully",
    "data": {
      "_id": "64fe92ff6g1h4d0012345678",
      "invoice_id": "INV_001",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "unit_number": "UNIT-001",
      "amount": 1500.00,
      "issue_date": "2024-01-15T00:00:00.000Z",
      "due_date": "2024-02-15T00:00:00.000Z",
      "status": "pending",
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  }
  ```
- **Error (400 Bad Request):** If invoice_id is already taken
  ```json
  {
    "success": false,
    "message": "Invoice ID must be unique"
  }
  ```

---

### 52. Get Invoices (Admin)
**Get paginated list of invoices**

- **Method:** `GET`
- **Endpoint:** `/api/admin/invoices`
- **Description:** Returns paginated list of all invoices. Admin access required.
- **Query Parameters:** `page`, `limit`
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 10,
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false,
      "nextPage": 2,
      "prevPage": null
    },
    "data": [
      {
        "_id": "64fe92ff6g1h4d0012345678",
        "invoice_id": "INV_001",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "unit_number": "UNIT-001",
        "amount": 1500.00,
        "status": "pending",
        "createdAt": "2024-01-15T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 53. Get Invoice by ID (Admin)
**Get invoice by MongoDB ID**

- **Method:** `GET`
- **Endpoint:** `/api/admin/invoices/:id`
- **Description:** Returns an invoice by MongoDB ObjectId. Admin access required.
- **URL Parameters:**
  - `id` - Invoice MongoDB ObjectId
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "64fe92ff6g1h4d0012345678",
      "invoice_id": "INV_001",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "unit_number": "UNIT-001",
      "amount": 1500.00,
      "issue_date": "2024-01-15T00:00:00.000Z",
      "due_date": "2024-02-15T00:00:00.000Z",
      "status": "pending",
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  }
  ```

---

### 54. Get Invoice by Invoice ID (Admin)
**Get invoice by invoice_id**

- **Method:** `GET`
- **Endpoint:** `/api/admin/invoices/by-id/:invoiceId`
- **Description:** Returns an invoice by its invoice_id (e.g., INV_001). Admin access required.
- **URL Parameters:**
  - `invoiceId` - Invoice ID (e.g., "INV_001")
- **Example:** `/api/admin/invoices/by-id/INV_001`
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "64fe92ff6g1h4d0012345678",
      "invoice_id": "INV_001",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "unit_number": "UNIT-001",
      "amount": 1500.00,
      "status": "pending",
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  }
  ```

---

### 55. Update Invoice (Admin)
**Update an invoice**

- **Method:** `PUT`
- **Endpoint:** `/api/admin/invoices/:id`
- **Description:** Updates an invoice. Admin access required.
- **URL Parameters:**
  - `id` - Invoice MongoDB ObjectId
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <adminToken>` or cookie
- **Request Body:** Any subset of invoice fields
  ```json
  {
    "status": "paid",
    "amount": 1600.00
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Invoice updated successfully",
    "data": {
      "_id": "64fe92ff6g1h4d0012345678",
      "invoice_id": "INV_001",
      "status": "paid",
      "amount": 1600.00,
      "updatedAt": "2024-01-20T10:15:00.000Z"
    }
  }
  ```

---

### 56. Delete Invoice (Admin)
**Delete an invoice**

- **Method:** `DELETE`
- **Endpoint:** `/api/admin/invoices/:id`
- **Description:** Deletes an invoice by ID. Admin access required.
- **URL Parameters:**
  - `id` - Invoice MongoDB ObjectId
- **Headers:** `Authorization: Bearer <adminToken>` or cookie
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Invoice deleted successfully",
    "data": {}
  }
  ```

---

## 👤 Client-Side APIs (Protected)

**Note:** All client routes require authentication with `token` cookie or `Authorization: Bearer <token>` header. Only users with 'user' role can access these endpoints.

### 57. Get My Rentals
**Get user's rented units dashboard**

- **Method:** `GET`
- **Endpoint:** `/api/client/my-rentals`
- **Description:** Returns the authenticated user's rented units with summary statistics. Only shows units where customer_email matches user's email and unit_is is 'rented'.
- **Query Parameters:**
  - `page` (optional, default: 1) - Page number
  - `limit` (optional, default: 10) - Items per page
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <token>"
  }
  ```
  OR
  - Cookie: `token`
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890",
        "roles": ["user"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "summary": {
        "totalUnits": 3,
        "totalMonthlyCost": 4500,
        "totalSquareFeet": 300.5
      },
      "units": [
        {
          "_id": "64f96f3f5c1d2b7f8c654321",
          "unit_number": "UNIT-001",
          "location": "DT-001",
          "monthly_rate": 1500,
          "dimensions": {
            "area_size": "100FQ"
          },
          "unit_is": "rented",
          "customer_email": "john@example.com"
        }
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 1,
        "totalItems": 3,
        "limit": 10,
        "hasNextPage": false,
        "hasPrevPage": false,
        "nextPage": null,
        "prevPage": null
      }
    }
  }
  ```

---

### 58. Get My Invoices
**Get user's invoices with summary**

- **Method:** `GET`
- **Endpoint:** `/api/client/my-invoices`
- **Description:** Returns the authenticated user's invoices with counts and monthly summary. Matches invoices by customer_email or customer_name.
- **Query Parameters:**
  - `page` (optional, default: 1) - Page number
  - `limit` (optional, default: 10) - Items per page
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <token>"
  }
  ```
  OR
  - Cookie: `token`
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "total_invoices": 25,
      "paid_invoices": 15,
      "un_paid_invoices": 8,
      "over_due_invoices": 2,
      "monthly_invoice_summary": {
        "total_generated": 15000,
        "total_collected": 12000,
        "outstanding": 3000
      },
      "invoices": [
        {
          "_id": "64fe92ff6g1h4d0012345678",
          "invoice_id": "INV_001",
          "customer_name": "John Doe",
          "customer_email": "john@example.com",
          "unit_number": "UNIT-001",
          "amount": 1500.00,
          "issue_date": "2024-01-15T00:00:00.000Z",
          "due_date": "2024-02-15T00:00:00.000Z",
          "status": "paid",
          "createdAt": "2024-01-15T00:00:00.000Z"
        }
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 3,
        "totalItems": 25,
        "limit": 10,
        "hasNextPage": true,
        "hasPrevPage": false,
        "nextPage": 2,
        "prevPage": null
      }
    }
  }
  ```

---

### 59. Update Profile
**Update user profile information**

- **Method:** `POST`
- **Endpoint:** `/api/client/profile`
- **Description:** Updates the authenticated user's profile. All fields are optional - only send fields you want to update.
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer <token>"
  }
  ```
  OR
  - Cookie: `token`
- **Request Body:** (All fields optional)
  ```json
  {
    "first_name": "John",
    "last_name": "Doe",
    "email_address": "john@example.com",
    "phoneNumber": "+1234567890",
    "address_line_one": "123 Main Street",
    "address_line_two": "Apt 4B",
    "city": "New York",
    "state_province": "NY",
    "zip_code": "10001"
  }
  ```
  - **Note:** `email_address` maps to `email` in the database. If changed, must be unique.
  - **Note:** `name` field is automatically updated from `first_name` and `last_name` if provided.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "address_line_one": "123 Main Street",
      "address_line_two": "Apt 4B",
      "city": "New York",
      "state_province": "NY",
      "zip_code": "10001",
      "roles": ["user"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  }
  ```
- **Error (400 Bad Request):** If email is already taken
  ```json
  {
    "success": false,
    "message": "Email address is already in use"
  }
  ```

---

### 60. Add Payment Method
**Add a payment method via Stripe**

- **Method:** `POST`
- **Endpoint:** `/api/client/payment-methods`
- **Description:** Adds a payment method for the authenticated user. Supports two methods: PaymentMethod ID (recommended) or card details (requires Raw Card Data APIs enabled).
- **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer <token>"
  }
  ```
  OR
  - Cookie: `token`
- **Request Body (Option 1 - Recommended):**
  ```json
  {
    "payment_method_id": "pm_1234567890abcdef"
  }
  ```
  - **Note:** Create PaymentMethod on frontend using Stripe Elements, then send the ID.
- **Request Body (Option 2 - Requires Raw Card Data APIs):**
  ```json
  {
    "card_number": "4242424242424242",
    "expiration_date": "12/25",
    "cv": "123",
    "card_holder_name": "John Doe"
  }
  ```
  - **Note:** `expiration_date` format: `MM/YY` or `MM/YYYY`
  - **Note:** Requires "Raw card data APIs" to be enabled in Stripe Dashboard
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Payment method added successfully",
    "data": {
      "_id": "64ff93gg7h2i5e0012345678",
      "user": "507f1f77bcf86cd799439011",
      "stripe_payment_method_id": "pm_1234567890abcdef",
      "stripe_customer_id": "cus_xxxxx",
      "card_brand": "visa",
      "card_last4": "4242",
      "card_exp_month": 12,
      "card_exp_year": 2025,
      "card_holder_name": "John Doe",
      "is_default": true,
      "is_active": true,
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  }
  ```
- **Error (400 Bad Request):** If raw card data APIs are not enabled
  ```json
  {
    "success": false,
    "message": "Raw card data APIs are not enabled in your Stripe account. Please use one of the following options:",
    "error": "RAW_CARD_DATA_DISABLED",
    "solutions": [
      {
        "method": "Use Stripe Elements (Recommended)",
        "description": "Create a PaymentMethod on the frontend using Stripe Elements, then send the payment_method_id to this endpoint",
        "documentation": "https://stripe.com/docs/stripe-js"
      },
      {
        "method": "Enable Raw Card Data APIs",
        "description": "Enable this feature in your Stripe Dashboard (requires approval)",
        "documentation": "https://support.stripe.com/questions/enabling-access-to-raw-card-data-apis"
      }
    ]
  }
  ```

---

### 61. Get Payment Methods
**Get all user's payment methods**

- **Method:** `GET`
- **Endpoint:** `/api/client/payment-methods`
- **Description:** Returns all active payment methods for the authenticated user. Default payment method is listed first.
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <token>"
  }
  ```
  OR
  - Cookie: `token`
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "64ff93gg7h2i5e0012345678",
        "stripe_payment_method_id": "pm_1234567890abcdef",
        "card_brand": "visa",
        "card_last4": "4242",
        "card_exp_month": 12,
        "card_exp_year": 2025,
        "card_holder_name": "John Doe",
        "is_default": true,
        "is_active": true,
        "createdAt": "2024-01-15T00:00:00.000Z"
      },
      {
        "_id": "64ff94hh8i3j6f0012345679",
        "stripe_payment_method_id": "pm_abcdef1234567890",
        "card_brand": "mastercard",
        "card_last4": "5555",
        "card_exp_month": 6,
        "card_exp_year": 2026,
        "card_holder_name": "John Doe",
        "is_default": false,
        "is_active": true,
        "createdAt": "2024-01-20T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 62. Set Default Payment Method
**Set a payment method as default**

- **Method:** `PUT`
- **Endpoint:** `/api/client/payment-methods/:paymentMethodId/default`
- **Description:** Sets a payment method as the default. Only one default payment method per user.
- **URL Parameters:**
  - `paymentMethodId` - PaymentMethod MongoDB ObjectId
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <token>"
  }
  ```
  OR
  - Cookie: `token`
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Default payment method updated successfully",
    "data": {
      "_id": "64ff94hh8i3j6f0012345679",
      "is_default": true,
      "updatedAt": "2024-01-25T10:30:00.000Z"
    }
  }
  ```

---

### 63. Delete Payment Method
**Delete a payment method**

- **Method:** `DELETE`
- **Endpoint:** `/api/client/payment-methods/:paymentMethodId`
- **Description:** Deletes a payment method (soft delete - marks as inactive and detaches from Stripe).
- **URL Parameters:**
  - `paymentMethodId` - PaymentMethod MongoDB ObjectId
- **Headers:**
  ```json
  {
    "Authorization": "Bearer <token>"
  }
  ```
  OR
  - Cookie: `token`
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Payment method deleted successfully",
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
- `GET /api/client/my-rentals` - Get user's rented units (with pagination)
- `GET /api/client/my-invoices` - Get user's invoices (with pagination)
- `POST /api/client/profile` - Update user profile
- `POST /api/client/payment-methods` - Add payment method
- `GET /api/client/payment-methods` - Get all payment methods
- `PUT /api/client/payment-methods/:paymentMethodId/default` - Set default payment method
- `DELETE /api/client/payment-methods/:paymentMethodId` - Delete payment method

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
- `POST /api/admin/locations` - Create location
- `GET /api/admin/locations` - List locations
- `GET /api/admin/locations/:id` - Get location
- `PUT /api/admin/locations/:id` - Update location
- `DELETE /api/admin/locations/:id` - Delete location
- `POST /api/admin/units` - Create unit
- `GET /api/admin/units` - List units
- `GET /api/admin/units/:id` - Get unit
- `PUT /api/admin/units/:id` - Update unit
- `DELETE /api/admin/units/:id` - Delete unit
- `POST /api/admin/unit-types` - Create unit type
- `GET /api/admin/unit-types` - List unit types
- `GET /api/admin/unit-types/:id` - Get unit type
- `PUT /api/admin/unit-types/:id` - Update unit type
- `DELETE /api/admin/unit-types/:id` - Delete unit type
- `POST /api/admin/analysis-codes` - Create analysis code
- `GET /api/admin/analysis-codes` - List analysis codes
- `GET /api/admin/analysis-codes/:id` - Get analysis code
- `PUT /api/admin/analysis-codes/:id` - Update analysis code
- `DELETE /api/admin/analysis-codes/:id` - Delete analysis code
- `POST /api/admin/units/:unitId/assign` - Assign unit to user
- `POST /api/admin/units/:unitId/release` - Release unit
- `POST /api/admin/notice-setups` - Create notice setup
- `GET /api/admin/notice-setups` - List notice setups
- `GET /api/admin/notice-setups/:id` - Get notice setup
- `PUT /api/admin/notice-setups/:id` - Update notice setup
- `DELETE /api/admin/notice-setups/:id` - Delete notice setup
- `POST /api/admin/notice-charges` - Create notice charge
- `GET /api/admin/notice-charges` - List notice charges
- `GET /api/admin/notice-charges/:id` - Get notice charge
- `PUT /api/admin/notice-charges/:id` - Update notice charge
- `DELETE /api/admin/notice-charges/:id` - Delete notice charge
- `POST /api/admin/invoices` - Create invoice
- `GET /api/admin/invoices` - List invoices
- `GET /api/admin/invoices/:id` - Get invoice by MongoDB ID
- `GET /api/admin/invoices/by-id/:invoiceId` - Get invoice by invoice_id
- `PUT /api/admin/invoices/:id` - Update invoice
- `DELETE /api/admin/invoices/:id` - Delete invoice

---

**Base URL:** `http://localhost:5000` (or your server URL)

**All timestamps are in ISO 8601 format (UTC)**


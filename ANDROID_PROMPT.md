Ты опытный Android-разработчик, тебе необходимо разработать приложение на Android Studio Jetpack Compose. Вот гайд:
# Mobile Client Development Guide for FootPath

## Overview

This document provides comprehensive guidance for developing a mobile client for the FootPath application using Android Studio, Kotlin, and Jetpack Compose. The mobile client will support all roles (user, moderator, admin) with role-specific interfaces and functionality.

## Architecture and Technology Stack

### Mobile Client Stack
- **Platform**: Android 7+ (API level 24+)
- **Language**: Kotlin
- **UI Framework**: Jetpack Compose
- **Map Library**: OpenStreetMap (using libraries like OSMDroid)
- **Local Database**: SQLite (Room database)
- **HTTP Client**: Retrofit + OkHttp
- **Authentication**: JWT-based with local token storage
- **Caching**: Room database for offline data storage

### Key Components

#### Authentication Flow
1. **Login Screen**: Basic email/password authentication
2. **Token Management**: JWT token stored securely in Android Keystore
3. **Role-based Navigation**: Different UI based on user role (user/moderator/admin)
4. **Auto-refresh**: Token refresh mechanism for seamless user experience

#### Local Storage Architecture
- **User credentials** stored in Android Keystore
- **Room Database** for caching offline data:
  - Places (POIs)
  - User profile data
- **Data synchronization** between local and remote databases

#### Backend Infrastructure
The backend uses PostgreSQL with PostGIS for spatial queries.
- **API response caching**: Frequent API responses are cached to improve response times
- **Session management**: JWT tokens are associated with session data in Redis for enhanced security and management

## API Integration

### Available APIs

#### Authentication APIs
- `POST /auth/register` - User registration
  - Request Body: `{"email": "string", "password": "string"}`
  - Response: `{"user": {"id": "string", "email": "string", "username": "string", "role": "string"}, "token": "string"}`
  - Error Codes: 400 (Bad Request), 409 (Conflict - email already exists)

- `POST /auth/login` - User login
  - Request Body: `{"email": "string", "password": "string"}`
  - Response: `{"user": {"id": "string", "email": "string", "username": "string", "role": "string"}, "token": "string"}`
  - Error Codes: 400 (Bad Request), 401 (Unauthorized)

- `GET /auth/me` - Get current user profile
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"id": "string", "email": "string", "username": "string", "role": "string", "createdAt": "datetime", "updatedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized)

- `PUT /auth/profile` - Update user profile
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"email": "string", "username": "string", "name": "string"}`
  - Response: `{"id": "string", "email": "string", "username": "string", "role": "string", "name": "string"}`
  - Error Codes: 401 (Unauthorized)

- `POST /auth/logout` - User logout
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"message": "Successfully logged out"}`
  - Error Codes: 401 (Unauthorized)

- `POST /auth/request-password-reset` - Password reset request
  - Request Body: `{"email": "string"}`
  - Response: `{"message": "Password reset email sent"}`
  - Error Codes: 404 (User not found)

- `POST /auth/reset-password` - Password reset confirmation
  - Request Body: `{"token": "string", "password": "string"}`
  - Response: `{"message": "Password updated successfully"}`
  - Error Codes: 400 (Invalid token)

- `POST /auth/register-moderator` - Admin register a new moderator/admin user (admin only)
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"email": "string", "password": "string", "role": "moderator|admin"}`
  - Response: `{"user": {"id": "string", "email": "string", "username": "string", "role": "string"}, "token": "string"}`
  - Error Codes: 401 (Unauthorized), 403 (Forbidden - only admins can register moderators), 400 (Bad Request - invalid role, email already exists, weak password, etc.)

#### Places APIs
- `POST /places` - Create a new place (pending moderation for regular users, approved for moderators/admins)
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"name": "string", "description": "string", "coordinates": {"latitude": "number", "longitude": "number"}, "tagIds": ["string"]}`
  - Response: `{"id": "string", "name": "string", "description": "string", "coordinates": {"type": "string", "coordinates": ["number"]}, "tagIds": ["string"], "status": "string", "creatorId": "string", "moderatorId": "string", "createdAt": "datetime", "updatedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized)
  - Notes: Places created by regular users start with "pending" status, while places created by moderators/admins start with "approved" status

- `GET /places` - Search for places with filters (radius, tags, status, creatorId)
  - Headers: `Authorization: Bearer <token>`
  - Query Params: `?name=string&status=string&tagIds[]=string&creatorId=string&location={"latitude": "number", "longitude": "number", "radius": "number"}&page=number&limit=number`
  - Response: `{"data": [...], "meta": {"page": "number", "limit": "number", "total": "number", "pages": "number"}}`
  - Error Codes: 401 (Unauthorized)
  - Notes: Regular users can see all approved places but only their own pending/rejected places; moderators/admins can see all places regardless of status

- `GET /places/{id}` - Get a specific place by ID
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"id": "string", "name": "string", "description": "string", "coordinates": {"type": "string", "coordinates": ["number"]}, "tagIds": ["string"], "status": "string", "creatorId": "string", "moderatorId": "string", "createdAt": "datetime", "updatedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized), 404 (Place not found)

- `PUT /places/{id}` - Update a place
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"name": "string", "description": "string", "coordinates": {"latitude": "number", "longitude": "number"}}`
  - Response: `{"id": "string", "name": "string", "description": "string", "coordinates": {"type": "string", "coordinates": ["number"]}, "tagIds": ["string"], "status": "string", "creatorId": "string", "moderatorId": "string", "createdAt": "datetime", "updatedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized), 403 (Forbidden - insufficient permissions), 404 (Place not found)
  - Notes: 
    - Regular users can update their own pending or rejected places
    - Rejected places automatically transition to pending status when edited by the creator
    - Moderators/admins can update approved places of any user

- `DELETE /places/{id}` - Delete a place
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"message": "Place deleted successfully", "id": "string"}`
  - Error Codes: 401 (Unauthorized), 403 (Forbidden - insufficient permissions), 404 (Place not found)
  - Notes: Regular users can only delete their own pending or rejected places; moderators/admins can delete approved places of any user

- `PUT /places/{id}/approve` - Approve a place (moderator/admin only)
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"reason": "string"}` (optional)
  - Response: `{"id": "string", "name": "string", "status": "approved", "moderatorId": "string", "approvedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized), 403 (Forbidden), 404 (Place not found)

- `PUT /places/{id}/reject` - Reject a place (moderator/admin only)
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"reason": "string"}` (optional)
  - Response: `{"id": "string", "name": "string", "status": "rejected", "moderatorId": "string", "rejectedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized), 403 (Forbidden), 404 (Place not found)

The Place object returned by these APIs now includes:
- `creatorId` - The ID of the user who proposed the place
- `moderatorId` - The ID of the moderator who approved/rejected the place (null if pending)

#### Paths APIs
- `POST /paths/generate` - Generate a path based on criteria
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"startLocation": {"lat": "number", "lng": "number"}, "endLocation": {"lat": "number", "lng": "number"}, "duration": "number", "tags": ["string"]}`
  - Response: `{"id": "string", "name": "string", "description": "string", "distance": "number", "totalTime": "number", "places": [{"id": "string", "name": "string"}]}`
  - Error Codes: 401 (Unauthorized)

- `POST /paths` - Create a saved path
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"name": "string", "description": "string", "places": ["string"], "distance": "number", "duration": "number"}`
  - Response: `{"id": "string", "name": "string", "description": "string", ...}`
  - Error Codes: 401 (Unauthorized)

- `GET /paths` - Get saved paths
  - Headers: `Authorization: Bearer <token>`
  - Query Params: `?page=number&limit=number&status=string&startDate=string&endDate=string`
  - Response: `{"data": [...], "meta": {"page": "number", "limit": "number", "total": "number", "pages": "number"}}`
  - Error Codes: 401 (Unauthorized)
  - Notes: Users can only retrieve paths they created; access to paths created by other users is denied

- `GET /paths/{id}` - Get a specific path
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"id": "string", "name": "string", "description": "string", "distance": "number", "totalTime": "number", "places": [...]}`
  - Error Codes: 401 (Unauthorized), 404 (Path not found or user does not have access)
  - Notes: Users can only access paths they created; access to paths created by other users is denied

- `PUT /paths/{id}` - Update a path
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"name": "string", "description": "string"}`
  - Response: `{"id": "string", "name": "string", "description": "string", ...}`
  - Error Codes: 401 (Unauthorized), 404 (Path not found or user does not have permission to update)
  - Notes: Only path creator can update the path

- `DELETE /paths/{id}` - Delete a path
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"message": "Path deleted successfully"}`
  - Error Codes: 401 (Unauthorized), 404 (Path not found or user does not have permission to delete)
  - Notes: Only path creator can delete the path

#### Walks APIs
- `POST /walks` - Create a new walk
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"pathId": "string", "title": "string", "startTime": "datetime", "duration": "number"}`
  - Response: `{"id": "string", "title": "string", "pathId": "string", "status": "pending|active|completed", "participants": [...]}`
  - Error Codes: 401 (Unauthorized)

- `GET /walks` - Get list of walks
  - Headers: `Authorization: Bearer <token>`
  - Query Params: `?page=number&limit=number&status=string&startDate=string&endDate=string`
  - Response: `{"data": [...], "meta": {"page": "number", "limit": "number", "total": "number", "pages": "number"}}`
  - Error Codes: 401 (Unauthorized)
  - Notes: Users can only retrieve walks they created or in which they are participants (invited or confirmed)

- `GET /walks/{id}` - Get a specific walk
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"id": "string", "title": "string", "path": {...}, "status": "string", "participants": [...], "startTime": "datetime", "endTime": "datetime"}`
  - Error Codes: 401 (Unauthorized), 404 (Walk not found or user does not have access)
  - Notes: Users can only access walks they created or in which they are participants (invited or confirmed)

- `POST /walks/{id}/respond` - Respond to a walk invitation (accept/decline)
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"status": "accepted|declined"}`
  - Response: `{"id": "string", "title": "string", "path": {...}, "status": "string", "participants": [...]}`
  - Error Codes: 401 (Unauthorized), 404 (Walk not found)

- `POST /walks/{id}/complete` - Complete a walk
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"id": "string", "status": "completed", "completedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized), 404 (Walk not found)

- `DELETE /walks/{id}` - Cancel a walk
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"message": "Walk canceled"}`
  - Error Codes: 401 (Unauthorized), 404 (Walk not found)



#### Recommendations APIs
- `GET /recommendations/places` - Get place recommendations
  - Headers: `Authorization: Bearer <token>`
  - Query Params: `?limit=number&tags=["string"]&userId=string`
  - Response: `{"data": [{"id": "string", "name": "string", "description": "string", ...}], "count": "number"}`
  - Error Codes: 401 (Unauthorized)

- `GET /recommendations/paths` - Get path recommendations
  - Headers: `Authorization: Bearer <token>`
  - Query Params: `?limit=number&tags=["string"]&userId=string`
  - Response: `{"data": [{"id": "string", "name": "string", "places": [...]}, ...], "count": "number"}`
  - Error Codes: 401 (Unauthorized)

- `POST /recommendations/generate-all-embeddings` - Generate embeddings (admin only)
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"message": "Embeddings generation started", "processed": "number"}`
  - Error Codes: 401 (Unauthorized), 403 (Forbidden)

### API Response Caching
The backend implements caching for improved performance:
- **Session caching**: User session data is cached in Redis after login for faster authentication
- **User profile caching**: Profile data is cached for 1 hour to reduce database load
- **API result caching**: Some API responses are cached to improve response times

Mobile clients should be aware that:
- User profile updates may have a slight delay before reflecting across all API calls (up to 1 hour)
- Session data on the server-side is maintained in Redis for enhanced security and management

## UI/UX Design Specifications

### New Place Creator Tracking Feature
The system now tracks which user proposed each place with the following fields:
- `creatorId` - The ID of the user who proposed the place
- `moderatorId` - The ID of the moderator who approved/rejected the place (null if pending)

This enables:
- Users to see who recommended places they visit
- Moderators to review places by specific users
- Better accountability for submitted content
- Potential social features based on place recommendations
- Enhanced moderation capabilities to identify repeat contributors

### Role-Based Interface
The mobile application will have different UI flows based on user role:

#### Regular User Interface
- Map view with searchable POIs
- Friend management
- Path generation and viewing
- Walk creation and participation
- Notifications
- Profile management
- Place details showing who created/proposed the place

#### Moderator Interface (in addition to user features)
- POI moderation queue
- Ability to approve/reject places
- Access to moderation logs
- View place creators in moderation queue to identify repeat contributors

#### Admin Interface (in addition to moderator features)
- Admin dashboard
- User management
- System statistics
- Full moderation capabilities
- Generate embeddings for all places functionality
- Register new moderators and admins

### Core UI Components

#### Login Screen
- Email/username input field
- Password input field
- Login button with equal spacing between input fields and button
- Registration link
- Password reset link
- UI spacing: Equal vertical spacing between email input, password input, and login button

#### Map View
- OpenStreetMap integration using OSMDroid
- POI markers with different icons based on type
- Search and filtering capabilities
- Route visualization
- Location tracking
- Display creator information on place details (show who proposed the place)

#### Navigation Drawer
- Role-specific menu items
- Profile information
- Settings access

#### Bottom Navigation
- Consistent across all roles
- Main sections: Map, Friends, Paths, Profile
- Role-specific additional items (Moderation for moderators)

## Local Storage Implementation

### Room Database Schema

#### User Entity
```
@Entity(tableName = "users")
data class User(
    @PrimaryKey val userId: String,
    val email: String,
    val username: String?, // Can be null initially, user can set it later
    val role: String, // "user", "moderator", "admin"
    val createdAt: Date,
    val updatedAt: Date
)
```

#### Place Entity
```
@Entity(tableName = "places")
data class Place(
    @PrimaryKey val placeId: String,
    val name: String,
    val description: String,
    val latitude: Double,
    val longitude: Double,
    val tags: List<String>,
    val status: String, // "pending", "approved", "rejected"
    val creatorId: String, // ID of the user who proposed this place
    val moderatorId: String?, // ID of the moderator who approved/rejected (nullable)
    val createdAt: Date,
    val updatedAt: Date
)
```

#### Friend Entity
```
@Entity(
    tableName = "friends",
    primaryKeys = ["userId", "friendId"]
)
data class Friend(
    val userId: String,
    val friendId: String,
    val username: String?, // Username of the friend (can be null if not set)
    val email: String,
    val createdAt: Date
)
```

#### FriendRequest Entity
```
@Entity(tableName = "friend_requests")
data class FriendRequest(
    @PrimaryKey val requestId: String,
    val senderId: String,
    val senderUsername: String?, // Username of the sender (can be null if not set)
    val senderEmail: String,
    val receiverId: String,
    val status: String, // "pending", "accepted", "rejected"
    val createdAt: Date,
    val updatedAt: Date
)
```

#### Walk Entity
```
@Entity(tableName = "walks")
data class Walk(
    @PrimaryKey val walkId: String,
    val title: String,
    val pathId: String,
    val status: String, // "pending", "active", "completed"
    val startTime: Date,
    val endTime: Date,
    val participants: List<String>, // list of user IDs
    val createdAt: Date,
    val updatedAt: Date
)
```

#### Path Entity
```
@Entity(tableName = "paths")
data class Path(
    @PrimaryKey val pathId: String,
    val name: String,
    val description: String,
    val distance: Float, // in km
    val totalTime: Int, // in minutes
    val places: List<String>, // list of place IDs
    val createdAt: Date,
    val updatedAt: Date
)
```

#### Notification Entity
```
@Entity(tableName = "notifications")
data class Notification(
    @PrimaryKey val notificationId: String,
    val userId: String,
    val type: String,
    val title: String,
    val message: String,
    val isRead: Boolean,
    val createdAt: Date
)
```


### Caching Strategy
- **Offline Support**: Critical data cached for offline use
- **Sync Mechanism**: Background synchronization with server
- **Cache Expiration**: Implement TTL for cached data
- **Conflict Resolution**: Handle offline changes when reconnecting

## Authentication Implementation

### JWT Token Management
- Store JWT token in Android Keystore
- Interceptor for adding Authorization header to API calls
- Automatic token refresh when expired
- Secure logout and token cleanup

### Role-Based Access
- Role information stored locally after login
- UI components conditionally rendered based on role
- API calls filtered by role permissions

## OpenStreetMap Integration

### OSMDroid Setup
- Display interactive maps
- Add custom markers for POIs
- Implement routing capabilities
- Location tracking and geolocation

### Map Features
- Search for places
- Display POI information
- Show routes and paths
- Add new locations
- Offline map support

## Security Considerations

### Data Security
- Encrypt sensitive data locally
- Use HTTPS for all API communications
- Implement certificate pinning
- Secure token storage in Android Keystore

### API Security
- Validate JWT tokens on each request
- Implement rate limiting
- Input validation on client side
- Role-based access control

## Performance Optimization

### Caching
- Implement proper caching strategies
- Local data prefetching
- Lazy loading for large datasets
- Efficient database queries

### Network Optimization
- Request compression
- Efficient data formats (JSON)
- Background data synchronization
- Offline-first approach for critical features

## Testing Strategy

### Unit Tests
- Repository layer tests
- ViewModels tests
- Utility functions tests

### UI Tests
- Compose UI tests
- Navigation tests
- Role-based UI flow tests

### Integration Tests
- API integration tests
- Database operation tests
- Authentication flow tests

## Deployment Considerations

### App Distribution
- Google Play Store deployment
- Internal testing track
- Production rollout strategy

### Monitoring
- Crash reporting (Firebase Crashlytics)
- Performance monitoring
- User analytics

## Development Environment Setup

### Prerequisites
- Android Studio Arctic Fox or later
- Android SDK 24+
- Kotlin 1.5+
- Java 11

### Dependencies
```kotlin
// Core
implementation 'androidx.core:core-ktx:1.9.0'
implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.6.1'
implementation 'androidx.activity:activity-compose:1.7.0'
implementation platform('androidx.compose:compose-bom:2023.03.00')

// Compose
implementation 'androidx.compose.ui:ui'
implementation 'androidx.compose.ui:ui-tooling-preview'
implementation 'androidx.compose.material3:material3'

// Navigation
implementation 'androidx.navigation:navigation-compose:2.5.3'

// Data storage
implementation 'androidx.room:room-runtime:2.5.0'
implementation 'androidx.room:room-ktx:2.5.0'
kapt 'androidx.room:room-compiler:2.5.0'

// Networking
implementation 'com.squareup.retrofit2:retrofit:2.9.0'
implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
implementation 'com.squareup.okhttp3:logging-interceptor:4.10.0'

// Map
implementation 'org.osmdroid:osmdroid-android:6.1.17'

// Authentication
implementation 'androidx.security:security-crypto-ktx:1.0.0'

// Image loading
implementation 'io.coil-kt:coil-compose:2.2.2'
```

## Build Configuration

### Gradle Configuration
```gradle
android {
    compileSdk 34

    defaultConfig {
        applicationId "com.footpath.mobile"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary true
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = '1.8'
    }

    buildFeatures {
        compose true
    }

    composeOptions {
        kotlinCompilerExtensionVersion '1.4.3'
    }

    packagingOptions {
        resources {
            excludes += '/META-INF/{AL2.0,LGPL2.1}'
        }
    }
}
```

This comprehensive guide provides all the necessary information to implement a complete mobile client for the FootPath application with role-based functionality, offline capabilities, and proper security measures.

Полный swagger: 

window.onload = function() {
  // Build a system
  let url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  let options = {
  "swaggerDoc": {
    "openapi": "3.0.0",
    "paths": {
      "/": {
        "get": {
          "operationId": "getHello",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          }
        }
      },
      "/health": {
        "get": {
          "operationId": "getHealth",
          "parameters": [],
          "responses": {
            "200": {
              "description": ""
            }
          }
        }
      },
      "/auth/register": {
        "post": {
          "operationId": "register",
          "summary": "Register a new user",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RegisterDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "User registered successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/RegisterResponseDto"
                  }
                }
              }
            },
            "400": {
              "description": "Bad request (email already exists, weak password, etc.)"
            }
          },
          "tags": [
            "Authentication"
          ]
        }
      },
      "/auth/login": {
        "post": {
          "operationId": "login",
          "summary": "Login user",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LoginDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "User logged in successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/LoginResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Invalid credentials"
            }
          },
          "tags": [
            "Authentication"
          ]
        }
      },
      "/auth/me": {
        "get": {
          "operationId": "getProfile",
          "summary": "Get authenticated user profile",
          "security": [
            {
              "bearer": []
            }
          ],
          "parameters": [],
          "responses": {
            "200": {
              "description": "User profile retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/UserResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Authentication"
          ]
        }
      },
      "/auth/profile": {
        "put": {
          "operationId": "updateProfile",
          "summary": "Update user profile",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserProfileDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Profile updated successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/UserResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Authentication"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/auth/request-password-reset": {
        "post": {
          "operationId": "requestPasswordReset",
          "summary": "Request password reset",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RequestPasswordResetDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Password reset request processed",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "message": "If an account with that email exists, a reset link has been sent."
                    }
                  }
                }
              }
            }
          },
          "tags": [
            "Authentication"
          ]
        }
      },
      "/auth/reset-password": {
        "post": {
          "operationId": "resetPassword",
          "summary": "Reset password with token",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResetPasswordDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Password reset successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "message": "Password has been reset successfully."
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid or expired reset token"
            }
          },
          "tags": [
            "Authentication"
          ]
        }
      },
      "/auth/logout": {
        "post": {
          "operationId": "logout",
          "summary": "Logout user",
          "parameters": [],
          "responses": {
            "200": {
              "description": "User logged out successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "message": "Logged out successfully"
                    }
                  }
                }
              }
            }
          },
          "tags": [
            "Authentication"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/auth/register-moderator": {
        "post": {
          "operationId": "registerModerator",
          "summary": "Admin register a new moderator/admin user",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RegisterModeratorDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Moderator/Admin registered successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/RegisterResponseDto"
                  }
                }
              }
            },
            "400": {
              "description": "Bad request (email already exists, weak password, invalid role, etc.)"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Forbidden - Only admins can register moderators"
            }
          },
          "tags": [
            "Authentication"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/places": {
        "post": {
          "operationId": "createPlace",
          "summary": "Create a new place (for moderation)",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreatePlaceDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Place created successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PlaceResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Forbidden"
            }
          },
          "tags": [
            "Places"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "get": {
          "operationId": "findPlaces",
          "summary": "Search for places with filters",
          "parameters": [
            {
              "name": "name",
              "required": false,
              "in": "query",
              "description": "Filter places by name",
              "schema": {
                "example": "Central Park",
                "type": "string"
              }
            },
            {
              "name": "tagIds",
              "required": false,
              "in": "query",
              "description": "Filter places by tag IDs",
              "schema": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            },
            {
              "name": "status",
              "required": false,
              "in": "query",
              "description": "Filter places by status",
              "schema": {
                "example": "approved",
                "enum": [
                  "pending",
                  "approved",
                  "rejected"
                ],
                "type": "string"
              }
            },
            {
              "description": "Latitude coordinate for location-based search",
              "name": "latitude",
              "in": "query",
              "required": true,
              "schema": {
                "minimum": -90,
                "maximum": 90,
                "example": 55.7558,
                "type": "number"
              }
            },
            {
              "description": "Longitude coordinate for location-based search",
              "name": "longitude",
              "in": "query",
              "required": true,
              "schema": {
                "minimum": -180,
                "maximum": 180,
                "example": 37.6173,
                "type": "number"
              }
            },
            {
              "description": "Radius in meters for location-based search",
              "name": "radius",
              "in": "query",
              "required": true,
              "schema": {
                "minimum": 0,
                "example": 1000,
                "type": "number"
              }
            },
            {
              "name": "page",
              "required": false,
              "in": "query",
              "description": "Page number for pagination",
              "schema": {
                "minimum": 0,
                "example": 1,
                "type": "number"
              }
            },
            {
              "name": "limit",
              "required": false,
              "in": "query",
              "description": "Number of items per page",
              "schema": {
                "minimum": 1,
                "maximum": 100,
                "example": 10,
                "type": "number"
              }
            },
            {
              "name": "creatorId",
              "required": false,
              "in": "query",
              "description": "Filter places by creator ID",
              "schema": {
                "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "type": "string"
              }
            },
            {
              "description": "Filter places by name",
              "required": false,
              "name": "name",
              "in": "query",
              "schema": {
                "example": "Central Park",
                "type": "string"
              }
            },
            {
              "description": "Filter places by tag IDs",
              "required": false,
              "name": "tagIds",
              "in": "query",
              "schema": {
                "example": [
                  "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                  "b2c3d4e5-f678-9012-3456-7890abcdef12"
                ],
                "type": "array"
              }
            },
            {
              "description": "Filter places by status",
              "required": false,
              "name": "status",
              "in": "query",
              "schema": {
                "example": "approved",
                "enum": [
                  "pending",
                  "approved",
                  "rejected"
                ],
                "type": "string"
              }
            },
            {
              "name": "location",
              "required": false,
              "description": "Location-based filter parameters",
              "allOf": [
                {
                  "$ref": "#/components/schemas/LocationFilterDto"
                }
              ],
              "in": "query",
              "schema": {
                "example": {
                  "latitude": 55.7558,
                  "longitude": 37.6173,
                  "radius": 1000
                }
              }
            },
            {
              "description": "Page number for pagination",
              "required": false,
              "name": "page",
              "in": "query",
              "schema": {
                "minimum": 0,
                "example": 1,
                "type": "number"
              }
            },
            {
              "description": "Number of items per page",
              "required": false,
              "name": "limit",
              "in": "query",
              "schema": {
                "minimum": 1,
                "maximum": 100,
                "example": 10,
                "type": "number"
              }
            },
            {
              "description": "Filter places by creator ID",
              "required": false,
              "name": "creatorId",
              "in": "query",
              "schema": {
                "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Places retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PlaceFilterResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Places"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/places/{id}": {
        "get": {
          "operationId": "getPlace",
          "summary": "Get a place by ID",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Place ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Place retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PlaceResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Place not found"
            }
          },
          "tags": [
            "Places"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "delete": {
          "operationId": "deletePlace",
          "summary": "Delete a place by ID",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Place ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Place deleted successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "message": "Place deleted successfully",
                      "id": "place-uuid"
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Forbidden - insufficient permissions"
            },
            "404": {
              "description": "Place not found"
            }
          },
          "tags": [
            "Places"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "put": {
          "operationId": "updatePlace",
          "summary": "Update a place by ID",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Place ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdatePlaceDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Place updated successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PlaceResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Place not found"
            }
          },
          "tags": [
            "Places"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/places/{id}/approve": {
        "put": {
          "operationId": "approvePlace",
          "summary": "Approve a place (moderator only)",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Place ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApprovePlaceDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Place approved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PlaceResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Forbidden - insufficient permissions"
            },
            "404": {
              "description": "Place not found"
            }
          },
          "tags": [
            "Places"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/places/{id}/reject": {
        "put": {
          "operationId": "rejectPlace",
          "summary": "Reject a place (moderator only)",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Place ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApprovePlaceDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Place rejected successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PlaceResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Forbidden - insufficient permissions"
            },
            "404": {
              "description": "Place not found"
            }
          },
          "tags": [
            "Places"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/tags": {
        "post": {
          "operationId": "createTag",
          "summary": "Create a new tag (moderator only)",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateTagDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Tag created successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/TagResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Forbidden - insufficient permissions"
            }
          },
          "tags": [
            "Tags"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "get": {
          "operationId": "getAllTags",
          "summary": "Get all tags",
          "parameters": [],
          "responses": {
            "200": {
              "description": "Tags retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/TagResponseDto"
                    }
                  }
                }
              }
            }
          },
          "tags": [
            "Tags"
          ]
        }
      },
      "/tags/{id}": {
        "get": {
          "operationId": "getTag",
          "summary": "Get a tag by ID",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Tag ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Tag retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/TagResponseDto"
                  }
                }
              }
            },
            "404": {
              "description": "Tag not found"
            }
          },
          "tags": [
            "Tags"
          ]
        },
        "put": {
          "operationId": "updateTag",
          "summary": "Update a tag by ID (moderator only)",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Tag ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateTagDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Tag updated successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/TagResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Forbidden - insufficient permissions"
            },
            "404": {
              "description": "Tag not found"
            }
          },
          "tags": [
            "Tags"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "delete": {
          "operationId": "deleteTag",
          "summary": "Delete a tag by ID (moderator only)",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Tag ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Tag deleted successfully"
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Forbidden - insufficient permissions"
            },
            "404": {
              "description": "Tag not found"
            }
          },
          "tags": [
            "Tags"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/recommendations/places": {
        "get": {
          "operationId": "getPlaceRecommendations",
          "summary": "Get personalized place recommendations for user",
          "parameters": [
            {
              "name": "userId",
              "required": false,
              "in": "query",
              "description": "UUID of the user to get recommendations for",
              "schema": {
                "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "type": "string"
              }
            },
            {
              "name": "limit",
              "required": false,
              "in": "query",
              "description": "Maximum number of recommendations to return",
              "schema": {
                "minimum": 1,
                "maximum": 50,
                "example": 10,
                "type": "number"
              }
            },
            {
              "name": "location",
              "required": false,
              "in": "query",
              "description": "Location context for recommendations (coordinates or area name)",
              "schema": {
                "maxLength": 100,
                "example": "Moscow, Russia",
                "type": "string"
              }
            },
            {
              "name": "tags",
              "required": false,
              "in": "query",
              "description": "Array of tags to filter recommendations",
              "schema": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            },
            {
              "description": "UUID of the user to get recommendations for",
              "required": false,
              "name": "userId",
              "in": "query",
              "schema": {
                "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "type": "string"
              }
            },
            {
              "description": "Maximum number of recommendations to return",
              "required": false,
              "name": "limit",
              "in": "query",
              "schema": {
                "minimum": 1,
                "maximum": 50,
                "example": 10,
                "type": "number"
              }
            },
            {
              "description": "Location context for recommendations (coordinates or area name)",
              "required": false,
              "name": "location",
              "in": "query",
              "schema": {
                "maxLength": 100,
                "example": "Moscow, Russia",
                "type": "string"
              }
            },
            {
              "description": "Array of tags to filter recommendations",
              "required": false,
              "name": "tags",
              "in": "query",
              "schema": {
                "example": [
                  "romantic",
                  "child-friendly",
                  "scenic"
                ],
                "type": "array"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Place recommendations retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": [
                      {
                        "id": "place-uuid1",
                        "name": "Central Park",
                        "description": "A beautiful park in the city",
                        "tags": [
                          "park",
                          "nature"
                        ],
                        "status": "approved",
                        "createdAt": "2023-01-01T00:00:00.000Z",
                        "updatedAt": "2023-01-01T00:00:00.000Z"
                      }
                    ]
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Recommendations"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/recommendations/paths": {
        "get": {
          "operationId": "getPathRecommendations",
          "summary": "Get personalized path recommendations for user",
          "parameters": [
            {
              "name": "userId",
              "required": false,
              "in": "query",
              "description": "UUID of the user to get recommendations for",
              "schema": {
                "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "type": "string"
              }
            },
            {
              "name": "limit",
              "required": false,
              "in": "query",
              "description": "Maximum number of path recommendations to return",
              "schema": {
                "minimum": 1,
                "maximum": 20,
                "example": 5,
                "type": "number"
              }
            },
            {
              "name": "startLocation",
              "required": false,
              "in": "query",
              "description": "Start location for path recommendations",
              "schema": {
                "maxLength": 100,
                "example": "Moscow, Russia",
                "type": "string"
              }
            },
            {
              "name": "endLocation",
              "required": false,
              "in": "query",
              "description": "End location for path recommendations",
              "schema": {
                "maxLength": 100,
                "example": "Red Square, Moscow",
                "type": "string"
              }
            },
            {
              "description": "UUID of the user to get recommendations for",
              "required": false,
              "name": "userId",
              "in": "query",
              "schema": {
                "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "type": "string"
              }
            },
            {
              "description": "Maximum number of path recommendations to return",
              "required": false,
              "name": "limit",
              "in": "query",
              "schema": {
                "minimum": 1,
                "maximum": 20,
                "example": 5,
                "type": "number"
              }
            },
            {
              "description": "Start location for path recommendations",
              "required": false,
              "name": "startLocation",
              "in": "query",
              "schema": {
                "maxLength": 100,
                "example": "Moscow, Russia",
                "type": "string"
              }
            },
            {
              "description": "End location for path recommendations",
              "required": false,
              "name": "endLocation",
              "in": "query",
              "schema": {
                "maxLength": 100,
                "example": "Red Square, Moscow",
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Path recommendations retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": [
                      {
                        "id": "path-uuid1",
                        "name": "Morning Walk",
                        "description": "A nice morning walk around the park",
                        "distance": 3.5,
                        "totalTime": 60,
                        "places": [
                          {
                            "id": "place-uuid",
                            "name": "Central Park",
                            "description": "A beautiful park"
                          }
                        ],
                        "createdAt": "2023-01-01T00:00:00.000Z",
                        "updatedAt": "2023-01-01T00:00:00.000Z"
                      }
                    ]
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Recommendations"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/recommendations/generate-all-embeddings": {
        "post": {
          "operationId": "generateAllEmbeddings",
          "summary": "Generate embeddings for all places (admin only)",
          "parameters": [],
          "responses": {
            "200": {
              "description": "Embeddings generation completed",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "processed": 25
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "403": {
              "description": "Forbidden - insufficient permissions"
            }
          },
          "tags": [
            "Recommendations"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/paths": {
        "post": {
          "operationId": "createPath",
          "summary": "Create a new saved path",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreatePathDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Path created successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PathResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Paths"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "get": {
          "operationId": "findPaths",
          "summary": "Search for paths with filters",
          "parameters": [],
          "responses": {
            "200": {
              "description": "Paths retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PathsListResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Paths"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/paths/generate": {
        "post": {
          "operationId": "generatePath",
          "summary": "Generate a new path based on criteria",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GeneratePathDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Path generated successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PathResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Paths"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/paths/{id}": {
        "get": {
          "operationId": "getPath",
          "summary": "Get a path by ID",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Path ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Path retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PathResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Path not found"
            }
          },
          "tags": [
            "Paths"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "put": {
          "operationId": "updatePath",
          "summary": "Update a path by ID",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Path ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdatePathDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Path updated successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/PathResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Path not found"
            }
          },
          "tags": [
            "Paths"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "delete": {
          "operationId": "deletePath",
          "summary": "Delete a path by ID",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Path ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Path deleted successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "message": "Path deleted successfully"
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Path not found"
            }
          },
          "tags": [
            "Paths"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/friends": {
        "get": {
          "operationId": "getFriends",
          "summary": "Get list of friends for authenticated user",
          "parameters": [],
          "responses": {
            "200": {
              "description": "Friends retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": [
                      {
                        "id": "friend-uuid",
                        "email": "friend@example.com",
                        "createdAt": "2023-01-01T00:00:00.000Z"
                      }
                    ]
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Friends"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/friends/requests": {
        "post": {
          "operationId": "sendFriendRequest",
          "summary": "Send a friend request to another user",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SendFriendRequestDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Friend request sent successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "id": "request-uuid",
                      "senderId": "sender-uuid",
                      "receiverId": "receiver-uuid",
                      "status": "pending",
                      "createdAt": "2023-01-01T00:00:00.000Z",
                      "updatedAt": "2023-01-01T00:00:00.000Z"
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Receiver user not found"
            }
          },
          "tags": [
            "Friends"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/friends/requests/{requestId}/accept": {
        "post": {
          "operationId": "acceptFriendRequest",
          "summary": "Accept or decline a friend request",
          "parameters": [
            {
              "name": "requestId",
              "required": true,
              "in": "path",
              "description": "Friend request ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AcceptFriendRequestDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Friend request updated successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "id": "request-uuid",
                      "senderId": "sender-uuid",
                      "receiverId": "receiver-uuid",
                      "status": "accepted",
                      "createdAt": "2023-01-01T00:00:00.000Z",
                      "updatedAt": "2023-01-01T00:00:00.000Z"
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Friend request not found"
            }
          },
          "tags": [
            "Friends"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/friends/{userId}": {
        "delete": {
          "operationId": "removeFriend",
          "summary": "Remove a friend from your friend list",
          "parameters": [
            {
              "name": "userId",
              "required": true,
              "in": "path",
              "description": "Friend user ID to remove",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Friend removed successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "message": "Friend removed successfully"
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Friend not found"
            }
          },
          "tags": [
            "Friends"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/walks": {
        "post": {
          "operationId": "createWalk",
          "summary": "Create a new walk",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateWalkDto"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Walk created successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/WalkResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Walks"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "get": {
          "operationId": "getWalks",
          "summary": "Get walks for the authenticated user",
          "parameters": [
            {
              "name": "endDate",
              "required": false,
              "in": "query",
              "description": "Filter by end date",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "startDate",
              "required": false,
              "in": "query",
              "description": "Filter by start date",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "status",
              "required": false,
              "in": "query",
              "description": "Filter by status",
              "schema": {
                "type": "string"
              }
            },
            {
              "name": "limit",
              "required": false,
              "in": "query",
              "description": "Number of items per page",
              "schema": {
                "type": "number"
              }
            },
            {
              "name": "page",
              "required": false,
              "in": "query",
              "description": "Page number",
              "schema": {
                "type": "number"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Walks retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/WalksListResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          },
          "tags": [
            "Walks"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/walks/{id}": {
        "get": {
          "operationId": "getWalk",
          "summary": "Get a specific walk by ID",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Walk ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Walk retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/WalkResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Walk not found"
            }
          },
          "tags": [
            "Walks"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "put": {
          "operationId": "updateWalk",
          "summary": "Update a specific walk",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Walk ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UpdateWalkDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Walk updated successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/WalkResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Walk not found"
            }
          },
          "tags": [
            "Walks"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        },
        "delete": {
          "operationId": "deleteWalk",
          "summary": "Delete a walk",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Walk ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Walk deleted successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "message": "Walk deleted successfully",
                      "id": "walk-uuid"
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Walk not found"
            }
          },
          "tags": [
            "Walks"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/walks/{id}/invite": {
        "post": {
          "operationId": "inviteParticipants",
          "summary": "Invite participants to a walk",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Walk ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/InviteParticipantsDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Participants invited successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/WalkResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Walk not found"
            }
          },
          "tags": [
            "Walks"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/walks/{id}/respond": {
        "post": {
          "operationId": "respondToInvitation",
          "summary": "Respond to a walk invitation",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Walk ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RespondToInvitationDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Invitation responded to successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/WalkResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Walk not found"
            }
          },
          "tags": [
            "Walks"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/walks/{id}/complete": {
        "post": {
          "operationId": "completeWalk",
          "summary": "Complete a walk",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Walk ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CompleteWalkDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Walk completed successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/WalkResponseDto"
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            },
            "404": {
              "description": "Walk not found"
            }
          },
          "tags": [
            "Walks"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/notifications": {
        "get": {
          "operationId": "getUserNotifications",
          "parameters": [],
          "responses": {
            "200": {
              "description": "Notifications retrieved successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/NotificationResponseDto"
                    }
                  }
                }
              }
            }
          },
          "tags": [
            "Notifications"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/notifications/{id}/read": {
        "post": {
          "operationId": "markAsRead",
          "parameters": [
            {
              "name": "id",
              "required": true,
              "in": "path",
              "description": "Notification ID",
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Notification marked as read successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/NotificationResponseDto"
                  }
                }
              }
            }
          },
          "tags": [
            "Notifications"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/notifications/bulk-read": {
        "post": {
          "operationId": "bulkMarkAsRead",
          "parameters": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BulkReadNotificationsDto"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Notifications marked as read successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "affected": 5
                    }
                  }
                }
              }
            }
          },
          "tags": [
            "Notifications"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      },
      "/notifications/mark-all-read": {
        "post": {
          "operationId": "markAllAsRead",
          "parameters": [],
          "responses": {
            "200": {
              "description": "All notifications marked as read successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "example": {
                      "affected": 10
                    }
                  }
                }
              }
            }
          },
          "tags": [
            "Notifications"
          ],
          "security": [
            {
              "bearer": []
            }
          ]
        }
      }
    },
    "info": {
      "title": "FootPath API",
      "description": "\n# FootPath Monolith API Documentation\n\n## Overview\nFootPath is a monolithic application for creating personalized walking routes. The API provides functionality for authentication, place management, friend relationships, walk planning, notifications, and recommendations.\n\n## Authentication\nMost endpoints require a JWT token in the Authorization header: `Authorization: Bearer <token>`\n\n## API Categories\n- **Authentication** (`/auth`): User registration, login, profile management\n- **Places** (`/places`): Points of interest management with moderation\n- **Friends** (`/friends`): Social connections and relationships\n- **Paths** (`/paths`): Route generation and management\n- **Walks** (`/walks`): Walk planning and participation\n- **Notifications** (`/notifications`): User notifications\n- **Recommendations** (`/recommendations`): Personalized place recommendations\n\n## Base URL\n```\nhttp://localhost:3000\n```\n\n## Status Codes\n- **200**: Success\n- **201**: Created\n- **400**: Bad Request\n- **401**: Unauthorized\n- **403**: Forbidden\n- **404**: Not Found\n- **500**: Server Error\n    ",
      "version": "1.0",
      "contact": {}
    },
    "tags": [
      {
        "name": "Authentication",
        "description": "User registration, login, and profile management endpoints"
      },
      {
        "name": "Places",
        "description": "Points of Interest management and moderation"
      },
      {
        "name": "Friends",
        "description": "Social connections and friend requests"
      },
      {
        "name": "Paths",
        "description": "Route generation and management"
      },
      {
        "name": "Walks",
        "description": "Walk planning and participation"
      },
      {
        "name": "Notifications",
        "description": "User notification system"
      },
      {
        "name": "Recommendations",
        "description": "Personalized place recommendations"
      }
    ],
    "servers": [],
    "components": {
      "securitySchemes": {
        "access-token": {
          "scheme": "bearer",
          "bearerFormat": "JWT",
          "type": "http",
          "name": "JWT",
          "description": "Enter JWT token in the format: Bearer <token>"
        }
      },
      "schemas": {
        "RegisterDto": {
          "type": "object",
          "properties": {
            "email": {
              "type": "string",
              "example": "user@example.com",
              "description": "Email address for the new user account",
              "format": "email"
            },
            "password": {
              "type": "string",
              "example": "securePassword123",
              "description": "Password for the user account",
              "minLength": 6,
              "maxLength": 20
            }
          },
          "required": [
            "email",
            "password"
          ]
        },
        "UserResponseDto": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "Unique identifier of the user"
            },
            "email": {
              "type": "string",
              "example": "john.doe@example.com",
              "description": "Email address of the user"
            },
            "username": {
              "type": "string",
              "example": "johndoe",
              "description": "Username of the user (can be changed by the user)",
              "nullable": true
            },
            "role": {
              "type": "string",
              "example": "user",
              "enum": [
                "user",
                "moderator",
                "admin"
              ],
              "description": "Role of the user in the system"
            },
            "createdAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the user was created"
            },
            "updatedAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the user was last updated"
            }
          },
          "required": [
            "id",
            "email",
            "username",
            "role",
            "createdAt",
            "updatedAt"
          ]
        },
        "RegisterResponseDto": {
          "type": "object",
          "properties": {
            "user": {
              "description": "User information",
              "allOf": [
                {
                  "$ref": "#/components/schemas/UserResponseDto"
                }
              ]
            },
            "token": {
              "type": "string",
              "example": "jwt-token-string",
              "description": "JWT token for authentication"
            }
          },
          "required": [
            "user",
            "token"
          ]
        },
        "LoginDto": {
          "type": "object",
          "properties": {
            "email": {
              "type": "string",
              "example": "user@example.com",
              "description": "Email address of the existing user account",
              "format": "email"
            },
            "password": {
              "type": "string",
              "example": "securePassword123",
              "description": "Password for the user account"
            }
          },
          "required": [
            "email",
            "password"
          ]
        },
        "LoginResponseDto": {
          "type": "object",
          "properties": {
            "user": {
              "description": "User information",
              "allOf": [
                {
                  "$ref": "#/components/schemas/UserResponseDto"
                }
              ]
            },
            "token": {
              "type": "string",
              "example": "jwt-token-string",
              "description": "JWT token for authentication"
            }
          },
          "required": [
            "user",
            "token"
          ]
        },
        "UserProfileDto": {
          "type": "object",
          "properties": {
            "email": {
              "type": "string",
              "example": "user@example.com",
              "description": "Email address for the user account",
              "format": "email"
            },
            "username": {
              "type": "string",
              "example": "johndoe",
              "description": "Username for the user account (can be changed anytime, no uniqueness required)",
              "minLength": 3,
              "maxLength": 30
            },
            "name": {
              "type": "string",
              "example": "John Doe",
              "description": "Display name for the user account",
              "minLength": 2,
              "maxLength": 50
            }
          },
          "required": [
            "email"
          ]
        },
        "RequestPasswordResetDto": {
          "type": "object",
          "properties": {
            "email": {
              "type": "string",
              "example": "user@example.com",
              "description": "Email address of the user requesting password reset",
              "format": "email"
            }
          },
          "required": [
            "email"
          ]
        },
        "ResetPasswordDto": {
          "type": "object",
          "properties": {
            "password": {
              "type": "string",
              "example": "newSecurePassword123",
              "description": "New password for the account",
              "minLength": 6
            },
            "token": {
              "type": "string",
              "example": "abc123def456",
              "description": "Token received via email for password reset"
            }
          },
          "required": [
            "password",
            "token"
          ]
        },
        "UserRole": {
          "type": "string",
          "description": "Role for the new user (moderator or admin)",
          "enum": [
            "user",
            "moderator",
            "admin"
          ]
        },
        "RegisterModeratorDto": {
          "type": "object",
          "properties": {
            "email": {
              "type": "string",
              "example": "moderator@example.com",
              "description": "Email address for the new moderator/admin account",
              "format": "email"
            },
            "password": {
              "type": "string",
              "example": "securePassword123",
              "description": "Password for the moderator/admin account",
              "minLength": 6,
              "maxLength": 128
            },
            "role": {
              "example": "moderator",
              "$ref": "#/components/schemas/UserRole"
            }
          },
          "required": [
            "email",
            "password",
            "role"
          ]
        },
        "CoordinatesDto": {
          "type": "object",
          "properties": {
            "longitude": {
              "type": "number",
              "example": 37.6173,
              "description": "Longitude coordinate of the place",
              "minimum": -180,
              "maximum": 180
            },
            "latitude": {
              "type": "number",
              "example": 55.7558,
              "description": "Latitude coordinate of the place",
              "minimum": -90,
              "maximum": 90
            }
          },
          "required": [
            "longitude",
            "latitude"
          ]
        },
        "CreatePlaceDto": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "example": "Central Park",
              "description": "Name of the place"
            },
            "description": {
              "type": "string",
              "example": "A beautiful urban park in the center of the city",
              "description": "Description of the place"
            },
            "coordinates": {
              "example": {
                "latitude": 55.7558,
                "longitude": 37.6173
              },
              "description": "Coordinates of the place",
              "allOf": [
                {
                  "$ref": "#/components/schemas/CoordinatesDto"
                }
              ]
            },
            "tagIds": {
              "example": [
                "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "b2c3d4e5-f678-9012-3456-7890abcdef12"
              ],
              "description": "Array of tag IDs to associate with the place (max 10)",
              "maxItems": 10,
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "name",
            "coordinates"
          ]
        },
        "TagResponseDto": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "Unique identifier of the tag"
            },
            "name": {
              "type": "string",
              "example": "Nature",
              "description": "Name of the tag"
            },
            "createdAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the tag was created"
            },
            "updatedAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the tag was last updated"
            }
          },
          "required": [
            "id",
            "name",
            "createdAt",
            "updatedAt"
          ]
        },
        "PlaceResponseDto": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "Unique identifier of the place"
            },
            "name": {
              "type": "string",
              "example": "Central Park",
              "description": "Name of the place"
            },
            "description": {
              "type": "string",
              "example": "A beautiful urban park in the center of the city",
              "description": "Description of the place",
              "nullable": true
            },
            "coordinates": {
              "type": "string",
              "example": "0101000020E6100000E17A14AE474145C08E9D908EC2434340",
              "description": "Geometry coordinates in WKT format"
            },
            "status": {
              "type": "string",
              "example": "approved",
              "enum": [
                "pending",
                "approved",
                "rejected"
              ],
              "description": "Current status of the place"
            },
            "creatorId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "ID of the user who created the place",
              "nullable": true
            },
            "moderatorId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "ID of the moderator who reviewed the place",
              "nullable": true
            },
            "createdAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the place was created"
            },
            "updatedAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the place was last updated"
            },
            "tags": {
              "description": "List of tags associated with the place",
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/TagResponseDto"
              }
            }
          },
          "required": [
            "id",
            "name",
            "description",
            "coordinates",
            "status",
            "creatorId",
            "moderatorId",
            "createdAt",
            "updatedAt",
            "tags"
          ]
        },
        "LocationFilterDto": {
          "type": "object",
          "properties": {
            "latitude": {
              "type": "number",
              "example": 55.7558,
              "description": "Latitude coordinate for location-based search",
              "minimum": -90,
              "maximum": 90
            },
            "longitude": {
              "type": "number",
              "example": 37.6173,
              "description": "Longitude coordinate for location-based search",
              "minimum": -180,
              "maximum": 180
            },
            "radius": {
              "type": "number",
              "example": 1000,
              "description": "Radius in meters for location-based search",
              "minimum": 0
            }
          },
          "required": [
            "latitude",
            "longitude",
            "radius"
          ]
        },
        "PlaceFilterResponseDto": {
          "type": "object",
          "properties": {
            "data": {
              "description": "List of places matching the filter criteria",
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/PlaceResponseDto"
              }
            },
            "meta": {
              "type": "object",
              "example": {
                "page": 1,
                "limit": 10,
                "total": 25,
                "pages": 3
              },
              "description": "Metadata about the pagination and total results"
            }
          },
          "required": [
            "data",
            "meta"
          ]
        },
        "UpdateCoordinatesDto": {
          "type": "object",
          "properties": {
            "2": {
              "type": "object",
              "example": 55.7558,
              "description": "New latitude coordinate of the place",
              "minimum": -90,
              "maximum": 90
            },
            "longitude": {
              "type": "number",
              "example": 37.6173,
              "description": "New longitude coordinate of the place",
              "minimum": -180,
              "maximum": 180
            }
          }
        },
        "UpdatePlaceDto": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "example": "Updated Central Park",
              "description": "New name of the place"
            },
            "description": {
              "type": "string",
              "example": "An updated description of the beautiful urban park",
              "description": "New description of the place"
            },
            "coordinates": {
              "example": {
                "latitude": 55.7558,
                "longitude": 37.6173
              },
              "description": "New coordinates of the place",
              "allOf": [
                {
                  "$ref": "#/components/schemas/UpdateCoordinatesDto"
                }
              ]
            },
            "tagIds": {
              "example": [
                "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "b2c3d4e5-f678-9012-3456-7890abcdef12"
              ],
              "description": "Updated array of tag IDs to associate with the place (max 10)",
              "maxItems": 10,
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        },
        "ApprovePlaceDto": {
          "type": "object",
          "properties": {
            "reason": {
              "type": "string",
              "example": "This location is appropriate and has proper details",
              "description": "Reason for approving the place"
            }
          }
        },
        "CreateTagDto": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "example": "Nature",
              "description": "Name of the tag"
            }
          },
          "required": [
            "name"
          ]
        },
        "UpdateTagDto": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "example": "Updated Tag Name",
              "description": "New name of the tag"
            }
          },
          "required": [
            "name"
          ]
        },
        "CreatePathDto": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "example": "Historic Downtown Walk",
              "description": "Name of the path"
            },
            "description": {
              "type": "string",
              "example": "A scenic walk through the historic downtown area",
              "description": "Description of the path"
            },
            "places": {
              "example": [
                {
                  "placeId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                  "order": 0,
                  "timeAtPlace": 30
                },
                {
                  "placeId": "b2c3d4e5-f678-9012-3456-7890abcdef12",
                  "order": 1,
                  "timeAtPlace": 60
                }
              ],
              "description": "Array of places in the path with their order and time spent",
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "status": {
              "type": "string",
              "example": "draft",
              "description": "Status of the path (draft or published)"
            }
          },
          "required": [
            "name",
            "places"
          ]
        },
        "PathPlaceResponseDto": {
          "type": "object",
          "properties": {
            "pathId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "ID of the path this place belongs to"
            },
            "placeId": {
              "type": "string",
              "example": "b1c2d3e4-f5g6-7890-1234-567890abcdef",
              "description": "ID of the place in the path"
            },
            "order": {
              "type": "number",
              "example": 1,
              "description": "Order of the place in the path"
            },
            "timeSpent": {
              "type": "number",
              "example": 15,
              "description": "Time to spend at this place in minutes"
            },
            "place": {
              "description": "Details of the place in the path",
              "allOf": [
                {
                  "$ref": "#/components/schemas/PlaceResponseDto"
                }
              ]
            }
          },
          "required": [
            "pathId",
            "placeId",
            "order",
            "timeSpent",
            "place"
          ]
        },
        "PathResponseDto": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "Unique identifier of the path"
            },
            "name": {
              "type": "string",
              "example": "Morning Walk",
              "description": "Name of the path"
            },
            "description": {
              "type": "string",
              "example": "A nice morning walk around the park",
              "description": "Description of the path",
              "nullable": true
            },
            "distance": {
              "type": "number",
              "example": 3.5,
              "description": "Distance of the path in kilometers"
            },
            "totalTime": {
              "type": "number",
              "example": 60,
              "description": "Total time of the path in minutes"
            },
            "status": {
              "type": "string",
              "example": "published",
              "enum": [
                "draft",
                "published",
                "archived"
              ],
              "description": "Status of the path"
            },
            "creatorId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "ID of the user who created the path",
              "nullable": true
            },
            "creator": {
              "description": "User who created the path",
              "allOf": [
                {
                  "$ref": "#/components/schemas/UserResponseDto"
                }
              ]
            },
            "pathPlaces": {
              "description": "List of places in the path",
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/PathPlaceResponseDto"
              }
            },
            "createdAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the path was created"
            },
            "updatedAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the path was last updated"
            }
          },
          "required": [
            "id",
            "name",
            "description",
            "distance",
            "totalTime",
            "status",
            "creatorId",
            "creator",
            "pathPlaces",
            "createdAt",
            "updatedAt"
          ]
        },
        "GeneratePathDto": {
          "type": "object",
          "properties": {
            "startPlaceId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "UUID of the starting place"
            },
            "endPlaceId": {
              "type": "string",
              "example": "b2c3d4e5-f678-9012-3456-7890abcdef12",
              "description": "UUID of the ending place"
            },
            "startLatitude": {
              "type": "number",
              "example": 55.7558,
              "description": "Starting latitude coordinate",
              "minimum": -90,
              "maximum": 90
            },
            "startLongitude": {
              "type": "number",
              "example": 37.6173,
              "description": "Starting longitude coordinate",
              "minimum": -180,
              "maximum": 180
            },
            "endLatitude": {
              "type": "number",
              "example": 55.7584,
              "description": "Ending latitude coordinate",
              "minimum": -90,
              "maximum": 90
            },
            "endLongitude": {
              "type": "number",
              "example": 37.6156,
              "description": "Ending longitude coordinate",
              "minimum": -180,
              "maximum": 180
            },
            "includedPlaceIds": {
              "example": [
                "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "b2c3d4e5-f678-9012-3456-7890abcdef12"
              ],
              "description": "Array of place IDs that must be included in the path",
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "tags": {
              "example": [
                "romantic",
                "child-friendly",
                "scenic"
              ],
              "description": "Array of tags to filter places in the path",
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "maxDuration": {
              "type": "number",
              "example": 120,
              "description": "Maximum duration of the path in minutes",
              "minimum": 0
            },
            "maxDistance": {
              "type": "number",
              "example": 5,
              "description": "Maximum distance of the path in kilometers",
              "minimum": 0
            },
            "name": {
              "type": "string",
              "example": "Romantic Evening Walk",
              "description": "Name for the generated path"
            },
            "description": {
              "type": "string",
              "example": "An evening walk with romantic places",
              "description": "Description for the generated path"
            }
          },
          "required": [
            "maxDuration",
            "maxDistance"
          ]
        },
        "PathsListResponseDto": {
          "type": "object",
          "properties": {
            "data": {
              "description": "List of paths matching the criteria",
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/PathResponseDto"
              }
            },
            "meta": {
              "type": "object",
              "example": {
                "page": 1,
                "limit": 10,
                "total": 25,
                "totalPages": 3
              },
              "description": "Pagination metadata"
            }
          },
          "required": [
            "data",
            "meta"
          ]
        },
        "UpdatePathDto": {
          "type": "object",
          "properties": {}
        },
        "SendFriendRequestDto": {
          "type": "object",
          "properties": {
            "receiverId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "UUID of the user receiving the friend request"
            }
          },
          "required": [
            "receiverId"
          ]
        },
        "AcceptFriendRequestDto": {
          "type": "object",
          "properties": {
            "requestId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "UUID of the friend request to accept"
            },
            "status": {
              "type": "string",
              "example": "accepted",
              "description": "Status to set for the friend request",
              "enum": [
                "pending",
                "accepted",
                "rejected",
                "cancelled"
              ]
            }
          },
          "required": [
            "requestId",
            "status"
          ]
        },
        "CreateWalkDto": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string",
              "example": "Evening Stroll in the Park",
              "description": "Title of the walk"
            },
            "description": {
              "type": "string",
              "example": "A relaxing evening walk with friends",
              "description": "Description of the walk"
            },
            "pathId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "ID of the path for this walk"
            },
            "startTime": {
              "type": "string",
              "example": "2023-01-01T18:00:00.000Z",
              "description": "Start time of the walk"
            },
            "endTime": {
              "type": "string",
              "example": "2023-01-01T20:00:00.000Z",
              "description": "End time of the walk"
            },
            "status": {
              "type": "string",
              "example": "planned",
              "description": "Status of the walk",
              "enum": [
                "planned",
                "ongoing",
                "completed",
                "cancelled"
              ]
            },
            "inviteeIds": {
              "example": [
                "b2c3d4e5-f678-9012-3456-7890abcdef12",
                "c3d4e5f6-7890-1234-5678-90abcdef123"
              ],
              "description": "Array of user IDs to invite to the walk",
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "title"
          ]
        },
        "WalkParticipantResponseDto": {
          "type": "object",
          "properties": {
            "walkId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "ID of the walk this participant belongs to"
            },
            "userId": {
              "type": "string",
              "example": "b1c2d3e4-f5g6-7890-1234-567890abcdef",
              "description": "ID of the user participating in the walk"
            },
            "status": {
              "type": "string",
              "example": "confirmed",
              "enum": [
                "pending",
                "confirmed",
                "declined",
                "no_response"
              ],
              "description": "Status of the participant in the walk"
            },
            "joinedAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the participant joined the walk",
              "nullable": true
            },
            "respondedAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the participant responded to the invitation",
              "nullable": true
            },
            "createdAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the participant record was created"
            },
            "attended": {
              "type": "boolean",
              "example": true,
              "description": "Whether the participant attended the walk",
              "nullable": true
            },
            "user": {
              "description": "User information of the participant",
              "allOf": [
                {
                  "$ref": "#/components/schemas/UserResponseDto"
                }
              ]
            }
          },
          "required": [
            "walkId",
            "userId",
            "status",
            "joinedAt",
            "respondedAt",
            "createdAt",
            "attended",
            "user"
          ]
        },
        "WalkResponseDto": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "Unique identifier of the walk"
            },
            "title": {
              "type": "string",
              "example": "Morning Walk",
              "description": "Title of the walk"
            },
            "description": {
              "type": "string",
              "example": "A nice morning walk around the park",
              "description": "Description of the walk",
              "nullable": true
            },
            "pathId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "ID of the path associated with this walk",
              "nullable": true
            },
            "startTime": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T10:00:00.000Z",
              "description": "Start time of the walk",
              "nullable": true
            },
            "endTime": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T11:00:00.000Z",
              "description": "End time of the walk",
              "nullable": true
            },
            "status": {
              "type": "string",
              "example": "planned",
              "enum": [
                "planned",
                "ongoing",
                "completed",
                "cancelled"
              ],
              "description": "Current status of the walk"
            },
            "creatorId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "ID of the user who created the walk"
            },
            "creator": {
              "description": "User who created the walk",
              "allOf": [
                {
                  "$ref": "#/components/schemas/UserResponseDto"
                }
              ]
            },
            "participants": {
              "description": "List of participants in the walk",
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/WalkParticipantResponseDto"
              }
            },
            "createdAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the walk was created"
            },
            "updatedAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the walk was last updated"
            }
          },
          "required": [
            "id",
            "title",
            "description",
            "pathId",
            "startTime",
            "endTime",
            "status",
            "creatorId",
            "creator",
            "participants",
            "createdAt",
            "updatedAt"
          ]
        },
        "WalksListResponseDto": {
          "type": "object",
          "properties": {
            "data": {
              "description": "List of walks matching the criteria",
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/WalkResponseDto"
              }
            },
            "meta": {
              "type": "object",
              "example": {
                "page": 1,
                "limit": 10,
                "total": 25,
                "totalPages": 3
              },
              "description": "Pagination metadata"
            }
          },
          "required": [
            "data",
            "meta"
          ]
        },
        "UpdateWalkDto": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string",
              "example": "Updated Evening Stroll in the Park",
              "description": "Updated title of the walk"
            },
            "description": {
              "type": "string",
              "example": "An updated description of the relaxing evening walk",
              "description": "Updated description of the walk"
            },
            "pathId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "Updated path ID for this walk"
            },
            "startTime": {
              "type": "string",
              "example": "2023-01-01T18:30:00.000Z",
              "description": "Updated start time of the walk"
            },
            "endTime": {
              "type": "string",
              "example": "2023-01-01T20:30:00.000Z",
              "description": "Updated end time of the walk"
            },
            "status": {
              "type": "string",
              "example": "confirmed",
              "description": "Updated status of the walk",
              "enum": [
                "planned",
                "ongoing",
                "completed",
                "cancelled"
              ]
            }
          }
        },
        "InviteParticipantsDto": {
          "type": "object",
          "properties": {
            "userIds": {
              "example": [
                "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "b2c3d4e5-f678-9012-3456-7890abcdef12"
              ],
              "description": "Array of user IDs to invite to the walk",
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "userIds"
          ]
        },
        "RespondToInvitationDto": {
          "type": "object",
          "properties": {
            "status": {
              "type": "string",
              "example": "confirmed",
              "description": "Response to the walk invitation",
              "enum": [
                "pending",
                "confirmed",
                "declined",
                "no_response"
              ]
            }
          },
          "required": [
            "status"
          ]
        },
        "CompleteWalkDto": {
          "type": "object",
          "properties": {
            "activityNotes": {
              "type": "string",
              "example": "Had a great time with the group! The weather was perfect.",
              "description": "Additional notes about the completed walk activity",
              "maxLength": 1000
            },
            "photoUrls": {
              "example": [
                "https://example.com/photo1.jpg",
                "https://example.com/photo2.jpg"
              ],
              "description": "URLs of photos taken during the walk",
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        },
        "NotificationResponseDto": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "Unique identifier of the notification"
            },
            "userId": {
              "type": "string",
              "example": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
              "description": "ID of the user who received the notification"
            },
            "type": {
              "type": "string",
              "example": "friend_request",
              "enum": [
                "friend_request",
                "walk_invitation",
                "place_moderation",
                "system",
                "walk_update",
                "walk_completed"
              ],
              "description": "Type of the notification"
            },
            "title": {
              "type": "string",
              "example": "Friend request received",
              "description": "Title of the notification"
            },
            "message": {
              "type": "string",
              "example": "John Doe sent you a friend request",
              "description": "Message content of the notification"
            },
            "isRead": {
              "type": "boolean",
              "example": false,
              "description": "Whether the notification has been read"
            },
            "createdAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the notification was created"
            },
            "updatedAt": {
              "format": "date-time",
              "type": "string",
              "example": "2023-01-01T00:00:00.000Z",
              "description": "Date when the notification was last updated"
            }
          },
          "required": [
            "id",
            "userId",
            "type",
            "title",
            "message",
            "isRead",
            "createdAt",
            "updatedAt"
          ]
        },
        "BulkReadNotificationsDto": {
          "type": "object",
          "properties": {
            "notificationIds": {
              "example": [
                "a1b2c3d4-e5f6-7890-1234-567890abcdef",
                "b2c3d4e5-f678-9012-3456-7890abcdef12"
              ],
              "description": "Array of notification IDs to mark as read",
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "notificationIds"
          ]
        }
      }
    }
  },
  "customOptions": {
    "persistAuthorization": true,
    "tagsSorter": "alpha",
    "operationsSorter": "alpha"
  }
};
  url = options.swaggerUrl || url
  let urls = options.swaggerUrls
  let customOptions = options.customOptions
  let spec1 = options.swaggerDoc
  let swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (let attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  let ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.initOAuth) {
    ui.initOAuth(customOptions.initOAuth)
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }
  
  window.ui = ui
}

К приложению следующие требования:

- Необходимо реализовать менеджер аккаунтов, где можно добавлять сразу нескольких аккаунтов в приложение, чтобы затем переключаться на нужный. Из каждого аккаунта можно выйти. Для каждого аккаунта проверяется валидность JWT токена по сроку истечения. Если истек, то аккаунт переводится в "замороженное" состояние, при его выборе необходимо залогиниться снова (причем логин в виде почты сам подставляется, изменить ее нельзя), что обновит JWT токен. Если все аккаунты оказались заморожены, при входе пользователь выберет из списка аккаунт, в который хочет войти или нажать на кнопку регистрации. При первом входе или же выходе из всех аккаунтов пользователю показывается экран входа с возможностью зарегистрировать новый аккаунт.
- После входа пользователь попадает на главный Activity, где внизу стандартная для современных андройд-приложений нижняя навигационная панель. Вкладки: карта, маршруты, друзья, профиль.
- На карте отображаются при роли пользователя: все подтвержденные модератором места, предложенные этим пользователем места и отклоненные модератором места этого пользователя. Для ролей модератора и администратора видны все: как подтвержденные, так и на рассмотрении, и отклоненные. Должны быть фильтры для отображения мест по тегам, по статусу (подтвержденные, отклоненные, на рассмотрении). Нажав на маркер места, можно посмотреть его карточку. Должна быть кнопка для добавления нового места. Причем, если добавляет пользователь, статус - на рассмотрении, если добавляет модератор или администратор - место подтверждается сразу. Должна быть кнопка просмотра мест, созданных текущим пользователем. Для администратора и модератора кнопка для списка мест "на рассмотреннии" с фильтрацией по времени, пользователям-создателям, названию и отдаленности от текущего центра карты. При первом заходе на владку карты должен вызываться запрос на получении мест, без использования пагинации. При перемещении карты после окончания перемещения тоже должен делаться запрос. Также должна быть кнопка для создания нового маршрута: пользователь выбирает два места или две координаты (или указывает, что в результате прогулки нужно вернуться в то же место), при желании выбирает теги точек интереса и время, которое он готов потратить на непосредственную ходьбу, после чего генерируется пеший маршрут по улицам карты OpenStreetMap и работает в формате навигатора. Путь отображается. Можно пригласить друзей, им придет уведомление.
- На вкладке маршруты информация о уже пройденных прогулках со списком мест, где был пользователь, а также друзей, с кем пользователь гулял, маршруты можно повторить, можно просмотреть на карте.
- На вкладке друзья - список друзей, возможность добавить и удалить друга, посмотреть друзей друзей.
- На вкладке профиль - информация о пользователе, кнопка для перехода к менеджеру аккаунтов.

Сначала давай составим подробный пошаговый план реализации, а затем, в следующих запросов, будем пошагово созадвать приложение по плану.

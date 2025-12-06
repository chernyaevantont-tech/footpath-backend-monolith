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
  - Friend connections
  - Notifications
  - User profile data
- **Data synchronization** between local and remote databases

#### Backend Infrastructure
The backend uses Redis for caching to improve performance:
- **Session storage**: User session data is cached in Redis for faster authentication
- **User profile caching**: User profile data is cached to reduce database queries
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
- `POST /places` - Create a new place (pending moderation)
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"name": "string", "description": "string", "coordinates": {"latitude": "number", "longitude": "number"}, "tagIds": ["string"]}`
  - Response: `{"id": "string", "name": "string", "description": "string", "coordinates": {"type": "string", "coordinates": ["number"]}, "tagIds": ["string"], "status": "string", "creatorId": "string", "moderatorId": "string", "createdAt": "datetime", "updatedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized)

- `GET /places` - Search for places with filters (radius, tags, status)
  - Headers: `Authorization: Bearer <token>`
  - Query Params: `?name=string&status=string&tagIds[]=string&location={"latitude": "number", "longitude": "number", "radius": "number"}&page=number&limit=number`
  - Response: `{"data": [...], "meta": {"page": "number", "limit": "number", "total": "number", "pages": "number"}}`
  - Error Codes: 401 (Unauthorized)

- `GET /places/{id}` - Get a specific place by ID
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"id": "string", "name": "string", "description": "string", "coordinates": {"type": "string", "coordinates": ["number"]}, "tagIds": ["string"], "status": "string", "creatorId": "string", "moderatorId": "string", "createdAt": "datetime", "updatedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized), 404 (Place not found)

- `PUT /places/{id}` - Update a place (user's own places only)
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"name": "string", "description": "string", "coordinates": {"latitude": "number", "longitude": "number"}}`
  - Response: `{"id": "string", "name": "string", "description": "string", "coordinates": {"type": "string", "coordinates": ["number"]}, "tagIds": ["string"], "status": "string", "creatorId": "string", "moderatorId": "string", "createdAt": "datetime", "updatedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized), 404 (Place not found)

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

#### Friends APIs
- `GET /friends` - Get list of friends
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"data": [{"id": "string", "email": "string", "username": "string", "createdAt": "datetime"}], "count": "number"}`
  - Error Codes: 401 (Unauthorized)

- `POST /friends/requests` - Send friend request
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"receiverId": "string"}`
  - Response: `{"requestId": "string", "senderId": "string", "senderUsername": "string", "senderEmail": "string", "receiverId": "string", "status": "pending", "createdAt": "datetime"}`
  - Error Codes: 401 (Unauthorized), 404 (User not found)

- `POST /friends/requests/{id}/accept` - Accept/decline friend request
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"status": "accepted|declined"}`
  - Response: `{"id": "string", "senderId": "string", "senderUsername": "string", "senderEmail": "string", "receiverId": "string", "status": "accepted|declined", "createdAt": "datetime", "updatedAt": "datetime"}`
  - Error Codes: 401 (Unauthorized), 404 (Request not found)

- `DELETE /friends/{userId}` - Remove friend
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"message": "Friend removed successfully"}`
  - Error Codes: 401 (Unauthorized), 404 (Friend not found)


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

- `GET /paths/{id}` - Get a specific path
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"id": "string", "name": "string", "description": "string", "distance": "number", "totalTime": "number", "places": [...]}`

- `PUT /paths/{id}` - Update a path
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"name": "string", "description": "string"}`
  - Response: `{"id": "string", "name": "string", "description": "string", ...}`
  - Error Codes: 401 (Unauthorized)

- `DELETE /paths/{id}` - Delete a path
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"message": "Path deleted successfully"}`
  - Error Codes: 401 (Unauthorized), 404 (Path not found)

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

- `GET /walks/{id}` - Get a specific walk
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"id": "string", "title": "string", "path": {...}, "status": "string", "participants": [...], "startTime": "datetime", "endTime": "datetime"}`
  - Error Codes: 401 (Unauthorized), 404 (Walk not found)

- `POST /walks/{id}/invite` - Invite friends to a walk
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"userIds": ["string"]}`
  - Response: `{"message": "Invitations sent", "invitations": [...]}`
  - Error Codes: 401 (Unauthorized), 404 (Walk not found)

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

#### Notifications APIs
- `GET /notifications` - Get user notifications
  - Headers: `Authorization: Bearer <token>`
  - Query Params: `?type=string&isRead=boolean&page=number&limit=number`
  - Response: `{"data": [...], "meta": {"page": "number", "limit": "number", "total": "number", "pages": "number"}}`
  - Error Codes: 401 (Unauthorized)

- `POST /notifications/{id}/read` - Mark notification as read
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"id": "string", "isRead": true, "readAt": "datetime"}`
  - Error Codes: 401 (Unauthorized), 404 (Notification not found)

- `POST /notifications/bulk-read` - Mark multiple notifications as read
  - Headers: `Authorization: Bearer <token>`
  - Request Body: `{"notificationIds": ["string"]}`
  - Response: `{"message": "Notifications marked as read", "count": "number"}`
  - Error Codes: 401 (Unauthorized)

- `POST /notifications/mark-all-read` - Mark all notifications as read
  - Headers: `Authorization: Bearer <token>`
  - Response: `{"affected": "number"}`
  - Error Codes: 401 (Unauthorized)

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
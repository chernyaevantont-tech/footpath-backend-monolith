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

## API Integration

### Available APIs

#### Authentication APIs
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile
- `PUT /auth/profile` - Update user profile
- `POST /auth/logout` - User logout
- `POST /auth/request-password-reset` - Password reset request
- `POST /auth/reset-password` - Password reset confirmation

#### Places APIs
- `POST /places` - Create a new place (pending moderation)
- `GET /places` - Search for places with filters (radius, tags, status)
- `GET /places/{id}` - Get a specific place by ID
- `PUT /places/{id}` - Update a place (user's own places only)
- `PUT /places/{id}/approve` - Approve a place (moderator/admin only)
- `PUT /places/{id}/reject` - Reject a place (moderator/admin only)

#### Friends APIs
- `GET /friends` - Get list of friends
- `POST /friends/requests` - Send friend request
- `POST /friends/requests/{id}/accept` - Accept/decline friend request
- `DELETE /friends/{userId}` - Remove friend
- `GET /friends/recommendations` - Get friend recommendations

#### Paths APIs
- `POST /paths/generate` - Generate a path based on criteria
- `POST /paths` - Create a saved path
- `GET /paths` - Get saved paths
- `GET /paths/{id}` - Get a specific path
- `PUT /paths/{id}` - Update a path
- `DELETE /paths/{id}` - Delete a path

#### Walks APIs
- `POST /walks` - Create a new walk
- `GET /walks` - Get list of walks
- `GET /walks/{id}` - Get a specific walk
- `POST /walks/{id}/invite` - Invite friends to a walk
- `POST /walks/{id}/complete` - Complete a walk
- `DELETE /walks/{id}` - Cancel a walk

#### Notifications APIs
- `GET /notifications` - Get user notifications
- `POST /notifications/{id}/read` - Mark notification as read
- `POST /notifications/bulk-read` - Mark multiple notifications as read

#### Recommendations APIs
- `GET /recommendations/places` - Get place recommendations
- `GET /recommendations/paths` - Get path recommendations
- `POST /recommendations/generate-all-embeddings` - Generate embeddings (admin only)

## UI/UX Design Specifications

### Role-Based Interface
The mobile application will have different UI flows based on user role:

#### Regular User Interface
- Map view with searchable POIs
- Friend management
- Path generation and viewing
- Walk creation and participation
- Notifications
- Profile management

#### Moderator Interface (in addition to user features)
- POI moderation queue
- Ability to approve/reject places
- Access to moderation logs

#### Admin Interface (in addition to moderator features)
- Admin dashboard
- User management
- System statistics
- Full moderation capabilities

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
    val ownerId: String,
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
    val createdAt: Date
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
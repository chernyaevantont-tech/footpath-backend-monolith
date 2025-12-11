# Path Generation Algorithm - Implementation Summary

## Overview
Completely refactored the path generation algorithm to support fine-grained user control over walking parameters.

## New Parameters (GeneratePathDto)

### Required Fields:
1. **totalTime** (number, min: 15 minutes)
   - Total walk duration INCLUDING place visits and 15-minute buffer
   - Replaces old `maxDuration` (which was walking time only)

2. **maxDistance** (number, km)
   - Maximum walking distance

3. **walkingSpeed** (number, 2-10 km/h)
   - User's walking speed for personalized time calculations
   - Typical: 5 km/h

### Optional Fields:
4. **maxPlaces** (number, 1-20, default: 10)
   - Maximum number of places to visit

5. **isCircular** (boolean)
   - Whether route should return to starting point

## Algorithm Flow

### 1. Constraint Calculation
```
maxWalkingTime = totalTime - (maxPlaces × 15 min) - 15 min buffer
maxWalkingDistance = maxWalkingTime × walkingSpeed / 60
effectiveMaxDistance = min(userMaxDistance, maxWalkingDistance)
```

### 2. Place Selection (Greedy Algorithm)
- **selectOptimalPlaces()** method uses nearest-neighbor approach:
  1. Start from startPlace or startCoordinates
  2. Iteratively add nearest place that fits constraints
  3. Check distance and time on each iteration
  4. Stop when limits reached or no more places available
  5. Ensure minimum 2 places in result

### 3. Route Generation (OSRM Integration)
- Extract coordinates from selected places
- Call OSRM with foot profile for pedestrian routing
- Get route geometry (GeoJSON) and navigation steps
- Calculate actual metrics from OSRM response

### 4. Time Breakdown Calculation
```typescript
walkingTime = calculateWalkingTime(distance, speed)
timeAtPlaces = numberOfPlaces × 15 minutes
bufferTime = 15 minutes (fixed)
totalTime = walkingTime + timeAtPlaces + bufferTime
```

### 5. Path Entity Creation
- Save Path with:
  - Actual distance from OSRM
  - Calculated total time (with buffer)
  - GeoJSON geometry
  - Navigation steps
  - isCircular flag
  - creatorId

- Save PathPlace relationships with:
  - order (sequence)
  - timeSpent (15 min per place)
  - distanceFromPrevious (from OSRM legs)
  - travelTimeFromPrevious (calculated from distance + speed)

## New Services

### TimeCalculationService
Location: `src/paths/utils/time-calculation.service.ts`

**Constants:**
- DEFAULT_TIME_PER_PLACE = 15 minutes
- BUFFER_TIME = 15 minutes

**Methods:**
1. `calculateWalkingTime(distanceKm, speedKmh)` → minutes
2. `calculateTimeBreakdown(params)` → {walkingTime, timeAtPlaces, bufferTime, totalTime}
3. `calculateMaxWalkingTime(totalTime, places, timePerPlace)` → minutes
4. `calculateMaxDistance(walkingTime, speed)` → km
5. `fitsWithinTimeLimit(distance, places, speed, timeLimit)` → boolean
6. `calculateOptimalPlaceCount(totalTime, maxDistance, speed)` → number

## Database Changes

**No migration required!** TypeORM will automatically synchronize the schema on application startup (via `synchronize: true` in development).

### New Database Fields:

**paths table:**
- `is_circular` (boolean, default: false) - Whether route returns to start
- `geometry` (jsonb, nullable) - GeoJSON LineString from OSRM
- `steps` (jsonb, nullable) - Turn-by-turn navigation instructions

**path_places table:**
- `time_spent` (int, nullable) - Time spent at this place in minutes

## API Changes

### POST /paths/generate

**Old Request:**
```json
{
  "maxDuration": 120,
  "maxDistance": 5
}
```

**New Request:**
```json
{
  "totalTime": 120,
  "maxDistance": 5,
  "walkingSpeed": 5,
  "maxPlaces": 8,
  "isCircular": true,
  "startLatitude": 55.7558,
  "startLongitude": 37.6173
}
```

**Response includes:**
- `isCircular`: boolean
- `geometry`: GeoJSON LineString
- `steps`: Navigation instructions array
- `totalTime`: includes buffer and place visits

## Key Improvements

1. **User Control**: Users now specify exactly how long they want to walk
2. **Place Limit**: Can control number of stops (1-20 places)
3. **Personalized Speed**: Algorithm adapts to individual walking pace
4. **Safety Buffer**: Automatic 15-minute cushion for flexibility
5. **Circular Routes**: Proper support for returning to start
6. **OSRM Integration**: Real pedestrian routes with turn-by-turn navigation
7. **Accurate Metrics**: Distance and time from actual street routing

## Testing Recommendations

1. Test with different totalTime values (30, 60, 120, 180 minutes)
2. Test maxPlaces constraint (1, 5, 10, 20)
3. Test walking speeds (3, 5, 7 km/h)
4. Test circular vs non-circular routes
5. Verify 15-minute buffer is applied
6. Test edge cases (no places found, constraints too strict)
7. Verify OSRM geometry and steps are returned

## Future Enhancements

1. **OSRM Trip API**: Use for better place ordering optimization
2. **Dynamic Time Per Place**: Allow users to specify visit duration
3. **Activity-Based Speed**: Different speeds for different terrains
4. **Multi-Modal**: Combine walking with public transport
5. **Weather Integration**: Adjust timing based on conditions
6. **Elevation**: Factor in hills and stairs
7. **Accessibility**: Routes for wheelchairs, strollers
8. **Preferences**: Avoid busy streets, prefer parks, etc.

## Related Files Modified

- `src/paths/dto/generate-path.dto.ts` - Updated request DTO
- `src/paths/dto/path-response.dto.ts` - Added isCircular field
- `src/paths/entities/path.entity.ts` - Added geometry, steps, isCircular
- `src/paths/entities/path-place.entity.ts` - Added timeSpent
- `src/paths/paths.service.ts` - Complete algorithm rewrite
- `src/paths/paths.controller.ts` - Added userId parameter
- `src/paths/paths.module.ts` - Added TimeCalculationService
- `src/paths/utils/time-calculation.service.ts` - NEW service

**Note:** No migrations needed - TypeORM auto-synchronization will create new fields automatically.

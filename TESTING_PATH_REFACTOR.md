# Testing Instructions for Path Generation Refactor

## Prerequisites
1. Start Docker Desktop
2. Ensure all services are running:
   ```bash
   docker-compose up -d
   ```

## Database Migration

Run the migration to add new fields:
```bash
docker-compose exec app npm run migration:run
```

Or connect to the app container and run:
```bash
docker-compose exec app sh
npm run migration:run
exit
```

## Testing the New API

### Example 1: Simple Circular Walk (60 minutes, 5 places)
```bash
curl -X POST http://localhost:3000/paths/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "startLatitude": 55.7558,
    "startLongitude": 37.6173,
    "totalTime": 60,
    "maxDistance": 3,
    "walkingSpeed": 5,
    "maxPlaces": 5,
    "isCircular": true,
    "tags": ["park", "scenic"],
    "name": "Lunch Break Walk",
    "description": "Quick walk during lunch"
  }'
```

### Example 2: Longer Non-Circular Walk (2 hours, 10 places)
```bash
curl -X POST http://localhost:3000/paths/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "startLatitude": 55.7558,
    "startLongitude": 37.6173,
    "endLatitude": 55.7600,
    "endLongitude": 37.6200,
    "totalTime": 120,
    "maxDistance": 6,
    "walkingSpeed": 4.5,
    "maxPlaces": 10,
    "isCircular": false,
    "name": "Afternoon Exploration"
  }'
```

### Example 3: Fast Walker, Few Stops (45 minutes, 3 places)
```bash
curl -X POST http://localhost:3000/paths/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "startLatitude": 55.7558,
    "startLongitude": 37.6173,
    "totalTime": 45,
    "maxDistance": 4,
    "walkingSpeed": 6,
    "maxPlaces": 3,
    "isCircular": true
  }'
```

## Expected Response Structure

```json
{
  "id": "uuid",
  "name": "Generated Path Name",
  "description": "Description",
  "distance": 3.45,
  "totalTime": 60,
  "status": "draft",
  "isCircular": true,
  "geometry": {
    "type": "LineString",
    "coordinates": [[37.6173, 55.7558], [37.6180, 55.7565], ...]
  },
  "steps": [
    {
      "instruction": "Head north on Main Street",
      "distance": 150,
      "duration": 120,
      "maneuver": {
        "type": "turn",
        "modifier": "left",
        "location": [37.6173, 55.7558]
      }
    }
  ],
  "creatorId": "user-uuid",
  "pathPlaces": [
    {
      "placeId": "place-uuid",
      "order": 0,
      "timeSpent": 15,
      "distanceFromPrevious": 0,
      "travelTimeFromPrevious": 0,
      "place": {
        "id": "place-uuid",
        "name": "Place Name",
        "coordinates": "POINT(...)"
      }
    }
  ],
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

## Validation Tests

### Test 1: Minimum Time Constraint
Should fail with 400 Bad Request (minimum is 15 minutes):
```json
{
  "startLatitude": 55.7558,
  "startLongitude": 37.6173,
  "totalTime": 10,
  "maxDistance": 5,
  "walkingSpeed": 5
}
```

### Test 2: Walking Speed Boundaries
Should fail with 400 Bad Request (speed must be 2-10 km/h):
```json
{
  "startLatitude": 55.7558,
  "startLongitude": 37.6173,
  "totalTime": 60,
  "maxDistance": 5,
  "walkingSpeed": 15
}
```

### Test 3: Max Places Constraint
Should fail with 400 Bad Request (max 20 places):
```json
{
  "startLatitude": 55.7558,
  "startLongitude": 37.6173,
  "totalTime": 300,
  "maxDistance": 20,
  "walkingSpeed": 5,
  "maxPlaces": 25
}
```

### Test 4: No Places Found
Should return 400 with message "No places found matching your criteria":
```json
{
  "startLatitude": 89.0,
  "startLongitude": 0.0,
  "totalTime": 60,
  "maxDistance": 1,
  "walkingSpeed": 5
}
```

## Verification Checklist

- [ ] Migration applied successfully
- [ ] New fields visible in database (is_circular, geometry, steps, time_spent)
- [ ] TimeCalculationService works correctly
- [ ] selectOptimalPlaces() returns valid place arrays
- [ ] OSRM returns geometry and steps
- [ ] totalTime includes buffer (should be ~15 min more than walking + visits)
- [ ] Circular routes return to start point
- [ ] pathPlaces have correct order and timing
- [ ] API validates all parameters correctly
- [ ] Swagger docs updated with new parameters

## Debugging

### Check Logs
```bash
docker-compose logs -f app
```

### Check OSRM Status
```bash
curl http://localhost:5000/health
```

### Check Database
```bash
docker-compose exec postgres psql -U postgres -d footpath
\d paths
\d path_places
```

### Test TimeCalculationService directly
Add test file or use NestJS testing framework to verify calculations:
```typescript
const service = new TimeCalculationService();
const walkingTime = service.calculateWalkingTime(5, 5); // 60 minutes
const breakdown = service.calculateTimeBreakdown({
  distance: 5,
  numberOfPlaces: 5,
  walkingSpeed: 5,
  timePerPlace: 15
});
// breakdown.totalTime should be: 60 + 75 + 15 = 150 minutes
```

## Performance Metrics

Expected response times:
- Place search: < 200ms
- selectOptimalPlaces: < 100ms
- OSRM routing: < 500ms
- Database save: < 100ms
- **Total: < 1000ms for typical request**

## Common Issues

1. **OSRM connection failed**: Ensure OSRM container is running and healthy
2. **No places found**: Check if approved places exist in database
3. **Migration fails**: Check if columns already exist (drop manually if needed)
4. **Time constraints too strict**: Algorithm returns "not enough places" - increase totalTime or maxDistance
5. **Geometry is null**: OSRM request failed - check OSRM logs

## Next Steps

After successful testing:
1. Update ANDROID_PROMPT.md with new API parameters
2. Test with mobile client
3. Consider implementing OSRM Trip API for better optimization
4. Add analytics tracking for generated paths
5. Implement caching for frequently requested routes

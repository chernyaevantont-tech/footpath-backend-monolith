import { Injectable } from '@nestjs/common';
import { Place } from '../../places/entities/place.entity';
import { PathCalculationService, Coordinates, PathSegment } from './path-calculation.service';

@Injectable()
export class AdvancedPathfindingService extends PathCalculationService {
  /**
   * Calculate walking distance considering pedestrian routes (real-world paths)
   * In a real implementation, this would call a routing service API
   * @param coord1 Start coordinate
   * @param coord2 End coordinate
   * @returns Real walking distance in kilometers
   */
  async calculateWalkingDistance(coord1: Coordinates, coord2: Coordinates): Promise<number> {
    // In a real implementation, this would call an external routing service
    // For this implementation, we'll add 10-20% to the straight-line distance to account for 
    // pedestrian routes that are typically longer than straight lines
    const straightLineDistance = this.calculateDistance(coord1, coord2);
    
    // Add 10-20% to account for pedestrian route deviations
    const routeMultiplier = 1.15; // Average pedestrian route is ~15% longer
    return straightLineDistance * routeMultiplier;
  }

  /**
   * Calculate walking time considering pedestrian routes and walking speed
   * Adjusts for pedestrian-specific factors
   * @param distance Walking distance in kilometers
   * @returns Estimated walking time in minutes
   */
  estimateWalkingTime(distance: number): number {
    // Average walking speed is 4-5 km/h, but for sightseeing we'll use 4 km/h (slower pace)
    const walkingSpeed = 4; // km/h for sightseeing walks
    const hours = distance / walkingSpeed;
    return hours * 60; // Convert to minutes
  }

  /**
   * Calculate path segments with pedestrian-aware distances and times
   * @param places Array of places to connect
   * @returns Array of path segments with real walking distances and times
   */
  async calculatePedestrianDistancesBetweenPlaces(places: Place[]): Promise<PathSegment[]> {
    const segments: PathSegment[] = [];
    
    for (let i = 0; i < places.length - 1; i++) {
      const startPlace = places[i];
      const endPlace = places[i + 1];
      
      try {
        const startCoords = this.getCoordinatesFromPlace(startPlace);
        const endCoords = this.getCoordinatesFromPlace(endPlace);
        
        const distance = await this.calculateWalkingDistance(startCoords, endCoords);
        const travelTime = this.estimateWalkingTime(distance);
        
        segments.push({
          startPlaceId: startPlace.id,
          endPlaceId: endPlace.id,
          distance,
          travelTime,
        });
      } catch (error) {
        console.error(`Error calculating walking distance between places ${startPlace.id} and ${endPlace.id}:`, error);
      }
    }
    
    return segments;
  }

  /**
   * Enhanced path metrics calculation with pedestrian-specific considerations
   * @param places Ordered list of places in the path
   * @param timeAtPlaces Time to spend at each place (in minutes)
   * @returns Total distance and time with pedestrian adjustments
   */
  async calculatePedestrianPathMetrics(places: Place[], timeAtPlaces: number[]): Promise<{ totalDistance: number; totalTime: number }> {
    if (places.length < 2) {
      return { totalDistance: 0, totalTime: timeAtPlaces.reduce((sum, time) => sum + time, 0) };
    }

    const segments = await this.calculatePedestrianDistancesBetweenPlaces(places);
    const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
    const totalTravelTime = segments.reduce((sum, segment) => sum + segment.travelTime, 0);
    const totalTimeAtPlaces = timeAtPlaces.reduce((sum, time) => sum + time, 0);
    
    return {
      totalDistance,
      totalTime: totalTravelTime + totalTimeAtPlaces,
    };
  }

  /**
   * Find an optimized path between places considering walking time and points of interest
   * This is a simplified version of TSP (Traveling Salesman Problem) adapted for walking routes
   * @param places Potential places to include in the path
   * @param startPlaceId Optional starting place ID
   * @param endPlaceId Optional ending place ID
   * @param maxDuration Optional maximum duration constraint
   * @param maxDistance Optional maximum distance constraint
   * @returns Optimized sequence of places
   */
  async findOptimalPathSequence(
    places: Place[],
    startPlaceId?: string,
    endPlaceId?: string,
    maxDuration?: number,
    maxDistance?: number
  ): Promise<Place[]> {
    // If we have fewer than 3 places, just return them as is
    if (places.length <= 2) {
      return places;
    }

    // For larger sets, we need to implement a path optimization algorithm
    // This is a simplified greedy approach - in a real system, we'd use a more sophisticated algorithm
    
    // If start/end places are specified, fix those positions
    let fixedStart: Place | undefined;
    let fixedEnd: Place | undefined;
    
    if (startPlaceId) {
      fixedStart = places.find(p => p.id === startPlaceId);
    }
    
    if (endPlaceId) {
      fixedEnd = places.find(p => p.id === endPlaceId);
    }
    
    // Create a list of places without the fixed start/end
    let remainingPlaces = places.filter(p => 
      p.id !== startPlaceId && p.id !== endPlaceId
    );
    
    // If we have a start place, build the path starting from it
    let path: Place[] = [];
    
    if (fixedStart) {
      path.push(fixedStart);
      remainingPlaces = remainingPlaces.filter(p => p.id !== fixedStart?.id);
    }
    
    // Add remaining places in a greedy manner (closest first)
    while (remainingPlaces.length > 0) {
      let nextPlace: Place;
      
      if (path.length === 0) {
        // If path is empty, pick the first one
        nextPlace = remainingPlaces[0];
      } else {
        // Find the closest place to the current end of the path
        const currentEnd = path[path.length - 1];
        let closestPlace = remainingPlaces[0];
        let minDistance = Infinity;
        
        for (const place of remainingPlaces) {
          const currentCoords = this.getCoordinatesFromPlace(currentEnd);
          const placeCoords = this.getCoordinatesFromPlace(place);
          const distance = await this.calculateWalkingDistance(currentCoords, placeCoords);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestPlace = place;
          }
        }
        
        nextPlace = closestPlace;
      }
      
      path.push(nextPlace);
      remainingPlaces = remainingPlaces.filter(p => p.id !== nextPlace.id);
    }
    
    // If we have a fixed end, check if it's at the end of our path, if not, try to add it
    if (fixedEnd) {
      if (path[path.length - 1]?.id !== fixedEnd.id) {
        // If our path doesn't end with the fixed end, we need to handle that
        // For simplicity in this implementation, we'll just move the fixed end to the last position
        path = path.filter(p => p.id !== fixedEnd.id);
        path.push(fixedEnd);
      }
    }
    
    // Check if the path meets the duration/distance constraints
    if ((maxDuration || maxDistance) && path.length > 0) {
      const timeAtPlaces = path.map(() => 60); // Default 60 minutes per place
      
      const metrics = await this.calculatePedestrianPathMetrics(path, timeAtPlaces);
      if ((maxDuration && metrics.totalTime > maxDuration) || (maxDistance && metrics.totalDistance > maxDistance)) {
        // If constraints are exceeded, try to remove some intermediate places
        // For now, we'll just return a shorter path by removing middle elements
        if (path.length > 2) {
          // Keep start and end, but remove middle places until constraints are met
          while (path.length > 2) {
            const reducedPath = [path[0], ...path.slice(1, -1).slice(0, -1), path[path.length - 1]].filter(p => p !== undefined);
            if (reducedPath.length !== path.length) {
              const reducedMetrics = await this.calculatePedestrianPathMetrics(reducedPath, reducedPath.map(() => 60));
              
              if ((maxDuration && reducedMetrics.totalTime <= maxDuration) || 
                  (maxDistance && reducedMetrics.totalDistance <= maxDistance)) {
                return reducedPath;
              }
              path = reducedPath;
            } else {
              break; // No more places to remove
            }
          }
        }
      }
    }
    
    return path;
  }
}
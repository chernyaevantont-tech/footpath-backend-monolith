import { Injectable } from '@nestjs/common';
import { Place } from '../../places/entities/place.entity';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PathSegment {
  startPlaceId: string;
  endPlaceId: string;
  distance: number; // in kilometers
  travelTime: number; // in minutes
}

@Injectable()
export class PathCalculationService {
  /**
   * Calculate the distance between two coordinates using Haversine formula
   * @param coord1 First coordinate
   * @param coord2 Second coordinate
   * @returns Distance in kilometers
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) *
      Math.cos(this.toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  /**
   * Estimate travel time between two coordinates (assumes walking speed of 5 km/h)
   * @param distance Distance in kilometers
   * @returns Estimated travel time in minutes
   */
  estimateTravelTime(distance: number): number {
    const walkingSpeed = 5; // km/h
    const hours = distance / walkingSpeed;
    return hours * 60; // Convert to minutes
  }

  /**
   * Convert degrees to radians
   * @param degrees Degrees to convert
   * @returns Radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get coordinates from a Place entity
   * @param place Place entity
   * @returns Coordinates object
   */
  getCoordinatesFromPlace(place: Place): Coordinates {
    // Handle GeoJSON format from ST_AsGeoJSON (returned as JSON object)
    if (place.coordinates !== null && typeof place.coordinates === 'object') {
      const coords = place.coordinates as any;
      if ('type' in coords && 'coordinates' in coords && Array.isArray(coords.coordinates) && coords.coordinates.length === 2) {
        return {
          longitude: coords.coordinates[0],
          latitude: coords.coordinates[1]
        };
      }
    }
    
    // Fallback: Extract coordinates from PostGIS WKT POINT format: "POINT(longitude latitude)"
    if (typeof place.coordinates === 'string') {
      const match = place.coordinates.match(/POINT\(([-+]?\d*\.?\d+)\s([-+]?\d*\.?\d+)\)/);
      if (match) {
        const longitude = parseFloat(match[1]);
        const latitude = parseFloat(match[2]);
        return { latitude, longitude };
      }
    }
    
    throw new Error(`Could not extract coordinates from place ${place.id}`);
  }

  /**
   * Calculate all distances between places using a simple algorithm
   * In a real application, this would use a routing service API like OSRM or Google Maps
   * @param places Array of places
   * @returns Array of path segments with distances and travel times
   */
  calculateDistancesBetweenPlaces(places: Place[]): PathSegment[] {
    const segments: PathSegment[] = [];
    
    for (let i = 0; i < places.length - 1; i++) {
      const startPlace = places[i];
      const endPlace = places[i + 1];
      
      try {
        const startCoords = this.getCoordinatesFromPlace(startPlace);
        const endCoords = this.getCoordinatesFromPlace(endPlace);
        
        const distance = this.calculateDistance(startCoords, endCoords);
        const travelTime = this.estimateTravelTime(distance);
        
        segments.push({
          startPlaceId: startPlace.id,
          endPlaceId: endPlace.id,
          distance,
          travelTime,
        });
      } catch (error) {
        console.error(`Error calculating distance between places ${startPlace.id} and ${endPlace.id}:`, error);
      }
    }
    
    return segments;
  }

  /**
   * Calculate the total distance and time for a path
   * @param places Ordered list of places in the path
   * @param timeAtPlaces Time to spend at each place (in minutes)
   * @returns Total distance and time
   */
  calculatePathMetrics(places: Place[], timeAtPlaces: number[]): { totalDistance: number; totalTime: number } {
    if (places.length < 2) {
      return { totalDistance: 0, totalTime: timeAtPlaces.reduce((sum, time) => sum + time, 0) };
    }

    const segments = this.calculateDistancesBetweenPlaces(places);
    const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
    const totalTravelTime = segments.reduce((sum, segment) => sum + segment.travelTime, 0);
    const totalTimeAtPlaces = timeAtPlaces.reduce((sum, time) => sum + time, 0);
    
    return {
      totalDistance,
      totalTime: totalTravelTime + totalTimeAtPlaces,
    };
  }
}
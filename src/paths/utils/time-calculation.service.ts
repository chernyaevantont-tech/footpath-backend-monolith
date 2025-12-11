import { Injectable } from '@nestjs/common';

export interface TimeCalculationParams {
  distanceKm: number;
  walkingSpeedKmh: number;
  numberOfPlaces: number;
  timePerPlaceMinutes?: number;
}

export interface TimeBreakdown {
  walkingTime: number; // minutes
  timeAtPlaces: number; // minutes
  bufferTime: number; // minutes (15 min safety buffer)
  totalTime: number; // minutes
}

@Injectable()
export class TimeCalculationService {
  private readonly DEFAULT_TIME_PER_PLACE = 15; // minutes
  private readonly BUFFER_TIME = 15; // minutes
  
  /**
   * Calculate walking time based on distance and speed
   * @param distanceKm Distance in kilometers
   * @param speedKmh Walking speed in km/h
   * @returns Time in minutes
   */
  calculateWalkingTime(distanceKm: number, speedKmh: number): number {
    if (speedKmh <= 0) {
      throw new Error('Walking speed must be positive');
    }
    const hours = distanceKm / speedKmh;
    return Math.ceil(hours * 60);
  }

  /**
   * Calculate total time breakdown for a path
   * @param params Calculation parameters
   * @returns Detailed time breakdown
   */
  calculateTimeBreakdown(params: TimeCalculationParams): TimeBreakdown {
    const walkingTime = this.calculateWalkingTime(
      params.distanceKm,
      params.walkingSpeedKmh,
    );
    
    const timePerPlace = params.timePerPlaceMinutes || this.DEFAULT_TIME_PER_PLACE;
    const timeAtPlaces = params.numberOfPlaces * timePerPlace;
    
    const totalTime = walkingTime + timeAtPlaces + this.BUFFER_TIME;

    return {
      walkingTime,
      timeAtPlaces,
      bufferTime: this.BUFFER_TIME,
      totalTime,
    };
  }

  /**
   * Calculate maximum walking time available given total time and places
   * @param totalTimeMinutes Total time budget in minutes
   * @param numberOfPlaces Number of places to visit
   * @param timePerPlaceMinutes Time to spend at each place
   * @returns Maximum walking time in minutes
   */
  calculateMaxWalkingTime(
    totalTimeMinutes: number,
    numberOfPlaces: number,
    timePerPlaceMinutes: number = this.DEFAULT_TIME_PER_PLACE,
  ): number {
    const timeAtPlaces = numberOfPlaces * timePerPlaceMinutes;
    const maxWalkingTime = totalTimeMinutes - timeAtPlaces - this.BUFFER_TIME;
    
    if (maxWalkingTime <= 0) {
      throw new Error(
        `Insufficient time: need at least ${timeAtPlaces + this.BUFFER_TIME} minutes for ${numberOfPlaces} places`,
      );
    }
    
    return maxWalkingTime;
  }

  /**
   * Calculate maximum distance possible given time budget and speed
   * @param walkingTimeMinutes Available walking time in minutes
   * @param speedKmh Walking speed in km/h
   * @returns Maximum distance in kilometers
   */
  calculateMaxDistance(walkingTimeMinutes: number, speedKmh: number): number {
    const hours = walkingTimeMinutes / 60;
    return hours * speedKmh;
  }

  /**
   * Check if a path fits within time constraints
   * @param pathDistanceKm Path distance in kilometers
   * @param numberOfPlaces Number of places in path
   * @param walkingSpeed Walking speed in km/h
   * @param totalTimeLimit Total time limit in minutes
   * @returns True if path fits, false otherwise
   */
  fitsWithinTimeLimit(
    pathDistanceKm: number,
    numberOfPlaces: number,
    walkingSpeed: number,
    totalTimeLimit: number,
  ): boolean {
    const breakdown = this.calculateTimeBreakdown({
      distanceKm: pathDistanceKm,
      walkingSpeedKmh: walkingSpeed,
      numberOfPlaces,
    });
    
    return breakdown.totalTime <= totalTimeLimit;
  }

  /**
   * Calculate optimal number of places given time and distance constraints
   * @param totalTimeMinutes Total time available
   * @param maxDistanceKm Maximum distance
   * @param walkingSpeed Walking speed in km/h
   * @returns Recommended number of places
   */
  calculateOptimalPlaceCount(
    totalTimeMinutes: number,
    maxDistanceKm: number,
    walkingSpeed: number,
  ): number {
    // Calculate walking time for max distance
    const walkingTime = this.calculateWalkingTime(maxDistanceKm, walkingSpeed);
    
    // Subtract buffer time
    const availableTime = totalTimeMinutes - this.BUFFER_TIME - walkingTime;
    
    if (availableTime <= 0) {
      return 0;
    }
    
    // Calculate how many places we can fit
    const placeCount = Math.floor(availableTime / this.DEFAULT_TIME_PER_PLACE);
    
    return Math.max(0, Math.min(placeCount, 20)); // Cap at 20 places
  }
}

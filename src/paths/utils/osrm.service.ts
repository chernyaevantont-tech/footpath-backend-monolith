import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OSRMCoordinate {
  longitude: number;
  latitude: number;
}

export interface OSRMRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    type: 'LineString';
    coordinates: number[][]; // [longitude, latitude][]
  };
}

export interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
  waypoints: any[];
}

@Injectable()
export class OSRMService {
  private readonly logger = new Logger(OSRMService.name);
  private readonly osrmUrl: string;

  constructor(private configService: ConfigService) {
    this.osrmUrl = this.configService.get<string>('OSRM_URL') || 'http://osrm:5000';
  }

  /**
   * Calculate route between multiple waypoints
   * @param coordinates Array of coordinates [longitude, latitude]
   * @returns Route with geometry (LineString)
   */
  async calculateRoute(coordinates: OSRMCoordinate[]): Promise<OSRMRoute> {
    if (coordinates.length < 2) {
      throw new HttpException(
        'At least 2 coordinates are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Build OSRM URL: /route/v1/foot/lon1,lat1;lon2,lat2;...
    const coordinatesString = coordinates
      .map(coord => `${coord.longitude},${coord.latitude}`)
      .join(';');

    const url = `${this.osrmUrl}/route/v1/foot/${coordinatesString}?overview=full&geometries=geojson&steps=false`;

    this.logger.log(`Requesting OSRM route: ${url}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new HttpException(
          `OSRM service error: ${response.statusText}`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const data: OSRMResponse = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        this.logger.warn(`OSRM returned no routes. Response code: ${data.code}`);
        throw new HttpException(
          'No route found between these points',
          HttpStatus.NOT_FOUND,
        );
      }

      const route = data.routes[0];

      this.logger.log(
        `Route calculated: ${(route.distance / 1000).toFixed(2)} km, ${(route.duration / 60).toFixed(0)} min`,
      );

      return route;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.name === 'AbortError') {
        this.logger.error('OSRM request timeout after 10 seconds');
        throw new HttpException(
          'Route calculation timeout',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      this.logger.error(`Failed to calculate route: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to calculate route. OSRM service may be starting up.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Health check for OSRM service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.osrmUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      this.logger.warn(`OSRM health check failed: ${error.message}`);
      return false;
    }
  }
}

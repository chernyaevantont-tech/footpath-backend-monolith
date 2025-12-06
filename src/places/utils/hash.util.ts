import { createHash } from 'crypto';
import { Place } from '../entities/place.entity';
import { Tag } from '../entities/tag.entity';

/**
 * Generates a content hash for a Place entity based on its significant fields.
 * This hash is used by mobile clients to detect changes without comparing all fields.
 * 
 * @param place - The Place entity to hash
 * @returns MD5 hash string representing the place's content
 */
export function generatePlaceContentHash(place: Partial<Place>): string {
  // Extract coordinates from geometry string (POINT(lng lat) or GeoJSON)
  let coordinatesString = '';
  
  if (place.coordinates) {
    if (typeof place.coordinates === 'string') {
      // Handle WKT format: POINT(lng lat)
      coordinatesString = place.coordinates;
    } else if (typeof place.coordinates === 'object') {
      // Handle GeoJSON format
      const geoJson = place.coordinates as any;
      if (geoJson.coordinates) {
        coordinatesString = JSON.stringify(geoJson.coordinates);
      }
    }
  }

  // Sort tags by ID to ensure consistent hash regardless of order
  const sortedTagIds = place.tags 
    ? place.tags
        .map(tag => typeof tag === 'string' ? tag : tag.id)
        .sort()
        .join(',')
    : '';

  // Create a string representation of all significant fields
  const contentString = [
    place.name || '',
    place.description || '',
    place.status || '',
    coordinatesString,
    sortedTagIds,
    place.updatedAt ? place.updatedAt.toISOString() : '',
  ].join('|');

  // Generate MD5 hash
  return createHash('md5')
    .update(contentString)
    .digest('hex');
}

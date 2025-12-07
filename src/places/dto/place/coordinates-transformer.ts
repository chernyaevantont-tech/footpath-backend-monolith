import { TransformFnParams } from 'class-transformer';

/**
 * Transforms coordinates from array [latitude, longitude] to object {latitude, longitude}
 * Also accepts object format {latitude, longitude}
 */
export function transformCoordinates({ value }: TransformFnParams) {
  // Handle array format [latitude, longitude]
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      return {
        latitude: value[0],
        longitude: value[1],
      };
    }
    throw new Error('Coordinates array must contain exactly 2 numbers [latitude, longitude]');
  }
  
  // Handle object format {latitude, longitude}
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  
  return value;
}

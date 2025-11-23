import { ValueTransformer } from 'typeorm';

/**
 * Transformer for vector data type
 * Handles conversion between database JSON and JavaScript array
 */
export class VectorTransformer implements ValueTransformer {
  /**
   * Transform from database value to entity value (array of numbers)
   */
  from(databaseValue: string | number[]): number[] {
    if (!databaseValue) {
      return [];
    }

    if (Array.isArray(databaseValue)) {
      return databaseValue;
    }

    // For simple-json type, the database value is a JSON string
    try {
      const parsed = JSON.parse(databaseValue);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (error) {
      // If JSON parsing fails, return empty array
      return [];
    }
  }

  /**
   * Transform from entity value to database value (JSON string)
   */
  to(entityValue: number[]): string {
    if (!entityValue || !Array.isArray(entityValue)) {
      return JSON.stringify([]);
    }

    // Convert array to JSON string
    return JSON.stringify(entityValue);
  }
}
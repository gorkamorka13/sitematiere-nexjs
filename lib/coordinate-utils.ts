/**
 * Coordinate Conversion Utilities
 * Provides functions to convert between decimal degrees and DMS (Degrees, Minutes, Seconds)
 */

export interface DMSCoordinate {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: 'N' | 'S' | 'E' | 'W';
}

/**
 * Convert decimal degrees to DMS format
 * @param decimal - The decimal coordinate value
 * @param isLatitude - True for latitude (N/S), false for longitude (E/W)
 * @returns Formatted DMS string (e.g., "8° 27' 56.52\" N")
 */
export function decimalToDMS(decimal: number, isLatitude: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);

  let direction: 'N' | 'S' | 'E' | 'W';
  if (isLatitude) {
    direction = decimal >= 0 ? 'N' : 'S';
  } else {
    direction = decimal >= 0 ? 'E' : 'W';
  }

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

/**
 * Parse a DMS string and convert to decimal degrees
 * @param dmsString - DMS string (e.g., "8° 27' 56.52\" N" or "8 27 56.52 N")
 * @returns Decimal coordinate value
 */
export function dmsToDecimal(dmsString: string): number {
  // Remove extra spaces and normalize
  const normalized = dmsString.trim().replace(/\s+/g, ' ');

  // Match patterns like: "8° 27' 56.52" N" or "8 27 56.52 N"
  const regex = /(-?\d+)[°\s]+(\d+)['′\s]+(\d+\.?\d*)[\"″\s]*([NSEW])?/i;
  const match = normalized.match(regex);

  if (!match) {
    throw new Error(`Invalid DMS format: ${dmsString}`);
  }

  const degrees = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseFloat(match[3]);
  const direction = match[4]?.toUpperCase();

  let decimal = degrees + minutes / 60 + seconds / 3600;

  // Apply direction
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Parse a DMS string into its components
 * @param dmsString - DMS string to parse
 * @returns Object with degrees, minutes, seconds, and direction
 */
export function parseDMS(dmsString: string): DMSCoordinate {
  const normalized = dmsString.trim().replace(/\s+/g, ' ');
  const regex = /(-?\d+)[°\s]+(\d+)['′\s]+(\d+\.?\d*)[\"″\s]*([NSEW])?/i;
  const match = normalized.match(regex);

  if (!match) {
    throw new Error(`Invalid DMS format: ${dmsString}`);
  }

  const degrees = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseFloat(match[3]);
  const direction = (match[4]?.toUpperCase() || 'N') as 'N' | 'S' | 'E' | 'W';

  return { degrees, minutes, seconds, direction };
}

/**
 * Format DMS components into a string
 * @param degrees - Degrees value
 * @param minutes - Minutes value
 * @param seconds - Seconds value
 * @param direction - Cardinal direction (N, S, E, W)
 * @returns Formatted DMS string
 */
export function formatDMS(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: 'N' | 'S' | 'E' | 'W'
): string {
  return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`;
}

/**
 * Validate latitude value
 * @param lat - Latitude value to validate
 * @returns True if valid, false otherwise
 */
export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude value
 * @param lng - Longitude value to validate
 * @returns True if valid, false otherwise
 */
export function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

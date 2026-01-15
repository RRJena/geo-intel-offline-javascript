/**
 * Geohash encoding and decoding for spatial indexing.
 * 
 * Geohash is a geocoding system that encodes latitude/longitude into a string.
 * We use it to create a spatial index for fast candidate country filtering.
 * 
 * Design Decision: Using precision level 6 (32-bit geohash) as a balance:
 * - Precision ~1.2km × 0.6km (sufficient for country-level resolution)
 * - Small index size (~200 countries × few geohashes each)
 * - Fast encoding/decoding operations
 */

// Base32 encoding used by geohash
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

// Geohash precision for indexing (6 chars = ~1.2km precision)
export const GEOHASH_PRECISION = 6;

export interface GeohashBounds {
  latRange: [number, number];
  lonRange: [number, number];
}

/**
 * Encode latitude/longitude to geohash string.
 * 
 * @param lat - Latitude (-90 to 90)
 * @param lon - Longitude (-180 to 180)
 * @param precision - Number of geohash characters (default 6)
 * @returns Geohash string
 */
export function encode(lat: number, lon: number, precision: number = GEOHASH_PRECISION): string {
  if (lat < -90 || lat > 90) {
    throw new Error(`Latitude must be between -90 and 90, got ${lat}`);
  }
  if (lon < -180 || lon > 180) {
    throw new Error(`Longitude must be between -180 and 180, got ${lon}`);
  }

  let latRange: [number, number] = [-90.0, 90.0];
  let lonRange: [number, number] = [-180.0, 180.0];
  const bitsPerChar = 5;
  const geohash: string[] = [];
  
  let ch = 0;
  
  for (let i = 0; i < precision * bitsPerChar; i++) {
    if (i % 2 === 0) {
      // Longitude bit
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (lon >= mid) {
        ch |= (1 << (bitsPerChar - 1 - Math.floor(i / 2) % bitsPerChar));
        lonRange = [mid, lonRange[1]];
      } else {
        lonRange = [lonRange[0], mid];
      }
    } else {
      // Latitude bit
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat >= mid) {
        ch |= (1 << (bitsPerChar - 1 - Math.floor(i / 2) % bitsPerChar));
        latRange = [mid, latRange[1]];
      } else {
        latRange = [latRange[0], mid];
      }
    }
    
    if ((i + 1) % bitsPerChar === 0) {
      geohash.push(BASE32[ch]);
      ch = 0;
    }
  }
  
  return geohash.join('');
}

/**
 * Decode geohash string to latitude/longitude with bounding box.
 * 
 * @param geohash - Geohash string
 * @returns Object with lat, lon, latRange, lonRange
 */
export function decode(geohash: string): { lat: number; lon: number; latRange: [number, number]; lonRange: [number, number] } {
  if (!geohash) {
    throw new Error("Geohash cannot be empty");
  }

  let latRange: [number, number] = [-90.0, 90.0];
  let lonRange: [number, number] = [-180.0, 180.0];
  let isEven = true;
  
  for (const char of geohash) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) {
      throw new Error(`Invalid geohash character: ${char}`);
    }
    
    for (let j = 0; j < 5; j++) {
      const bit = (idx >> (4 - j)) & 1;
      if (isEven) {
        const mid = (lonRange[0] + lonRange[1]) / 2;
        if (bit) {
          lonRange = [mid, lonRange[1]];
        } else {
          lonRange = [lonRange[0], mid];
        }
      } else {
        const mid = (latRange[0] + latRange[1]) / 2;
        if (bit) {
          latRange = [mid, latRange[1]];
        } else {
          latRange = [latRange[0], mid];
        }
      }
      isEven = !isEven;
    }
  }
  
  const lat = (latRange[0] + latRange[1]) / 2;
  const lon = (lonRange[0] + lonRange[1]) / 2;
  
  return { lat, lon, latRange, lonRange };
}

/**
 * Get 8 neighboring geohashes (for border cases).
 * 
 * Design Decision: Check neighbors when point-in-polygon fails.
 * This handles edge cases where a point is near geohash boundaries.
 * 
 * @param geohash - Geohash string
 * @returns List of 8 neighboring geohashes
 */
export function getNeighbors(geohash: string): string[] {
  const { lat, lon, latRange, lonRange } = decode(geohash);
  
  // Calculate step size from precision
  const latStep = latRange[1] - latRange[0];
  const lonStep = lonRange[1] - lonRange[0];
  
  const neighbors: string[] = [];
  for (const dlat of [-latStep, 0, latStep]) {
    for (const dlon of [-lonStep, 0, lonStep]) {
      if (dlat === 0 && dlon === 0) {
        continue;
      }
      let newLat = lat + dlat;
      let newLon = lon + dlon;
      
      // Clamp to valid ranges
      newLat = Math.max(-90, Math.min(90, newLat));
      newLon = Math.max(-180, Math.min(180, newLon));
      
      neighbors.push(encode(newLat, newLon, geohash.length));
    }
  }
  
  return neighbors;
}

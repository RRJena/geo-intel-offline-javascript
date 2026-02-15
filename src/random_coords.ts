/**
 * Random coordinate generation module.
 * 
 * This module provides functionality to generate random coordinates within:
 * - Countries (by name or ISO code)
 * - Continents
 * - Circular areas (by center point and radius)
 * 
 * Features:
 * - Uniform distribution across regions
 * - Point-in-polygon validation
 * - Support for multi-polygon regions (islands, territories)
 * - Reproducible results with seed support
 */

import { Point, pointInPolygonWithHoles } from './pip';
import { calculateBoundingBox } from './utils/polygon';

/**
 * Result object for random coordinate generation.
 */
export class RandomCoordinateResult {
  coordinates: [number, number][];
  region: string;
  regionType: 'country' | 'continent' | 'area';
  totalRequested: number;
  totalGenerated: number;

  constructor(
    coordinates: [number, number][],
    region: string,
    regionType: 'country' | 'continent' | 'area',
    totalRequested: number,
    totalGenerated: number
  ) {
    this.coordinates = coordinates;
    this.region = region;
    this.regionType = regionType;
    this.totalRequested = totalRequested;
    this.totalGenerated = totalGenerated;
  }

  toDict(): Record<string, any> {
    return {
      coordinates: this.coordinates,
      region: this.region,
      region_type: this.regionType,
      total_requested: this.totalRequested,
      total_generated: this.totalGenerated
    };
  }

  toString(): string {
    return `RandomCoordinateResult(region=${this.region}, type=${this.regionType}, generated=${this.totalGenerated}/${this.totalRequested})`;
  }
}

/**
 * Simple seeded random number generator for reproducibility.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) % 2 ** 32;
    return this.seed / 2 ** 32;
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}

/**
 * Detect if region is a country or continent.
 * 
 * @param region - Region name or ISO code
 * @param resolveFn - Optional resolve function for country detection
 * @returns 'country' or 'continent'
 */
async function detectRegionType(
  region: string,
  resolveFn?: (input: string) => Promise<{ latitude: number | null; longitude: number | null }>
): Promise<'country' | 'continent'> {
  // Check if it's a known continent
  const knownContinents = new Set([
    'africa', 'asia', 'europe', 'north america', 'south america',
    'oceania', 'antarctica', 'australia'
  ]);

  if (knownContinents.has(region.toLowerCase().trim())) {
    return 'continent';
  }

  // Try resolving as country first
  if (resolveFn) {
    try {
      const result = await resolveFn(region);
      if (result.latitude !== null && result.longitude !== null) {
        return 'country';
      }
    } catch (e) {
      // Not a country, try continent
    }
  }

  // Default to country (will fail later if invalid)
  return 'country';
}

/**
 * Calculate combined bounding box for multiple polygons.
 * 
 * @param polygons - List of (exterior, holes) tuples
 * @returns Tuple of (min_lat, max_lat, min_lon, max_lon)
 */
function calculateBoundingBoxForPolygons(
  polygons: [Point[], Point[][]][]
): [number, number, number, number] {
  if (polygons.length === 0) {
    throw new Error('No polygons provided');
  }

  let minLat = 90.0;
  let maxLat = -90.0;
  let minLon = 180.0;
  let maxLon = -180.0;

  for (const [exterior] of polygons) {
    if (exterior.length === 0) {
      continue;
    }

    const bbox = calculateBoundingBox(exterior);
    const [polyMinLat, polyMaxLat, polyMinLon, polyMaxLon] = bbox;

    minLat = Math.min(minLat, polyMinLat);
    maxLat = Math.max(maxLat, polyMaxLat);
    minLon = Math.min(minLon, polyMinLon);
    maxLon = Math.max(maxLon, polyMaxLon);
  }

  return [minLat, maxLat, minLon, maxLon];
}

/**
 * Generate a single random coordinate within polygons using rejection sampling.
 * 
 * @param polygons - List of (exterior, holes) tuples
 * @param boundingBox - (min_lat, max_lat, min_lon, max_lon)
 * @param random - Random number generator
 * @param maxAttempts - Maximum number of attempts before giving up
 * @returns Tuple of [lat, lon] or null if generation failed
 */
function generateSingleCoordinateInPolygons(
  polygons: [Point[], Point[][]][],
  boundingBox: [number, number, number, number],
  random: SeededRandom,
  maxAttempts: number = 1000
): [number, number] | null {
  const [minLat, maxLat, minLon, maxLon] = boundingBox;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random point in bounding box
    const lat = random.uniform(minLat, maxLat);
    const lon = random.uniform(minLon, maxLon);
    const point: Point = [lat, lon];

    // Check if point is in any polygon
    for (const [exterior, holes] of polygons) {
      if (pointInPolygonWithHoles(point, exterior, holes.length > 0 ? holes : undefined)) {
        return [lat, lon];
      }
    }
  }

  // Failed to generate after max_attempts
  return null;
}

/**
 * Convert meters to degrees, accounting for Earth's curvature.
 * 
 * @param meters - Distance in meters
 * @param latitude - Latitude for longitude conversion (degrees)
 * @returns Approximate distance in degrees
 */
function metersToDegrees(meters: number, latitude: number): number {
  // Average degree size (latitude)
  // 1 degree latitude ≈ 111,000 meters everywhere
  const degreesLat = meters / 111000.0;

  // For longitude, account for latitude
  // 1 degree longitude ≈ 111,000 * cos(latitude) meters
  const latRad = (latitude * Math.PI) / 180;
  const degreesLon = meters / (111000.0 * Math.abs(Math.cos(latRad)));

  // Return average (for circular area, use the larger value to ensure coverage)
  return Math.max(degreesLat, degreesLon);
}

/**
 * Generate random coordinate within circle using polar coordinates.
 * 
 * @param center - Center point [lat, lon]
 * @param radiusDeg - Radius in degrees
 * @param random - Random number generator
 * @returns Random coordinate [lat, lon] within the circle
 */
function generateCoordinateInCircle(
  center: [number, number],
  radiusDeg: number,
  random: SeededRandom
): [number, number] {
  const [centerLat, centerLon] = center;

  // Generate random angle and distance
  const angle = random.uniform(0, 2 * Math.PI);

  // For uniform distribution in circle, use sqrt of uniform random for radius
  // (simple uniform r would cluster points near center)
  const r = Math.sqrt(random.next()) * radiusDeg;

  // Convert polar to lat/lon offset
  // Approximate: treat as flat plane (good for small radii)
  const latOffset = r * Math.cos(angle);
  let lonOffset = r * Math.sin(angle);

  // Account for longitude convergence at poles
  // Longitude degrees get smaller as we move away from equator
  const latRad = (centerLat * Math.PI) / 180;
  if (Math.abs(Math.cos(latRad)) > 0.01) {
    lonOffset = lonOffset / Math.abs(Math.cos(latRad));
  }

  // Calculate new coordinates
  let newLat = centerLat + latOffset;
  let newLon = centerLon + lonOffset;

  // Normalize coordinates
  newLat = Math.max(-90.0, Math.min(90.0, newLat));
  newLon = ((newLon + 180.0) % 360.0) - 180.0;

  return [newLat, newLon];
}

/**
 * Generate random coordinates within a country or continent.
 * 
 * Uses rejection sampling: generates random points in the bounding box
 * and validates them using point-in-polygon checks. This ensures all
 * generated coordinates are actually within the region.
 * 
 * @param region - Country name, ISO code, or continent name
 * @param count - Number of coordinates to generate
 * @param options - Configuration options
 * @param options.regionType - 'country' or 'continent' (auto-detected if undefined)
 * @param options.seed - Random seed for reproducibility
 * @param options.maxAttempts - Maximum attempts per coordinate (default: 1000)
 * @param options.getPolygons - Function to get polygons for region
 * @returns RandomCoordinateResult with generated coordinates
 * @throws {Error} If region is invalid or cannot generate enough coordinates
 * 
 * @example
 * ```typescript
 * // Generate 10 random coordinates in United States
 * const result = await generateRandomCoordinatesByRegion("United States", 10, {
 *   getPolygons: async (region, type) => {
 *     // Implementation to get polygons
 *     return polygons;
 *   }
 * });
 * console.log(`Generated ${result.totalGenerated} coordinates`);
 * ```
 */
export async function generateRandomCoordinatesByRegion(
  region: string,
  count: number,
  options: {
    regionType?: 'country' | 'continent';
    seed?: number;
    maxAttempts?: number;
    getPolygons: (region: string, type: 'country' | 'continent') => Promise<[Point[], Point[][]][]>;
  }
): Promise<RandomCoordinateResult> {
  if (count <= 0) {
    throw new Error(`Count must be positive, got ${count}`);
  }

  const {
    regionType,
    seed,
    maxAttempts = 1000,
    getPolygons
  } = options;

  // Initialize random number generator
  const random = new SeededRandom(seed !== undefined ? seed : Math.floor(Math.random() * 2 ** 32));

  // Determine region type if not specified
  const finalRegionType = regionType || await detectRegionType(region);

  // Get polygon data for region
  const polygons = await getPolygons(region, finalRegionType);

  if (polygons.length === 0) {
    throw new Error(`No polygons found for region: ${region}`);
  }

  // Calculate bounding box for efficient generation
  const boundingBox = calculateBoundingBoxForPolygons(polygons);

  // Generate random coordinates
  const coordinates: [number, number][] = [];
  let failedCount = 0;

  for (let i = 0; i < count; i++) {
    const coord = generateSingleCoordinateInPolygons(polygons, boundingBox, random, maxAttempts);
    if (coord) {
      coordinates.push(coord);
    } else {
      failedCount++;
      // If too many failures, raise error
      if (failedCount > count * 0.5) {
        // More than 50% failure rate
        throw new Error(
          `Failed to generate coordinates for region '${region}'. ` +
          `Only generated ${coordinates.length}/${count} coordinates. ` +
          `This may indicate the region is too small or complex. ` +
          `Try increasing maxAttempts or using a different region.`
        );
      }
    }
  }

  return new RandomCoordinateResult(
    coordinates,
    region,
    finalRegionType,
    count,
    coordinates.length
  );
}

/**
 * Generate random coordinates within a circular area.
 * 
 * Uses polar coordinate generation with uniform distribution to ensure
 * coordinates are evenly distributed within the circular area.
 * 
 * @param center - Center point [latitude, longitude]
 * @param radius - Radius of the circular area
 * @param count - Number of coordinates to generate
 * @param options - Configuration options
 * @param options.radiusUnit - Unit for radius ('m', 'km', 'mile', 'degree') (default: 'm')
 * @param options.seed - Random seed for reproducibility
 * @returns RandomCoordinateResult with generated coordinates
 * @throws {Error} If inputs are invalid
 * 
 * @example
 * ```typescript
 * // Generate 10 random coordinates within 10km of NYC
 * const result = generateRandomCoordinatesByArea(
 *   [40.7128, -74.0060],  // NYC
 *   10,  // 10 km
 *   10,
 *   { radiusUnit: 'km', seed: 42 }
 * );
 * console.log(`Generated ${result.totalGenerated} coordinates`);
 * ```
 */
export function generateRandomCoordinatesByArea(
  center: [number, number],
  radius: number,
  count: number,
  options: {
    radiusUnit?: 'm' | 'km' | 'mile' | 'degree';
    seed?: number;
  } = {}
): RandomCoordinateResult {
  if (count <= 0) {
    throw new Error(`Count must be positive, got ${count}`);
  }

  if (center[0] < -90 || center[0] > 90 || center[1] < -180 || center[1] > 180) {
    throw new Error(
      `Invalid center coordinates: [${center[0]}, ${center[1]}]. ` +
      `Latitude must be -90 to 90, longitude must be -180 to 180.`
    );
  }

  if (radius < 0) {
    throw new Error(`Radius must be non-negative, got ${radius}`);
  }

  const {
    radiusUnit = 'm',
    seed
  } = options;

  // Initialize random number generator
  const random = new SeededRandom(seed !== undefined ? seed : Math.floor(Math.random() * 2 ** 32));

  // Convert radius to degrees
  let radiusDeg: number;
  if (radiusUnit === 'degree') {
    radiusDeg = radius;
  } else {
    // Convert to meters first
    let radiusM: number;
    if (radiusUnit === 'm') {
      radiusM = radius;
    } else if (radiusUnit === 'km') {
      radiusM = radius * 1000.0;
    } else if (radiusUnit === 'mile') {
      radiusM = radius * 1609.34;
    } else {
      throw new Error(
        `Unknown radiusUnit: ${radiusUnit}. ` +
        `Supported: 'm', 'km', 'mile', 'degree'`
      );
    }

    // Convert meters to degrees
    radiusDeg = metersToDegrees(radiusM, center[0]);
  }

  // Generate random coordinates
  const coordinates: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const coord = generateCoordinateInCircle(center, radiusDeg, random);
    coordinates.push(coord);
  }

  return new RandomCoordinateResult(
    coordinates,
    `Area around (${center[0]}, ${center[1]})`,
    'area',
    count,
    coordinates.length
  );
}

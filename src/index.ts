/**
 * Public API for geo-intel-offline library.
 * 
 * Clean, simple interface that hides implementation details.
 */

import { resolve as _resolve, ResolutionResult } from './resolver';
import { resolveByCountry as _resolveByCountry, ReverseResolutionResult } from './resolver/reverse';
import { DataLoader, getLoader } from './data/loader';

/**
 * Result object for geo-intelligence resolution (forward geocoding).
 * 
 * Provides both dictionary-like access and attribute access.
 */
export class GeoIntelResult {
  private _result: ResolutionResult;

  constructor(result: ResolutionResult) {
    this._result = result;
  }

  get country(): string | null {
    return this._result.countryName;
  }

  get iso2(): string | null {
    return this._result.iso2;
  }

  get iso3(): string | null {
    return this._result.iso3;
  }

  get continent(): string | null {
    return this._result.continent;
  }

  get timezone(): string | null {
    return this._result.timezone;
  }

  get confidence(): number {
    return this._result.confidence;
  }

  toDict(): Record<string, any> {
    // ResolutionResult is an interface, so we construct the dict manually
    return {
      country: this._result.countryName,
      iso2: this._result.iso2,
      iso3: this._result.iso3,
      continent: this._result.continent,
      timezone: this._result.timezone,
      confidence: this._result.confidence
    };
  }

  toString(): string {
    return `GeoIntelResult(country=${this.country}, iso2=${this.iso2}, iso3=${this.iso3}, confidence=${this.confidence.toFixed(2)})`;
  }
}

/**
 * Result object for reverse geo-intelligence resolution.
 * 
 * Provides both dictionary-like access and attribute access.
 */
export class ReverseGeoIntelResult {
  private _result: ReverseResolutionResult;

  constructor(result: ReverseResolutionResult) {
    this._result = result;
  }

  get latitude(): number | null {
    return this._result.latitude;
  }

  get longitude(): number | null {
    return this._result.longitude;
  }

  get country(): string | null {
    return this._result.countryName;
  }

  get iso2(): string | null {
    return this._result.iso2;
  }

  get iso3(): string | null {
    return this._result.iso3;
  }

  get continent(): string | null {
    return this._result.continent;
  }

  get timezone(): string | null {
    return this._result.timezone;
  }

  get confidence(): number {
    return this._result.confidence;
  }

  toDict(): Record<string, any> {
    // ReverseResolutionResult is an interface, so we construct the dict manually
    return {
      latitude: this._result.latitude,
      longitude: this._result.longitude,
      country: this._result.countryName,
      iso2: this._result.iso2,
      iso3: this._result.iso3,
      continent: this._result.continent,
      timezone: this._result.timezone,
      confidence: this._result.confidence
    };
  }

  toString(): string {
    return `ReverseGeoIntelResult(country=${this.country}, lat=${this.latitude}, lon=${this.longitude}, iso2=${this.iso2})`;
  }
}

/**
 * Resolve coordinates to geo-intelligence (forward geocoding) or country to coordinates (reverse geocoding).
 * 
 * This unified function automatically detects the mode based on parameters:
 * 
 * **Forward Geocoding** (Coordinates → Country):
 *     Pass two numeric arguments: resolve(lat, lon)
 *     Example: resolve(40.7128, -74.0060)
 * 
 * **Reverse Geocoding** (Country → Coordinates):
 *     Pass one string argument: resolve("United States") or resolve("US")
 *     Example: resolve("United States")
 * 
 * @param args - 
 *     - For forward geocoding: (lat: number, lon: number)
 *     - For reverse geocoding: (country: string)
 * @param options - Optional configuration
 * @param options.dataDir - Optional custom data directory path (Node.js only)
 * @param options.loader - Optional pre-configured loader instance
 * @returns 
 *     - GeoIntelResult for forward geocoding (when lat/lon provided)
 *     - ReverseGeoIntelResult for reverse geocoding (when country string provided)
 * 
 * @example
 * Forward geocoding (coordinates → country):
 * ```typescript
 * const result = await resolve(40.7128, -74.0060); // New York
 * console.log(result.country); // "United States of America"
 * console.log(result.iso2); // "US"
 * ```
 * 
 * @example
 * Reverse geocoding (country → coordinates):
 * ```typescript
 * const result = await resolve("United States");
 * console.log(result.latitude, result.longitude); // 39.8283 -98.5795
 * console.log(result.iso2); // "US"
 * ```
 */
export async function resolve(
  ...args: any[]
): Promise<GeoIntelResult | ReverseGeoIntelResult> {
  const options: { dataDir?: string; loader?: DataLoader } = {};
  
  // Extract options from last argument if it's an object
  if (args.length > 0 && typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null && !Array.isArray(args[args.length - 1])) {
    const lastArg = args[args.length - 1];
    if ('dataDir' in lastArg || 'loader' in lastArg) {
      Object.assign(options, args.pop());
    }
  }

  // Get loader
  const loader = options.loader || getLoader(options.dataDir);

  // Auto-detect mode based on arguments
  if (args.length === 2) {
    // Forward geocoding: two numeric arguments (lat, lon)
    const [lat, lon] = args;
    
    // Validate types
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new Error(
        `Forward geocoding requires two numeric arguments (lat, lon). ` +
        `Got: lat=${typeof lat}, lon=${typeof lon}\n` +
        `For reverse geocoding, use: resolve('Country Name')`
      );
    }
    
    // Forward geocoding mode
    const resolutionResult = await _resolve(lat, lon, loader);
    return new GeoIntelResult(resolutionResult);
    
  } else if (args.length === 1) {
    // Reverse geocoding: one string argument (country)
    const countryInput = args[0];
    
    // Validate type
    if (typeof countryInput !== 'string') {
      throw new Error(
        `Reverse geocoding requires one string argument (country name or ISO code). ` +
        `Got: ${typeof countryInput}\n` +
        `For forward geocoding, use: resolve(lat, lon)`
      );
    }
    
    // Reverse geocoding mode
    const reverseResult = await _resolveByCountry(countryInput, loader);
    return new ReverseGeoIntelResult(reverseResult);
    
  } else {
    throw new Error(
      `Must provide either:\n` +
      `  - Two numeric arguments for forward geocoding: resolve(lat, lon)\n` +
      `  - One string argument for reverse geocoding: resolve('Country Name')\n` +
      `Examples:\n` +
      `  Forward:  resolve(40.7128, -74.0060)\n` +
      `  Reverse:  resolve('United States')`
    );
  }
}

/**
 * Resolve country name or ISO code to coordinates and metadata.
 * 
 * **Deprecated**: Use `resolve(country)` instead for consistency.
 * This function is kept for backward compatibility.
 * 
 * @param countryInput - Country name (e.g., "United States", "USA", "US") or ISO code
 * @param options - Optional configuration
 * @param options.dataDir - Optional custom data directory path
 * @param options.loader - Optional pre-configured loader instance
 * @returns ReverseGeoIntelResult with coordinates and metadata
 */
export async function resolveByCountry(
  countryInput: string,
  options: { dataDir?: string; loader?: DataLoader } = {}
): Promise<ReverseGeoIntelResult> {
  const loader = options.loader || getLoader(options.dataDir);
  const reverseResult = await _resolveByCountry(countryInput, loader);
  return new ReverseGeoIntelResult(reverseResult);
}

// Export types and utilities
export { DataLoader, getLoader } from './data/loader';
export { encode, decode, getNeighbors, GEOHASH_PRECISION } from './geohash';
export { pointInPolygon, pointInPolygonWithHoles, Point, Polygon } from './pip';
export { calculateConfidence, getConfidenceLabel } from './utils/confidence';
export { getPolygonCentroid, calculateBoundingBox } from './utils/polygon';

/**
 * Helper function to load data from CDN and create a configured loader.
 * This is a convenience function for browser/CDN usage.
 * 
 * @param baseUrl - Base URL for data files (e.g., 'https://unpkg.com/geo-intel-offline@latest/dist/data')
 * @param options - Optional configuration (same as DataLoader.loadFromCDN)
 * @returns Configured DataLoader instance ready to use
 * 
 * @example
 * ```typescript
 * // Load from CDN and use
 * const loader = await loadFromCDN('https://unpkg.com/geo-intel-offline@latest/dist/data');
 * const result = await resolve(40.7128, -74.0060, { loader });
 * ```
 */
export async function loadFromCDN(
  baseUrl: string,
  options?: {
    useGzip?: boolean;
    filenames?: {
      geohashIndex?: string;
      polygons?: string;
      metadata?: string;
    };
  }
): Promise<DataLoader> {
  const loader = new DataLoader();
  await loader.loadFromCDN(baseUrl, options);
  return loader;
}

// Default export
export default {
  resolve,
  resolveByCountry,
  GeoIntelResult,
  ReverseGeoIntelResult,
  DataLoader,
  getLoader,
  loadFromCDN
};

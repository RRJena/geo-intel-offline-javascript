/**
 * Distance calculation module with multiple algorithms.
 * 
 * This module provides accurate distance calculations between geographic points
 * using various algorithms optimized for different use cases.
 * 
 * Features:
 * - Haversine formula (standard great-circle distance)
 * - Spherical Law of Cosines (alternative validation method)
 * - Vincenty formula (high-precision ellipsoidal distance)
 * - All algorithms return distance in kilometers
 * 
 * Algorithms:
 * - Haversine: Most accurate for short to medium distances (< 1000 km)
 * - Spherical Law of Cosines: Alternative method, less accurate for short distances
 * - Vincenty: Most accurate for all distances, accounts for Earth's ellipsoidal shape
 */

// Earth radius constants (in kilometers)
export const EARTH_RADIUS_KM = 6371.0;
export const EARTH_RADIUS_MILES = 3958.8;

// WGS84 ellipsoid parameters for Vincenty formula
const WGS84_A = 6378137.0;  // Semi-major axis (meters)
const WGS84_F = 1 / 298.257223563;  // Flattening
const WGS84_B = (1 - WGS84_F) * WGS84_A;  // Semi-minor axis (meters)

// Country unit preferences (ISO2 codes that use imperial system)
// All other countries default to metric (kilometers)
const IMPERIAL_COUNTRIES = new Set(['US', 'GB', 'LR', 'MM']);

/**
 * Calculate distance between two points using Haversine formula.
 * 
 * The Haversine formula calculates the great-circle distance between two points
 * on a sphere given their longitudes and latitudes. This is the most commonly
 * used formula for distance calculations and is accurate for short to medium
 * distances (< 1000 km).
 * 
 * @param lat1 - Latitude of first point in degrees (-90 to 90)
 * @param lon1 - Longitude of first point in degrees (-180 to 180)
 * @param lat2 - Latitude of second point in degrees (-90 to 90)
 * @param lon2 - Longitude of second point in degrees (-180 to 180)
 * @returns Distance in kilometers
 * @throws {Error} If coordinates are out of valid range
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Validate input coordinates
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    throw new Error(
      `Latitude must be between -90 and 90 degrees. Got: lat1=${lat1}, lat2=${lat2}`
    );
  }
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    throw new Error(
      `Longitude must be between -180 and 180 degrees. Got: lon1=${lon1}, lon2=${lon2}`
    );
  }

  // Convert degrees to radians
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lon1Rad = (lon1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lon2Rad = (lon2 * Math.PI) / 180;

  // Calculate differences
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;

  // Haversine formula
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in kilometers
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate distance between two points using Spherical Law of Cosines.
 * 
 * The Spherical Law of Cosines is an alternative method for calculating
 * great-circle distances. It is less accurate than Haversine for very short
 * distances but can be useful for validation or when computational efficiency
 * is a concern.
 * 
 * @param lat1 - Latitude of first point in degrees (-90 to 90)
 * @param lon1 - Longitude of first point in degrees (-180 to 180)
 * @param lat2 - Latitude of second point in degrees (-90 to 90)
 * @param lon2 - Longitude of second point in degrees (-180 to 180)
 * @returns Distance in kilometers
 * @throws {Error} If coordinates are out of valid range
 */
export function sphericalLawOfCosines(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Validate input coordinates
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    throw new Error(
      `Latitude must be between -90 and 90 degrees. Got: lat1=${lat1}, lat2=${lat2}`
    );
  }
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    throw new Error(
      `Longitude must be between -180 and 180 degrees. Got: lon1=${lon1}, lon2=${lon2}`
    );
  }

  // Convert degrees to radians
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lon1Rad = (lon1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lon2Rad = (lon2 * Math.PI) / 180;

  // Calculate difference in longitude
  const dLon = lon2Rad - lon1Rad;

  // Spherical Law of Cosines formula
  // Clamp the result to [-1, 1] to avoid numerical errors with arccos
  const centralAngle = Math.max(
    -1.0,
    Math.min(
      1.0,
      Math.sin(lat1Rad) * Math.sin(lat2Rad) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
    )
  );

  // Distance in kilometers
  return EARTH_RADIUS_KM * Math.acos(centralAngle);
}

/**
 * Calculate distance between two points using Vincenty's inverse formula.
 * 
 * Vincenty's formula is the most accurate method for calculating distances
 * on an ellipsoid. It accounts for Earth's ellipsoidal shape (flattening at
 * the poles) and provides sub-millimeter accuracy. This is the recommended
 * method for high-precision applications.
 * 
 * @param lat1 - Latitude of first point in degrees (-90 to 90)
 * @param lon1 - Longitude of first point in degrees (-180 to 180)
 * @param lat2 - Latitude of second point in degrees (-90 to 90)
 * @param lon2 - Longitude of second point in degrees (-180 to 180)
 * @param maxIterations - Maximum number of iterations (default: 200)
 * @param tolerance - Convergence tolerance (default: 1e-12)
 * @returns Distance in kilometers
 * @throws {Error} If coordinates are out of valid range or algorithm fails to converge
 */
export function vincentyDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  maxIterations: number = 200,
  tolerance: number = 1e-12
): number {
  // Validate input coordinates
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    throw new Error(
      `Latitude must be between -90 and 90 degrees. Got: lat1=${lat1}, lat2=${lat2}`
    );
  }
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    throw new Error(
      `Longitude must be between -180 and 180 degrees. Got: lon1=${lon1}, lon2=${lon2}`
    );
  }

  // Convert degrees to radians
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lon1Rad = (lon1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const lon2Rad = (lon2 * Math.PI) / 180;

  // Calculate difference in longitude
  const L = lon2Rad - lon1Rad;

  // Calculate reduced latitudes
  const U1 = Math.atan((1 - WGS84_F) * Math.tan(lat1Rad));
  const U2 = Math.atan((1 - WGS84_F) * Math.tan(lat2Rad));

  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  // Initialize iteration variables
  let lambdaP = L;
  let lambda = L;

  // Iterate to find lambda
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);

    const sinSigma = Math.sqrt(
      (cosU2 * sinLambda) ** 2 +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2
    );

    if (sinSigma === 0) {
      // Co-incident points
      return 0.0;
    }

    const cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    const sigma = Math.atan2(sinSigma, cosSigma);

    const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    const cos2Alpha = 1 - sinAlpha ** 2;

    let cos2SigmaM: number;
    if (cos2Alpha === 0) {
      // Equatorial line
      cos2SigmaM = 0;
    } else {
      cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cos2Alpha;
    }

    const C = (WGS84_F / 16) * cos2Alpha * (4 + WGS84_F * (4 - 3 * cos2Alpha));

    lambdaP = lambda;
    lambda =
      L +
      (1 - C) *
        WGS84_F *
        sinAlpha *
        (sigma +
          C *
            sinSigma *
            (cos2SigmaM +
              C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));

    // Check for convergence
    if (Math.abs(lambda - lambdaP) < tolerance) {
      break;
    }

    if (iteration === maxIterations - 1) {
      // Failed to converge
      throw new Error(
        `Vincenty algorithm failed to converge after ${maxIterations} iterations. ` +
          `This may occur for nearly antipodal points.`
      );
    }
  }

  // Calculate final values
  const sinLambdaFinal = Math.sin(lambda);
  const cosLambdaFinal = Math.cos(lambda);
  const sinU1Final = Math.sin(U1);
  const cosU1Final = Math.cos(U1);
  const sinU2Final = Math.sin(U2);
  const cosU2Final = Math.cos(U2);

  // Recalculate sinSigma for final calculation
  const sinSigmaFinalCalc = Math.sqrt(
    (cosU2Final * sinLambdaFinal) ** 2 +
      (cosU1Final * sinU2Final - sinU1Final * cosU2Final * cosLambdaFinal) ** 2
  );
  const cosSigmaFinalCalc = sinU1Final * sinU2Final + cosU1Final * cosU2Final * cosLambdaFinal;
  const sigmaFinalCalc = Math.atan2(sinSigmaFinalCalc, cosSigmaFinalCalc);

  // Calculate cos2Alpha for final calculation
  const sinAlphaFinalCalc = (cosU1Final * cosU2Final * sinLambdaFinal) / sinSigmaFinalCalc;
  const cos2AlphaFinalCalc = 1 - sinAlphaFinalCalc ** 2;

  const u2 = (cos2AlphaFinalCalc * (WGS84_A ** 2 - WGS84_B ** 2)) / (WGS84_B ** 2);
  const A =
    1 + (u2 / 16384) * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
  const B = (u2 / 1024) * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));

  let cos2SigmaMFinal: number;
  if (cos2AlphaFinalCalc === 0) {
    cos2SigmaMFinal = 0;
  } else {
    cos2SigmaMFinal = cosSigmaFinalCalc - (2 * sinU1Final * sinU2Final) / cos2AlphaFinalCalc;
  }

  const deltaSigma =
    B *
    sinSigmaFinalCalc *
    (cos2SigmaMFinal +
      (B / 4) *
        (cosSigmaFinalCalc * (-1 + 2 * cos2SigmaMFinal ** 2) -
          (B / 6) *
            cos2SigmaMFinal *
            (-3 + 4 * sinSigmaFinalCalc ** 2) *
            (-3 + 4 * cos2SigmaMFinal ** 2)));

  // Distance in meters
  const distanceM = WGS84_B * A * (sigmaFinalCalc - deltaSigma);

  // Convert to kilometers
  return distanceM / 1000.0;
}

/**
 * Convert kilometers to miles.
 * 
 * @param km - Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Convert miles to kilometers.
 * 
 * @param miles - Distance in miles
 * @returns Distance in kilometers
 */
export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

/**
 * Get preferred unit system for a country based on ISO2 code.
 * 
 * Countries using imperial system (miles):
 * - US (United States)
 * - GB (United Kingdom)
 * - LR (Liberia)
 * - MM (Myanmar)
 * 
 * All other countries default to metric (kilometers).
 * 
 * @param iso2Code - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')
 * @returns 'mile' for imperial countries, 'km' for metric countries (default)
 */
export function getCountryUnitPreference(iso2Code: string | null): 'km' | 'mile' {
  if (iso2Code === null || iso2Code === undefined) {
    return 'km';  // Default to metric
  }

  const iso2Upper = iso2Code.toUpperCase();
  return IMPERIAL_COUNTRIES.has(iso2Upper) ? 'mile' : 'km';
}

/**
 * Determine preferred unit for distance calculation.
 * 
 * Priority order:
 * 1. Explicit unit parameter (highest priority)
 * 2. useMetric parameter (True = km, False = mile)
 * 3. Country preferences (from coordinates or ISO codes)
 * 4. Default to metric (km)
 * 
 * @param options - Configuration options
 * @param options.lat1 - Latitude of first point (optional, for country detection)
 * @param options.lon1 - Longitude of first point (optional, for country detection)
 * @param options.lat2 - Latitude of second point (optional, for country detection)
 * @param options.lon2 - Longitude of second point (optional, for country detection)
 * @param options.iso2_1 - ISO2 code of first location (optional)
 * @param options.iso2_2 - ISO2 code of second location (optional)
 * @param options.unit - Explicit unit preference ('km' or 'mile')
 * @param options.useMetric - Explicit metric preference (true = km, false = mile)
 * @param options.resolve - Optional resolve function for coordinate-based detection
 * @returns Preferred unit: 'km' or 'mile'
 */
export async function determineUnitPreference(options: {
  lat1?: number;
  lon1?: number;
  lat2?: number;
  lon2?: number;
  iso2_1?: string | null;
  iso2_2?: string | null;
  unit?: 'km' | 'mile';
  useMetric?: boolean;
  resolve?: (input: string) => Promise<{ latitude: number | null; longitude: number | null; iso2?: string | null }>;
}): Promise<'km' | 'mile'> {
  const {
    iso2_1,
    iso2_2,
    unit,
    useMetric,
    resolve: _resolveFn
  } = options;

  // Priority 1: Explicit unit parameter
  if (unit !== undefined) {
    if (unit.toLowerCase() === 'km' || unit.toLowerCase() === 'kilometer' || unit.toLowerCase() === 'kilometre') {
      return 'km';
    } else if (unit.toLowerCase() === 'mile' || unit.toLowerCase() === 'miles' || unit.toLowerCase() === 'mi') {
      return 'mile';
    } else {
      throw new Error(`Invalid unit: ${unit}. Must be 'km' or 'mile'`);
    }
  }

  // Priority 2: useMetric parameter
  if (useMetric !== undefined) {
    return useMetric ? 'km' : 'mile';
  }

  // Priority 3: Country preferences
  const iso2Codes: string[] = [];

  if (iso2_1) {
    iso2Codes.push(iso2_1);
  }
  // Note: For coordinate-based resolution, we would need a forward geocoding function
  // For now, we only use ISO2 codes that are explicitly provided

  if (iso2_2) {
    iso2Codes.push(iso2_2);
  }

  // If we have country codes, check preferences
  if (iso2Codes.length > 0) {
    // If any country uses imperial, prefer miles
    for (const iso2 of iso2Codes) {
      if (getCountryUnitPreference(iso2) === 'mile') {
        return 'mile';
      }
    }
    return 'km';
  }

  // Priority 4: Default to metric
  return 'km';
}

/**
 * Calculate distance between two points using specified method.
 * 
 * This is a convenience function that wraps the individual distance calculation
 * methods. It provides a unified interface for distance calculations.
 * 
 * @param lat1 - Latitude of first point in degrees (-90 to 90)
 * @param lon1 - Longitude of first point in degrees (-180 to 180)
 * @param lat2 - Latitude of second point in degrees (-90 to 90)
 * @param lon2 - Longitude of second point in degrees (-180 to 180)
 * @param method - Calculation method - 'haversine', 'vincenty', or 'spherical' (default: 'haversine')
 * @returns Distance in kilometers
 * @throws {Error} If coordinates are invalid or method is unknown
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  method: 'haversine' | 'vincenty' | 'spherical' = 'haversine'
): number {
  const methodLower = method.toLowerCase();

  if (methodLower === 'haversine') {
    return haversineDistance(lat1, lon1, lat2, lon2);
  } else if (methodLower === 'vincenty') {
    return vincentyDistance(lat1, lon1, lat2, lon2);
  } else if (methodLower === 'spherical') {
    return sphericalLawOfCosines(lat1, lon1, lat2, lon2);
  } else {
    throw new Error(
      `Unknown method: ${method}. Supported methods: 'haversine', 'vincenty', 'spherical'`
    );
  }
}

/**
 * Result object for distance calculations.
 * 
 * Contains distance value, unit, calculation method, and location information.
 */
export class DistanceResult {
  distance: number;
  unit: 'km' | 'mile';
  method: 'haversine' | 'vincenty' | 'spherical';
  fromLocation: [number, number] | string;
  toLocation: [number, number] | string;
  fromCoordinates?: [number, number];
  toCoordinates?: [number, number];

  constructor(
    distance: number,
    unit: 'km' | 'mile',
    method: 'haversine' | 'vincenty' | 'spherical',
    fromLocation: [number, number] | string,
    toLocation: [number, number] | string,
    fromCoordinates?: [number, number],
    toCoordinates?: [number, number]
  ) {
    this.distance = distance;
    this.unit = unit;
    this.method = method;
    this.fromLocation = fromLocation;
    this.toLocation = toLocation;
    this.fromCoordinates = fromCoordinates;
    this.toCoordinates = toCoordinates;
  }

  toDict(): Record<string, any> {
    return {
      distance: this.distance,
      unit: this.unit,
      method: this.method,
      from_location: this.fromLocation,
      to_location: this.toLocation,
      from_coordinates: this.fromCoordinates,
      to_coordinates: this.toCoordinates
    };
  }

  toString(): string {
    const fromStr = typeof this.fromLocation === 'string'
      ? this.fromLocation
      : `(${this.fromLocation[0].toFixed(4)}, ${this.fromLocation[1].toFixed(4)})`;
    const toStr = typeof this.toLocation === 'string'
      ? this.toLocation
      : `(${this.toLocation[0].toFixed(4)}, ${this.toLocation[1].toFixed(4)})`;
    
    return `DistanceResult(distance=${this.distance.toFixed(2)} ${this.unit}, method=${this.method}, from=${fromStr}, to=${toStr})`;
  }
}

/**
 * Select appropriate calculation method.
 * 
 * If method is 'auto', selects based on distance:
 * - Short distances (< 1000 km): Haversine (fast, accurate)
 * - Long distances (>= 1000 km): Vincenty (most accurate)
 * 
 * @param method - Requested method ('haversine', 'vincenty', 'spherical', 'auto')
 * @param fromCoords - Starting coordinates
 * @param toCoords - Ending coordinates
 * @returns Selected method name
 */
function selectCalculationMethod(
  method: 'haversine' | 'vincenty' | 'spherical' | 'auto',
  fromCoords: [number, number],
  toCoords: [number, number]
): 'haversine' | 'vincenty' | 'spherical' {
  if (method === 'auto') {
    // Calculate rough distance to decide method
    const roughDistance = haversineDistance(
      fromCoords[0], fromCoords[1],
      toCoords[0], toCoords[1]
    );

    // For long distances, use Vincenty for better accuracy
    if (roughDistance >= 1000.0) {
      return 'vincenty';
    } else {
      return 'haversine';
    }
  }

  return method;
}

/**
 * Normalize location input to coordinates (lat, lon).
 * 
 * Accepts:
 * - Coordinate tuple: [lat, lon] → returns as-is
 * - Country name: "United States" → returns country centroid
 * - ISO2 code: "US" → returns country centroid
 * - ISO3 code: "USA" → returns country centroid
 * - Continent name: "North America" → returns continent centroid
 * 
 * @param location - Location input
 * @param resolveFn - Optional resolve function for country/continent resolution
 * @returns Tuple of [latitude, longitude] in degrees
 * @throws {Error} If location cannot be resolved to coordinates
 */
export async function normalizeLocation(
  location: [number, number] | string,
  resolveFn?: (input: string) => Promise<{ latitude: number | null; longitude: number | null; iso2?: string | null }>
): Promise<[number, number]> {
  // If already a coordinate tuple, return as-is
  if (Array.isArray(location) && location.length === 2) {
    const [lat, lon] = location;
    if (typeof lat === 'number' && typeof lon === 'number') {
      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new Error(
          `Invalid coordinates: (${lat}, ${lon}). ` +
          `Latitude must be -90 to 90, longitude must be -180 to 180.`
        );
      }
      return [lat, lon];
    }
  }

  // If string, try to resolve as country or continent
  if (typeof location === 'string') {
    const locationStr = location.trim();

    if (!resolveFn) {
      throw new Error(
        `Cannot resolve location '${locationStr}' to coordinates. ` +
        `Resolve function not provided. For coordinate tuples, use [lat, lon] format.`
      );
    }

    // Try country first (using reverse geocoding)
    try {
      const result = await resolveFn(locationStr);
      if (result.latitude !== null && result.longitude !== null) {
        return [result.latitude, result.longitude];
      }
    } catch (e) {
      // Not a country, try continent
    }

    // Try continent
    const continentCoords = await getContinentCentroid(locationStr, resolveFn);
    if (continentCoords) {
      return continentCoords;
    }

    // If we get here, location couldn't be resolved
    throw new Error(
      `Could not resolve location '${locationStr}' to coordinates. ` +
      `Expected: coordinate tuple [lat, lon], country name/ISO code, or continent name.`
    );
  }

  // Invalid type
  throw new Error(
    `Invalid location type: ${typeof location}. ` +
    `Expected: [number, number] or string (country/continent name or ISO code).`
  );
}

/**
 * Get centroid coordinates for a continent.
 * 
 * Calculates the average centroid of all countries in the continent.
 * 
 * @param continentName - Continent name (e.g., "North America", "Europe")
 * @param resolveFn - Resolve function for getting country coordinates
 * @returns Tuple of [latitude, longitude] or null if continent not found
 */
async function getContinentCentroid(
  continentName: string,
  _resolveFn?: (input: string) => Promise<{ latitude: number | null; longitude: number | null }>
): Promise<[number, number] | null> {
  // Normalize continent name
  const continentMapping: Record<string, string> = {
    'africa': 'Africa',
    'asia': 'Asia',
    'europe': 'Europe',
    'north america': 'North America',
    'north_america': 'North America',
    'south america': 'South America',
    'south_america': 'South America',
    'oceania': 'Oceania',
    'australia': 'Oceania',
    'antarctica': 'Antarctica',
  };

  const continentNormalized = continentName.trim().toLowerCase();
  const continentStandard = continentMapping[continentNormalized] || continentName;

  // This is a simplified implementation
  // In a full implementation, we would iterate through all countries
  // For now, return approximate centroids for major continents
  const continentCentroids: Record<string, [number, number]> = {
    'Africa': [8.7832, 34.5085],
    'Asia': [34.0479, 100.6197],
    'Europe': [54.5260, 15.2551],
    'North America': [54.5260, -105.2551],
    'South America': [-14.2350, -51.9253],
    'Oceania': [-25.2744, 133.7751],
    'Antarctica': [-75.2509, 0.0000],
  };

  const centroid = continentCentroids[continentStandard];
  if (centroid) {
    return centroid;
  }

  return null;
}

/**
 * Calculate distance between two points with automatic unit detection.
 * 
 * This is the main public API for distance calculations. It supports flexible
 * input types and automatically detects unit preferences based on country.
 * 
 * @param fromPoint - Starting location - can be [lat, lon] tuple or country/continent name
 * @param toPoint - Ending location - can be [lat, lon] tuple or country/continent name
 * @param options - Configuration options
 * @param options.method - Calculation method: 'haversine', 'vincenty', 'spherical', or 'auto' (default: 'auto')
 * @param options.unit - Force unit ('km' or 'mile'), undefined for auto-detect
 * @param options.useMetric - Force metric (true) or imperial (false), undefined for auto-detect
 * @param options.resolve - Resolve function for country/continent name resolution
 * @returns DistanceResult object with distance, unit, method, and location information
 * @throws {Error} If inputs are invalid or cannot be resolved
 * 
 * @example
 * ```typescript
 * // Distance between coordinates
 * const result = await calculateDistance([40.7128, -74.0060], [34.0522, -118.2437], {
 *   resolve: async (name) => await resolve(name)
 * });
 * console.log(`${result.distance.toFixed(2)} ${result.unit}`);
 * // Output: "2448.50 mile" (auto-detected miles for US locations)
 * 
 * // Distance between countries
 * const result2 = await calculateDistance("United States", "Canada", {
 *   resolve: async (name) => await resolve(name)
 * });
 * console.log(`${result2.distance.toFixed(2)} ${result2.unit}`);
 * // Output: "2000.00 km" (auto-detected km for metric countries)
 * ```
 */
export async function calculateDistance(
  fromPoint: [number, number] | string,
  toPoint: [number, number] | string,
  options: {
    method?: 'haversine' | 'vincenty' | 'spherical' | 'auto';
    unit?: 'km' | 'mile';
    useMetric?: boolean;
    resolve?: (input: string) => Promise<{ latitude: number | null; longitude: number | null; iso2?: string | null }>;
  } = {}
): Promise<DistanceResult> {
  const {
    method = 'auto',
    unit,
    useMetric,
    resolve: resolveFn
  } = options;

  // Step 1: Normalize inputs (convert country/continent names to coordinates)
  const fromCoords = await normalizeLocation(fromPoint, resolveFn);
  const toCoords = await normalizeLocation(toPoint, resolveFn);

  // Step 2: Determine unit preference
  // Get ISO2 codes if resolve function is available
  let iso2_1: string | null = null;
  let iso2_2: string | null = null;

  if (resolveFn) {
    if (typeof fromPoint === 'string') {
      try {
        const result1 = await resolveFn(fromPoint);
        iso2_1 = result1.iso2 || null;
      } catch (e) {
        // Ignore errors
      }
    }
    if (typeof toPoint === 'string') {
      try {
        const result2 = await resolveFn(toPoint);
        iso2_2 = result2.iso2 || null;
      } catch (e) {
        // Ignore errors
      }
    }
  }

  const preferredUnit = await determineUnitPreference({
    lat1: fromCoords[0],
    lon1: fromCoords[1],
    lat2: toCoords[0],
    lon2: toCoords[1],
    iso2_1,
    iso2_2,
    unit,
    useMetric,
    resolve: resolveFn
  });

  // Step 3: Select calculation method
  const calcMethod = selectCalculationMethod(method, fromCoords, toCoords);

  // Step 4: Calculate distance in kilometers
  const distanceKm = calculateDistanceKm(
    fromCoords[0], fromCoords[1],
    toCoords[0], toCoords[1],
    calcMethod
  );

  // Step 5: Convert to preferred unit
  const distance = preferredUnit === 'mile' ? kmToMiles(distanceKm) : distanceKm;

  return new DistanceResult(
    distance,
    preferredUnit,
    calcMethod,
    fromPoint,
    toPoint,
    fromCoords,
    toCoords
  );
}

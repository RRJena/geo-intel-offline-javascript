/**
 * Reverse geocoding - resolve country name/ISO code to coordinates.
 * 
 * Given a country name or ISO code, returns:
 * - Latitude/Longitude (centroid of country)
 * - Country metadata (name, ISO codes, continent, timezone)
 */

import { DataLoader } from '../data/loader';
import { getPolygonCentroid } from '../utils/polygon';
import { Point } from '../pip';

export interface ReverseResolutionResult {
  latitude: number | null;
  longitude: number | null;
  countryName: string | null;
  iso2: string | null;
  iso3: string | null;
  continent: string | null;
  timezone: string | null;
  confidence: number; // Always 1.0 for exact country match
}

/**
 * Result of reverse geo-intelligence resolution.
 */
export class ReverseResolutionResultImpl implements ReverseResolutionResult {
  latitude: number | null = null;
  longitude: number | null = null;
  countryName: string | null = null;
  iso2: string | null = null;
  iso3: string | null = null;
  continent: string | null = null;
  timezone: string | null = null;
  confidence: number = 1.0; // Always 1.0 for exact country match

  constructor(result?: Partial<ReverseResolutionResult>) {
    if (result) {
      Object.assign(this, result);
    }
  }

  toDict(): Record<string, any> {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      country: this.countryName,
      iso2: this.iso2,
      iso3: this.iso3,
      continent: this.continent,
      timezone: this.timezone,
      confidence: this.confidence
    };
  }
}

/**
 * Normalize country name for matching.
 */
function normalizeCountryName(name: string): string {
  return name.trim().toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
}

/**
 * Find country ID and metadata by name or ISO code.
 * 
 * @param countryInput - Country name, ISO2 code, or ISO3 code
 * @param loader - Data loader instance
 * @returns Object with countryId and metadata, or null if not found
 */
function findCountryByNameOrIso(
  countryInput: string,
  loader: DataLoader
): { countryId: number; metadata: any } | null {
  const metadata = loader.metadata;
  
  const normalizedInput = countryInput.trim().toUpperCase();
  const normalizedName = normalizeCountryName(countryInput);
  
  // Search through all countries
  for (const [countryIdStr, countryMeta] of Object.entries(metadata)) {
    const countryId = parseInt(countryIdStr, 10);
    
    // Check ISO2
    const iso2 = (countryMeta.iso2 || '').toUpperCase();
    if (iso2 === normalizedInput) {
      return { countryId, metadata: countryMeta };
    }
    
    // Check ISO3
    const iso3 = (countryMeta.iso3 || '').toUpperCase();
    if (iso3 === normalizedInput) {
      return { countryId, metadata: countryMeta };
    }
    
    // Check country name (exact match)
    const countryName = countryMeta.name || '';
    const normalizedMetaName = normalizeCountryName(countryName);
    if (normalizedMetaName === normalizedName) {
      return { countryId, metadata: countryMeta };
    }
  }
  
  // Try partial match (case-insensitive)
  for (const [countryIdStr, countryMeta] of Object.entries(metadata)) {
    const countryId = parseInt(countryIdStr, 10);
    const countryName = countryMeta.name || '';
    const normalizedMetaName = normalizeCountryName(countryName);
    
    // Check if input is contained in country name or vice versa
    if (normalizedName.includes(normalizedMetaName) || normalizedMetaName.includes(normalizedName)) {
      return { countryId, metadata: countryMeta };
    }
  }
  
  return null;
}

/**
 * Resolve country name or ISO code to coordinates and metadata.
 * 
 * This function performs reverse geocoding - given a country name or ISO code,
 * it returns the country's centroid coordinates along with all metadata.
 * 
 * @param countryInput - Country name (e.g., "United States", "USA", "US") or ISO code
 * @param loader - Data loader instance
 * @returns ReverseResolutionResult object with coordinates and metadata
 */
export async function resolveByCountry(
  countryInput: string,
  loader: DataLoader
): Promise<ReverseResolutionResult> {
  // Ensure data is loaded
  await loader.load();
  
  // Find country
  const countryMatch = findCountryByNameOrIso(countryInput, loader);
  
  if (!countryMatch) {
    throw new Error(
      `Country not found: '${countryInput}'. ` +
      `Please provide a valid country name or ISO code (ISO2/ISO3).`
    );
  }
  
  const { countryId, metadata } = countryMatch;
  
  // Get polygon to calculate centroid
  const polygonData = loader.getPolygon(countryId);
  
  if (!polygonData) {
    throw new Error(`Polygon data not found for country ID ${countryId}`);
  }
  
  // Handle MultiPolygon (multiple exteriors) or single Polygon
  const exteriors: number[][][] = [];
  if (polygonData.multi && polygonData.exteriors) {
    exteriors.push(...polygonData.exteriors);
  } else if (polygonData.exterior) {
    exteriors.push(polygonData.exterior);
  }
  
  if (exteriors.length === 0) {
    throw new Error(`Invalid polygon data for country ID ${countryId}`);
  }
  
  // Calculate centroid from all exteriors
  // For MultiPolygon countries, use average of all centroids
  const allCentroids: Point[] = [];
  for (const ext of exteriors) {
    if (ext && ext.length > 0) {
      const exteriorPolygon: Point[] = ext.map((coord: number[]) => {
        if (Array.isArray(coord) && coord.length >= 2) {
          return [coord[0], coord[1]] as Point;
        }
        throw new Error(`Invalid coordinate format: ${coord}`);
      });
      const centroid = getPolygonCentroid(exteriorPolygon);
      allCentroids.push(centroid);
    }
  }
  
  if (allCentroids.length === 0) {
    throw new Error(`No valid exteriors found for country ID ${countryId}`);
  }
  
  // Use average of all centroids
  const centroidLat = allCentroids.reduce((sum, c) => sum + c[0], 0) / allCentroids.length;
  const centroidLon = allCentroids.reduce((sum, c) => sum + c[1], 0) / allCentroids.length;
  
  // Build result
  return new ReverseResolutionResultImpl({
    latitude: centroidLat,
    longitude: centroidLon,
    countryName: metadata.name,
    iso2: metadata.iso2,
    iso3: metadata.iso3,
    continent: metadata.continent,
    timezone: metadata.timezone,
    confidence: 1.0 // Exact match
  });
}

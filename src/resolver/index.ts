/**
 * Resolver orchestration - coordinates the resolution pipeline.
 * 
 * Resolution Pipeline:
 * 1. Encode lat/lon to geohash
 * 2. Query geohash index for candidate countries
 * 3. For each candidate:
 *    a. Load polygon
 *    b. Test point-in-polygon
 *    c. If match, calculate confidence
 * 4. Return best match or handle ambiguity
 * 
 * Edge Cases Handled:
 * - Points in oceans (no country match)
 * - Border points (multiple candidates)
 * - Geohash boundary cases (check neighbors)
 * - Countries with holes (islands, lakes)
 */

import { encode, getNeighbors } from '../geohash';
import { Point, pointInPolygonWithHoles } from '../pip';
import { calculateConfidence } from '../utils/confidence';
import { DataLoader } from '../data/loader';

export interface ResolutionResult {
  countryId: number | null;
  countryName: string | null;
  iso2: string | null;
  iso3: string | null;
  continent: string | null;
  timezone: string | null;
  confidence: number;
}

/**
 * Result of a geo-intelligence resolution.
 */
export class ResolutionResultImpl implements ResolutionResult {
  countryId: number | null = null;
  countryName: string | null = null;
  iso2: string | null = null;
  iso3: string | null = null;
  continent: string | null = null;
  timezone: string | null = null;
  confidence: number = 0.0;

  constructor(result?: Partial<ResolutionResult>) {
    if (result) {
      Object.assign(this, result);
    }
  }

  toDict(): Record<string, any> {
    return {
      country: this.countryName,
      iso2: this.iso2,
      iso3: this.iso3,
      continent: this.continent,
      timezone: this.timezone,
      confidence: this.confidence
    };
  }

  isValid(): boolean {
    return this.countryId !== null;
  }
}

/**
 * Resolve latitude/longitude to geo-intelligence.
 * 
 * Main resolution function that orchestrates the entire pipeline.
 * 
 * @param lat - Latitude (-90 to 90)
 * @param lon - Longitude (-180 to 180)
 * @param loader - Data loader instance
 * @returns ResolutionResult with country information and confidence
 */
export async function resolve(
  lat: number,
  lon: number,
  loader: DataLoader
): Promise<ResolutionResult> {
  const point: Point = [lat, lon];
  
  // Ensure data is loaded
  await loader.load();
  
  // Step 1: Encode to geohash
  const geohash = encode(lat, lon);
  
  // Step 2: Get candidate countries
  let candidates = loader.getCandidateCountries(geohash);
  
  // Step 3: If no candidates from primary geohash, try neighbors
  // This handles edge cases where point is on geohash boundaries
  if (candidates.length === 0) {
    const neighbors = getNeighbors(geohash);
    const neighborCandidates: number[] = [];
    for (const neighborHash of neighbors) {
      neighborCandidates.push(...loader.getCandidateCountries(neighborHash));
    }
    candidates = Array.from(new Set(neighborCandidates)); // Deduplicate
  }
  
  // Step 3b: If still no candidates, try extended neighbors (9x9 grid around point)
  if (candidates.length === 0) {
    const neighbors = getNeighbors(geohash);
    const extendedNeighbors = new Set<string>();
    for (const neighborHash of neighbors) {
      extendedNeighbors.add(neighborHash);
      for (const extendedNeighbor of getNeighbors(neighborHash)) {
        extendedNeighbors.add(extendedNeighbor);
      }
    }
    
    const extendedCandidates: number[] = [];
    for (const extendedHash of extendedNeighbors) {
      if (extendedHash !== geohash) { // Skip primary (already checked)
        extendedCandidates.push(...loader.getCandidateCountries(extendedHash));
      }
    }
    candidates = Array.from(new Set(extendedCandidates)); // Deduplicate
  }
  
  // Step 3c: Final fallback - if still no candidates, try checking all loaded countries
  if (candidates.length === 0) {
    // Try to get all country IDs from the loader
    try {
      const metadata = loader.metadata;
      candidates = Object.keys(metadata).map(id => parseInt(id, 10));
    } catch {
      // Fallback failed, continue with empty candidates
    }
  }
  
  if (candidates.length === 0) {
    // No country found (likely ocean or unsupported area)
    return new ResolutionResultImpl({
      countryId: null,
      countryName: null,
      iso2: null,
      iso3: null,
      continent: null,
      timezone: null,
      confidence: 0.0
    });
  }
  
  // Step 4: Test each candidate with point-in-polygon
  const matches: Array<{ countryId: number; confidence: number }> = [];
  
  for (const countryId of candidates) {
    const polygonData = loader.getPolygon(countryId);
    if (!polygonData) {
      continue;
    }
    
    // Handle MultiPolygon or single Polygon
    const exteriors: number[][][] = [];
    if (polygonData.multi && polygonData.exteriors) {
      exteriors.push(...polygonData.exteriors);
    } else if (polygonData.exterior) {
      exteriors.push(polygonData.exterior);
    }
    
    // Test each exterior
    for (const exterior of exteriors) {
      if (!exterior || exterior.length === 0) {
        continue;
      }
      
      // Convert to Point format
      const exteriorPolygon: Point[] = exterior.map((coord: number[]) => {
        // Handle both [lat, lon] and [lon, lat] formats
        if (Array.isArray(coord) && coord.length >= 2) {
          return [coord[0], coord[1]] as Point;
        }
        throw new Error(`Invalid coordinate format: ${coord}`);
      });
      
      // Handle holes - ensure they're properly formatted
      const holes: Point[][] = [];
      if (polygonData.holes && Array.isArray(polygonData.holes)) {
        for (const hole of polygonData.holes) {
          if (Array.isArray(hole) && hole.length > 0) {
            holes.push(hole.map((coord: number[]) => [coord[0], coord[1]] as Point));
          }
        }
      }
      
      if (pointInPolygonWithHoles(point, exteriorPolygon, holes)) {
        // Calculate confidence
        const confidence = calculateConfidence(
          point,
          exteriorPolygon,
          holes,
          candidates.length
        );
        
        matches.push({ countryId, confidence });
        break; // Found match, no need to check other exteriors
      }
    }
  }
  
  // Step 5: If no matches from geohash candidates, try broader search
  // This handles cases where geohash index doesn't have complete coverage
  if (matches.length === 0) {
    // Fallback: Check all countries (expensive, but ensures accuracy)
    // This is a last resort when geohash indexing missed the country
    const metadata = loader.metadata;
    const polygons = loader.polygons;
    
    for (const countryIdStr of Object.keys(metadata)) {
      const countryId = parseInt(countryIdStr, 10);
      
      // Skip if already checked as candidate
      if (candidates.includes(countryId)) {
        continue;
      }
      
      const polygonData = polygons[countryIdStr];
      if (!polygonData) {
        continue;
      }
      
      // Handle MultiPolygon or single Polygon
      const exteriors: number[][][] = [];
      if (polygonData.multi && polygonData.exteriors) {
        exteriors.push(...polygonData.exteriors);
      } else if (polygonData.exterior) {
        exteriors.push(polygonData.exterior);
      }
      
      // Test each exterior
      for (const exterior of exteriors) {
        if (!exterior || exterior.length === 0) {
          continue;
        }
        
        // Convert to Point format
        const exteriorPolygon: Point[] = exterior.map((coord: number[]) => [coord[0], coord[1]] as Point);
        const holes: Point[][] = [];
        if (polygonData.holes && Array.isArray(polygonData.holes)) {
          for (const hole of polygonData.holes) {
            if (Array.isArray(hole) && hole.length > 0) {
              holes.push(hole.map((coord: number[]) => [coord[0], coord[1]] as Point));
            }
          }
        }
        
        if (pointInPolygonWithHoles(point, exteriorPolygon, holes)) {
          // Calculate confidence (slightly lower for fallback match)
          const confidence = calculateConfidence(
            point,
            exteriorPolygon,
            holes,
            1 // Single match in fallback
          ) * 0.95; // Slightly lower confidence for fallback match
          
          matches.push({ countryId, confidence });
          break; // Found match, no need to check other exteriors
        }
      }
    }
  }
  
  if (matches.length === 0) {
    // No match found (point in ocean or gap)
    return new ResolutionResultImpl({
      countryId: null,
      countryName: null,
      iso2: null,
      iso3: null,
      continent: null,
      timezone: null,
      confidence: 0.0
    });
  }
  
  // Step 5: Select best match (highest confidence)
  matches.sort((a, b) => b.confidence - a.confidence);
  const bestMatch = matches[0];
  
  // Get metadata
  const metadata = loader.getMetadata(bestMatch.countryId);
  if (!metadata) {
    throw new Error(`Metadata not found for country ID ${bestMatch.countryId}`);
  }
  
  return new ResolutionResultImpl({
    countryId: bestMatch.countryId,
    countryName: metadata.name,
    iso2: metadata.iso2,
    iso3: metadata.iso3,
    continent: metadata.continent,
    timezone: metadata.timezone,
    confidence: bestMatch.confidence
  });
}

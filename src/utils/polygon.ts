/**
 * Shared polygon processing utilities.
 */

import { Point } from '../pip';

/**
 * Calculate bounding box for a polygon.
 */
export function calculateBoundingBox(polygon: Point[]): [number, number, number, number] {
  if (!polygon || polygon.length === 0) {
    return [0.0, 0.0, 0.0, 0.0];
  }
  
  const lats = polygon.map(p => p[0]);
  const lons = polygon.map(p => p[1]);
  return [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
}

/**
 * Calculate polygon centroid.
 */
export function getPolygonCentroid(polygon: Point[]): Point {
  if (!polygon || polygon.length === 0) {
    return [0.0, 0.0];
  }
  
  const lats = polygon.map(p => p[0]);
  const lons = polygon.map(p => p[1]);
  const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const avgLon = lons.reduce((a, b) => a + b, 0) / lons.length;
  return [avgLat, avgLon];
}

/**
 * Convert GeoJSON coordinates [lon, lat] to internal format [(lat, lon), ...].
 * 
 * @param coordsList - GeoJSON coordinate list (each element is [lon, lat])
 * @returns List of [lat, lon] tuples
 */
export function convertGeojsonCoordsToLatLon(coordsList: number[][]): Point[] {
  return coordsList.map(p => [p[1], p[0]]);
}

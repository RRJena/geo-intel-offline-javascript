/**
 * Confidence scoring for geo-intelligence results.
 * 
 * Confidence is based on:
 * 1. Distance to polygon edge (closer = lower confidence)
 * 2. Geohash ambiguity (multiple candidates = lower confidence)
 * 3. Border proximity threshold
 * 
 * Design Decision: Use distance-based scoring with thresholds:
 * - > 0.1° from edge: 0.98-1.0 confidence (high)
 * - 0.01°-0.1° from edge: 0.85-0.98 confidence (medium)
 * - < 0.01° from edge: 0.70-0.85 confidence (low)
 * - Multiple candidates: Reduce by 0.1-0.2
 * 
 * This gives users actionable confidence metrics without over-promising accuracy.
 */

import { Point, Polygon, distanceToPolygonEdge } from '../pip';

/**
 * Calculate confidence score for geo-intelligence result.
 * 
 * @param point - [lat, lon] tuple
 * @param polygon - Exterior polygon ring
 * @param holes - Interior rings (holes) if any
 * @param candidateCount - Number of candidate countries found (ambiguity penalty)
 * @returns Confidence score between 0.0 and 1.0
 */
export function calculateConfidence(
  point: Point,
  polygon: Polygon,
  holes: Polygon[] = [],
  candidateCount: number = 1
): number {
  // Calculate distance to nearest edge (exterior or holes)
  let minDist = distanceToPolygonEdge(point, polygon);
  
  for (const hole of holes) {
    const distHole = distanceToPolygonEdge(point, hole);
    minDist = Math.min(minDist, distHole);
  }
  
  // Convert distance (degrees) to confidence
  // 0.1° ≈ 11km at equator, good threshold for "far from border"
  let baseConfidence: number;
  if (minDist >= 0.1) {
    baseConfidence = 0.98;
  } else if (minDist >= 0.05) {
    // Linear interpolation between 0.05° and 0.1°
    baseConfidence = 0.88 + (minDist - 0.05) / 0.05 * 0.10;
  } else if (minDist >= 0.01) {
    // Linear interpolation between 0.01° and 0.05°
    baseConfidence = 0.75 + (minDist - 0.01) / 0.04 * 0.13;
  } else {
    // Very close to border
    baseConfidence = 0.70 + minDist / 0.01 * 0.05;
  }
  
  // Apply ambiguity penalty
  if (candidateCount > 1) {
    // Multiple candidates reduce confidence
    const penalty = Math.min(0.2, (candidateCount - 1) * 0.05);
    baseConfidence -= penalty;
  }
  
  // Clamp to valid range
  return Math.max(0.5, Math.min(1.0, baseConfidence));
}

/**
 * Get human-readable confidence label.
 * 
 * @param confidence - Confidence score (0.0-1.0)
 * @returns Label: "high", "medium", or "low"
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.90) {
    return "high";
  } else if (confidence >= 0.75) {
    return "medium";
  } else {
    return "low";
  }
}

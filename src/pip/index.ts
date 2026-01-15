/**
 * Point-in-Polygon (PIP) algorithm using Ray Casting.
 * 
 * Ray Casting Algorithm:
 * - Cast a ray from the point to infinity (we use East, +X direction)
 * - Count intersections with polygon edges
 * - Odd intersections = inside, even = outside
 * 
 * Design Decisions:
 * 1. Ray Casting chosen over Winding Number for:
 *    - Simpler implementation
 *    - Better performance
 *    - Deterministic results
 * 
 * 2. Handle polygon rings (exterior + holes):
 *    - Exterior ring: inside = true
 *    - Interior rings (holes): inside = false
 * 
 * 3. Edge cases handled:
 *    - Points on vertices
 *    - Points on edges
 *    - Horizontal rays (collinear with edges)
 */

export type Point = [number, number]; // [lat, lon]
export type Polygon = Point[];

/**
 * Check if a point is inside a polygon using ray casting.
 * 
 * @param point - [lat, lon] tuple
 * @param polygon - Array of [lat, lon] tuples forming polygon ring
 * @returns True if point is inside polygon, False otherwise
 */
export function pointInPolygon(point: Point, polygon: Polygon): boolean {
  if (!polygon || polygon.length < 3) {
    return false;
  }
  
  const [lat, lon] = point;
  let inside = false;
  
  // Ray casting: check intersections with horizontal ray going East
  let j = polygon.length - 1;
  for (let i = 0; i < polygon.length; i++) {
    const [lat_i, lon_i] = polygon[i];
    const [lat_j, lon_j] = polygon[j];
    
    // Check if ray crosses edge
    if ((lat_i > lat) !== (lat_j > lat)) {
      // Calculate intersection point
      let intersectLon: number;
      if (lon_j !== lon_i) {
        // Avoid division by zero (horizontal edges)
        intersectLon = (lat - lat_i) * (lon_j - lon_i) / (lat_j - lat_i) + lon_i;
      } else {
        intersectLon = lon_i;
      }
      
      // Count intersection if ray crosses to the right
      if (lon < intersectLon) {
        inside = !inside;
      }
    }
    
    j = i;
  }
  
  return inside;
}

/**
 * Check if point is in polygon with holes (interior rings).
 * 
 * Design Decision: Exterior ring defines inclusion, holes define exclusion.
 * This handles countries with lakes, islands with lakes, etc.
 * 
 * @param point - [lat, lon] tuple
 * @param exterior - Exterior polygon ring
 * @param holes - Array of interior rings (holes)
 * @returns True if point is inside exterior but not in any hole
 */
export function pointInPolygonWithHoles(
  point: Point,
  exterior: Polygon,
  holes: Polygon[] = []
): boolean {
  if (!pointInPolygon(point, exterior)) {
    return false;
  }
  
  // Check if point is in any hole (exclude from result)
  for (const hole of holes) {
    if (pointInPolygon(point, hole)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Calculate minimum distance from point to polygon edge.
 * 
 * Used for confidence scoring: closer to edge = lower confidence.
 * 
 * @param point - [lat, lon] tuple
 * @param polygon - Polygon ring
 * @returns Distance in degrees (approximate, for confidence scoring)
 */
export function distanceToPolygonEdge(point: Point, polygon: Polygon): number {
  if (!polygon || polygon.length === 0) {
    return Infinity;
  }
  
  let minDist = Infinity;
  const [lat, lon] = point;
  
  let j = polygon.length - 1;
  for (let i = 0; i < polygon.length; i++) {
    const [lat_i, lon_i] = polygon[i];
    const [lat_j, lon_j] = polygon[j];
    
    // Distance to line segment
    // Use point-to-line-segment distance formula
    const dx = lon_j - lon_i;
    const dy = lat_j - lat_i;
    
    let dist: number;
    if (dx === 0 && dy === 0) {
      // Degenerate segment (point)
      dist = Math.sqrt((lat - lat_i) ** 2 + (lon - lon_i) ** 2);
    } else {
      // Project point onto line segment
      const t = Math.max(0, Math.min(1, ((lat - lat_i) * dy + (lon - lon_i) * dx) / (dx * dx + dy * dy)));
      
      const projLat = lat_i + t * dy;
      const projLon = lon_i + t * dx;
      
      dist = Math.sqrt((lat - projLat) ** 2 + (lon - projLon) ** 2);
    }
    
    minDist = Math.min(minDist, dist);
    j = i;
  }
  
  return minDist;
}

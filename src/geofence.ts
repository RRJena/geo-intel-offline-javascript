/**
 * Geo-fencing module for location proximity detection.
 * 
 * This module provides functionality to monitor whether a location is within
 * a specified radius of a destination, with state tracking and alert generation.
 * 
 * Features:
 * - Inside/outside detection
 * - State tracking (OUTSIDE, APPROACHING, INSIDE, LEAVING)
 * - Alert generation (reached, entered, exited, approaching, leaving)
 * - Configurable thresholds and buffers
 * - Support for multiple radius units (meters, kilometers, miles)
 * - Both stateless and stateful monitoring
 */

import { calculateDistanceKm } from './distance';

/**
 * Geofence state enumeration.
 */
export enum GeofenceState {
  OUTSIDE = 'outside',
  APPROACHING = 'approaching',
  INSIDE = 'inside',
  LEAVING = 'leaving'
}

/**
 * Geofence configuration options.
 */
export interface GeofenceConfig {
  /** Geofence radius */
  radius: number;
  /** Radius unit ('m', 'km', 'mile') */
  radiusUnit: 'm' | 'km' | 'mile';
  /** Threshold for "reached" alert (default: 0.1 * radius) */
  reachedThreshold?: number;
  /** Threshold for "approaching" alert as percentage of radius (default: 10%) */
  approachingThresholdPercent?: number;
  /** Threshold for "leaving" alert as percentage of radius (default: 10%) */
  leavingThresholdPercent?: number;
  /** Buffer for inside state to prevent flickering (default: 0) */
  insideBuffer?: number;
  /** Buffer for outside state to prevent flickering (default: 0) */
  outsideBuffer?: number;
}

/**
 * Geofence alert information.
 */
export class GeofenceAlert {
  alertType: 'reached' | 'entered' | 'exited' | 'approaching' | 'leaving';
  distance: number;
  unit: 'km' | 'mile';
  state: GeofenceState;
  previousDistance?: number;
  distanceChange?: number;
  distanceChangePercent?: number;

  constructor(
    alertType: 'reached' | 'entered' | 'exited' | 'approaching' | 'leaving',
    distance: number,
    unit: 'km' | 'mile',
    state: GeofenceState,
    previousDistance?: number,
    distanceChange?: number,
    distanceChangePercent?: number
  ) {
    this.alertType = alertType;
    this.distance = distance;
    this.unit = unit;
    this.state = state;
    this.previousDistance = previousDistance;
    this.distanceChange = distanceChange;
    this.distanceChangePercent = distanceChangePercent;
  }

  toDict(): Record<string, any> {
    return {
      alert_type: this.alertType,
      distance: this.distance,
      unit: this.unit,
      state: this.state,
      previous_distance: this.previousDistance,
      distance_change: this.distanceChange,
      distance_change_percent: this.distanceChangePercent
    };
  }

  toString(): string {
    return `GeofenceAlert(type=${this.alertType}, distance=${this.distance.toFixed(2)} ${this.unit}, state=${this.state})`;
  }
}

/**
 * Geofence check result.
 */
export class GeofenceResult {
  isInside: boolean;
  distance: number;
  unit: 'km' | 'mile';
  state: GeofenceState;
  alerts: GeofenceAlert[];
  currentLocation: [number, number] | string;
  destination: [number, number] | string;
  radius: number;
  radiusUnit: 'm' | 'km' | 'mile';

  constructor(
    isInside: boolean,
    distance: number,
    unit: 'km' | 'mile',
    state: GeofenceState,
    alerts: GeofenceAlert[],
    currentLocation: [number, number] | string,
    destination: [number, number] | string,
    radius: number,
    radiusUnit: 'm' | 'km' | 'mile'
  ) {
    this.isInside = isInside;
    this.distance = distance;
    this.unit = unit;
    this.state = state;
    this.alerts = alerts;
    this.currentLocation = currentLocation;
    this.destination = destination;
    this.radius = radius;
    this.radiusUnit = radiusUnit;
  }

  toDict(): Record<string, any> {
    return {
      is_inside: this.isInside,
      distance: this.distance,
      unit: this.unit,
      state: this.state,
      alerts: this.alerts.map(a => a.toDict()),
      current_location: this.currentLocation,
      destination: this.destination,
      radius: this.radius,
      radius_unit: this.radiusUnit
    };
  }

  toString(): string {
    return `GeofenceResult(is_inside=${this.isInside}, distance=${this.distance.toFixed(2)} ${this.unit}, state=${this.state}, alerts=${this.alerts.length})`;
  }
}

/**
 * Convert distance value to meters.
 * 
 * @param value - Distance value
 * @param unit - Unit ('m', 'km', 'mile')
 * @returns Distance in meters
 */
function convertToMeters(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();
  if (unitLower === 'm' || unitLower === 'meter' || unitLower === 'meters') {
    return value;
  } else if (unitLower === 'km' || unitLower === 'kilometer' || unitLower === 'kilometers') {
    return value * 1000.0;
  } else if (unitLower === 'mile' || unitLower === 'miles' || unitLower === 'mi') {
    return value * 1609.34;
  } else {
    throw new Error(`Unknown unit: ${unit}. Supported: 'm', 'km', 'mile'`);
  }
}

/**
 * Convert distance value from meters to specified unit.
 * 
 * @param value - Distance in meters
 * @param unit - Target unit ('m', 'km', 'mile')
 * @returns Distance in target unit
 */
function convertFromMeters(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();
  if (unitLower === 'm' || unitLower === 'meter' || unitLower === 'meters') {
    return value;
  } else if (unitLower === 'km' || unitLower === 'kilometer' || unitLower === 'kilometers') {
    return value / 1000.0;
  } else if (unitLower === 'mile' || unitLower === 'miles' || unitLower === 'mi') {
    return value / 1609.34;
  } else {
    throw new Error(`Unknown unit: ${unit}. Supported: 'm', 'km', 'mile'`);
  }
}

/**
 * Determine current geofence state based on position and previous state.
 * 
 * @param isInside - Whether location is currently inside geofence
 * @param previousState - Previous geofence state (null for first check)
 * @param distanceM - Current distance in meters
 * @param radiusM - Geofence radius in meters
 * @param insideBufferM - Buffer for inside state in meters
 * @param outsideBufferM - Buffer for outside state in meters
 * @param previousDistanceM - Previous distance in meters (null for first check)
 * @returns Current geofence state
 */
function determineState(
  _isInside: boolean,
  previousState: GeofenceState | null,
  distanceM: number,
  radiusM: number,
  insideBufferM: number,
  _outsideBufferM: number,
  previousDistanceM: number | null
): GeofenceState {
  // Apply buffers to prevent flickering
  const effectiveInsideThreshold = radiusM + insideBufferM;

  // Determine if actually inside (with buffers)
  const actuallyInside = distanceM <= effectiveInsideThreshold;

  // If no previous state, determine based on current position
  if (previousState === null) {
    if (actuallyInside) {
      return GeofenceState.INSIDE;
    } else {
      return GeofenceState.OUTSIDE;
    }
  }

  // If we have previous distance, check movement direction
  if (previousDistanceM !== null) {
    const distanceChange = previousDistanceM - distanceM; // Positive = getting closer

    if (actuallyInside) {
      // Inside geofence
      if (previousState === GeofenceState.OUTSIDE || previousState === GeofenceState.APPROACHING) {
        // Just entered
        return GeofenceState.INSIDE;
      } else if (distanceChange > 0) {
        // Moving closer while inside (shouldn't happen, but handle it)
        return GeofenceState.INSIDE;
      } else if (distanceChange < 0) {
        // Moving away while inside
        return GeofenceState.LEAVING;
      } else {
        return GeofenceState.INSIDE;
      }
    } else {
      // Outside geofence
      if (previousState === GeofenceState.INSIDE || previousState === GeofenceState.LEAVING) {
        // Just exited
        return GeofenceState.OUTSIDE;
      } else if (distanceChange < 0) {
        // Moving away while outside
        return GeofenceState.OUTSIDE;
      } else if (distanceChange > 0) {
        // Moving closer while outside
        return GeofenceState.APPROACHING;
      } else {
        return GeofenceState.OUTSIDE;
      }
    }
  }

  // Fallback: determine based on current position only
  if (actuallyInside) {
    return GeofenceState.INSIDE;
  } else {
    return GeofenceState.OUTSIDE;
  }
}

/**
 * Generate alerts based on state transitions and thresholds.
 * 
 * @param state - Current geofence state
 * @param previousState - Previous geofence state
 * @param distance - Current distance
 * @param distanceUnit - Unit of distance
 * @param radius - Geofence radius
 * @param radiusUnit - Unit of radius
 * @param config - Geofence configuration
 * @param previousDistance - Previous distance (null for first check)
 * @returns List of alerts generated
 */
function generateAlerts(
  state: GeofenceState,
  previousState: GeofenceState | null,
  distance: number,
  distanceUnit: 'km' | 'mile',
  radius: number,
  radiusUnit: 'm' | 'km' | 'mile',
  config: GeofenceConfig,
  previousDistance: number | null
): GeofenceAlert[] {
  const alerts: GeofenceAlert[] = [];

  // Convert everything to meters for comparison
  const distanceM = convertToMeters(distance, distanceUnit);
  convertToMeters(radius, radiusUnit); // radiusM not used directly, but conversion needed for reachedThresholdM
  const reachedThresholdM = convertToMeters(
    config.reachedThreshold || radius * 0.1,
    radiusUnit
  );
  const previousDistanceM = previousDistance !== null
    ? convertToMeters(previousDistance, distanceUnit)
    : null;

  // State transition alerts
  if (previousState !== null) {
    if (previousState !== state) {
      if (state === GeofenceState.INSIDE && (previousState === GeofenceState.OUTSIDE || previousState === GeofenceState.APPROACHING)) {
        // Entered geofence
        alerts.push(new GeofenceAlert(
          'entered',
          distance,
          distanceUnit,
          state,
          previousDistance || undefined,
          previousDistance !== null ? previousDistance - distance : undefined,
          previousDistance !== null && previousDistance > 0
            ? ((previousDistance - distance) / previousDistance * 100.0)
            : undefined
        ));
      } else if (state === GeofenceState.OUTSIDE && (previousState === GeofenceState.INSIDE || previousState === GeofenceState.LEAVING)) {
        // Exited geofence
        alerts.push(new GeofenceAlert(
          'exited',
          distance,
          distanceUnit,
          state,
          previousDistance || undefined,
          previousDistance !== null ? distance - previousDistance : undefined,
          previousDistance !== null && previousDistance > 0
            ? ((distance - previousDistance) / previousDistance * 100.0)
            : undefined
        ));
      }
    }
  }

  // Threshold-based alerts
  if (previousDistanceM !== null) {
    const distanceChange = previousDistanceM - distanceM; // Positive = getting closer

    // Approaching alert
    if (state === GeofenceState.APPROACHING) {
      const thresholdPercent = config.approachingThresholdPercent || 10.0;
      const approachingDistanceChangePercent = previousDistanceM > 0
        ? (distanceChange / previousDistanceM * 100.0)
        : 0.0;
      if (approachingDistanceChangePercent >= thresholdPercent) {
        alerts.push(new GeofenceAlert(
          'approaching',
          distance,
          distanceUnit,
          state,
          previousDistance || undefined,
          distanceChange,
          approachingDistanceChangePercent
        ));
      }
    }

    // Leaving alert
    if (state === GeofenceState.LEAVING) {
      const thresholdPercent = config.leavingThresholdPercent || 10.0;
      const leavingDistanceChangePercent = previousDistanceM > 0
        ? (distanceChange / previousDistanceM * 100.0)
        : 0.0;
      if (leavingDistanceChangePercent <= -thresholdPercent) {
        alerts.push(new GeofenceAlert(
          'leaving',
          distance,
          distanceUnit,
          state,
          previousDistance || undefined,
          distanceChange,
          leavingDistanceChangePercent
        ));
      }
    }

    // Reached alert (when entering and very close)
    if (state === GeofenceState.INSIDE && distanceM <= reachedThresholdM) {
      if (previousState === null || previousState === GeofenceState.OUTSIDE || previousState === GeofenceState.APPROACHING) {
        alerts.push(new GeofenceAlert(
          'reached',
          distance,
          distanceUnit,
          state,
          previousDistance || undefined,
          previousDistance !== null ? previousDistance - distance : undefined,
          previousDistance !== null && previousDistance > 0
            ? ((previousDistance - distance) / previousDistance * 100.0)
            : undefined
        ));
      }
    }
  }

  return alerts;
}

/**
 * Check geofence status (stateless).
 * 
 * This is a convenience function for one-off geofence checks without state tracking.
 * For stateful monitoring with state transitions and alerts, use GeofenceMonitor.
 * 
 * @param currentLocation - Current location [lat, lon] or location identifier
 * @param destination - Destination [lat, lon] or location identifier
 * @param radius - Geofence radius
 * @param radiusUnit - Radius unit ('m', 'km', 'mile')
 * @param options - Optional configuration
 * @param options.resolve - Optional resolve function for location name resolution
 * @param options.config - Optional geofence configuration for advanced options
 * @returns GeofenceResult with current status
 * 
 * @example
 * ```typescript
 * const result = await checkGeofence(
 *   [40.7128, -74.0060],  // Current location
 *   [40.7130, -74.0060],  // Destination
 *   1000,  // 1000 meters
 *   'm'
 * );
 * console.log(`Inside: ${result.isInside}, Distance: ${result.distance} ${result.unit}`);
 * ```
 */
export async function checkGeofence(
  currentLocation: [number, number] | string,
  destination: [number, number] | string,
  radius: number,
  radiusUnit: 'm' | 'km' | 'mile',
  options: {
    resolve?: (input: string) => Promise<{ latitude: number | null; longitude: number | null }>;
    config?: Partial<GeofenceConfig>;
  } = {}
): Promise<GeofenceResult> {
  const monitor = new GeofenceMonitor({
    radius,
    radiusUnit,
    ...options.config
  });

  return await monitor.check(currentLocation, destination, options);
}

/**
 * Geofence monitor for tracking location relative to destination.
 * 
 * Maintains state between calls to detect state transitions.
 */
export class GeofenceMonitor {
  private config: GeofenceConfig;
  private previousState: GeofenceState | null = null;
  private previousDistance: number | null = null; // in meters
  private previousDistanceUnit: 'km' | 'mile' | null = null;
  private destinationCoords: [number, number] | null = null; // Resolved destination coordinates

  constructor(config: GeofenceConfig) {
    this.config = {
      radius: config.radius,
      radiusUnit: config.radiusUnit,
      reachedThreshold: config.reachedThreshold || config.radius * 0.1,
      approachingThresholdPercent: config.approachingThresholdPercent || 10.0,
      leavingThresholdPercent: config.leavingThresholdPercent || 10.0,
      insideBuffer: config.insideBuffer || 0,
      outsideBuffer: config.outsideBuffer || 0
    };
  }

  /**
   * Reset the monitor's state.
   */
  reset(): void {
    this.previousState = null;
    this.previousDistance = null;
    this.previousDistanceUnit = null;
    this.destinationCoords = null;
  }

  /**
   * Check current location against geofence.
   * 
   * @param currentLocation - Current [lat, lon] or location identifier
   * @param destination - Destination [lat, lon] or location identifier
   * @param options - Optional configuration
   * @param options.resolve - Optional resolve function for location name resolution
   * @returns GeofenceResult with current state and alerts
   */
  async check(
    currentLocation: [number, number] | string,
    destination: [number, number] | string,
    options: {
      resolve?: (input: string) => Promise<{ latitude: number | null; longitude: number | null }>;
    } = {}
  ): Promise<GeofenceResult> {
    // 1. Resolve destination coordinates once if not already resolved
    if (this.destinationCoords === null) {
      if (Array.isArray(destination) && destination.length === 2) {
        this.destinationCoords = [destination[0], destination[1]];
      } else if (typeof destination === 'string' && options.resolve) {
        const destResult = await options.resolve(destination);
        if (destResult.latitude !== null && destResult.longitude !== null) {
          this.destinationCoords = [destResult.latitude, destResult.longitude];
        } else {
          throw new Error(`Could not resolve destination: ${destination}`);
        }
      } else {
        throw new Error(`Invalid destination: ${destination}. Must be [lat, lon] or string with resolve function.`);
      }
    }

    // 2. Resolve current location coordinates
    let currentCoords: [number, number];
    if (Array.isArray(currentLocation) && currentLocation.length === 2) {
      currentCoords = [currentLocation[0], currentLocation[1]];
    } else if (typeof currentLocation === 'string' && options.resolve) {
      const currentResult = await options.resolve(currentLocation);
      if (currentResult.latitude !== null && currentResult.longitude !== null) {
        currentCoords = [currentResult.latitude, currentResult.longitude];
      } else {
        throw new Error(`Could not resolve current location: ${currentLocation}`);
      }
    } else {
      throw new Error(`Invalid current location: ${currentLocation}. Must be [lat, lon] or string with resolve function.`);
    }

    // 3. Calculate current distance
    const distanceKm = calculateDistanceKm(
      currentCoords[0], currentCoords[1],
      this.destinationCoords[0], this.destinationCoords[1],
      'haversine'
    );

    // Determine unit based on country preference (simplified - default to km)
    // In a full implementation, we would resolve coordinates to get country ISO2
    const distanceUnit: 'km' | 'mile' = 'km'; // Default to km
    const distance = distanceKm;

    // Convert current_distance to meters for internal comparison
    const currentDistanceM = convertToMeters(distance, distanceUnit);

    // Convert radius to meters
    const radiusM = convertToMeters(this.config.radius, this.config.radiusUnit);

    // 4. Determine if inside geofence (considering buffers)
    const insideBufferM = convertToMeters(this.config.insideBuffer || 0, this.config.radiusUnit);
    const isInside = currentDistanceM <= (radiusM + insideBufferM);

    // 5. Determine state
    const outsideBufferM = convertToMeters(this.config.outsideBuffer || 0, this.config.radiusUnit);
    const state = determineState(
      isInside,
      this.previousState,
      currentDistanceM,
      radiusM,
      insideBufferM,
      outsideBufferM,
      this.previousDistance
    );

    // 6. Generate alerts
    const alerts = generateAlerts(
      state,
      this.previousState,
      distance,
      distanceUnit,
      this.config.radius,
      this.config.radiusUnit,
      this.config,
      this.previousDistance !== null && this.previousDistanceUnit !== null
        ? convertFromMeters(this.previousDistance, this.previousDistanceUnit)
        : null
    );

    // 7. Update previous state and distance
    this.previousState = state;
    this.previousDistance = currentDistanceM;
    this.previousDistanceUnit = distanceUnit;

    return new GeofenceResult(
      isInside,
      distance,
      distanceUnit,
      state,
      alerts,
      currentLocation,
      destination,
      this.config.radius,
      this.config.radiusUnit
    );
  }
}

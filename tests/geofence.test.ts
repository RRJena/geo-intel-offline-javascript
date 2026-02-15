/**
 * Comprehensive tests for geo-fencing feature.
 * 
 * Tests cover:
 * - Basic inside/outside detection
 * - State tracking and transitions
 * - Alert generation
 * - Multiple radius units
 * - Positive, negative, and edge cases
 */

import {
  checkGeofence,
  GeofenceMonitor,
  GeofenceConfig,
  GeofenceState
} from '../src/geofence';
import { resolve } from '../src/index';
import { DataLoader } from '../src/data/loader';

describe('Geo-fencing Tests', () => {
  let loader: DataLoader;
  const resolveFn = async (input: string) => {
    const result = await resolve(input, { loader });
    return {
      latitude: result instanceof (await import('../src/index')).ReverseGeoIntelResult
        ? (result as any).latitude
        : null,
      longitude: result instanceof (await import('../src/index')).ReverseGeoIntelResult
        ? (result as any).longitude
        : null,
      iso2: result.iso2 || null
    };
  };

  beforeAll(async () => {
    loader = new DataLoader('./data');
    await loader.load();
  });

  describe('checkGeofence - Stateless', () => {
    test('Should detect point inside geofence', async () => {
      const result = await checkGeofence(
        [40.7128, -74.0060],
        [40.7130, -74.0060],
        1000,
        'm',
        { resolve: resolveFn }
      );

      expect(result.isInside).toBe(true);
      expect(result.distance).toBeLessThan(1); // Less than 1 km
      expect(result.state).toBe(GeofenceState.INSIDE);
    });

    test('Should detect point outside geofence', async () => {
      const result = await checkGeofence(
        [40.7128, -74.0060],
        [34.0522, -118.2437], // LA (far away)
        1000,
        'm',
        { resolve: resolveFn }
      );

      expect(result.isInside).toBe(false);
      expect(result.distance).toBeGreaterThan(1000);
      expect(result.state).toBe(GeofenceState.OUTSIDE);
    });

    test('Should work with different radius units', async () => {
      const resultM = await checkGeofence(
        [40.7128, -74.0060],
        [40.7130, -74.0060],
        1,
        'km',
        { resolve: resolveFn }
      );
      expect(resultM.isInside).toBe(true);

      const resultKm = await checkGeofence(
        [40.7128, -74.0060],
        [40.7130, -74.0060],
        1000,
        'm',
        { resolve: resolveFn }
      );
      expect(resultKm.isInside).toBe(true);

      const resultMile = await checkGeofence(
        [40.7128, -74.0060],
        [40.7130, -74.0060],
        0.621371,
        'mile',
        { resolve: resolveFn }
      );
      expect(resultMile.isInside).toBe(true);
    });

    test('Should throw error for invalid radius unit', async () => {
      await expect(
        checkGeofence(
          [40.7128, -74.0060],
          [40.7130, -74.0060],
          1000,
          'invalid' as any,
          { resolve: resolveFn }
        )
      ).rejects.toThrow();
    });
  });

  describe('GeofenceMonitor - Stateful', () => {
    test('Should track state transitions', async () => {
      const config: GeofenceConfig = {
        radius: 1000, // 1 km
        radiusUnit: 'm',
        approachingThresholdPercent: 10,
        leavingThresholdPercent: 10,
        insideBuffer: 10,
        outsideBuffer: 10
      };

      const monitor = new GeofenceMonitor(config);

      // 1. Far outside
      let result = await monitor.check(
        [40.7128, -74.0060],
        [40.7128, -74.0060 + 0.05], // ~5km away
        { resolve: resolveFn }
      );
      expect(result.state).toBe(GeofenceState.OUTSIDE);
      expect(result.isInside).toBe(false);

      // 2. Move closer (approaching)
      result = await monitor.check(
        [40.7128, -74.0060 + 0.02], // ~2km away
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );
      expect(result.state).toBe(GeofenceState.APPROACHING);

      // 3. Move inside
      result = await monitor.check(
        [40.7128, -74.0060 + 0.049], // Very close
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );
      expect(result.state).toBe(GeofenceState.INSIDE);
      expect(result.isInside).toBe(true);

      // 4. Move away (leaving)
      result = await monitor.check(
        [40.7128, -74.0060 + 0.045], // Moving away
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );
      expect(result.state).toBe(GeofenceState.LEAVING);

      // 5. Move far outside
      result = await monitor.check(
        [40.7128, -74.0060], // Far away
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );
      expect(result.state).toBe(GeofenceState.OUTSIDE);
      expect(result.isInside).toBe(false);
    });

    test('Should generate alerts on state transitions', async () => {
      const config: GeofenceConfig = {
        radius: 1000,
        radiusUnit: 'm',
        reachedThreshold: 100,
        approachingThresholdPercent: 10,
        leavingThresholdPercent: 10
      };

      const monitor = new GeofenceMonitor(config);

      // First check (outside)
      await monitor.check(
        [40.7128, -74.0060],
        [40.7128, -74.0060 + 0.05], // Far away
        { resolve: resolveFn }
      );

      // Then move inside (entering)
      let result = await monitor.check(
        [40.7128, -74.0060 + 0.049], // Very close
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );

      // Should have entered/reached alerts
      const enteredAlerts = result.alerts.filter(a => a.alertType === 'entered' || a.alertType === 'reached');
      expect(enteredAlerts.length).toBeGreaterThan(0);

      // Move away (exiting)
      result = await monitor.check(
        [40.7128, -74.0060],
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );

      // Should have exited alert
      const exitedAlerts = result.alerts.filter(a => a.alertType === 'exited');
      expect(exitedAlerts.length).toBeGreaterThan(0);
    });

    test('Should reset state', async () => {
      const monitor = new GeofenceMonitor({
        radius: 1000,
        radiusUnit: 'm'
      });

      await monitor.check([40.7128, -74.0060], [40.7130, -74.0060], { resolve: resolveFn });
      expect(monitor['previousState']).not.toBeNull();

      monitor.reset();
      expect(monitor['previousState']).toBeNull();
      expect(monitor['previousDistance']).toBeNull();
    });
  });

  describe('Alert Generation', () => {
    test('Should generate entered alert', async () => {
      const monitor = new GeofenceMonitor({
        radius: 1000,
        radiusUnit: 'm'
      });

      // First check outside
      await monitor.check(
        [40.7128, -74.0060],
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );

      // Then move inside
      const result = await monitor.check(
        [40.7128, -74.0060 + 0.049],
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );

      const enteredAlert = result.alerts.find(a => a.alertType === 'entered');
      expect(enteredAlert).toBeDefined();
      if (enteredAlert) {
        expect(enteredAlert.state).toBe(GeofenceState.INSIDE);
        expect(enteredAlert.distance).toBeGreaterThan(0);
      }
    });

    test('Should generate exited alert', async () => {
      const monitor = new GeofenceMonitor({
        radius: 1000,
        radiusUnit: 'm'
      });

      // First check inside
      await monitor.check(
        [40.7128, -74.0060 + 0.049],
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );

      // Then move outside
      const result = await monitor.check(
        [40.7128, -74.0060],
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );

      const exitedAlert = result.alerts.find(a => a.alertType === 'exited');
      expect(exitedAlert).toBeDefined();
      if (exitedAlert) {
        expect(exitedAlert.state).toBe(GeofenceState.OUTSIDE);
      }
    });

    test('Alert should have toDict method', async () => {
      const monitor = new GeofenceMonitor({
        radius: 1000,
        radiusUnit: 'm'
      });

      await monitor.check([40.7128, -74.0060], [40.7128, -74.0060 + 0.05], { resolve: resolveFn });
      const result = await monitor.check(
        [40.7128, -74.0060 + 0.049],
        [40.7128, -74.0060 + 0.05],
        { resolve: resolveFn }
      );

      if (result.alerts.length > 0) {
        const alert = result.alerts[0];
        const dict = alert.toDict();
        expect(dict).toHaveProperty('alert_type');
        expect(dict).toHaveProperty('distance');
        expect(dict).toHaveProperty('unit');
        expect(dict).toHaveProperty('state');
      }
    });
  });

  describe('Edge Cases', () => {
    test('Should handle very small radius', async () => {
      const result = await checkGeofence(
        [40.7128, -74.0060],
        [40.7128, -74.0060],
        10,
        'm',
        { resolve: resolveFn }
      );

      expect(result.isInside).toBe(true);
      expect(result.distance).toBeCloseTo(0, 1);
    });

    test('Should handle very large radius', async () => {
      const result = await checkGeofence(
        [40.7128, -74.0060],
        [34.0522, -118.2437],
        10000,
        'km',
        { resolve: resolveFn }
      );

      expect(result.isInside).toBe(true); // Within 10000 km
    });

    test('Should handle exact boundary', async () => {
      const config: GeofenceConfig = {
        radius: 1000,
        radiusUnit: 'm',
        insideBuffer: 0,
        outsideBuffer: 0
      };

      const monitor = new GeofenceMonitor(config);

      // Point exactly at boundary
      const result = await monitor.check(
        [40.7128, -74.0060],
        [40.7128, -74.0060 + 0.009], // ~1km away
        { resolve: resolveFn }
      );

      expect(result.isInside).toBe(true); // Within or at boundary
    });

    test('Should handle coordinate wrapping', async () => {
      // Test near date line
      const result = await checkGeofence(
        [0, 179],
        [0, -179],
        1000,
        'km',
        { resolve: resolveFn }
      );

      expect(result.distance).toBeGreaterThan(0);
    });
  });

  describe('Result Object', () => {
    test('Result should have toDict method', async () => {
      const result = await checkGeofence(
        [40.7128, -74.0060],
        [40.7130, -74.0060],
        1000,
        'm',
        { resolve: resolveFn }
      );

      const dict = result.toDict();
      expect(dict).toHaveProperty('is_inside');
      expect(dict).toHaveProperty('distance');
      expect(dict).toHaveProperty('unit');
      expect(dict).toHaveProperty('state');
      expect(dict).toHaveProperty('alerts');
    });

    test('Result should have toString method', async () => {
      const result = await checkGeofence(
        [40.7128, -74.0060],
        [40.7130, -74.0060],
        1000,
        'm',
        { resolve: resolveFn }
      );

      const str = result.toString();
      expect(str).toContain('GeofenceResult');
      expect(str).toContain(result.isInside.toString());
    });
  });
});

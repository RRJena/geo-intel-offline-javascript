/**
 * Comprehensive tests for distance calculation feature.
 * 
 * Tests cover:
 * - Core distance algorithms (Haversine, Vincenty, Spherical)
 * - Unit conversion
 * - Country unit preferences
 * - Unified calculateDistance API
 * - Positive, negative, and edge cases
 */

import {
  haversineDistance,
  vincentyDistance,
  sphericalLawOfCosines,
  calculateDistanceKm,
  calculateDistance,
  kmToMiles,
  milesToKm,
  getCountryUnitPreference,
  determineUnitPreference,
  DistanceResult
} from '../src/distance';
import { resolve } from '../src/index';
import { DataLoader } from '../src/data/loader';

describe('Distance Calculation Tests', () => {
  let loader: DataLoader;

  beforeAll(async () => {
    loader = new DataLoader('./data');
    await loader.load();
  });

  describe('Core Distance Algorithms', () => {
    test('Haversine: should calculate distance between NYC and LA', () => {
      const distance = haversineDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeCloseTo(3935.75, 0); // ~3935.75 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    test('Vincenty: should calculate distance between NYC and LA', () => {
      const distance = vincentyDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeCloseTo(3944.42, 0); // ~3944.42 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    test('Spherical Law of Cosines: should calculate distance between NYC and LA', () => {
      const distance = sphericalLawOfCosines(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeCloseTo(3935.75, 0); // ~3935.75 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    test('All methods should produce similar results', () => {
      const haversine = haversineDistance(40.7128, -74.0060, 34.0522, -118.2437);
      const vincenty = vincentyDistance(40.7128, -74.0060, 34.0522, -118.2437);
      const spherical = sphericalLawOfCosines(40.7128, -74.0060, 34.0522, -118.2437);

      // All should be within 50km of each other
      expect(Math.abs(haversine - vincenty)).toBeLessThan(50);
      expect(Math.abs(haversine - spherical)).toBeLessThan(50);
      expect(Math.abs(vincenty - spherical)).toBeLessThan(50);
    });

    test('Same point should return zero distance', () => {
      const distance = haversineDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBeCloseTo(0, 1);
    });

    test('Should throw error for invalid latitude', () => {
      expect(() => haversineDistance(91, -74.0060, 34.0522, -118.2437)).toThrow();
      expect(() => haversineDistance(-91, -74.0060, 34.0522, -118.2437)).toThrow();
    });

    test('Should throw error for invalid longitude', () => {
      expect(() => haversineDistance(40.7128, 181, 34.0522, -118.2437)).toThrow();
      expect(() => haversineDistance(40.7128, -181, 34.0522, -118.2437)).toThrow();
    });
  });

  describe('Unit Conversion', () => {
    test('kmToMiles: should convert correctly', () => {
      const miles = kmToMiles(100);
      expect(miles).toBeCloseTo(62.1371, 2);
    });

    test('milesToKm: should convert correctly', () => {
      const km = milesToKm(100);
      expect(km).toBeCloseTo(160.934, 2);
    });

    test('Round-trip conversion should be accurate', () => {
      const originalKm = 100;
      const miles = kmToMiles(originalKm);
      const backToKm = milesToKm(miles);
      expect(backToKm).toBeCloseTo(originalKm, 1);
    });
  });

  describe('Country Unit Preferences', () => {
    test('US should prefer miles', () => {
      expect(getCountryUnitPreference('US')).toBe('mile');
    });

    test('GB should prefer miles', () => {
      expect(getCountryUnitPreference('GB')).toBe('mile');
    });

    test('FR should prefer km', () => {
      expect(getCountryUnitPreference('FR')).toBe('km');
    });

    test('JP should prefer km', () => {
      expect(getCountryUnitPreference('JP')).toBe('km');
    });

    test('Null should default to km', () => {
      expect(getCountryUnitPreference(null)).toBe('km');
    });
  });

  describe('calculateDistanceKm', () => {
    test('Should use haversine by default', () => {
      const distance = calculateDistanceKm(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeCloseTo(3935.75, 0);
    });

    test('Should use vincenty when specified', () => {
      const distance = calculateDistanceKm(40.7128, -74.0060, 34.0522, -118.2437, 'vincenty');
      expect(distance).toBeCloseTo(3944.42, 0);
    });

    test('Should use spherical when specified', () => {
      const distance = calculateDistanceKm(40.7128, -74.0060, 34.0522, -118.2437, 'spherical');
      expect(distance).toBeCloseTo(3935.75, 0);
    });

    test('Should throw error for unknown method', () => {
      expect(() => {
        calculateDistanceKm(40.7128, -74.0060, 34.0522, -118.2437, 'invalid' as any);
      }).toThrow();
    });
  });

  describe('calculateDistance - Unified API', () => {
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

    test('Should calculate distance between coordinates', async () => {
      const result = await calculateDistance(
        [40.7128, -74.0060],
        [34.0522, -118.2437],
        { resolve: resolveFn }
      );

      expect(result).toBeInstanceOf(DistanceResult);
      // Distance is in the unit specified (mile for US locations)
      if (result.unit === 'mile') {
        expect(result.distance).toBeGreaterThan(2400);
        expect(result.distance).toBeLessThan(2500);
        // Verify distance is correct (in miles) - convert back to km
        const distanceInKm = result.distance * 1.60934;
        expect(distanceInKm).toBeCloseTo(3944, 0);
      } else {
        // If in km, check km range
        expect(result.distance).toBeGreaterThan(3900);
        expect(result.distance).toBeLessThan(4000);
      }
      expect(result.method).toBe('vincenty'); // Auto-selected for long distance
    });

    test('Should calculate distance between countries', async () => {
      const result = await calculateDistance(
        'United States',
        'Canada',
        { resolve: resolveFn }
      );

      expect(result).toBeInstanceOf(DistanceResult);
      expect(result.distance).toBeGreaterThan(0);
      expect(result.unit).toBe('mile'); // US preference
    });

    test('Should force unit to km', async () => {
      const result = await calculateDistance(
        [40.7128, -74.0060],
        [34.0522, -118.2437],
        { unit: 'km', resolve: resolveFn }
      );

      expect(result.unit).toBe('km');
    });

    test('Should force unit to mile', async () => {
      const result = await calculateDistance(
        [40.7128, -74.0060],
        [34.0522, -118.2437],
        { unit: 'mile', resolve: resolveFn }
      );

      expect(result.unit).toBe('mile');
    });

    test('Should force method', async () => {
      const result = await calculateDistance(
        [40.7128, -74.0060],
        [34.0522, -118.2437],
        { method: 'haversine', resolve: resolveFn }
      );

      expect(result.method).toBe('haversine');
    });

    test('Should use auto method selection', async () => {
      // Short distance should use haversine
      const shortResult = await calculateDistance(
        [40.7128, -74.0060],
        [40.7130, -74.0060],
        { method: 'auto', resolve: resolveFn }
      );
      expect(shortResult.method).toBe('haversine');

      // Long distance should use vincenty
      const longResult = await calculateDistance(
        [40.7128, -74.0060],
        [34.0522, -118.2437],
        { method: 'auto', resolve: resolveFn }
      );
      expect(longResult.method).toBe('vincenty');
    });

    test('Should throw error for invalid coordinates', async () => {
      await expect(
        calculateDistance([91, 0], [0, 0], { resolve: resolveFn })
      ).rejects.toThrow();
    });

    test('Result should have toDict method', async () => {
      const result = await calculateDistance(
        [40.7128, -74.0060],
        [34.0522, -118.2437],
        { resolve: resolveFn }
      );

      const dict = result.toDict();
      expect(dict).toHaveProperty('distance');
      expect(dict).toHaveProperty('unit');
      expect(dict).toHaveProperty('method');
      expect(dict).toHaveProperty('from_location');
      expect(dict).toHaveProperty('to_location');
    });

    test('Result should have toString method', async () => {
      const result = await calculateDistance(
        [40.7128, -74.0060],
        [34.0522, -118.2437],
        { resolve: resolveFn }
      );

      const str = result.toString();
      expect(str).toContain('DistanceResult');
      expect(str).toContain(result.unit);
    });
  });

  describe('Edge Cases', () => {
    test('Antipodal points should calculate correctly', () => {
      const distance = haversineDistance(0, 0, 0, 180);
      expect(distance).toBeCloseTo(20015, 0); // ~20015 km (half Earth circumference)
    });

    test('Pole to pole should calculate correctly', () => {
      const distance = haversineDistance(90, 0, -90, 0);
      expect(distance).toBeCloseTo(20015, 0); // ~20015 km
    });

    test('Equator crossing should calculate correctly', () => {
      const distance = haversineDistance(0, 0, 0, 1);
      expect(distance).toBeCloseTo(111, 0); // ~111 km per degree at equator
    });

    test('Very short distance should be accurate', () => {
      const distance = haversineDistance(40.7128, -74.0060, 40.7129, -74.0060);
      expect(distance).toBeLessThan(1); // Less than 1 km
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('determineUnitPreference', () => {
    test('Should respect explicit unit parameter', async () => {
      const unit = await determineUnitPreference({ unit: 'km' });
      expect(unit).toBe('km');

      const unit2 = await determineUnitPreference({ unit: 'mile' });
      expect(unit2).toBe('mile');
    });

    test('Should respect useMetric parameter', async () => {
      const unit = await determineUnitPreference({ useMetric: true });
      expect(unit).toBe('km');

      const unit2 = await determineUnitPreference({ useMetric: false });
      expect(unit2).toBe('mile');
    });

    test('Should use country preferences', async () => {
      const unit = await determineUnitPreference({ iso2_1: 'US', iso2_2: 'CA' });
      expect(unit).toBe('mile'); // US preference

      const unit2 = await determineUnitPreference({ iso2_1: 'FR', iso2_2: 'DE' });
      expect(unit2).toBe('km'); // Metric preference
    });

    test('Should default to km', async () => {
      const unit = await determineUnitPreference({});
      expect(unit).toBe('km');
    });
  });
});

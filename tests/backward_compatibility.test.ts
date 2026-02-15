/**
 * Backward compatibility tests to ensure existing functionality is not broken.
 * 
 * Tests verify that all original features still work correctly after adding
 * new features (distance, geofence, random coordinates).
 */

import {
  resolve,
  resolveByCountry,
  GeoIntelResult,
  ReverseGeoIntelResult,
  DataLoader
} from '../src/index';

describe('Backward Compatibility Tests', () => {
  let loader: DataLoader;

  beforeAll(async () => {
    loader = new DataLoader('./data');
    await loader.load();
  });

  describe('Forward Geocoding (Original Functionality)', () => {
    test('resolve() should work with coordinates', async () => {
      const result = await resolve(40.7128, -74.0060, { loader });

      expect(result).toBeInstanceOf(GeoIntelResult);
      expect(result.country).toBeDefined();
      expect(result.iso2).toBeDefined();
      expect(result.iso3).toBeDefined();
      expect(result.continent).toBeDefined();
      expect(result.timezone).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('resolve() should return correct country for NYC', async () => {
      const result = await resolve(40.7128, -74.0060, { loader });
      expect(result.iso2).toBe('US');
      expect(result.country).toContain('United States');
    });

    test('resolve() should return correct country for London', async () => {
      const result = await resolve(51.5074, -0.1278, { loader });
      expect(result.iso2).toBe('GB');
    });

    test('resolve() should return correct country for Tokyo', async () => {
      const result = await resolve(35.6762, 139.6503, { loader });
      expect(result.iso2).toBe('JP');
    });

    test('GeoIntelResult should have toDict method', async () => {
      const result = await resolve(40.7128, -74.0060, { loader });
      const dict = result.toDict();

      expect(dict).toHaveProperty('country');
      expect(dict).toHaveProperty('iso2');
      expect(dict).toHaveProperty('iso3');
      expect(dict).toHaveProperty('continent');
      expect(dict).toHaveProperty('timezone');
      expect(dict).toHaveProperty('confidence');
    });

    test('GeoIntelResult should have toString method', async () => {
      const result = await resolve(40.7128, -74.0060, { loader });
      const str = result.toString();

      expect(str).toContain('GeoIntelResult');
      expect(str).toContain(result.country || '');
    });
  });

  describe('Reverse Geocoding (Original Functionality)', () => {
    test('resolve() should work with country name', async () => {
      const result = await resolve('United States', { loader });

      expect(result).toBeInstanceOf(ReverseGeoIntelResult);
      if (result instanceof ReverseGeoIntelResult) {
        expect(result.latitude).toBeDefined();
        expect(result.longitude).toBeDefined();
        expect(result.country).toBeDefined();
        expect(result.iso2).toBe('US');
      }
    });

    test('resolve() should work with ISO2 code', async () => {
      const result = await resolve('US', { loader });

      expect(result).toBeInstanceOf(ReverseGeoIntelResult);
      if (result instanceof ReverseGeoIntelResult) {
        expect(result.iso2).toBe('US');
        expect(result.latitude).not.toBeNull();
        expect(result.longitude).not.toBeNull();
      }
    });

    test('resolve() should work with ISO3 code', async () => {
      const result = await resolve('USA', { loader });

      expect(result).toBeInstanceOf(ReverseGeoIntelResult);
      expect(result.iso2).toBe('US');
    });

    test('resolveByCountry() should still work (backward compatibility)', async () => {
      const result = await resolveByCountry('United States', { loader });

      expect(result).toBeInstanceOf(ReverseGeoIntelResult);
      expect(result.iso2).toBe('US');
      expect(result.latitude).not.toBeNull();
      expect(result.longitude).not.toBeNull();
    });

    test('ReverseGeoIntelResult should have toDict method', async () => {
      const result = await resolve('United States', { loader });
      const dict = result.toDict();

      expect(dict).toHaveProperty('latitude');
      expect(dict).toHaveProperty('longitude');
      expect(dict).toHaveProperty('country');
      expect(dict).toHaveProperty('iso2');
      expect(dict).toHaveProperty('iso3');
      expect(dict).toHaveProperty('continent');
      expect(dict).toHaveProperty('timezone');
    });

    test('ReverseGeoIntelResult should have toString method', async () => {
      const result = await resolve('United States', { loader });
      const str = result.toString();

      expect(str).toContain('ReverseGeoIntelResult');
      expect(str).toContain(result.country || '');
    });
  });

  describe('Edge Cases (Original Functionality)', () => {
    test('Should handle ocean locations', async () => {
      const result = await resolve(0.0, 0.0, { loader }); // Gulf of Guinea

      // May or may not resolve to a country
      if (result.country) {
        expect(result.confidence).toBeLessThan(1.0);
      }
    });

    test('Should handle border locations', async () => {
      // Near France-Germany border
      const result = await resolve(49.0, 8.2, { loader });

      expect(result.country).toBeDefined();
      // Border locations may have lower confidence
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('Should handle invalid country name', async () => {
      await expect(
        resolve('InvalidCountry123', { loader })
      ).rejects.toThrow();
    });
  });

  describe('Data Loader (Original Functionality)', () => {
    test('DataLoader should load data correctly', async () => {
      expect(loader).toBeDefined();
      // Data should be loaded in beforeAll
    });

    test('DataLoader should provide geohash index', () => {
      const index = loader.geohashIndex;
      expect(index).toBeDefined();
      expect(Object.keys(index).length).toBeGreaterThan(0);
    });

    test('DataLoader should provide polygons', () => {
      const polygons = loader.polygons;
      expect(polygons).toBeDefined();
      expect(Object.keys(polygons).length).toBeGreaterThan(0);
    });

    test('DataLoader should provide metadata', () => {
      const metadata = loader.metadata;
      expect(metadata).toBeDefined();
      expect(Object.keys(metadata).length).toBeGreaterThan(0);
    });
  });

  describe('Integration - All Features Together', () => {
    test('Original resolve() should work alongside new features', async () => {
      // Test that original functionality still works
      const result = await resolve(40.7128, -74.0060, { loader });
      expect(result.iso2).toBe('US');

      // New features should also work
      const { calculateDistance } = await import('../src/distance');
      const distanceResult = await calculateDistance(
        [40.7128, -74.0060],
        [34.0522, -118.2437],
        {
          resolve: async (input: string) => {
            const r = await resolve(input, { loader });
            return {
              latitude: r instanceof ReverseGeoIntelResult ? r.latitude : null,
              longitude: r instanceof ReverseGeoIntelResult ? r.longitude : null,
              iso2: r.iso2 || null
            };
          }
        }
      );
      expect(distanceResult.distance).toBeGreaterThan(0);
    });
  });
});

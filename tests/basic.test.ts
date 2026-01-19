/**
 * Basic unit tests for geo-intel-offline library.
 */

import { resolve, DataLoader, ReverseGeoIntelResult } from '../src/index';
import { encode, decode, getNeighbors } from '../src/geohash';
import { pointInPolygon, pointInPolygonWithHoles } from '../src/pip';

describe('Basic Functionality Tests', () => {
  let loader: DataLoader;

  beforeAll(async () => {
    loader = new DataLoader('./data');
    await loader.load();
  });

  describe('Geohash Encoding/Decoding', () => {
    test('should encode coordinates to geohash', () => {
      const geohash = encode(40.7128, -74.0060);
      expect(geohash).toBeDefined();
      expect(geohash.length).toBe(6);
    });

    test('should decode geohash to coordinates', () => {
      const geohash = encode(40.7128, -74.0060);
      const decoded = decode(geohash);
      
      expect(decoded.lat).toBeCloseTo(40.7128, 1);
      expect(decoded.lon).toBeCloseTo(-74.0060, 1);
    });

    test('should get neighbors', () => {
      const geohash = encode(40.7128, -74.0060);
      const neighbors = getNeighbors(geohash);
      
      expect(neighbors.length).toBe(8);
      expect(neighbors.every(n => n.length === geohash.length)).toBe(true);
    });
  });

  describe('Point-in-Polygon', () => {
    test('should detect point inside polygon', () => {
      // Simple square polygon
      const polygon = [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0]
      ] as any;
      
      const point: [number, number] = [0.5, 0.5];
      expect(pointInPolygon(point, polygon)).toBe(true);
    });

    test('should detect point outside polygon', () => {
      const polygon = [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0]
      ] as any;
      
      const point: [number, number] = [2, 2];
      expect(pointInPolygon(point, polygon)).toBe(false);
    });

    test('should handle polygons with holes', () => {
      const exterior = [
        [0, 0],
        [0, 2],
        [2, 2],
        [2, 0]
      ] as any;
      
      const hole = [
        [0.5, 0.5],
        [0.5, 1.5],
        [1.5, 1.5],
        [1.5, 0.5]
      ] as any;
      
      const pointInside: [number, number] = [0.25, 0.25];
      const pointInHole: [number, number] = [1, 1];
      
      expect(pointInPolygonWithHoles(pointInside, exterior, [hole])).toBe(true);
      expect(pointInPolygonWithHoles(pointInHole, exterior, [hole])).toBe(false);
    });
  });

  describe('Forward Geocoding', () => {
    test('should resolve New York coordinates', async () => {
      const result = await resolve(40.7128, -74.0060, { loader });
      
      expect(result.country).toBeDefined();
      expect(result.iso2).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should resolve London coordinates', async () => {
      const result = await resolve(51.5074, -0.1278, { loader });
      
      expect(result.country).toBeDefined();
      expect(result.iso2).toBeDefined();
    });
  });

  describe('Reverse Geocoding', () => {
    test('should resolve country name to coordinates', async () => {
      const result = await resolve('United States', { loader }) as ReverseGeoIntelResult;
      
      expect(result.latitude).not.toBeNull();
      expect(result.longitude).not.toBeNull();
      expect(result.country).toBeDefined();
      expect(result.iso2).toBe('US');
    });

    test('should resolve ISO2 code to coordinates', async () => {
      const result = await resolve('US', { loader }) as ReverseGeoIntelResult;
      
      expect(result.latitude).not.toBeNull();
      expect(result.longitude).not.toBeNull();
      expect(result.iso2).toBe('US');
    });

    test('should resolve ISO3 code to coordinates', async () => {
      const result = await resolve('USA', { loader }) as ReverseGeoIntelResult;
      
      expect(result.latitude).not.toBeNull();
      expect(result.longitude).not.toBeNull();
      expect(result.iso3).toBe('USA');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid coordinates', () => {
      expect(() => encode(100, 0)).toThrow();
      expect(() => encode(0, 200)).toThrow();
    });

    test('should throw error for invalid country', async () => {
      await expect(resolve('InvalidCountry123', { loader })).rejects.toThrow();
    });
  });
});

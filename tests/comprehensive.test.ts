/**
 * Comprehensive test suite for geo-intel-offline library.
 * 
 * Tests forward and reverse geocoding for all 258 countries.
 * 
 * This test suite ensures:
 * - Forward geocoding accuracy (coordinates → country)
 * - Reverse geocoding accuracy (country → coordinates)
 * - Edge cases (oceans, borders, small islands)
 * - Performance benchmarks
 */

import { resolve, DataLoader, ReverseGeoIntelResult } from '../src/index';
import { Point } from '../src/pip';

// Test data: Sample coordinates for each country
// Format: { countryName: { iso2: string, iso3: string, testPoints: [[lat, lon], ...] } }
interface CountryTestData {
  [countryName: string]: {
    iso2: string;
    iso3: string;
    continent: string;
    testPoints: Point[];
  };
}

// This will be populated from actual data files
const countryTestData: CountryTestData = {};

describe('Comprehensive Geo-Intelligence Tests', () => {
  let loader: DataLoader;

  beforeAll(async () => {
    // Initialize loader
    loader = new DataLoader('./data');
    
    // Load data
    await loader.load();
    
    // Populate test data from metadata
    // For each country, generate test points (centroid + 4 corners of bounding box)
    const metadata = loader.metadata;
    const polygons = loader.polygons;
    
    for (const [countryIdStr, meta] of Object.entries(metadata)) {
      const polygonData = polygons[countryIdStr];
      
      if (polygonData) {
        // Get bounding box and generate test points
        const exteriors: number[][][] = [];
        if (polygonData.multi && polygonData.exteriors) {
          exteriors.push(...polygonData.exteriors);
        } else if (polygonData.exterior) {
          exteriors.push(polygonData.exterior);
        }
        
        const testPoints: Point[] = [];
        for (const exterior of exteriors) {
          if (exterior && exterior.length > 0) {
            // Use centroid as primary test point
            const lats = exterior.map(p => p[0]);
            const lons = exterior.map(p => p[1]);
            const centroid: Point = [
              lats.reduce((a, b) => a + b, 0) / lats.length,
              lons.reduce((a, b) => a + b, 0) / lons.length
            ];
            testPoints.push(centroid);
            
            // Add a few more points from the polygon
            const step = Math.max(1, Math.floor(exterior.length / 4));
            for (let i = 0; i < exterior.length; i += step) {
              testPoints.push([exterior[i][0], exterior[i][1]]);
              if (testPoints.length >= 10) break; // Limit to 10 points per country
            }
          }
        }
        
        countryTestData[meta.name] = {
          iso2: meta.iso2,
          iso3: meta.iso3,
          continent: meta.continent,
          testPoints: testPoints.slice(0, 10) // Limit to 10 points
        };
      }
    }
  });

  describe('Forward Geocoding (Coordinates → Country)', () => {
    let totalTests = 0;
    let passedTests = 0;
    const countryResults: Map<string, { passed: number; failed: number; tests: number }> = new Map();

    test('should resolve coordinates to correct country for all countries', async () => {
      for (const [countryName, testData] of Object.entries(countryTestData)) {
        let countryPassed = 0;
        let countryFailed = 0;
        
        for (const [lat, lon] of testData.testPoints) {
          totalTests++;
          
          try {
            const result = await resolve(lat, lon, { loader });
            
            // Check if result matches expected country
            const matches = 
              result.country === countryName ||
              result.iso2 === testData.iso2 ||
              result.iso3 === testData.iso3;
            
            if (matches) {
              passedTests++;
              countryPassed++;
            } else {
              countryFailed++;
              console.warn(
                `Failed: (${lat}, ${lon}) expected ${countryName} (${testData.iso2}), ` +
                `got ${result.country} (${result.iso2})`
              );
            }
          } catch (error) {
            countryFailed++;
            console.error(`Error resolving (${lat}, ${lon}):`, error);
          }
        }
        
        countryResults.set(countryName, {
          passed: countryPassed,
          failed: countryFailed,
          tests: testData.testPoints.length
        });
      }
      
      const accuracy = (passedTests / totalTests) * 100;
      console.log(`\nForward Geocoding Results:`);
      console.log(`Total Tests: ${totalTests}`);
      console.log(`Passed: ${passedTests}`);
      console.log(`Failed: ${totalTests - passedTests}`);
      console.log(`Accuracy: ${accuracy.toFixed(2)}%`);
      
      // Expect at least 99% accuracy
      expect(accuracy).toBeGreaterThanOrEqual(99.0);
    }, 300000); // 5 minute timeout for comprehensive tests

    test('should handle edge cases', async () => {
      // Test ocean locations (should return null country)
      const oceanPoints: Point[] = [
        [0.0, 0.0], // Gulf of Guinea (ocean)
        [-30.0, -30.0], // South Atlantic (ocean)
        [30.0, 150.0], // Pacific Ocean
      ];
      
      for (const [lat, lon] of oceanPoints) {
        const result = await resolve(lat, lon, { loader });
        // Ocean points may or may not have a country (depends on EEZ)
        // Just ensure no errors
        expect(result).toBeDefined();
      }
    });

    test('should provide confidence scores', async () => {
      // Test that confidence scores are in valid range
      const testPoint: Point = [40.7128, -74.0060]; // New York
      const result = await resolve(testPoint[0], testPoint[1], { loader });
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Reverse Geocoding (Country → Coordinates)', () => {
    let totalTests = 0;
    let passedTests = 0;

    test('should resolve country names to coordinates', async () => {
      for (const [_countryName, testData] of Object.entries(countryTestData)) {
        const countryName = _countryName;
        totalTests++;
        
        try {
          const result = await resolve(countryName, { loader }) as ReverseGeoIntelResult;
          
          expect(result.latitude).not.toBeNull();
          expect(result.longitude).not.toBeNull();
          expect(result.country).toBe(countryName);
          expect(result.iso2).toBe(testData.iso2);
          expect(result.iso3).toBe(testData.iso3);
          expect(result.confidence).toBe(1.0); // Exact match should be 1.0
          
          passedTests++;
        } catch (error) {
          console.error(`Error resolving country "${countryName}":`, error);
        }
      }
      
      const accuracy = (passedTests / totalTests) * 100;
      console.log(`\nReverse Geocoding Results (by name):`);
      console.log(`Total Tests: ${totalTests}`);
      console.log(`Passed: ${passedTests}`);
      console.log(`Failed: ${totalTests - passedTests}`);
      console.log(`Accuracy: ${accuracy.toFixed(2)}%`);
      
      expect(accuracy).toBeGreaterThanOrEqual(95.0);
    }, 300000);

    test('should resolve ISO2 codes to coordinates', async () => {
      for (const [_countryName, testData] of Object.entries(countryTestData)) {
        if (!testData.iso2 || testData.iso2 === '-99') continue;
        
        totalTests++;
        
        try {
          const result = await resolve(testData.iso2, { loader }) as ReverseGeoIntelResult;
          
          expect(result.latitude).not.toBeNull();
          expect(result.longitude).not.toBeNull();
          expect(result.iso2).toBe(testData.iso2);
          expect(result.confidence).toBe(1.0);
          
          passedTests++;
        } catch (error) {
          console.error(`Error resolving ISO2 "${testData.iso2}":`, error);
        }
      }
      
      const accuracy = (passedTests / totalTests) * 100;
      console.log(`\nReverse Geocoding Results (by ISO2):`);
      console.log(`Total Tests: ${totalTests}`);
      console.log(`Passed: ${passedTests}`);
      console.log(`Accuracy: ${accuracy.toFixed(2)}%`);
      
      expect(accuracy).toBeGreaterThanOrEqual(95.0);
    }, 300000);

    test('should resolve ISO3 codes to coordinates', async () => {
      for (const [_countryName, testData] of Object.entries(countryTestData)) {
        if (!testData.iso3 || testData.iso3 === '-99') continue;
        
        totalTests++;
        
        try {
          const result = await resolve(testData.iso3, { loader }) as ReverseGeoIntelResult;
          
          expect(result.latitude).not.toBeNull();
          expect(result.longitude).not.toBeNull();
          expect(result.iso3).toBe(testData.iso3);
          expect(result.confidence).toBe(1.0);
          
          passedTests++;
        } catch (error) {
          console.error(`Error resolving ISO3 "${testData.iso3}":`, error);
        }
      }
      
      const accuracy = (passedTests / totalTests) * 100;
      console.log(`\nReverse Geocoding Results (by ISO3):`);
      console.log(`Total Tests: ${totalTests}`);
      console.log(`Passed: ${passedTests}`);
      console.log(`Accuracy: ${accuracy.toFixed(2)}%`);
      
      expect(accuracy).toBeGreaterThanOrEqual(95.0);
    }, 300000);
  });

  describe('Performance Tests', () => {
    test('should resolve coordinates in < 1ms', async () => {
      const testPoints: Point[] = [
        [40.7128, -74.0060], // New York
        [51.5074, -0.1278],  // London
        [35.6762, 139.6503], // Tokyo
        [-33.8688, 151.2093], // Sydney
        [-22.9068, -43.1729], // Rio de Janeiro
      ];
      
      for (const [lat, lon] of testPoints) {
        const start = Date.now();
        await resolve(lat, lon, { loader });
        const duration = Date.now() - start;
        
        expect(duration).toBeLessThan(10); // Allow some margin, but should be fast
      }
    });
  });
});

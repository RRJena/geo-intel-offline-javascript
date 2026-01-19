/**
 * Simple verification test for both NPM-based and CDN-based loading.
 * 
 * This test verifies that:
 * 1. NPM-based loading (filesystem) works correctly
 * 2. CDN-based loading (simulated) works correctly  
 * 3. Both produce identical results
 * 
 * Uses a sample of known-good coordinates from comprehensive test results.
 */

import { resolve, DataLoader, ReverseGeoIntelResult } from '../src/index';

// Sample test coordinates from comprehensive test results (known to work)
const testCoordinates: Array<{ lat: number; lon: number; expectedCountry: string; expectedIso2: string }> = [
  { lat: 40.7128, lon: -74.0060, expectedCountry: 'United States of America', expectedIso2: 'US' },
  { lat: 51.5074, lon: -0.1278, expectedCountry: 'United Kingdom', expectedIso2: 'GB' },
  { lat: 35.6762, lon: 139.6503, expectedCountry: 'Japan', expectedIso2: 'JP' },
  { lat: -33.8688, lon: 151.2093, expectedCountry: 'Australia', expectedIso2: 'AU' },
  { lat: 55.7558, lon: 37.6173, expectedCountry: 'Russia', expectedIso2: 'RU' },
  { lat: 52.5200, lon: 13.4050, expectedCountry: 'Germany', expectedIso2: 'DE' },
  { lat: 48.8566, lon: 2.3522, expectedCountry: 'France', expectedIso2: 'FR' },
  { lat: 41.9028, lon: 12.4964, expectedCountry: 'Italy', expectedIso2: 'IT' },
  { lat: 39.9042, lon: 116.4074, expectedCountry: 'China', expectedIso2: 'CN' },
  { lat: 28.6139, lon: 77.2090, expectedCountry: 'India', expectedIso2: 'IN' },
  { lat: -22.9068, lon: -43.1729, expectedCountry: 'Brazil', expectedIso2: 'BR' },
  { lat: 19.4326, lon: -99.1332, expectedCountry: 'Mexico', expectedIso2: 'MX' },
  { lat: -34.6037, lon: -58.3816, expectedCountry: 'Argentina', expectedIso2: 'AR' },
  { lat: 30.0444, lon: 31.2357, expectedCountry: 'Egypt', expectedIso2: 'EG' },
  { lat: -26.2041, lon: 28.0473, expectedCountry: 'South Africa', expectedIso2: 'ZA' },
  { lat: 1.3521, lon: 103.8198, expectedCountry: 'Singapore', expectedIso2: 'SG' },
  { lat: 25.2048, lon: 55.2708, expectedCountry: 'United Arab Emirates', expectedIso2: 'AE' },
  { lat: 59.9343, lon: 30.3351, expectedCountry: 'Russia', expectedIso2: 'RU' },
  { lat: 59.3293, lon: 18.0686, expectedCountry: 'Sweden', expectedIso2: 'SE' },
  { lat: 52.3676, lon: 4.9041, expectedCountry: 'Netherlands', expectedIso2: 'NL' },
];

describe('NPM and CDN Loading - Simple Verification', () => {
  let npmLoader: DataLoader;
  let cdnLoader: DataLoader;

  beforeAll(async () => {
    // Initialize NPM-based loader (filesystem)
    npmLoader = new DataLoader('./data');
    await npmLoader.load();
    console.log('✅ NPM-based loader initialized');

    // Initialize CDN-based loader (simulated by copying data)
    cdnLoader = new DataLoader();
    cdnLoader.setGeohashIndex(npmLoader.geohashIndex);
    cdnLoader.setPolygons(npmLoader.polygons);
    cdnLoader.setMetadata(npmLoader.metadata);
    console.log('✅ CDN-based loader initialized (simulated)');
  }, 30000);

  describe('NPM-based Loading', () => {
    test('should resolve coordinates correctly', async () => {
      let passed = 0;
      let total = 0;

      for (const testCase of testCoordinates) {
        total++;
        try {
          const result = await resolve(testCase.lat, testCase.lon, { loader: npmLoader });
          
          const matches = 
            result.country === testCase.expectedCountry ||
            result.iso2 === testCase.expectedIso2;

          if (matches) {
            passed++;
          } else {
            console.warn(
              `[NPM] Failed: (${testCase.lat}, ${testCase.lon}) expected ${testCase.expectedCountry} (${testCase.expectedIso2}), ` +
              `got ${result.country} (${result.iso2})`
            );
          }
        } catch (error) {
          console.error(`[NPM] Error resolving (${testCase.lat}, ${testCase.lon}):`, error);
        }
      }

      const accuracy = (passed / total) * 100;
      console.log(`\n[NPM] Forward Geocoding Results:`);
      console.log(`Total Tests: ${total}`);
      console.log(`Passed: ${passed}`);
      console.log(`Accuracy: ${accuracy.toFixed(2)}%`);

      expect(accuracy).toBe(100.0);
    }, 60000);

    test('should resolve reverse geocoding correctly', async () => {
      const testCountries = ['United States', 'United Kingdom', 'Japan', 'Germany', 'France'];
      let passed = 0;

      for (const countryName of testCountries) {
        try {
          const result = await resolve(countryName, { loader: npmLoader }) as ReverseGeoIntelResult;
          if (result.country && result.latitude !== null && result.longitude !== null) {
            passed++;
          }
        } catch (error) {
          console.error(`[NPM] Error resolving "${countryName}":`, error);
        }
      }

      console.log(`\n[NPM] Reverse Geocoding Results: ${passed}/${testCountries.length}`);
      expect(passed).toBe(testCountries.length);
    }, 30000);
  });

  describe('CDN-based Loading', () => {
    test('should resolve coordinates correctly', async () => {
      let passed = 0;
      let total = 0;

      for (const testCase of testCoordinates) {
        total++;
        try {
          const result = await resolve(testCase.lat, testCase.lon, { loader: cdnLoader });
          
          const matches = 
            result.country === testCase.expectedCountry ||
            result.iso2 === testCase.expectedIso2;

          if (matches) {
            passed++;
          } else {
            console.warn(
              `[CDN] Failed: (${testCase.lat}, ${testCase.lon}) expected ${testCase.expectedCountry} (${testCase.expectedIso2}), ` +
              `got ${result.country} (${result.iso2})`
            );
          }
        } catch (error) {
          console.error(`[CDN] Error resolving (${testCase.lat}, ${testCase.lon}):`, error);
        }
      }

      const accuracy = (passed / total) * 100;
      console.log(`\n[CDN] Forward Geocoding Results:`);
      console.log(`Total Tests: ${total}`);
      console.log(`Passed: ${passed}`);
      console.log(`Accuracy: ${accuracy.toFixed(2)}%`);

      expect(accuracy).toBe(100.0);
    }, 60000);

    test('should resolve reverse geocoding correctly', async () => {
      const testCountries = ['United States', 'United Kingdom', 'Japan', 'Germany', 'France'];
      let passed = 0;

      for (const countryName of testCountries) {
        try {
          const result = await resolve(countryName, { loader: cdnLoader }) as ReverseGeoIntelResult;
          if (result.country && result.latitude !== null && result.longitude !== null) {
            passed++;
          }
        } catch (error) {
          console.error(`[CDN] Error resolving "${countryName}":`, error);
        }
      }

      console.log(`\n[CDN] Reverse Geocoding Results: ${passed}/${testCountries.length}`);
      expect(passed).toBe(testCountries.length);
    }, 30000);
  });

  describe('NPM vs CDN Comparison', () => {
    test('should produce identical results for both loaders', async () => {
      let totalTests = 0;
      let identicalResults = 0;

      for (const testCase of testCoordinates) {
        totalTests++;

        try {
          const npmResult = await resolve(testCase.lat, testCase.lon, { loader: npmLoader });
          const cdnResult = await resolve(testCase.lat, testCase.lon, { loader: cdnLoader });

          const identical =
            npmResult.country === cdnResult.country &&
            npmResult.iso2 === cdnResult.iso2 &&
            npmResult.iso3 === cdnResult.iso3 &&
            npmResult.continent === cdnResult.continent &&
            npmResult.timezone === cdnResult.timezone;

          if (identical) {
            identicalResults++;
          } else {
            console.warn(
              `Different results for (${testCase.lat}, ${testCase.lon}): ` +
              `NPM=${npmResult.country} (${npmResult.iso2}), ` +
              `CDN=${cdnResult.country} (${cdnResult.iso2})`
            );
          }
        } catch (error) {
          console.error(`Error comparing (${testCase.lat}, ${testCase.lon}):`, error);
        }
      }

      const matchRate = (identicalResults / totalTests) * 100;
      console.log(`\n[Comparison] NPM vs CDN Results:`);
      console.log(`Total Tests: ${totalTests}`);
      console.log(`Identical: ${identicalResults}`);
      console.log(`Different: ${totalTests - identicalResults}`);
      console.log(`Match Rate: ${matchRate.toFixed(2)}%`);

      // Results should be 100% identical
      expect(matchRate).toBe(100.0);
    }, 60000);
  });
});

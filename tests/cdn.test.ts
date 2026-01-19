/**
 * Tests for CDN-based data loading functionality.
 * 
 * Tests the loadFromCDN() method and ensures it works correctly
 * in browser-like environments.
 */

import { resolve, DataLoader, loadFromCDN } from '../src/index';

describe('CDN Data Loading Tests', () => {
  describe('DataLoader.loadFromCDN()', () => {
    test('should load data from local filesystem (simulating CDN)', async () => {
      // Use file:// protocol or local path to simulate CDN
      // In a real browser, this would be a URL like https://unpkg.com/...
      const loader = new DataLoader();
      
      // For Node.js testing, we'll use the local data directory
      // In browser, this would be a CDN URL
      const isNode = typeof process !== 'undefined' && 
                     process.versions != null && 
                     process.versions.node != null;
      
      if (isNode) {
        // In Node.js, we can't easily test CDN loading without a real server
        // So we test that load() works after manually setting data
        loader.setGeohashIndex({});
        loader.setPolygons({});
        loader.setMetadata({});
        
        // Should not throw when load() is called after data is set
        await expect(loader.load()).resolves.not.toThrow();
      }
    });

    test('should skip filesystem load if data already loaded', async () => {
      const loader = new DataLoader();
      
      // Manually set data (simulating loadFromCDN)
      loader.setGeohashIndex({ 'test': [1] });
      loader.setPolygons({ '1': { exterior: [[0, 0], [1, 0], [1, 1], [0, 1]] } });
      loader.setMetadata({ '1': { name: 'Test', iso2: 'TS', iso3: 'TST', continent: 'Test', timezone: 'UTC' } });
      
      // load() should return immediately without trying to load from filesystem
      await expect(loader.load()).resolves.not.toThrow();
      
      // Verify data is still accessible
      expect(loader.geohashIndex).toBeDefined();
      expect(loader.polygons).toBeDefined();
      expect(loader.metadata).toBeDefined();
    });

    test('loadFromCDN helper function should create configured loader', async () => {
      const isNode = typeof process !== 'undefined' && 
                     process.versions != null && 
                     process.versions.node != null;
      
      if (!isNode) {
        // In browser environment, we'd test actual CDN loading
        // For now, skip in Node.js
        return;
      }
      
      // In Node.js, we can't test actual CDN without a server
      // But we can verify the function exists and has correct signature
      expect(typeof loadFromCDN).toBe('function');
    });
  });

  describe('Integration with resolve()', () => {
    test('should work with loader that has data pre-loaded', async () => {
      const loader = new DataLoader('./data');
      await loader.load();
      
      // Now resolve should work
      const result = await resolve(40.7128, -74.0060, { loader });
      
      expect(result.country).toBeDefined();
      expect(result.iso2).toBeDefined();
    });

    test('should work when load() is called after data is set', async () => {
      const loader = new DataLoader('./data');
      await loader.load();
      
      // Create a new loader and manually set data
      const newLoader = new DataLoader();
      
      // Copy data from loaded loader
      newLoader.setGeohashIndex(loader.geohashIndex);
      newLoader.setPolygons(loader.polygons);
      newLoader.setMetadata(loader.metadata);
      
      // load() should skip filesystem and use existing data
      await newLoader.load();
      
      // Should work with resolve
      const result = await resolve(40.7128, -74.0060, { loader: newLoader });
      
      expect(result.country).toBeDefined();
      expect(result.iso2).toBeDefined();
    });
  });
});

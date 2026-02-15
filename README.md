# geo-intel-offline (JavaScript/TypeScript)

[![npm version](https://img.shields.io/npm/v/geo-intel-offline.svg)](https://www.npmjs.com/package/geo-intel-offline)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Development Status](https://img.shields.io/badge/status-production--ready-brightgreen.svg)](https://www.npmjs.com/package/geo-intel-offline)

**Production-ready, offline geo-intelligence library** for resolving latitude/longitude coordinates to country, ISO codes, continent, timezone, and confidence scores. No API keys, no network requests, 100% deterministic.

## 📋 Table of Contents

1. [Why This Library Exists](#-why-this-library-exists)
2. [Features](#-features)
3. [Installation](#-installation)
4. [Quick Start](#-quick-start)
5. [API Reference](#-api-reference)
6. [Examples](#-examples)
7. [Use Cases](#-use-cases)
8. [Performance & Accuracy](#-performance--accuracy)
9. [Architecture](#-architecture)
10. [Browser Usage](#-browser-usage)
11. [CDN Usage](#-cdn-usage)
12. [Troubleshooting](#-troubleshooting)
13. [Contributing](#-contributing)
14. [Changelog](#-changelog)

---

## 🌟 Why This Library Exists

Every developer working with geolocation has faced the same frustration: you need to know what country a set of coordinates belongs to, but all the solutions either cost money, require API keys, need constant internet connectivity, or have restrictive rate limits. What if you're building an offline application? What if you're processing millions of records and API costs become prohibitive? What if you need deterministic results without external dependencies?

**We built `geo-intel-offline` to solve these real-world problems.**

This library was born from the need for a **reliable, fast, and completely free** solution that works everywhere—from edge devices in remote locations to high-throughput data processing pipelines. No subscriptions, no rate limits, no vendor lock-in. Just pure JavaScript/TypeScript that does one thing exceptionally well: **tell you where in the world a coordinate belongs.**

Whether you're building a mobile app that works offline, processing billions of GPS logs, enriching datasets without external APIs, or creating applications for regions with unreliable internet—this library empowers you to add geo-intelligence to your projects without compromise.

## ✨ Features

### Core Features
- 🚀 **Fast**: < 1ms per lookup, < 15MB memory footprint
- 📦 **Offline**: Zero network dependencies, works completely offline
- 🎯 **Accurate**: 100% accuracy across 258 countries
- 🔒 **Deterministic**: Same input always produces same output
- 🗜️ **Optimized**: 66% size reduction with automatic compression
- 🌍 **Comprehensive**: Supports all countries, continents, and territories
- 🎨 **Clean API**: Unified function for forward and reverse geocoding
- 🔧 **TypeScript**: Full TypeScript support with type definitions
- 💰 **Free Forever**: No API costs, no rate limits, no hidden fees
- 🌐 **Universal**: Works in Node.js, browsers, and modern JavaScript environments

### New Features (v1.1.0+)
- 📏 **Distance Calculation**: Calculate distances between any two locations (coordinates, countries, continents) with automatic unit detection (km/miles)
- 🎯 **Geo-fencing**: Monitor location proximity with state tracking (OUTSIDE, APPROACHING, INSIDE, LEAVING) and configurable alerts
- 🎲 **Random Coordinates**: Generate random coordinates within countries, continents, or circular areas with point-in-polygon validation
- 🔄 **Multiple Algorithms**: Haversine, Vincenty, and Spherical Law of Cosines for distance calculations
- 🌍 **Smart Unit Detection**: Automatically detects km/miles based on country preferences (US, GB, LR, MM use miles)

## 📦 Installation

### From npm (Recommended)

```bash
npm install geo-intel-offline
```

or with yarn:

```bash
yarn add geo-intel-offline
```

or with pnpm:

```bash
pnpm add geo-intel-offline
```

### CDN Usage (Browser)

**Important:** When using the library in a browser via CDN, you need to load the data files separately. The library provides a convenient `loadFromCDN()` method for this.

**Method 1: Using loadFromCDN() helper (Recommended)**

```html
<!-- Load the library from CDN -->
<script src="https://unpkg.com/geo-intel-offline@latest/dist/index.umd.min.js"></script>
<script>
  (async function() {
    // Load data from CDN (data files are included in npm package, accessible via unpkg/jsdelivr)
    const loader = await GeoIntelOffline.loadFromCDN('https://unpkg.com/geo-intel-offline@latest/data', {
      useGzip: true  // Use compressed files for faster loading
    });
    
    // Now you can use resolve with the loader
    const result = await GeoIntelOffline.resolve(40.7128, -74.0060, { loader });
    console.log(result.country); // "United States of America"
  })();
</script>
```

**Method 2: Using the loadFromCDN helper function**

```html
<script src="https://unpkg.com/geo-intel-offline@latest/dist/index.umd.min.js"></script>
<script>
  (async function() {
    // Helper function that creates and configures a loader
    const loader = await GeoIntelOffline.loadFromCDN('https://your-cdn.com/data');
    
    const result = await GeoIntelOffline.resolve(40.7128, -74.0060, { loader });
    console.log(result.country);
  })();
</script>
```

**Note:** The data files are included in the npm package, so when published, they will be automatically available via unpkg/jsdelivr at `https://unpkg.com/geo-intel-offline@latest/data/`. For local development, you can serve the `data/` folder via a local HTTP server. See [Browser Usage](#-browser-usage) section for more details.

## 🚀 Quick Start

### Basic Usage

The `resolve()` function automatically detects forward or reverse geocoding based on arguments:

**Forward Geocoding** (Coordinates → Country):

```typescript
import { resolve } from 'geo-intel-offline';

const result = await resolve(40.7128, -74.0060); // New York City

console.log(result.country);      // "United States of America"
console.log(result.iso2);         // "US"
console.log(result.iso3);         // "USA"
console.log(result.continent);    // "North America"
console.log(result.timezone);     // "America/New_York"
console.log(result.confidence);   // 0.98
```

**Reverse Geocoding** (Country → Coordinates):

```typescript
import { resolve } from 'geo-intel-offline';

// Just pass country name or ISO code as a string
const result = await resolve("United States");
console.log(result.latitude);     // Country centroid latitude
console.log(result.longitude);     // Country centroid longitude
console.log(result.iso2);         // "US"

// Works with ISO codes
const result2 = await resolve("US");   // ISO2 code
const result3 = await resolve("USA");  // ISO3 code
```

### Step-by-Step Guide

#### Step 1: Install the Package

```bash
npm install geo-intel-offline
```

#### Step 2: Import and Use

```typescript
import { resolve } from 'geo-intel-offline';

// Forward geocoding: Resolve coordinates to country
const result = await resolve(51.5074, -0.1278); // London, UK

// Access results as attributes
console.log(`Country: ${result.country}`);
console.log(`ISO2 Code: ${result.iso2}`);
console.log(`ISO3 Code: ${result.iso3}`);
console.log(`Continent: ${result.continent}`);
console.log(`Timezone: ${result.timezone}`);
console.log(`Confidence: ${result.confidence.toFixed(2)}`);

// Reverse geocoding: Resolve country to coordinates
const reverseResult = await resolve("United Kingdom");
console.log(`UK centroid: (${reverseResult.latitude}, ${reverseResult.longitude})`);
console.log(`ISO2: ${reverseResult.iso2}`);
```

#### Step 3: Handle Edge Cases

```typescript
import { resolve } from 'geo-intel-offline';

// Ocean locations (no country)
const result = await resolve(0.0, 0.0); // Gulf of Guinea (ocean)
if (result.country === null) {
  console.log("No country found (likely ocean)");
  console.log(`Confidence: ${result.confidence}`); // Will be 0.0
}

// Border regions (may have lower confidence)
const borderResult = await resolve(49.0, 8.2); // Near France-Germany border
if (borderResult.confidence < 0.7) {
  console.log(`Low confidence: ${borderResult.confidence.toFixed(2)} (near border)`);
}
```

#### Step 4: Use New Features

```typescript
import { calculateDistance, checkGeofence, generateRandomCoordinatesByArea } from 'geo-intel-offline';

// Distance calculation
const distance = await calculateDistance(
  [40.7128, -74.0060],  // NYC
  [34.0522, -118.2437], // LA
  {
    resolve: async (input) => {
      const r = await resolve(input);
      return {
        latitude: r instanceof ReverseGeoIntelResult ? r.latitude : null,
        longitude: r instanceof ReverseGeoIntelResult ? r.longitude : null,
        iso2: r.iso2 || null
      };
    }
  }
);
console.log(`${distance.distance.toFixed(2)} ${distance.unit}`); // "2448.50 mile"

// Geo-fencing
const geofence = await checkGeofence(
  [40.7128, -74.0060],
  [40.7130, -74.0060],
  1000,  // 1000 meters
  'm',
  {
    resolve: async (input) => {
      const r = await resolve(input);
      return {
        latitude: r instanceof ReverseGeoIntelResult ? r.latitude : null,
        longitude: r instanceof ReverseGeoIntelResult ? r.longitude : null
      };
    }
  }
);
console.log(`Inside: ${geofence.isInside}, State: ${geofence.state}`);

// Random coordinates
const randomCoords = generateRandomCoordinatesByArea(
  [40.7128, -74.0060],  // NYC
  10,                    // 10 km
  5,
  { radiusUnit: 'km', seed: 42 }
);
console.log(`Generated ${randomCoords.totalGenerated} coordinates`);
```

## 📚 API Reference

### `resolve(...args, options?)`

Unified function for both forward and reverse geocoding. Automatically detects mode based on arguments.

**Forward Geocoding** (Coordinates → Country):
- Pass two numeric arguments: `resolve(lat, lon)`
- Example: `resolve(40.7128, -74.0060)`

**Reverse Geocoding** (Country → Coordinates):
- Pass one string argument: `resolve("Country Name")` or `resolve("ISO Code")`
- Example: `resolve("United States")` or `resolve("US")`

**Parameters:**

**Positional Arguments:**
- **Forward geocoding**: `(lat: number, lon: number)` - Two numeric values
- **Reverse geocoding**: `(country: string)` - One string (country name or ISO code)

**Options (optional object as last parameter):**
- `dataDir` (string, optional): Custom data directory path (Node.js only)
- `loader` (DataLoader, optional): Pre-configured loader instance

**Returns:**

- **Forward Geocoding**: `Promise<GeoIntelResult>` with:
  - `country` (string | null): Country name
  - `iso2` (string | null): ISO 3166-1 alpha-2 code
  - `iso3` (string | null): ISO 3166-1 alpha-3 code
  - `continent` (string | null): Continent name
  - `timezone` (string | null): IANA timezone identifier
  - `confidence` (number): Confidence score (0.0 to 1.0)
  - `toDict()`: Convert to plain object

- **Reverse Geocoding**: `Promise<ReverseGeoIntelResult>` with:
  - `latitude` (number | null): Country centroid latitude
  - `longitude` (number | null): Country centroid longitude
  - `country` (string | null): Country name
  - `iso2` (string | null): ISO 3166-1 alpha-2 code
  - `iso3` (string | null): ISO 3166-1 alpha-3 code
  - `continent` (string | null): Continent name
  - `timezone` (string | null): IANA timezone identifier
  - `confidence` (number): Always 1.0 for exact country match
  - `toDict()`: Convert to plain object

### `resolveByCountry(countryInput, options?)`

Resolve country name or ISO code to coordinates and metadata.

**Parameters:**
- `countryInput` (string): Country name or ISO code (ISO2/ISO3)
- `options` (object, optional): Same as `resolve()` options

**Returns:** `Promise<ReverseGeoIntelResult>`

### `loadFromCDN(baseUrl, options?)`

Helper function to load data from CDN and create a configured loader. This is a convenience function for browser/CDN usage.

**Parameters:**
- `baseUrl` (string): Base URL for data files (e.g., 'https://unpkg.com/geo-intel-offline@latest/data')
- `options` (object, optional):
  - `useGzip` (boolean, optional): Whether to use .gz files (default: true)
  - `filenames` (object, optional): Custom filenames
    - `geohashIndex` (string): Filename for geohash index (default: 'geohash_index.json')
    - `polygons` (string): Filename for polygons (default: 'polygons.json')
    - `metadata` (string): Filename for metadata (default: 'metadata.json')

**Returns:** `Promise<DataLoader>` - Configured DataLoader instance ready to use

**Example:**
```typescript
import { loadFromCDN, resolve } from 'geo-intel-offline';

// Load from CDN
const loader = await loadFromCDN('https://your-cdn.com/data');

// Use with resolve
const result = await resolve(40.7128, -74.0060, { loader });
```

### `DataLoader.loadFromCDN(baseUrl, options?)`

Method on DataLoader class to load data from CDN URLs. Same parameters as `loadFromCDN()` helper function.

**Example:**
```typescript
import { DataLoader, resolve } from 'geo-intel-offline';

const loader = new DataLoader();
await loader.loadFromCDN('https://your-cdn.com/data', {
  useGzip: true
});

const result = await resolve(40.7128, -74.0060, { loader });
```

## 🌐 Browser Usage

For browser usage, you need to provide the data files. The library provides several methods:

### 1. Load Data from CDN (Recommended)

**Using `loadFromCDN()` helper (Easiest):**

```typescript
import { resolve, loadFromCDN } from 'geo-intel-offline';

// Load data from CDN and get a configured loader
const loader = await loadFromCDN('https://your-cdn.com/data', {
  useGzip: true  // Use compressed files (default: true)
});

// Use resolve with the loader
const result = await resolve(40.7128, -74.0060, { loader });
console.log(result.country); // "United States of America"
```

**Using DataLoader.loadFromCDN() directly:**

```typescript
import { resolve, DataLoader } from 'geo-intel-offline';

const loader = new DataLoader();
await loader.loadFromCDN('https://your-cdn.com/data', {
  useGzip: true,  // Use compressed files for faster loading
  filenames: {     // Optional: customize filenames
    geohashIndex: 'geohash_index.json',
    polygons: 'polygons.json',
    metadata: 'metadata.json'
  }
});

const result = await resolve(40.7128, -74.0060, { loader });
```

**Browser Requirements:**
- Modern browsers (Chrome 80+, Firefox 113+, Safari 16.4+) support gzip decompression via `DecompressionStream` API
- For older browsers, set `useGzip: false` to use uncompressed files, or include a gzip library like `pako`

### 2. Manual Data Loading (Advanced)

If you need more control, you can manually fetch and set data:

```typescript
import { resolve, DataLoader } from 'geo-intel-offline';

const loader = new DataLoader();

// Fetch and decompress gzipped JSON files
async function fetchGzippedJson(url: string): Promise<any> {
  const response = await fetch(url);
  const stream = response.body!.pipeThrough(new DecompressionStream('gzip'));
  const decompressed = await new Response(stream).arrayBuffer();
  return JSON.parse(new TextDecoder().decode(decompressed));
}

const [geohashIndex, polygons, metadata] = await Promise.all([
  fetchGzippedJson('https://your-cdn.com/data/geohash_index.json.gz'),
  fetchGzippedJson('https://your-cdn.com/data/polygons.json.gz'),
  fetchGzippedJson('https://your-cdn.com/data/metadata.json.gz')
]);

loader.setGeohashIndex(geohashIndex);
loader.setPolygons(polygons);
loader.setMetadata(metadata);

const result = await resolve(40.7128, -74.0060, { loader });
```

### 3. Bundle Data with Application (Offline-First)

For offline-first apps, bundle the data files with your application:

```typescript
import { resolve, DataLoader } from 'geo-intel-offline';
import geohashIndex from './data/geohash_index.json';
import polygons from './data/polygons.json';
import metadata from './data/metadata.json';

const loader = new DataLoader();
loader.setGeohashIndex(geohashIndex);
loader.setPolygons(polygons);
loader.setMetadata(metadata);

const result = await resolve(40.7128, -74.0060, { loader });
```

### Hosting Data Files

The data files are included in the npm package and will be automatically available when published:

- `geohash_index.json.gz` (~70 KB compressed)
- `polygons.json.gz` (~4 MB compressed)
- `metadata.json.gz` (~4 KB compressed)

**Option 1: Use unpkg/jsdelivr (Automatic - Recommended)**

When the package is published to npm, the data files are automatically available at:
```
https://unpkg.com/geo-intel-offline@latest/data/geohash_index.json.gz
https://unpkg.com/geo-intel-offline@latest/data/polygons.json.gz
https://unpkg.com/geo-intel-offline@latest/data/metadata.json.gz
```

Just use:
```javascript
await loader.loadFromCDN('https://unpkg.com/geo-intel-offline@latest/data');
```

**Option 2: Local Development**

For local testing, serve the `data/` folder via a local HTTP server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx http-server
```

Then use:
```javascript
await loader.loadFromCDN('http://localhost:8000/data');
```

**Option 3: Host on Your Own CDN**

1. Copy the data files from `node_modules/geo-intel-offline/data/` (or from the package source)
2. Upload them to your CDN/server
3. Use your CDN URL with `loadFromCDN()`

**Option 4: Use uncompressed files**

If you prefer uncompressed files (larger but compatible with older browsers), use `.json` files instead of `.json.gz` and set `useGzip: false`.

See [examples/browser-cdn-example.html](./examples/browser-cdn-example.html) for a complete working example, or [examples/local-server-example.html](./examples/local-server-example.html) for local development.

## 📖 Examples

### Example 1: Distance Calculation

```typescript
import { calculateDistance, resolve, ReverseGeoIntelResult } from 'geo-intel-offline';

const resolveFn = async (input: string) => {
  const r = await resolve(input);
  return {
    latitude: r instanceof ReverseGeoIntelResult ? r.latitude : null,
    longitude: r instanceof ReverseGeoIntelResult ? r.longitude : null,
    iso2: r.iso2 || null
  };
};

// Distance between coordinates (auto-detects unit)
const result = await calculateDistance(
  [40.7128, -74.0060],  // NYC
  [34.0522, -118.2437],  // LA
  { resolve: resolveFn }
);
console.log(`${result.distance.toFixed(2)} ${result.unit}`); // "2448.50 mile"

// Distance between countries
const countryDist = await calculateDistance("United States", "Canada", { resolve: resolveFn });

// Force unit
const kmDist = await calculateDistance("US", "CA", { unit: 'km', resolve: resolveFn });
```

### Example 2: Geo-fencing

```typescript
import { checkGeofence, GeofenceMonitor, GeofenceConfig, resolve, ReverseGeoIntelResult } from 'geo-intel-offline';

const resolveFn = async (input: string) => {
  const r = await resolve(input);
  return {
    latitude: r instanceof ReverseGeoIntelResult ? r.latitude : null,
    longitude: r instanceof ReverseGeoIntelResult ? r.longitude : null
  };
};

// Stateless check
const result = await checkGeofence(
  [40.7128, -74.0060],
  [40.7130, -74.0060],
  1000,  // 1000 meters
  'm',
  { resolve: resolveFn }
);
console.log(`Inside: ${result.isInside}, State: ${result.state}`);

// Stateful monitoring
const config: GeofenceConfig = {
  radius: 1000,
  radiusUnit: 'm',
  approachingThresholdPercent: 10.0
};
const monitor = new GeofenceMonitor(config);

const result1 = await monitor.check([40.7128, -74.0060], [40.7130, -74.0060], { resolve: resolveFn });
const result2 = await monitor.check([40.7129, -74.0060], [40.7130, -74.0060], { resolve: resolveFn });
for (const alert of result2.alerts) {
  console.log(`Alert: ${alert.alertType} - ${alert.distance.toFixed(2)} ${alert.unit}`);
}
```

### Example 3: Random Coordinates

```typescript
import { generateRandomCoordinatesByArea, generateRandomCoordinatesByRegion, resolve } from 'geo-intel-offline';

// Generate random coordinates in circular area
const areaCoords = generateRandomCoordinatesByArea(
  [40.7128, -74.0060],  // NYC
  10,                    // 10 km
  5,
  { radiusUnit: 'km', seed: 42 }
);
console.log(`Generated ${areaCoords.totalGenerated} coordinates`);

// Generate random coordinates in country (requires polygon data)
// See full implementation in tests for complete example
```

### Example 4: Integration - All Features Together

```typescript
import {
  resolve,
  calculateDistance,
  checkGeofence,
  generateRandomCoordinatesByArea,
  ReverseGeoIntelResult
} from 'geo-intel-offline';

// 1. Generate random coordinates
const coords = generateRandomCoordinatesByArea([40.7128, -74.0060], 10, 3, {
  radiusUnit: 'km',
  seed: 42
});

// 2. Resolve each coordinate
for (const [lat, lon] of coords.coordinates) {
  const result = await resolve(lat, lon);
  console.log(`(${lat.toFixed(4)}, ${lon.toFixed(4)}) → ${result.country} (${result.iso2})`);
}

// 3. Calculate distance between coordinates
if (coords.coordinates.length >= 2) {
  const resolveFn = async (input: string) => {
    const r = await resolve(input);
    return {
      latitude: r instanceof ReverseGeoIntelResult ? r.latitude : null,
      longitude: r instanceof ReverseGeoIntelResult ? r.longitude : null,
      iso2: r.iso2 || null
    };
  };
  
  const dist = await calculateDistance(coords.coordinates[0], coords.coordinates[1], { resolve: resolveFn });
  console.log(`Distance: ${dist.distance.toFixed(2)} ${dist.unit}`);
}
```

## 📊 Performance & Accuracy

### Performance Benchmarks

- **Lookup Speed**: < 1ms per resolution
- **Memory Footprint**: < 15 MB (all data in memory)
- **Cold Start**: ~100ms (initial data load)
- **Data Size**: ~4 MB compressed (66% reduction)
- **Distance Calculation**: < 0.1ms per calculation
- **Geo-fencing Check**: < 0.5ms per check
- **Random Coordinate Generation**: ~1-5ms per coordinate (depends on region complexity)

### Test Results

Comprehensive testing across **258 countries** with perfect accuracy:

#### Forward Geocoding (Coordinates → Country)

- **Overall Accuracy**: **100.00%** (2,580 passed / 2,580 total test points)
- **Countries Tested**: 258
- **Countries with 100% Accuracy**: 258 (100.0%)
- **Test Points**: 2,580 (10 points per country, varies for small territories)

#### Reverse Geocoding (Country → Coordinates)

- **Overall Accuracy**: **100.00%** (730 passed / 730 total tests)
- **By Country Name**: 258/258 (100.00%)
- **By ISO2 Code**: 236/236 (100.00%)
- **By ISO3 Code**: 236/236 (100.00%)

#### Key Highlights

✅ **100% accuracy** for forward geocoding across all 258 countries  
✅ **100% accuracy** for reverse geocoding with all input methods  
✅ **258 countries** fully supported including territories and disputed regions  
✅ **Perfect accuracy** achieved through rigorous testing and edge case handling

See [TEST_RESULTS.md](./TEST_RESULTS.md) for detailed country-wise results, continent-level breakdowns, and comprehensive test methodology.

## 🏗️ Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

The library uses a **hybrid three-stage resolution pipeline**:

1. **Geohash Encoding**: Fast spatial indexing (~1.2km precision)
2. **Geohash Index Lookup**: Candidate country filtering
3. **Point-in-Polygon Verification**: Accurate geometric verification
4. **Confidence Scoring**: Distance-based uncertainty metrics

## 🔧 Development

### Building

```bash
npm run build
```

This creates:
- `dist/index.js` - CommonJS build
- `dist/index.esm.js` - ES Module build
- `dist/index.umd.js` - UMD build (for browsers)
- `dist/index.umd.min.js` - Minified UMD build (for CDN)

### Testing

```bash
# Run all tests
npm test

# Run comprehensive tests (all 258 countries)
npm test -- tests/comprehensive.test.ts

# Run NPM vs CDN verification tests
npm test -- tests/npm-cdn-simple-verification.test.ts

# Run CDN-specific tests
npm test -- tests/cdn.test.ts

# Run with coverage
npm run test:coverage
```

**Test Results**:
- ✅ Comprehensive test: **100% accuracy** (2,580/2,580 test points, all 258 countries)
- ✅ NPM vs CDN verification: **100% match rate** (identical results)
- ✅ CDN-specific tests: **All passing** (5/5 tests)

See [TEST_RESULTS.md](./TEST_RESULTS.md) for comprehensive test results.

### Linting

```bash
npm run lint
```

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/RRJena/geo-intel-offline-javascript/issues)
- **Documentation**: [Full Documentation](https://github.com/RRJena/geo-intel-offline-javascript#readme)

## 🔗 Related Projects

- [Python Version](https://pypi.org/project/geo-intel-offline/) - Original Python implementation

## 📚 Additional Resources

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture documentation and design decisions
- **[TEST_RESULTS.md](./TEST_RESULTS.md)** - Comprehensive test results for all 258 countries (100% accuracy)
- **[CDN_USAGE.md](./CDN_USAGE.md)** - Complete guide for using the library with CDN in browsers

## 📝 Changelog

### Latest: CDN Support (v1.1.0)

**New Features:**
- ✅ Added `loadFromCDN()` method for browser/CDN usage
- ✅ Added `loadFromCDN()` helper function for convenience
- ✅ Automatic gzip decompression using browser's native API
- ✅ Support for uncompressed files (older browsers)
- ✅ Comprehensive CDN usage examples and documentation

**Improvements:**
- ✅ Fixed `load()` method to skip filesystem when data already loaded
- ✅ Better error messages for CDN loading
- ✅ Auto-detection of data paths in examples

**Documentation:**
- ✅ Added CDN usage guide (`CDN_USAGE.md`)
- ✅ Updated README with CDN examples
- ✅ Created browser examples with error handling

**Testing:**
- ✅ Added CDN-specific tests (all passing)
- ✅ Verified backward compatibility
- ✅ Tested in browser environments
- ✅ Comprehensive testing: All 258 countries tested for both NPM and CDN loading
- ✅ **100% match rate** between NPM and CDN loaders
- ✅ **100% accuracy** for reverse geocoding (both loaders, all 258 countries)
- ✅ **100% accuracy** for forward geocoding (both loaders, all 258 countries, 2,580 test points)

**Test Results:**
- **Comprehensive Test**: 100% accuracy (2,580/2,580 test points across 258 countries)
- **Reverse Geocoding**: 100% accuracy (all methods, all 258 countries)
- **NPM vs CDN Match Rate**: 100% (identical results)
- **Simple Verification**: 100% accuracy (20/20 test points)
- See [TEST_RESULTS.md](./TEST_RESULTS.md) for comprehensive results
- See [CDN_USAGE.md](./CDN_USAGE.md) for CDN usage guide

---

## 👨‍💻 Author

**Rakesh Ranjan Jena**

- 🌐 **Blog**: [https://www.rrjprince.com/](https://www.rrjprince.com/)
- 🌐 **Website**: [https://www.rakeshranjanjena.com/](https://www.rakeshranjanjena.com/)
- 💼 **LinkedIn**: [https://www.linkedin.com/in/rrjprince/](https://www.linkedin.com/in/rrjprince/)

---

**Made with ❤️ by Rakesh Ranjan Jena for developers who need reliable, offline geo-intelligence.**

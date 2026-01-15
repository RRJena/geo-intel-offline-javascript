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

---

## 🌟 Why This Library Exists

Every developer working with geolocation has faced the same frustration: you need to know what country a set of coordinates belongs to, but all the solutions either cost money, require API keys, need constant internet connectivity, or have restrictive rate limits. What if you're building an offline application? What if you're processing millions of records and API costs become prohibitive? What if you need deterministic results without external dependencies?

**We built `geo-intel-offline` to solve these real-world problems.**

This library was born from the need for a **reliable, fast, and completely free** solution that works everywhere—from edge devices in remote locations to high-throughput data processing pipelines. No subscriptions, no rate limits, no vendor lock-in. Just pure JavaScript/TypeScript that does one thing exceptionally well: **tell you where in the world a coordinate belongs.**

Whether you're building a mobile app that works offline, processing billions of GPS logs, enriching datasets without external APIs, or creating applications for regions with unreliable internet—this library empowers you to add geo-intelligence to your projects without compromise.

## ✨ Features

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

```html
<!-- Minified UMD build -->
<script src="https://unpkg.com/geo-intel-offline/dist/index.umd.min.js"></script>
<script>
  const result = await GeoIntelOffline.resolve(40.7128, -74.0060);
  console.log(result.country); // "United States of America"
</script>
```

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

## 🌐 Browser Usage

For browser usage, you need to provide the data files. You can either:

1. **Load data from CDN** (recommended for production):

```typescript
import { resolve, DataLoader } from 'geo-intel-offline';

// Create loader and set data from CDN
const loader = new DataLoader();

// Load data files (you need to host these or use a CDN)
const [geohashIndex, polygons, metadata] = await Promise.all([
  fetch('https://your-cdn.com/data/geohash_index.json.gz').then(r => r.json()),
  fetch('https://your-cdn.com/data/polygons.json.gz').then(r => r.json()),
  fetch('https://your-cdn.com/data/metadata.json.gz').then(r => r.json())
]);

loader.setGeohashIndex(geohashIndex);
loader.setPolygons(polygons);
loader.setMetadata(metadata);

// Now use resolve with the loader
const result = await resolve(40.7128, -74.0060, { loader });
```

2. **Bundle data with your application** (for offline-first apps):

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

## 📊 Performance & Accuracy

### Performance Benchmarks

- **Lookup Speed**: < 1ms per resolution
- **Memory Footprint**: < 15 MB (all data in memory)
- **Cold Start**: ~100ms (initial data load)
- **Data Size**: ~4 MB compressed (66% reduction)

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
npm run test:all-countries

# Run with coverage
npm run test:coverage
```

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

---

## 👨‍💻 Author

**Rakesh Ranjan Jena**

- 🌐 **Blog**: [https://www.rrjprince.com/](https://www.rrjprince.com/)
- 🌐 **Website**: [https://www.rakeshranjanjena.com/](https://www.rakeshranjanjena.com/)
- 💼 **LinkedIn**: [https://www.linkedin.com/in/rrjprince/](https://www.linkedin.com/in/rrjprince/)

---

**Made with ❤️ by Rakesh Ranjan Jena for developers who need reliable, offline geo-intelligence.**

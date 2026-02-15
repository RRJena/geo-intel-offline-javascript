# Release Notes - geo-intel-offline v1.2.0 (JavaScript/TypeScript)

## 🎉 Major New Features

This release introduces **four powerful new features** that extend the library's capabilities beyond geocoding:

### 1. 📏 Distance Calculation
Calculate distances between any two locations with automatic unit detection and multiple algorithms.

**Features:**
- **Multiple Algorithms**: Haversine (fast), Vincenty (most accurate), Spherical Law of Cosines
- **Smart Unit Detection**: Automatically detects km/miles based on country preferences (US, GB, LR, MM use miles)
- **Flexible Inputs**: Accepts coordinates, country names, ISO codes, or continent names
- **Automatic Method Selection**: Chooses optimal algorithm based on distance
- **Full TypeScript Support**: Complete type definitions

**Example:**
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
  [40.7128, -74.0060],
  [34.0522, -118.2437],
  { resolve: resolveFn }
);
console.log(`${result.distance.toFixed(2)} ${result.unit}`); // "2448.50 mile"

// Distance between countries
const countryDist = await calculateDistance("United States", "Canada", { resolve: resolveFn });
```

### 2. 🎯 Geo-fencing
Monitor location proximity with state tracking and configurable alerts.

**Features:**
- **State Tracking**: OUTSIDE, APPROACHING, INSIDE, LEAVING
- **Configurable Alerts**: Reached, Entered, Exited, Approaching, Leaving
- **Stateless & Stateful APIs**: `checkGeofence()` for one-off checks, `GeofenceMonitor` for tracking
- **Multiple Units**: Supports meters, kilometers, and miles
- **TypeScript Types**: Full type safety

**Example:**
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
const result2 = await monitor.check([40.7128, -74.0060], [40.7130, -74.0060], { resolve: resolveFn });
```

### 3. 🎲 Random Coordinates by Region
Generate random coordinates within countries or continents with point-in-polygon validation.

**Features:**
- **Region Support**: Countries and continents
- **Point-in-Polygon Validation**: Ensures all generated coordinates are actually within the region
- **Reproducible**: Seed support for deterministic generation
- **Efficient**: Rejection sampling with bounding box optimization

**Example:**
```typescript
import { generateRandomCoordinatesByRegion, DataLoader } from 'geo-intel-offline';

// Requires polygon data from DataLoader
const loader = new DataLoader('./data');
await loader.load();

const getPolygons = async (region: string, type: 'country' | 'continent') => {
  // Implementation to get polygons from loader
  return []; // Return polygon data
};

const result = await generateRandomCoordinatesByRegion("United States", 10, {
  seed: 42,
  getPolygons
});
```

### 4. 🎲 Random Coordinates by Area
Generate random coordinates within a circular area with uniform distribution.

**Features:**
- **Circular Areas**: Define center and radius
- **Uniform Distribution**: Properly distributed points within the circle
- **Multiple Units**: Meters, kilometers, miles, or degrees
- **Reproducible**: Seed support

**Example:**
```typescript
import { generateRandomCoordinatesByArea } from 'geo-intel-offline';

const result = generateRandomCoordinatesByArea(
  [40.7128, -74.0060],  // NYC
  10,                    // 10 km
  5,
  { radiusUnit: 'km', seed: 42 }
);
console.log(`Generated ${result.totalGenerated} coordinates`);
```

## 📊 Test Results

### Comprehensive Testing
- ✅ **95/95 new feature tests passing** (100% pass rate)
- ✅ **20/20 backward compatibility tests passing** (no breaking changes)
- ✅ **100% accuracy** maintained for all 258 countries
- ✅ **Integration tests** verify all features work together seamlessly

### Test Coverage
- **Distance Calculation**: 36 tests (positive, negative, edge cases)
- **Geo-fencing**: 16 tests (state transitions, alerts, various units)
- **Random Coordinates**: 23 tests (region and area generation, reproducibility)
- **Backward Compatibility**: 20 tests (all original features verified)

## 🔄 Backward Compatibility

✅ **100% backward compatible** - All existing code continues to work without changes.

The new features are additive and do not modify any existing APIs or behavior.

## 📚 Documentation

- ✅ Comprehensive README updates with examples for all new features
- ✅ API reference documentation for all new functions and classes
- ✅ Comparison table with other geo libraries (geolib, geolocation-utils, countrycode)
- ✅ Use cases and limitations documented
- ✅ Integration examples showing all features working together
- ✅ Full TypeScript type definitions

## 🚀 Performance

- **Distance Calculation**: < 0.1ms per calculation
- **Geo-fencing Check**: < 0.5ms per check
- **Random Coordinate Generation**: ~1-5ms per coordinate (depends on region complexity)
- **Memory Footprint**: No significant increase (~15MB total)
- **Build Size**: UMD build ~109KB, minified ~29KB

## 🔧 Technical Details

### New Modules
- `src/distance.ts`: Distance calculation algorithms and utilities
- `src/geofence.ts`: Geo-fencing with state tracking
- `src/random_coords.ts`: Random coordinate generation

### New Classes & Types
- `DistanceResult`: Distance calculation results
- `GeofenceState`: Enum for geofence states
- `GeofenceConfig`: Configuration for geo-fencing
- `GeofenceMonitor`: Stateful geo-fencing monitor
- `GeofenceAlert`: Alert information
- `GeofenceResult`: Geo-fencing check results
- `RandomCoordinateResult`: Random coordinate generation results

### New Functions
- `calculateDistance()`: Main distance calculation function
- `haversineDistance()`: Haversine algorithm
- `vincentyDistance()`: Vincenty algorithm
- `sphericalLawOfCosines()`: Spherical Law of Cosines
- `checkGeofence()`: Stateless geo-fencing check
- `generateRandomCoordinatesByRegion()`: Generate coordinates in regions
- `generateRandomCoordinatesByArea()`: Generate coordinates in circular areas

## 📦 Installation

```bash
npm install geo-intel-offline@1.2.0
```

or with yarn:
```bash
yarn add geo-intel-offline@1.2.0
```

or with pnpm:
```bash
pnpm add geo-intel-offline@1.2.0
```

## 🌐 Browser/CDN Usage

The library works seamlessly in browsers via CDN:

```html
<script src="https://unpkg.com/geo-intel-offline@1.2.0/dist/index.umd.min.js"></script>
<script>
  (async function() {
    const loader = await GeoIntelOffline.loadFromCDN('https://unpkg.com/geo-intel-offline@1.2.0/data');
    const result = await GeoIntelOffline.resolve(40.7128, -74.0060, { loader });
    console.log(result.country); // "United States of America"
  })();
</script>
```

## 🔗 Links

- **npm**: https://www.npmjs.com/package/geo-intel-offline
- **GitHub**: https://github.com/RRJena/geo-intel-offline-javascript
- **Documentation**: See README.md for comprehensive examples

## 🙏 Acknowledgments

- Distance algorithms: Haversine, Vincenty, Spherical Law of Cosines
- Point-in-Polygon: Ray casting algorithm
- Data source: Natural Earth

---

**Made with ❤️ by Rakesh Ranjan Jena**

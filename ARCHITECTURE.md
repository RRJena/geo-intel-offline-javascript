# Architecture Documentation

## Internal Architecture

### Overview

`geo-intel-offline` (JavaScript/TypeScript) uses a **hybrid three-stage resolution pipeline** optimized for speed, accuracy, and memory efficiency. This architecture is identical to the Python version, ensuring consistent behavior across platforms.

```
Input: (lat, lon)
    ↓
[1] Geohash Encoding
    ↓
[2] Geohash Index Lookup → Candidate Countries
    ↓
[3] Point-in-Polygon Verification
    ↓
[4] Confidence Scoring
    ↓
Output: Country + Metadata + Confidence
```

### Stage 1: Geohash Encoding

**Purpose**: Fast spatial indexing to reduce candidate set from ~200 countries to 1-3 candidates.

**Implementation**: `src/geohash/index.ts`
- Encodes lat/lon to base32 string (precision level 6 = ~1.2km)
- Deterministic encoding (same input → same output)
- O(1) lookup complexity

**Design Decisions**:
- **Precision 6**: Balance between index size and spatial resolution
  - Too low (4): Too many false positives → more PIP tests
  - Too high (8): Index too large → memory bloat
  - 6 is optimal: ~1.2km precision, manageable index size

**TypeScript Implementation**:
```typescript
export function encode(lat: number, lon: number, precision: number = 6): string
export function decode(geohash: string): { lat, lon, latRange, lonRange }
export function getNeighbors(geohash: string): string[]
```

### Stage 2: Geohash Index Lookup

**Purpose**: Map geohash → candidate country IDs.

**Data Structure**: `geohash_index.json`
- Key: geohash string (6 chars)
- Value: list of country IDs

**Construction**:
- For each country polygon, sample points and validate with point-in-polygon
- Only index geohashes where country actually exists (eliminates false positives)
- Encode validated sample point → geohash
- Build reverse index: geohash → country IDs

**Edge Cases**:
- Geohash on border: Multiple countries in list (handled in Stage 3)
- No match: Try neighbor geohashes (geohash boundary cases)

**Implementation**: `src/data/loader.ts`
```typescript
class DataLoader {
  getCandidateCountries(geohash: string): number[]
}
```

### Stage 3: Point-in-Polygon (PIP)

**Purpose**: Accurate geometric verification.

**Algorithm**: Ray Casting
- Cast horizontal ray East from point
- Count intersections with polygon edges
- Odd count = inside, even = outside

**Why Ray Casting?**
- More accurate than bounding boxes
- Handles complex polygons (holes, multiple rings)
- Deterministic results
- Fast enough for production (< 0.5ms typical)

**Implementation**: `src/pip/index.ts`
- `pointInPolygon()`: Basic PIP for single ring
- `pointInPolygonWithHoles()`: PIP with exclusion rings (lakes, etc.)

**TypeScript Implementation**:
```typescript
export function pointInPolygon(point: Point, polygon: Polygon): boolean
export function pointInPolygonWithHoles(
  point: Point,
  exterior: Polygon,
  holes: Polygon[]
): boolean
export function distanceToPolygonEdge(point: Point, polygon: Polygon): number
```

### Stage 4: Confidence Scoring

**Purpose**: Provide actionable uncertainty metrics.

**Strategy**: Distance-based scoring
- Calculate distance to nearest polygon edge
- Map distance → confidence score (0.0-1.0)
- Apply ambiguity penalty (multiple candidates)

**Thresholds**:
- > 0.1° (~11km): 0.98-1.0 confidence (high)
- 0.01°-0.1° (~1-11km): 0.85-0.98 (medium)
- < 0.01° (~1km): 0.70-0.85 (low)

**Design Rationale**: Users need to know when results are uncertain (borders, disputed areas).

**Implementation**: `src/utils/confidence.ts`
```typescript
export function calculateConfidence(
  point: Point,
  polygon: Polygon,
  holes: Polygon[],
  candidateCount: number
): number
```

## Data Model

### Binary Format Design

**Format**: JSON with automatic gzip compression

**Files**:
1. `geohash_index.json(.gz)`: `{geohash: [country_ids]}`
2. `polygons.json(.gz)`: `{country_id: {exterior: [[lat,lon]], holes: [...]}}`
3. `metadata.json(.gz)`: `{country_id: {name, iso2, iso3, continent, timezone}}`

**Data Loading**:
- **Node.js**: Reads from filesystem (supports gzip decompression)
- **Browser**: Requires manual data injection via `setGeohashIndex()`, `setPolygons()`, `setMetadata()`

**Implementation**: `src/data/loader.ts`
```typescript
class DataLoader {
  async load(): Promise<void>  // Node.js: loads from filesystem
  setGeohashIndex(index: GeohashIndex): void  // Browser: manual injection
  setPolygons(polygons: PolygonsData): void
  setMetadata(metadata: MetadataData): void
}
```

## API Design

### Unified `resolve()` Function

The library provides a single `resolve()` function that automatically detects forward or reverse geocoding:

```typescript
// Forward geocoding
const result = await resolve(40.7128, -74.0060);

// Reverse geocoding
const reverse = await resolve("United States");
```

**Implementation**: `src/index.ts`

### Result Objects

**GeoIntelResult** (Forward Geocoding):
```typescript
class GeoIntelResult {
  country: string | null
  iso2: string | null
  iso3: string | null
  continent: string | null
  timezone: string | null
  confidence: number
  toDict(): Record<string, any>
}
```

**ReverseGeoIntelResult** (Reverse Geocoding):
```typescript
class ReverseGeoIntelResult {
  latitude: number | null
  longitude: number | null
  country: string | null
  iso2: string | null
  iso3: string | null
  continent: string | null
  timezone: string | null
  confidence: number  // Always 1.0
  toDict(): Record<string, any>
}
```

## TypeScript Type System

### Core Types

```typescript
type Point = [number, number]  // [lat, lon]
type Polygon = Point[]

interface GeohashIndex {
  [geohash: string]: number[]  // country IDs
}

interface PolygonData {
  exterior: number[][]
  holes?: number[][][]
  multi?: boolean
  exteriors?: number[][][]
}

interface CountryMetadata {
  name: string
  iso2: string
  iso3: string
  continent: string
  timezone: string
}
```

## Performance Optimizations

### Memory Efficiency

1. **Lazy Loading**: Data files loaded only when needed
2. **In-Memory Caching**: Data kept in memory after first load
3. **Compressed Data**: Gzip compression reduces file size by ~60-80%

### Speed Optimizations

1. **Geohash Pre-filtering**: Reduces candidate set from ~200 to 1-3 countries
2. **Early Termination**: Stop after first match (if unambiguous)
3. **Efficient Algorithms**: Ray casting optimized for typical polygon sizes

### Browser Optimizations

1. **Manual Data Injection**: Allows pre-loading data in browser
2. **CDN Support**: Data can be loaded from CDN
3. **Bundle Size**: Minified UMD build < 50KB (without data)

## Build System

### TypeScript Compilation

- **Target**: ES2020
- **Module**: ESNext (with CommonJS fallback)
- **Strict Mode**: Enabled for type safety

### Build Outputs

1. **CommonJS** (`dist/index.js`): For Node.js
2. **ES Modules** (`dist/index.esm.js`): For modern bundlers
3. **UMD** (`dist/index.umd.js`): For browsers (global variable)
4. **UMD Minified** (`dist/index.umd.min.js`): For CDN usage

### Build Tools

- **TypeScript**: Type checking and compilation
- **Rollup**: Bundling for different formats
- **Terser**: Minification for production

## Testing Strategy

### Test Coverage

1. **Unit Tests**: Individual functions (geohash, PIP, confidence)
2. **Integration Tests**: End-to-end resolution pipeline
3. **Comprehensive Tests**: All 258 countries (forward + reverse)

### Test Files

- `tests/basic.test.ts`: Unit and basic integration tests
- `tests/comprehensive.test.ts`: Full country coverage tests

## Browser vs Node.js Differences

### Node.js

- Automatic file system access
- Gzip decompression via `zlib`
- Data files loaded from `./data` directory

### Browser

- No file system access
- Manual data injection required
- Data can be loaded from CDN or bundled
- Supports both UMD and ES Module builds

## Future Enhancements

1. **Web Workers**: Offload processing to background threads
2. **IndexedDB Caching**: Cache data in browser storage
3. **Streaming Data Loading**: Load data incrementally
4. **Modular Data Loading**: Load only specific countries/continents


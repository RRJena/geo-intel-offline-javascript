# CDN Usage Guide for geo-intel-offline

## Problem

When using `geo-intel-offline` in a browser with vanilla JavaScript, the library needs to load data files (geohash_index.json.gz, polygons.json.gz, metadata.json.gz). Previously, there was no easy way to load these files from a CDN.

## Solution

The library now includes a `loadFromCDN()` method that:

1. Fetches gzipped JSON data files from a CDN URL
2. Automatically decompresses them using the browser's native `DecompressionStream` API
3. Loads them into the DataLoader instance
4. Makes the library ready to use

## Quick Start

### Method 1: Using the Helper Function (Easiest)

```html
<script src="https://unpkg.com/geo-intel-offline@latest/dist/index.umd.min.js"></script>
<script>
  (async function() {
    // Load data from CDN
    const loader = await GeoIntelOffline.loadFromCDN('https://unpkg.com/geo-intel-offline@latest/data');
    
    // Use the library
    const result = await GeoIntelOffline.resolve(40.7128, -74.0060, { loader });
    console.log(result.country); // "United States of America"
  })();
</script>
```

### Method 2: Using DataLoader Directly

```html
<script src="https://unpkg.com/geo-intel-offline@latest/dist/index.umd.min.js"></script>
<script>
  (async function() {
    const loader = new GeoIntelOffline.DataLoader();
    await loader.loadFromCDN('https://unpkg.com/geo-intel-offline@latest/data', {
      useGzip: true  // Use compressed files (default: true)
    });
    
    const result = await GeoIntelOffline.resolve(40.7128, -74.0060, { loader });
    console.log(result.country);
  })();
</script>
```

## Browser Compatibility

### Modern Browsers (Recommended)
- Chrome 80+
- Firefox 113+
- Safari 16.4+
- Edge 80+

These browsers support the native `DecompressionStream` API for gzip decompression.

### Older Browsers

For older browsers that don't support `DecompressionStream`:

**Option 1: Use uncompressed files**
```javascript
await loader.loadFromCDN('https://your-cdn.com/data', {
  useGzip: false  // Use uncompressed .json files
});
```

**Option 2: Include pako library**
```html
<script src="https://cdn.jsdelivr.net/npm/pako@latest/dist/pako.min.js"></script>
<script>
  // Modify the library to use pako for decompression
  // (This requires modifying the library code or using a wrapper)
</script>
```

## Hosting Data Files

### Option 1: Use unpkg/jsdelivr (if published to npm)

When the package is published to npm, the data files will be available at:
```
https://unpkg.com/geo-intel-offline@latest/data/geohash_index.json.gz
https://unpkg.com/geo-intel-offline@latest/data/polygons.json.gz
https://unpkg.com/geo-intel-offline@latest/data/metadata.json.gz
```

### Option 2: Host on Your Own CDN

1. Copy the data files from `node_modules/geo-intel-offline/data/` (or from the package source)
2. Upload them to your CDN/server
3. Use your CDN URL with `loadFromCDN()`

### Option 3: Bundle with Your Application

For offline-first applications, bundle the data files with your app and use the manual setter methods:

```javascript
const loader = new GeoIntelOffline.DataLoader();
loader.setGeohashIndex(geohashIndexData);
loader.setPolygons(polygonsData);
loader.setMetadata(metadataData);
```

## Complete Example

See [examples/browser-cdn-example.html](./examples/browser-cdn-example.html) for a complete working example with error handling and UI.

## API Reference

### `loadFromCDN(baseUrl, options?)`

Helper function that creates a DataLoader and loads data from CDN.

**Parameters:**
- `baseUrl` (string): Base URL for data files
- `options` (object, optional):
  - `useGzip` (boolean): Use compressed files (default: true)
  - `filenames` (object): Custom filenames

**Returns:** `Promise<DataLoader>`

### `DataLoader.loadFromCDN(baseUrl, options?)`

Method on DataLoader class to load data from CDN.

**Parameters:** Same as `loadFromCDN()` helper

**Returns:** `Promise<void>`

## Troubleshooting

### Error: "Failed to fetch"

**Cause:** Data files are not accessible at the provided URL.

**Solution:**
1. Verify the CDN URL is correct
2. Check CORS settings if hosting on your own server
3. Ensure the data files exist at the specified paths

### Error: "Gzip decompression requires DecompressionStream API"

**Cause:** Browser doesn't support native gzip decompression.

**Solution:**
1. Use `useGzip: false` to use uncompressed files
2. Or upgrade to a modern browser
3. Or include a gzip library like pako

### Error: "Data not loaded"

**Cause:** Trying to use resolve() before data is loaded.

**Solution:**
```javascript
// ❌ Wrong - data not loaded yet
const result = await GeoIntelOffline.resolve(40.7128, -74.0060);

// ✅ Correct - wait for data to load
const loader = await GeoIntelOffline.loadFromCDN('https://...');
const result = await GeoIntelOffline.resolve(40.7128, -74.0060, { loader });
```

## Performance Notes

- **Compressed files**: ~4 MB total, faster to download
- **Uncompressed files**: ~12 MB total, compatible with older browsers
- **First load**: ~100-500ms depending on network speed
- **Subsequent lookups**: < 1ms per coordinate

## Security Considerations

- Data files contain only geographic boundaries and metadata (no sensitive data)
- All processing happens client-side (no data sent to external servers)
- CDN should use HTTPS for secure delivery

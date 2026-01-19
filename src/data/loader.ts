/**
 * Data loading and binary format handling.
 * 
 * Binary Format Design:
 * 1. geohash_index.json(.gz) - Geohash → country_id mappings (compressed)
 * 2. polygons.json(.gz) - Country polygons (simplified, coordinate arrays)
 * 3. metadata.json(.gz) - Country metadata (ISO codes, continent, timezone)
 * 
 * Design Decisions:
 * - JSON for simplicity (can be compressed/gzipped in production)
 * - Supports gzip compression for reduced file size
 * - Lazy loading: Load only when needed
 * - In-memory caching: Keep in memory after first load
 */

export interface CountryMetadata {
  name: string;
  iso2: string;
  iso3: string;
  continent: string;
  timezone: string;
}

export interface PolygonData {
  exterior: number[][]; // [[lat, lon], ...]
  holes?: number[][][]; // [[[lat, lon], ...], ...]
  multi?: boolean;
  exteriors?: number[][][]; // For MultiPolygon
}

export interface GeohashIndex {
  [geohash: string]: number[]; // country IDs
}

export interface PolygonsData {
  [countryId: string]: PolygonData;
}

export interface MetadataData {
  [countryId: string]: CountryMetadata;
}

/**
 * Loads and caches geo-intelligence data.
 */
export class DataLoader {
  private dataDir: string;
  private _geohashIndex: GeohashIndex | null = null;
  private _polygons: PolygonsData | null = null;
  private _metadata: MetadataData | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(dataDir?: string) {
    // Default to package data directory
    // In browser, this will need to be provided via CDN or bundled
    this.dataDir = dataDir || './data';
  }

  /**
   * Load JSON data from a file.
   * In browser environment, this should fetch from CDN or use bundled data.
   * In Node.js, this reads from filesystem.
   */
  private async loadJson(filename: string): Promise<any> {
    // Check if we're in Node.js environment
    // Use a more reliable check that works with both CommonJS and ES modules
    const isNode = typeof process !== 'undefined' && 
                   process.versions != null && 
                   process.versions.node != null;
    
    if (isNode) {
      // Node.js environment - use fs module
      // Use require for CommonJS compatibility (works in both CJS and ESM via ts-node/jest)
      let fs: any;
      let path: any;
      let zlib: any;
      
      try {
        // Use require which works in both CommonJS and when transpiled
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        path = require('path');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        zlib = require('zlib');
      } catch (error: any) {
        throw new Error(`Failed to load Node.js modules: ${error.message}`);
      }
      
      const filepath = path.join(this.dataDir, filename);
      const gzipFilepath = path.join(this.dataDir, `${filename}.gz`);
      
      // Try compressed version first
      if (fs.existsSync(gzipFilepath)) {
        try {
          const compressed = fs.readFileSync(gzipFilepath);
          const decompressed = zlib.gunzipSync(compressed);
          return JSON.parse(decompressed.toString('utf-8'));
        } catch (error: any) {
          // If decompression fails, try uncompressed
          if (fs.existsSync(filepath)) {
            return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
          }
          throw error;
        }
      }
      
      // Fallback to uncompressed
      if (fs.existsSync(filepath)) {
        return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      }
      
      throw new Error(
        `Data file not found: ${gzipFilepath} or ${filepath}\n` +
        `Please ensure data files are available in ${this.dataDir}\n` +
        `Run: bash scripts/copy-data.sh`
      );
    } else {
      // Browser environment - fetch from URL or use bundled data
      // For now, throw error - user must provide data via setData methods
      throw new Error(
        `Data loading not implemented for browser. ` +
        `Use loadFromCDN() or setGeohashIndex(), setPolygons(), and setMetadata() to provide data.`
      );
    }
  }

  /**
   * Load data from CDN URLs (browser only).
   * Fetches and decompresses gzipped JSON files from provided URLs.
   * 
   * @param baseUrl - Base URL for data files (e.g., 'https://cdn.example.com/data')
   * @param options - Optional configuration
   * @param options.useGzip - Whether to use .gz files (default: true)
   * @param options.filenames - Custom filenames (default: geohash_index.json, polygons.json, metadata.json)
   * 
   * @example
   * ```typescript
   * const loader = new DataLoader();
   * await loader.loadFromCDN('https://unpkg.com/geo-intel-offline@latest/dist/data');
   * const result = await resolve(40.7128, -74.0060, { loader });
   * ```
   */
  async loadFromCDN(
    baseUrl: string,
    options: {
      useGzip?: boolean;
      filenames?: {
        geohashIndex?: string;
        polygons?: string;
        metadata?: string;
      };
    } = {}
  ): Promise<void> {
    const useGzip = options.useGzip !== false; // Default to true
    const filenames = {
      geohashIndex: options.filenames?.geohashIndex || 'geohash_index.json',
      polygons: options.filenames?.polygons || 'polygons.json',
      metadata: options.filenames?.metadata || 'metadata.json'
    };

    // Ensure baseUrl doesn't end with /
    const base = baseUrl.replace(/\/$/, '');

    // Helper to fetch and decompress JSON
    const fetchJson = async (url: string, isGzipped: boolean): Promise<any> => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }

      if (isGzipped) {
        // Use browser's native DecompressionStream API (available in modern browsers)
        if (typeof DecompressionStream !== 'undefined') {
          const stream = response.body!.pipeThrough(new DecompressionStream('gzip'));
          const decompressed = await new Response(stream).arrayBuffer();
          const text = new TextDecoder().decode(decompressed);
          return JSON.parse(text);
        } else {
          // Fallback: try to fetch as blob and use pako if available, or throw helpful error
          throw new Error(
            `Gzip decompression requires DecompressionStream API (Chrome 80+, Firefox 113+, Safari 16.4+). ` +
            `Either use uncompressed files (set useGzip: false) or include pako library for older browsers.`
          );
        }
      } else {
        return response.json();
      }
    };

    try {
      // Load all data files in parallel
      const [geohashData, polygonsData, metadataData] = await Promise.all([
        fetchJson(
          `${base}/${filenames.geohashIndex}${useGzip ? '.gz' : ''}`,
          useGzip
        ),
        fetchJson(
          `${base}/${filenames.polygons}${useGzip ? '.gz' : ''}`,
          useGzip
        ),
        fetchJson(
          `${base}/${filenames.metadata}${useGzip ? '.gz' : ''}`,
          useGzip
        )
      ]);

      // Process geohash index
      this._geohashIndex = {};
      for (const [k, v] of Object.entries(geohashData)) {
        this._geohashIndex[k] = Array.isArray(v) ? v : [v];
      }

      // Process polygons (convert string keys to numbers)
      this._polygons = {};
      for (const [k, v] of Object.entries(polygonsData)) {
        this._polygons[k] = v as PolygonData;
      }

      // Process metadata (convert string keys to numbers)
      this._metadata = {};
      for (const [k, v] of Object.entries(metadataData)) {
        this._metadata[k] = v as CountryMetadata;
      }
    } catch (error: any) {
      throw new Error(
        `Failed to load data from CDN: ${error.message}\n` +
        `Base URL: ${baseUrl}\n` +
        `Make sure the data files are accessible at:\n` +
        `  - ${base}/${filenames.geohashIndex}${useGzip ? '.gz' : ''}\n` +
        `  - ${base}/${filenames.polygons}${useGzip ? '.gz' : ''}\n` +
        `  - ${base}/${filenames.metadata}${useGzip ? '.gz' : ''}`
      );
    }
  }

  /**
   * Manually set geohash index (useful for browser/CDN usage)
   */
  setGeohashIndex(index: GeohashIndex): void {
    this._geohashIndex = index;
  }

  /**
   * Manually set polygons data (useful for browser/CDN usage)
   */
  setPolygons(polygons: PolygonsData): void {
    this._polygons = polygons;
  }

  /**
   * Manually set metadata (useful for browser/CDN usage)
   */
  setMetadata(metadata: MetadataData): void {
    this._metadata = metadata;
  }

  /**
   * Load all data files (lazy-loaded, cached)
   */
  async load(): Promise<void> {
    // If data is already loaded (via setGeohashIndex, setPolygons, setMetadata, or loadFromCDN),
    // skip filesystem loading
    if (this._geohashIndex !== null && this._polygons !== null && this._metadata !== null) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      try {
        // Load all data files in parallel
        const [geohashData, polygonsData, metadataData] = await Promise.all([
          this.loadJson('geohash_index.json'),
          this.loadJson('polygons.json'),
          this.loadJson('metadata.json')
        ]);

        // Process geohash index
        this._geohashIndex = {};
        for (const [k, v] of Object.entries(geohashData)) {
          this._geohashIndex[k] = Array.isArray(v) ? v : [v];
        }

        // Process polygons (convert string keys to numbers)
        this._polygons = {};
        for (const [k, v] of Object.entries(polygonsData)) {
          this._polygons[k] = v as PolygonData;
        }

        // Process metadata (convert string keys to numbers)
        this._metadata = {};
        for (const [k, v] of Object.entries(metadataData)) {
          this._metadata[k] = v as CountryMetadata;
        }
      } catch (error) {
        this.loadPromise = null; // Reset on error
        throw error;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Get geohash index (lazy-loaded).
   */
  get geohashIndex(): GeohashIndex {
    if (this._geohashIndex === null) {
      throw new Error('Data not loaded. Call load() first or use setGeohashIndex().');
    }
    return this._geohashIndex;
  }

  /**
   * Get country polygons (lazy-loaded).
   */
  get polygons(): PolygonsData {
    if (this._polygons === null) {
      throw new Error('Data not loaded. Call load() first or use setPolygons().');
    }
    return this._polygons;
  }

  /**
   * Get country metadata (lazy-loaded).
   */
  get metadata(): MetadataData {
    if (this._metadata === null) {
      throw new Error('Data not loaded. Call load() first or use setMetadata().');
    }
    return this._metadata;
  }

  /**
   * Get candidate country IDs for a geohash.
   * 
   * @param geohash - Geohash string
   * @returns List of country IDs that may contain this geohash
   */
  getCandidateCountries(geohash: string): number[] {
    const index = this.geohashIndex;
    
    // Try full geohash first
    let candidates = index[geohash] || [];
    
    // If no exact match, try prefixes (geohash can overlap borders)
    if (candidates.length === 0) {
      for (let prefixLen = geohash.length; prefixLen > 0; prefixLen--) {
        const prefix = geohash.substring(0, prefixLen);
        if (index[prefix]) {
          candidates = index[prefix];
          break;
        }
      }
    }
    
    // Deduplicate
    return Array.from(new Set(candidates));
  }

  /**
   * Get polygon data for a country.
   * 
   * @param countryId - Country ID
   * @returns Polygon data or undefined if country not found
   */
  getPolygon(countryId: number): PolygonData | undefined {
    return this.polygons[countryId.toString()];
  }

  /**
   * Get metadata for a country.
   * 
   * @param countryId - Country ID
   * @returns Metadata or undefined if country not found
   */
  getMetadata(countryId: number): CountryMetadata | undefined {
    return this.metadata[countryId.toString()];
  }
}

// Global instance (lazy-loaded)
let _loader: DataLoader | null = null;

/**
 * Get or create global data loader instance.
 */
export function getLoader(dataDir?: string): DataLoader {
  if (_loader === null) {
    _loader = new DataLoader(dataDir);
  }
  return _loader;
}

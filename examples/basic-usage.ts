/**
 * Basic usage examples for geo-intel-offline library
 */

import { resolve, resolveByCountry } from '../src/index';

async function main() {
  console.log('=== Forward Geocoding Examples ===\n');

  // Example 1: Resolve New York coordinates
  console.log('1. New York City (40.7128, -74.0060):');
  const nyResult = await resolve(40.7128, -74.0060);
  console.log(`   Country: ${nyResult.country}`);
  console.log(`   ISO2: ${nyResult.iso2}`);
  console.log(`   ISO3: ${nyResult.iso3}`);
  console.log(`   Continent: ${nyResult.continent}`);
  console.log(`   Timezone: ${nyResult.timezone}`);
  console.log(`   Confidence: ${nyResult.confidence.toFixed(2)}\n`);

  // Example 2: Resolve London coordinates
  console.log('2. London, UK (51.5074, -0.1278):');
  const londonResult = await resolve(51.5074, -0.1278);
  console.log(`   Country: ${londonResult.country}`);
  console.log(`   ISO2: ${londonResult.iso2}`);
  console.log(`   Confidence: ${londonResult.confidence.toFixed(2)}\n`);

  // Example 3: Ocean location (should return null or low confidence)
  console.log('3. Ocean location (0.0, 0.0):');
  const oceanResult = await resolve(0.0, 0.0);
  if (oceanResult.country === null) {
    console.log('   No country found (ocean location)');
  } else {
    console.log(`   Country: ${oceanResult.country}`);
    console.log(`   Confidence: ${oceanResult.confidence.toFixed(2)}`);
  }
  console.log();

  console.log('=== Reverse Geocoding Examples ===\n');

  // Example 4: Resolve country name to coordinates
  console.log('4. Resolve "United States" to coordinates:');
  const usResult = await resolve('United States');
  console.log(`   Coordinates: (${usResult.latitude}, ${usResult.longitude})`);
  console.log(`   Country: ${usResult.country}`);
  console.log(`   ISO2: ${usResult.iso2}\n`);

  // Example 5: Resolve ISO2 code
  console.log('5. Resolve ISO2 code "US":');
  const usIso2Result = await resolve('US');
  console.log(`   Coordinates: (${usIso2Result.latitude}, ${usIso2Result.longitude})`);
  console.log(`   Country: ${usIso2Result.country}\n`);

  // Example 6: Resolve ISO3 code
  console.log('6. Resolve ISO3 code "USA":');
  const usIso3Result = await resolve('USA');
  console.log(`   Coordinates: (${usIso3Result.latitude}, ${usIso3Result.longitude})`);
  console.log(`   Country: ${usIso3Result.country}\n`);

  // Example 7: Using resolveByCountry (deprecated but still works)
  console.log('7. Using resolveByCountry("United Kingdom"):');
  const ukResult = await resolveByCountry('United Kingdom');
  console.log(`   Coordinates: (${ukResult.latitude}, ${ukResult.longitude})`);
  console.log(`   ISO2: ${ukResult.iso2}\n`);
}

// Run examples if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };

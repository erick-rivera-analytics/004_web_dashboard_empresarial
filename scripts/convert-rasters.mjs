/**
 * Converts NDVI/NDRE/LCI GeoTIFFs to PNG image overlays for Leaflet.
 *
 * Each classified raster (values 1–4) gets mapped to a 4-color ramp:
 *   1 = low  (red)
 *   2 = medium-low (yellow)
 *   3 = medium-high (light green)
 *   4 = high (dark green)
 *   0 = no-data (transparent)
 *
 * Output: public/rasters/{ndvi,ndre,lci}.png  + public/rasters/bounds.json
 *
 * Run: node scripts/convert-rasters.mjs
 *
 * Requirements:
 *   npm install geotiff sharp  (geotiff is already installed via install step)
 */

import { fromFile } from "geotiff";
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir   = join(__dirname, "..");
const outDir    = join(rootDir, "public", "rasters");
mkdirSync(outDir, { recursive: true });

// UTM Zone 17S → WGS84 reprojection (for bounds)
import proj4 from "proj4";
const UTM17S = "+proj=utm +zone=17 +south +datum=WGS84 +units=m +no_defs";
const WGS84  = "+proj=longlat +datum=WGS84 +no_defs";

// Color ramp: classified value 1-4 → RGBA
const RAMP = {
  1: [220, 38,  38, 200],   // red    – low index
  2: [234, 179, 8,  200],   // yellow – medium-low
  3: [134, 239, 172, 200],  // light green – medium-high
  4: [22,  163, 74, 200],   // dark green – high
};

const LAYERS = [
  { name: "ndvi", file: "NDVI.tif" },
  { name: "ndre", file: "NDRE.tif" },
  { name: "lci",  file: "LCI.tif"  },
];

const boundsMap = {};

for (const { name, file } of LAYERS) {
  const tifPath = join(rootDir, "Capas", file);
  console.log(`Processing ${file}…`);

  const tiff  = await fromFile(tifPath);
  const image = await tiff.getImage();

  const width  = image.getWidth();
  const height = image.getHeight();
  const bbox   = image.getBoundingBox(); // [xmin, ymin, xmax, ymax] in CRS units

  // Convert UTM bbox to WGS84
  const [swLng, swLat] = proj4(UTM17S, WGS84, [bbox[0], bbox[1]]);
  const [neLng, neLat] = proj4(UTM17S, WGS84, [bbox[2], bbox[3]]);
  boundsMap[name] = [[swLat, swLng], [neLat, neLng]]; // Leaflet: [[lat,lng],[lat,lng]]

  console.log(`  Size: ${width}×${height}, Bounds: SW=[${swLng.toFixed(6)},${swLat.toFixed(6)}] NE=[${neLng.toFixed(6)},${neLat.toFixed(6)}]`);

  // Read raster data (band 1)
  const rasters = await image.readRasters({ interleave: true });
  const data    = rasters instanceof DataView ? null : rasters;

  if (!data) {
    console.warn(`  Could not read raster data, skipping.`);
    continue;
  }

  // Build RGBA buffer
  const pixels = width * height;
  const rgba   = Buffer.allocUnsafe(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    const val = (data as unknown as Uint8Array | Float32Array)[i] ?? 0;
    const color = RAMP[val as keyof typeof RAMP] ?? [0, 0, 0, 0];
    rgba[i * 4]     = color[0];
    rgba[i * 4 + 1] = color[1];
    rgba[i * 4 + 2] = color[2];
    rgba[i * 4 + 3] = color[3];
  }

  // Save PNG
  const outPath = join(outDir, `${name}.png`);
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6 })
    .toFile(outPath);

  const sizeMB = ((await import("fs")).statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`  Saved → public/rasters/${name}.png (${sizeMB} MB)`);
}

// Save bounds for Leaflet ImageOverlay
writeFileSync(join(outDir, "bounds.json"), JSON.stringify(boundsMap, null, 2));
console.log("\nWrote public/rasters/bounds.json");
console.log("Done!");

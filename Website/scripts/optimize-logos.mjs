// One-off asset prep: shrink the brand logos copied from /logo into web-ready sizes.
// Emblem -> 192x192 PNG (header, footer, favicon, apple-touch).
// Full lockup -> 1200px JPEG for Open Graph / social cards + Organization JSON-LD.
// Run: node scripts/optimize-logos.mjs
// Requires `sharp` (not a declared project dependency — install with `npm i -D sharp`).
// Loaded dynamically so a missing install surfaces an actionable message instead of an opaque ERR_MODULE_NOT_FOUND.
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("This script needs `sharp`. Install it first: npm i -D sharp");
  process.exit(1);
}

const pub = join(import.meta.dirname, "..", "public");
const j = (f) => join(pub, f);

// Read sources into buffers first so we can safely overwrite the same paths.
const emblemBuf = readFileSync(j("logo-emblem.png"));
await sharp(emblemBuf)
  .resize(192, 192, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toFile(j("logo-emblem.png"));

if (existsSync(j("logo-full.png"))) {
  const fullBuf = readFileSync(j("logo-full.png"));
  await sharp(fullBuf)
    .resize(1200, null, { withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(j("logo-full.jpg"));
  // Remove the heavy source PNG; if the environment blocks deletion, shrink it in place.
  try {
    rmSync(j("logo-full.png"));
  } catch {
    await sharp(fullBuf)
      .resize(400, null, { withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(j("logo-full.png"));
  }
}

console.log("Logos optimized.");

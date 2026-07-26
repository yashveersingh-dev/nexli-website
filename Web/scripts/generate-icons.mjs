/**
 * NEXLI — PWA icon generator (dependency-free).
 *
 * Renders the NEXLI monogram (gold "N" on obsidian) to the three PNG icons the
 * web manifest (vite.config.ts) expects:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/icon-512-maskable.png   (extra padding → safe inside the mask)
 *
 * No image library: we rasterize a coverage map with 4× supersampling for smooth
 * edges, blend gold over obsidian, then hand-encode a PNG (IHDR/IDAT/IEND + CRC).
 *
 * Run:  node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/icons');

// NEXLI brand tokens (from nexli.css).
const OBSIDIAN = [8, 8, 8]; // #080808
const GOLD = [198, 165, 92]; // #C6A55C
const GOLD_LIGHT = [232, 211, 160]; // #E8D3A0 — subtle top-to-bottom sheen

/** Distance from point (px,py) to segment (ax,ay)-(bx,by). */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Is the supersample point (x,y) inside the "N" glyph?
 * The N = left vertical bar + right vertical bar + a thick diagonal joining them.
 */
function inGlyph(x, y, S, marginRatio) {
  const m = S * marginRatio;
  const x0 = m;
  const x1 = S - m;
  const y0 = m;
  const y1 = S - m;
  const gw = x1 - x0;
  const t = gw * 0.2; // stroke thickness
  const half = t / 2;

  // Vertical bars.
  if (y >= y0 && y <= y1) {
    if (x >= x0 && x <= x0 + t) return true; // left
    if (x >= x1 - t && x <= x1) return true; // right
  }
  // Diagonal (top-left → bottom-right), centred on the inner edges of the bars.
  if (distToSegment(x, y, x0 + half, y0, x1 - half, y1) <= half) return true;
  return false;
}

function makeIcon(size, { marginRatio }) {
  const scale = 4; // supersampling factor for anti-aliasing
  const cov = new Float32Array(size * size); // gold coverage 0..1 per final pixel

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const x = px + (sx + 0.5) / scale;
          const y = py + (sy + 0.5) / scale;
          if (inGlyph(x, y, size, marginRatio)) hits++;
        }
      }
      cov[py * size + px] = hits / (scale * scale);
    }
  }

  // Compose RGBA: obsidian background, gold glyph with a faint vertical sheen.
  const raw = Buffer.alloc(size * size * 4 + size); // +1 filter byte per row
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const c = cov[y * size + x];
      // Sheen: blend gold→gold-light from top to bottom for a premium feel.
      const sheen = y / size;
      const gr = GOLD[0] + (GOLD_LIGHT[0] - GOLD[0]) * sheen;
      const gg = GOLD[1] + (GOLD_LIGHT[1] - GOLD[1]) * sheen;
      const gb = GOLD[2] + (GOLD_LIGHT[2] - GOLD[2]) * sheen;
      raw[o++] = Math.round(OBSIDIAN[0] + (gr - OBSIDIAN[0]) * c);
      raw[o++] = Math.round(OBSIDIAN[1] + (gg - OBSIDIAN[1]) * c);
      raw[o++] = Math.round(OBSIDIAN[2] + (gb - OBSIDIAN[2]) * c);
      raw[o++] = 255; // opaque (maskable needs a filled background)
    }
  }
  return encodePng(size, size, raw);
}

/* ---------------- minimal PNG encoder (RGBA, 8-bit) ---------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rawWithFilters) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const idat = deflateSync(rawWithFilters, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------------- emit ---------------- */
mkdirSync(OUT_DIR, { recursive: true });
const files = [
  ['icon-192.png', makeIcon(192, { marginRatio: 0.26 })],
  ['icon-512.png', makeIcon(512, { marginRatio: 0.26 })],
  // Maskable: bigger margin so the glyph stays inside the platform safe zone (~80%).
  ['icon-512-maskable.png', makeIcon(512, { marginRatio: 0.32 })],
];
for (const [name, buf] of files) {
  writeFileSync(resolve(OUT_DIR, name), buf);
  console.log(`✓ ${name} (${buf.length} bytes)`);
}
console.log('Done — PWA icons written to public/icons/.');

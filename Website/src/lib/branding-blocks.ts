// Parses the canonical 60 rotating branding paragraphs from
// Web/Blog/BRANDING_BLOCKS.md at build time (read via Node fs during SSG, so we
// never transcribe or risk drift). Articles reference these by frontmatter number.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// This module is bundled into the SSR entry, so import.meta.url points into dist/
// at render time. Resolve from the build cwd (the Website/ project root) first,
// with fallbacks, so the source file is found in dev and build alike.
function readBrandingSource(): string {
  const candidates = [
    join(process.cwd(), "../Web/Blog/BRANDING_BLOCKS.md"),
    join(process.cwd(), "Web/Blog/BRANDING_BLOCKS.md"),
    fileURLToPath(new URL("../../../Web/Blog/BRANDING_BLOCKS.md", import.meta.url)),
  ];
  for (const p of candidates) {
    try {
      return readFileSync(p, "utf-8");
    } catch {
      /* try next */
    }
  }
  return "";
}

const raw = readBrandingSource();

function extractSection(src: string, heading: string): string {
  // From "## <HEADING> ..." to the next "## " section.
  const start = src.search(new RegExp(`^##\\s+${heading}\\b`, "m"));
  if (start === -1) return "";
  const rest = src.slice(start + 2);
  const next = rest.search(/^##\s/m);
  return next === -1 ? rest : rest.slice(0, next);
}

// Keep every rendered branding claim defensible against Web/Blog/NEXLI_FACTS.md.
// A few source blocks predate the facts and claim capabilities that are not built
// yet (an "open API", real-time parent bus notifications). We never edit the
// read-only source; instead we soften those exact sentences at parse time so the
// rest of the (grounded) block still renders.
function sanitizeClaims(text: string): string {
  return text
    // Open API: NEXLI_FACTS lists "SSO & Open API ... not yet architected".
    .replace(
      "Want to use Nexli with a third-party app? The system supports open APIs.",
      "Want to move your records elsewhere? Clean data export is built in."
    )
    .replace("The system includes APIs for third-party integration. ", "")
    // Real-time parent bus notifications are roadmap-only; keep office GPS + RFID.
    .replace(
      "it integrates GPS tracking, RFID boarding, live alerts, and parent notifications. A parent is notified when their child boards the bus and again when they alight. ",
      "it brings GPS tracking and RFID boarding together. "
    );
}

function parseBlocks(section: string): string[] {
  const blocks: string[] = [];
  const re = /###\s*Block\s*(\d+)\s*\n([\s\S]*?)(?=\n###\s*Block\s|\n---|\n##\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const idx = parseInt(m[1], 10) - 1;
    blocks[idx] = sanitizeClaims(m[2].trim().replace(/\s*\n\s*/g, " "));
  }
  return blocks;
}

export const FOUNDER_BLOCKS = parseBlocks(extractSection(raw, "FOUNDER BLOCKS"));
export const COMPANY_BLOCKS = parseBlocks(extractSection(raw, "COMPANY BLOCKS"));
export const NEXLI_BLOCKS = parseBlocks(extractSection(raw, "NEXLI BLOCKS"));

function pick(blocks: string[], n: number | undefined, fallbackSeed: number): string {
  const len = blocks.length || 1;
  const i = n && n >= 1 ? (n - 1) % len : ((fallbackSeed % len) + len) % len;
  return blocks[i] ?? blocks[0] ?? "";
}

export interface BrandingTrio {
  founder: string;
  company: string;
  nexli: string;
}

/** Choose the three branding paragraphs for an article from its frontmatter
 *  numbers, falling back to a stable per-article seed so rotation still varies. */
export function brandingFor(
  fm: { founder?: number; company?: number; nexli?: number; single?: number },
  seed: number
): BrandingTrio {
  return {
    founder: pick(FOUNDER_BLOCKS, fm.founder ?? fm.single, seed),
    company: pick(COMPANY_BLOCKS, fm.company ?? fm.single, seed),
    nexli: pick(NEXLI_BLOCKS, fm.nexli ?? fm.single, seed),
  };
}

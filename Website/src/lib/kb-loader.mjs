// Custom Content Layer loader for the knowledge base.
//
// Why custom: the Web/Blog corpus is large and inconsistent — several frontmatter
// schemas, some files with none, BOM prefixes, and (the build-breaker) unquoted
// colons in titles. Astro's stock glob loader fails the WHOLE build on one bad
// YAML file. This loader instead parses frontmatter leniently (auto-quoting bad
// scalar values, then falling back to empty frontmatter) so no article is lost,
// logs anything it had to salvage, and sanitizes article bodies as strings before
// rendering (trimming trailing boilerplate, dropping a duplicate H1/meta line, and
// rewriting nexli.* marketing links to the internal /demo).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ARTICLES_DIR = fileURLToPath(new URL("../../../Web/Blog/articles/", import.meta.url));

// Known scalar frontmatter keys whose values may contain stray colons.
const SCALAR_KEYS = new Set([
  "title", "meta_description", "description", "seo_title", "seo_description",
  "category", "primary_keyword", "intent", "slug", "author", "canonical",
]);

function fixScalarLine(line) {
  const m = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*):[ \t]+(.+?)[ \t]*$/);
  if (!m) return line;
  const [, indent, key, val] = m;
  if (!SCALAR_KEYS.has(key)) return line;
  if (/^["'\[{|>&*#]/.test(val)) return line; // already quoted / structured
  return `${indent}${key}: "${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function parseFrontmatter(raw) {
  let text = raw;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text, salvaged: false };
  const fm = m[1];
  const body = m[2];
  try {
    return { data: yaml.load(fm) || {}, body, salvaged: false };
  } catch {
    // ignore
  }
  try {
    const fixed = fm.split(/\r?\n/).map(fixScalarLine).join("\n");
    return { data: yaml.load(fixed) || {}, body, salvaged: true };
  } catch {
    return { data: {}, body, salvaged: true };
  }
}

const TAIL_MARKER = /^#{2,4}\s+(branding block|call to action|frequently asked|faqs?\b|about (nexli|yashveer|the author)|how nexli helps|related (articles|reading))/i;
const META_LINE = /^\*{0,2}\s*(published|category|read time|reading time)\b/i;

function sanitizeBody(body) {
  let lines = body.split(/\r?\n/);
  // strip leading blank / duplicate H1 / horizontal rule / meta line
  while (lines.length) {
    const l = lines[0].trim();
    if (l === "" || /^#\s+/.test(l) || /^(---|\*\*\*|___)\s*$/.test(l) || META_LINE.test(l)) {
      lines.shift();
    } else break;
  }
  // trim trailing boilerplate from the first marker heading onward
  let cut = -1;
  for (let i = 0; i < lines.length; i++) {
    if (TAIL_MARKER.test(lines[i].trim())) { cut = i; break; }
  }
  if (cut !== -1) lines = lines.slice(0, cut);

  let out = lines.join("\n");
  out = out.replace(/\((https?:\/\/[^)]*nexli\.[a-z.]+[^)]*)\)/gi, "(/demo)");
  out = out.replace(/https?:\/\/(?:www\.)?nexli\.[a-z]+(?:\/[^\s)]*)?/gi, "/demo");
  // Articles cross-link each other under an old /blog/<category>/<slug> scheme whose
  // deep slugs do not match the published /knowledge-base/<category>/<slug> URLs.
  // Re-point every such link to its category index (always a real, on-topic page) so
  // no in-article link 404s, keeping the descriptive anchor text intact.
  out = out.replace(/\/blog\/([0-9]{2}-[a-z0-9-]+)(?:\/[A-Za-z0-9-]+)?/gi, "/knowledge-base/$1");
  // Any leftover /blog path (non-standard category) falls back to the KB index.
  out = out.replace(/\/blog\/[^\s)"'\]]*/gi, "/knowledge-base");
  out = out.replace(/\/blog\b/gi, "/knowledge-base");
  // No em-dashes in published prose (matches the blog's house style). A few source
  // files still carry them; normalise to a comma so rendered articles stay consistent.
  out = out.replace(/\s*—\s*/g, ", ");
  // Some article bodies embed the canonical branding paragraphs inline, including a
  // couple of claims that NEXLI_FACTS marks as not-yet-built (an "open API", real-time
  // parent bus notifications). Soften those exact sentences here too, mirroring the
  // dynamic branding blocks, so every rendered surface stays defensible.
  out = out.replace(
    "Want to use Nexli with a third-party app? The system supports open APIs.",
    "Want to move your records elsewhere? Clean data export is built in."
  );
  out = out.replace(/\s*The system supports open APIs\./g, " Clean data export is built in.");
  out = out.replace(/\s*The system includes APIs for third-party integration\./g, "");
  out = out.replace(
    "it integrates GPS tracking, RFID boarding, live alerts, and parent notifications. A parent is notified when their child boards the bus and again when they alight.",
    "it brings GPS tracking and RFID boarding together."
  );
  out = out.replace(/\s*A parent is notified when their child boards the bus and again when they alight\./g, "");
  out = out.replace(
    /Nexli provides open APIs and standard export\/import formats\./g,
    "Nexli provides standard data export and import formats."
  );
  return out.trim();
}

function* walkArticles() {
  let categories;
  try {
    categories = readdirSync(ARTICLES_DIR);
  } catch {
    return;
  }
  for (const cat of categories) {
    const catPath = ARTICLES_DIR + cat;
    let st;
    try { st = statSync(catPath); } catch { continue; }
    if (!st.isDirectory()) continue; // skip loose root files (ARTICLE_INDEX.md, etc.)
    let files;
    try { files = readdirSync(catPath); } catch { continue; }
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      yield { id: `${cat}/${file.replace(/\.md$/, "")}`, path: `${catPath}/${file}` };
    }
  }
}

export function kbLoader() {
  return {
    name: "nexli-kb-loader",
    async load({ store, parseData, renderMarkdown, generateDigest, logger }) {
      store.clear();
      let count = 0;
      let salvagedCount = 0;
      let failed = 0;
      for (const { id, path } of walkArticles()) {
        let raw;
        try {
          raw = readFileSync(path, "utf-8");
        } catch (e) {
          failed++;
          logger?.warn(`kb: could not read ${id} — skipped`);
          continue;
        }
        const { data: fm, body, salvaged } = parseFrontmatter(raw);
        if (salvaged) salvagedCount++;
        try {
          const data = await parseData({ id, data: fm });
          const rendered = await renderMarkdown(sanitizeBody(body));
          store.set({
            id,
            data,
            body,
            rendered,
            digest: generateDigest ? generateDigest(raw) : undefined,
          });
          count++;
        } catch (e) {
          failed++;
          logger?.warn(`kb: failed to render ${id} — skipped (${e?.message || e})`);
        }
      }
      logger?.info(`kb: loaded ${count} articles (${salvagedCount} salvaged, ${failed} skipped)`);
    },
  };
}

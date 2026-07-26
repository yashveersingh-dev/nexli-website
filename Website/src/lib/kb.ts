// Knowledge-base normalization + queries.
// The Web/Blog corpus has several frontmatter schemas (and some files with none),
// so everything funnels through normalize() into one predictable Article shape.
import { getCollection, type CollectionEntry } from "astro:content";
import { KB_BY_SLUG } from "./site";

export const KB_PAGE_SIZE = 24;

export interface Faq {
  q: string;
  a: string;
}
export interface Article {
  id: string;
  categorySlug: string;
  categoryTitle: string;
  slug: string; // URL segment within the category
  title: string;
  description: string;
  date?: string;
  keywords: string[];
  author: string;
  branding: { founder?: number; company?: number; nexli?: number; single?: number };
  readingTime: number;
  seed: number;
  entry: CollectionEntry<"kb">;
}

// ---- small markdown helpers --------------------------------------------------
function stripMd(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function titleFromSlug(slug: string): string {
  return slug
    .replace(/^\d+-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function firstHeading(body: string): string | null {
  const m = body.match(/^﻿?#{1,3}\s+(.+?)\s*$/m);
  return m ? stripMd(m[1]) : null;
}
function firstParagraph(body: string): string | null {
  // skip frontmatter if present
  const withoutFm = body.replace(/^﻿?---[\s\S]*?\n---\s*/, "");
  for (const rawLine of withoutFm.split(/\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^(#|-|\*|>|\||```|\d+\.)/.test(line)) continue;
    if (/^\*\*(published|category)/i.test(line)) continue;
    const clean = stripMd(line);
    if (clean.length > 40) return clean;
  }
  return null;
}
function toArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function clamp(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}
function seedFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

// ---- normalization -----------------------------------------------------------
function normalize(entry: CollectionEntry<"kb">): Article {
  const d = entry.data as Record<string, any>;
  const body = entry.body || "";
  const [categorySlug, fileName = ""] = entry.id.split("/");
  const cat = KB_BY_SLUG[categorySlug];

  const fmSlug = typeof d.slug === "string" && d.slug.trim() ? d.slug.trim() : "";
  const slug = (fmSlug || fileName.replace(/^\d+[-_]/, "") || fileName)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const title =
    (typeof d.title === "string" && d.title.trim()) ||
    (typeof d.seo_title === "string" && d.seo_title.trim()) ||
    firstHeading(body) ||
    titleFromSlug(fileName);

  const rawDesc =
    d.meta_description ||
    d.description ||
    d.seo_description ||
    (d.seo && d.seo.description) ||
    firstParagraph(body) ||
    `${title}: a practical guide for Indian schools.`;
  const description = clamp(stripMd(String(rawDesc)), 165);

  const date = d.date || d.published_date || d.updated_date;
  const keywords = [
    ...toArray(d.primary_keyword),
    ...toArray(d.secondary_keywords),
    ...toArray(d.keywords),
    ...toArray(d.seo && d.seo.keywords),
  ];

  const words = body.split(/\s+/).filter(Boolean).length;

  return {
    id: entry.id,
    categorySlug,
    categoryTitle: cat ? cat.title : titleFromSlug(categorySlug),
    slug,
    title: String(title).trim(),
    description,
    date: date ? String(date).slice(0, 10) : undefined,
    keywords: [...new Set(keywords)].slice(0, 12),
    author: (typeof d.author === "string" && d.author.trim()) || "Yashveer Labs",
    branding: {
      founder: numOrUndef(d.branding_block_founder),
      company: numOrUndef(d.branding_block_company),
      nexli: numOrUndef(d.branding_block_nexli),
      single: numOrUndef(d.branding_block),
    },
    readingTime: Math.max(1, Math.round(words / 200)),
    seed: seedFrom(entry.id),
    entry,
  };
}
function numOrUndef(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

// ---- queries -----------------------------------------------------------------
let _cache: Article[] | null = null;

export async function getAllArticles(): Promise<Article[]> {
  if (_cache) return _cache;
  const entries = await getCollection("kb");
  const seen = new Set<string>();
  const articles: Article[] = [];
  for (const entry of entries) {
    const a = normalize(entry);
    if (!a.slug || !KB_BY_SLUG[a.categorySlug]) continue; // skip unknown categories
    let key = `${a.categorySlug}/${a.slug}`;
    if (seen.has(key)) {
      // de-collide using the source filename
      const fileName = entry.id.split("/")[1] || "";
      a.slug = `${a.slug}-${fileName.replace(/^\d+[-_]/, "").slice(0, 6) || "x"}`;
      key = `${a.categorySlug}/${a.slug}`;
      if (seen.has(key)) continue;
    }
    seen.add(key);
    articles.push(a);
  }
  // stable order: by category, then by source id (keeps NN- numbering)
  articles.sort((x, y) => (x.categorySlug + x.id).localeCompare(y.categorySlug + y.id));
  _cache = articles;
  return articles;
}

export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  return (await getAllArticles()).filter((a) => a.categorySlug === categorySlug);
}

export async function countsByCategory(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const a of await getAllArticles()) counts[a.categorySlug] = (counts[a.categorySlug] || 0) + 1;
  return counts;
}

export function relatedArticles(article: Article, pool: Article[], n = 4): Article[] {
  const sameCat = pool.filter((a) => a.categorySlug === article.categorySlug && a.id !== article.id);
  if (sameCat.length <= n) return sameCat;
  // rotate a window so related links vary between articles
  const start = seedFrom(article.id) % sameCat.length;
  const out: Article[] = [];
  for (let i = 0; i < n; i++) out.push(sameCat[(start + i) % sameCat.length]);
  return out;
}

// FAQ answers come from the raw (un-sanitised) body, so soften the few embedded
// claims NEXLI_FACTS marks not-yet-built here too (keeps FAQ text + FAQPage JSON-LD
// defensible). Data import/export is built; an open API is not yet.
function softenClaims(s: string): string {
  return s.replace(
    /Nexli provides open APIs and standard export\/import formats\.?/gi,
    "Nexli provides standard data export and import formats."
  );
}

// ---- FAQ extraction from raw body -------------------------------------------
export function extractFaqs(body: string): Faq[] {
  const region = body.match(
    /(?:^|\n)#{2,4}\s*(?:FAQs?|Frequently Asked Questions)[^\n]*\n([\s\S]*?)(?=\n#{2}\s|$)/i
  );
  if (!region) return [];
  const text = region[1];
  const out: Faq[] = [];

  const patterns = [
    /\*\*Q:\s*([\s\S]+?)\*\*\s*\n+A:\s*([\s\S]+?)(?=\n\s*\*\*Q:|\n#{2,4}\s|$)/gi,
    /#{3,4}\s*(.+?\?)\s*\n+([\s\S]+?)(?=\n#{2,4}\s|$)/g,
    /\*\*(.+?\?)\*\*\s*\n+([^\n][\s\S]*?)(?=\n\s*\*\*|\n#{2,4}\s|$)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    const local: Faq[] = [];
    while ((m = re.exec(text)) !== null) {
      const q = softenClaims(stripMd(m[1]));
      const a = softenClaims(stripMd(m[2]));
      if (q.length > 4 && a.length > 4) local.push({ q, a });
    }
    if (local.length) {
      out.push(...local);
      break;
    }
  }
  // de-dup + cap
  const seen = new Set<string>();
  return out
    .filter((f) => (seen.has(f.q) ? false : (seen.add(f.q), true)))
    .slice(0, 8);
}

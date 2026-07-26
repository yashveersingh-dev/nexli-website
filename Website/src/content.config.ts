import { defineCollection, z } from "astro:content";
import { kbLoader } from "./lib/kb-loader.mjs";
import { legalLoader } from "./lib/legal-loader.mjs";

// --- Knowledge Base -----------------------------------------------------------
// ~2,000 articles from Web/Blog/articles, structured as NN-category/NN-slug.md.
// The corpus is NOT uniform (several frontmatter schemas, some files with none,
// BOM prefixes, unquoted colons in titles). A custom loader parses frontmatter
// leniently so no file breaks the build, and sanitizes bodies before rendering.
// The permissive passthrough schema never rejects a file; src/lib/kb.ts does all
// normalization.
const kb = defineCollection({
  loader: kbLoader(),
  schema: z.object({}).passthrough(),
});

// --- Legal --------------------------------------------------------------------
// Draft legal documents rendered as styled pages, with internal drafting notes
// stripped at load time (see legal-loader.mjs).
const legal = defineCollection({
  loader: legalLoader(),
  schema: z.object({ title: z.string() }),
});

export const collections = { kb, legal };

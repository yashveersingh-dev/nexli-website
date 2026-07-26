// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// KB article bodies are sanitized as strings inside the custom loader
// (src/lib/kb-loader.mjs) before rendering, so no global remark plugin is needed.
export default defineConfig({
  // TODO(owner): set to the real production domain — used for canonical URLs, sitemap, and OG tags.
  // Placeholder only — never a real or Nexli-branded domain until the owner registers one.
  site: 'https://domain.com',
  trailingSlash: 'ignore',
  // Keep noindex legal documents (refund + /legal/<doc> privacy/terms/etc., which set
  // <meta robots="noindex">) OUT of the sitemap — listing a noindex URL sends crawlers
  // a mixed signal. The /legal index hub is indexable and stays in.
  integrations: [sitemap({ filter: (page) => !/\/legal\/[^/]+/.test(page) })],
  vite: {
    plugins: [tailwindcss()],
  },
});

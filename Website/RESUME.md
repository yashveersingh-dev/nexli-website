# Nexli Marketing Website — RESUME

> **Paste everything below this line into a brand-new session to pick up the
> project.** It is written as a self-contained prompt: it explains what the project
> is, its current finished state, the exact rules to follow, the only open items,
> and how to run/build/refresh it. For deeper architecture detail, also open
> `Website/CONTEXT.md` (next to this file).

_Last updated: **2026-06-22**. Latest commit **`ed9d867`** on branch **`website`**._

---

## ▶ PASTE-READY PROMPT

You are resuming work on the **Nexli marketing website** — a finished **Astro 5 +
Tailwind v4** static marketing site for **Nexli**, the School Operating System
(cloud ERP) built by **Yashveer Labs**, founder **Yashveer Singh**. It is
**positioned globally** ("for schools worldwide, with India-grade compliance at its
core"). It is a separate codebase from the Nexli app: no backend, no auth, fully
static (~2,237 pages, the bulk being a Knowledge Base of ~2,092 articles).

### Where it lives & how to stay isolated (do not break these)
- Work **only inside the `Website/` folder** at:
  `C:\Users\yashv\Desktop\Yashveer Singh\Lets_Build\NEXLI\Nexli-website\Website`
- It is a **separate git worktree**. Git root is `Nexli-website` (parent of
  `Website/`); the branch is **`website`**.
- **Stage only `Website/`** when committing — `git add Website`. **Never
  `git add -A`.** Every commit in this project must touch only `Website/`.
- Two source images sit at the git root (`Yashveer Singh.jpg`,
  `nexli-preview-share.png`) and are intentionally **untracked — never stage
  them**; their processed copies are already committed at `Website/public/`
  (`founder.jpg`, `og-share.jpg`).
- **Never edit** `../Web/Blog/`, `../articles/`, the `../legal` source drafts, or
  the Python generators — they are **read-only inputs**. The site reads them at
  build via relative paths.
- **Never touch the Nexli app's own context/resume/continuity files** (e.g.
  `../context/`, `../resume/`, `../docs/archive/continuity/`, `../Web/Blog/RESUME.md`).
  This project's only handoff docs are `Website/CONTEXT.md` and `Website/RESUME.md`.

### Content & brand rules (carry forward — these are deliberate owner decisions)
- **Contact = Instagram only.** No WhatsApp anywhere (no number, no `wa.me`, no
  floating WhatsApp button), no phone number, no contact/web form. Email
  `yashveersr4@gmail.com` is the written backup; location line is "Somewhere in
  Sector 10, Dwarka, New Delhi". Do not re-add WhatsApp or a form.
- **Primary CTA site-wide = "Book Free Live Demo"** (→ `/demo`); **secondary =
  Instagram.** Config in `src/lib/site.ts`.
- **Keep the `https://domain.com` placeholder** for the production domain (in
  `src/lib/site.ts` → `SITE.url`, `astro.config.mjs` → `site`, and
  `public/robots.txt`). **Never** use a real or Nexli-branded domain until the owner
  registers one.
- **No exact prices.** Pricing is two quote-based tiers (Founding School / Standard
  School) with no rupee figures. Only add figures if the owner provides them.
- **No fabricated features, customers, logos, testimonials, numbers, or awards.**
  Every product claim must be defensible against `../Web/Blog/NEXLI_FACTS.md`.
  Automated WhatsApp delivery is **not built** — product copy says SMS + in-app +
  email only.
- **House style:** no em-dashes in published prose (the loaders normalise them);
  en-dash numeric ranges are fine.
- Only put a real value on the site — never a placeholder or dead social link.

### Current state — it is complete
The full site is built and the production build is **green (~2,237 pages)**; a full
automated audit of every page returns **zero findings** (no broken links, no missing
SEO/title/desc/canonical/OG/Twitter/JSON-LD, no placeholders, no missing images, no
em-dashes). All real-world details from the owner interview are wired in:
Instagram-only contact + email + location; 9 social links (footer + contact +
`sameAs`); founder page with the real photo + Person JSON-LD + global framing;
filled-in legal details (data fiduciary Yashveer Labs, DPO Yashveer Singh /
`yashveersr4@gmail.com`, Google Firebase sub-processor, New Delhi jurisdiction);
two-tier quote-based pricing; `og-share.jpg` share image; favicon
`/logo-emblem.png`. See `Website/CONTEXT.md` §6 for the full list.

**Last audit (2026-06-22, commit `ed9d867`):** a deep code review fixed 6 website
issues — the dead `"safety"` module slug → `"medical-safety"` in
`src/lib/modules.ts` (restores the Medical & Safety cross-link on the
Communication/Transport/Hostel pages); noindex legal docs excluded from the sitemap
(`astro.config.mjs` filter); `<html lang="en-IN">` in `BaseLayout.astro`; the marks
demo clamped to 0–25 in `components/demo/TeacherDemo.astro`; and `sharp` declared as
a devDependency + loaded via a guarded import in `scripts/optimize-logos.mjs`. Build
re-verified green afterward (~2,237 pages).

### The only open items (both deliberate — not bugs)
1. **Production domain** — still the `https://domain.com` placeholder. The owner is
   launching first (GitHub + Vercel) and will buy a domain after onboarding ~10–15
   schools. When ready, set the real domain in `src/lib/site.ts` → `SITE.url`,
   `astro.config.mjs` → `site`, and `public/robots.txt`, then rebuild/redeploy.
2. **Exact pricing figures** — none on the page by design. If the owner sends real
   numbers, drop them into the two tiers in `src/pages/pricing.astro`.

Also (not a blocker): the legal pages say "subject to final legal review" — a
qualified Indian lawyer should review them before the school relies on them.

### How to run & build
```bash
cd "C:/Users/yashv/Desktop/Yashveer Singh/Lets_Build/NEXLI/Nexli-website/Website"
npm install        # first time only
npm run dev        # dev server → http://localhost:4321
npm run build      # production build → Website/dist  (~2,237 pages)
npm run preview    # serve the built dist locally
```
- First `dev`/`build` runs a content sync (~30s) that runs the KB loader; the
  console logs e.g. `kb: loaded 2092 articles (… salvaged, 0 skipped)`.
- `dist/`, `.astro/`, `node_modules/` are gitignored — never commit build output.
- **After changing a loader** (`src/lib/kb-loader.mjs`, `legal-loader.mjs`,
  `branding-blocks.ts`), clear the content cache so unchanged-source articles
  re-render:
  `rm -rf .astro dist node_modules/.astro && npm run build`.

### How to refresh the Knowledge Base content
The articles are a **snapshot** taken when the `website` branch was cut; the blog
generator keeps adding/editing articles on `master` in the main `Nexli` repo. To
pull newer content in:
```bash
cd "C:/Users/yashv/Desktop/Yashveer Singh/Lets_Build/NEXLI/Nexli-website"
git fetch                 # if master was updated elsewhere
git merge master          # brings updated Web/Blog (+ legal) into the website branch
cd Website
rm -rf .astro dist node_modules/.astro && npm run build   # loader picks up changes
```
The loader is resilient (lenient frontmatter, sanitized bodies), so new files in
whatever shape the generator produces load without breaking the build — only a merge
+ rebuild is needed, no code changes. Keep the commit rule: `git add Website` only.

### How to deploy (when the owner is ready — do not deploy unprompted)
Target is **Vercel**, static output. **First set the real domain** (open item #1).
Then import the repo, deploy the **`website` branch**, set **Root Directory =
`Website`**, Framework = Astro, Build = `npm run build`, Output = `dist`. Vercel
clones the whole branch so the build can still read `../Web/Blog` and `../legal`
(that's why those stay committed to `website`). No env vars (static, no backend).

### Working agreement
Make changes in `Website/` only, keep the build green, run the audit, commit with
`git add Website` (never `-A`), and tell the owner exactly what changed. Don't
deploy, don't buy/guess a domain, don't invent facts, don't re-add WhatsApp or a
form, don't add prices.

---

_End of paste-ready prompt. Architecture and file-by-file detail: `CONTEXT.md`._

# Nexli Marketing Website — CONTEXT

> What this project is, how it's set up, and how it fits next to the Nexli app.
> Read this first if you're a new session with no prior memory. For the current
> finished state and the exact rules to follow, see **RESUME.md** next to this file.

_Last updated: **2026-06-22**. Latest commit **`ed9d867`** on branch **`website`**._

> **Status (2026-06-22):** the site is complete and the build is green (~2,237
> pages). A deep code audit (covering the app and this site) fixed **6 website
> issues** in `ed9d867`: a dead "safety" module slug in `src/lib/modules.ts` →
> `"medical-safety"` (so the Communication/Transport/Hostel pages render their
> Medical & Safety cross-link); noindex legal docs excluded from the sitemap
> (`astro.config.mjs` filter); `<html lang="en-IN">`; the marks demo clamped to its
> 0–25 max; and `sharp` declared as a devDependency + loaded via a guarded import in
> `scripts/optimize-logos.mjs`. **Location note:** the repo moved to
> `…/Lets_Build/NEXLI/` (older docs/paths below may still cite the previous
> `…/My-Apps/…` path — the current root is `Lets_Build/NEXLI/Nexli-website`).

---

## 1. What it is

The public marketing website for **Nexli — the School Operating System for modern
education**, a cloud ERP built by **Yashveer Labs** (founder **Yashveer Singh**,
"Founder & Lead Engineer").

Positioning is **global**: Nexli is built for **schools worldwide, with
India-grade compliance at its core**. The idea began from operational problems the
founder saw in his own school in India, but the product is designed for educational
institutions anywhere. India-specific compliance (DPDP, POCSO, RTE, CBSE, UDISE+)
is presented as a strength, not as a limit on who it is for.

It is a **static site**: marketing/product pages, a large SEO/AEO Knowledge Base
wired from existing markdown, and a no-signup interactive product demo. It is a
**separate codebase** from the Nexli app — it talks to no backend and has no auth.

---

## 2. Stack

- **Astro 5** (v5.18.2) — static site generation, **Content Layer API**.
- **Tailwind v4** via the `@tailwindcss/vite` plugin (NOT `@astrojs/tailwind`).
  Design tokens live in a `@theme` block in `src/styles/global.css`.
- **@astrojs/sitemap** — generates `sitemap-index.xml`.
- **sharp** — one-off logo optimization (`scripts/optimize-logos.mjs`).
- Fonts: **Fraunces** (display serif) + **Inter** (body), via Google Fonts.
- No client framework, no islands beyond small inline `<script is:inline>` blocks
  (header menu, scroll reveal, demo screen-switching, demo interactivity).

---

## 3. Folder / worktree setup  ⚠️ important

The site lives in a **separate git worktree** so its commits never collide with a
concurrent blog-generator process that commits to `master` in the main repo.

```
C:\Users\yashv\Desktop\Yashveer Singh\Lets_Build\NEXLI\
├─ Nexli\            ← main app repo (branch: master) — the blog process commits here
└─ Nexli-website\    ← THIS worktree (branch: website) — git root
   ├─ Website\       ← the Astro site (ALL website work happens here)
   ├─ Web\Blog\      ← snapshot of article content + NEXLI_FACTS.md the site reads
   ├─ legal\         ← legal-policy drafts the site reads
   ├─ logo\          ← brand logos (source for public/ images)
   └─ … (the rest of the app tree, inherited from the branch point)
```

- **Git root:** `Nexli-website` (the parent of `Website/`). **Branch:** `website`.
  **Site root:** the `Website/` subfolder.
- **COMMIT RULE (do not break):** stage **only** `Website/` — `git add Website`.
  **Never `git add -A`.** Every commit in this project touches only `Website/`.
  This is what keeps the website work isolated from the app + blog process.
- Two source images for the site live at the **git root** (`Yashveer Singh.jpg`,
  `nexli-preview-share.png`); their processed copies are committed
  inside `Website/public/` (`founder.jpg`, `og-share.jpg`). The originals at the
  root are intentionally left untracked — **do not stage them.**
- The build reads sibling folders by relative path: `../Web/Blog/articles`,
  `../Web/Blog/BRANDING_BLOCKS.md`, `../Web/Blog/NEXLI_FACTS.md`, `../legal`. These
  are committed to the `website` branch, so the build is self-contained.

---

## 4. Page structure

```
/                              Home (hero + module/compliance/KB teasers)
/platform                      Platform overview (links to all modules)
/platform/<slug>               12 module pages: admissions, fees, attendance,
                                 academics, report-cards, hr-payroll,
                                 communication, transport, hostel, library,
                                 medical-safety, compliance
/solutions                     Solutions index
/solutions/<slug>              5 school types: cbse, icse, state-board,
                                 boarding, international
/pricing                       Two tiers, approach only (no rupee figures)
/security                      Security reference
/compliance                    Compliance reference (DPDP/POCSO/RTE/CBSE/UDISE+)
/about  /founder  /careers  /contact     Company pages
/demo                          Interactive demo role picker (6 roles)
/demo/<role>                   In-browser demo apps (principal, vice-principal,
                                 teacher, coordinator, student, parent)
/knowledge-base                KB index (20 categories, live counts)
/knowledge-base/<category>     Category index (page 1)
/knowledge-base/<category>/page/<n>      Category pagination
/knowledge-base/<category>/<slug>        ~2,092 article pages
/faq                           General FAQ (FAQPage JSON-LD)
/founding-partner              Founding Partner Program (replaces fake case studies)
/legal  /legal/<doc>  /legal/refund      Privacy, Terms, Data Processing,
                                 Parent Consent, Refund
/sitemap  /accessibility  /404           HTML sitemap, a11y statement, 404
```

Total: **~2,237 static pages** (the vast majority are KB articles).

### Key source files
- `src/lib/site.ts` — central config: `SITE` (name, url, tagline, company,
  founder, founderTitle, founded), contact channels (`INSTAGRAM_URL`,
  `CONTACT_EMAIL`, `EMAIL_HREF`, `LOCATION`), `SOCIALS[]` (9 profiles), `SAME_AS`
  / `FOUNDER_SAME_AS` (JSON-LD entity links), `OG_IMAGE`, `PRIMARY_CTA`
  (`Book Free Live Demo` → `/demo`), `NAV`, `FOOTER_GROUPS`, `MODULES`,
  `COMPLIANCE`, `KB_CATEGORIES`. **No WhatsApp, no web-form exports** (removed).
- `src/lib/modules.ts` / `src/lib/solutions.ts` — content for the data-driven
  module + solution pages.
- `src/lib/seo.ts` — `webPage()` / `articleSchema()` JSON-LD helpers, `abs()`.
- `src/content.config.ts` — registers the `kb` and `legal` collections.
- `src/layouts/BaseLayout.astro` — HTML shell: head/SEO/OG (default OG image =
  `OG_IMAGE`), favicon = `/logo-emblem.png`, Organization JSON-LD
  (`areaServed: Worldwide`, founder block, `sameAs: SAME_AS`), optional per-page
  `jsonLd` prop, Header + Footer + **FloatingContact** (floating Instagram button).
- `src/components/` — shared UI (PageHero, Breadcrumbs, Faq, CtaBand/CtaButtons,
  FeatureGrid, ArticleCard, KbCategoryView, JsonLd, Icon, Logo, Header, Footer,
  FloatingContact); `home/` homepage sections; `demo/` the demo shell + 6 roles.

---

## 5. Design system & brand

- Tokens in `src/styles/global.css` `@theme`:
  - **obsidian `#080808`** (background; plus 800/700/600 shades),
    **gold `#c6a55c`** (accent; plus 200/300/700), **ivory `#f7f2e8`** (text; plus
    `-muted #b4afa4`, `-faint #6d6a62`), hairline **`--color-line #221f1a`**.
  - `--font-display: Fraunces`, `--font-sans: Inter`; `--radius-xl`, `--radius-2xl`.
- Reusable plain-CSS classes (not utilities): `.container-nx`, `.section`,
  `.eyebrow`, `.btn` / `.btn-gold` / `.btn-ghost` / **`.btn-instagram`** (the
  Instagram brand-gradient button — this replaced the old `.btn-whatsapp`),
  `.card`, `.chip`, `.callout`, `.kicker-chip`, `.text-gradient-gold`,
  `.glow-radial`, `.grid-texture`, `.prose-nx` (long-form article/legal styling),
  `.reveal` (scroll-in, respects reduced-motion), `.nx-input`, the `.demo-*` set
  (demo app chrome + widgets) and `.badge`.
- Dark theme throughout, mobile-first, aiming at WCAG AA (skip link, focus rings,
  semantic landmarks, single H1 per page, reduced-motion handling).
- **Primary CTA everywhere = "Book Free Live Demo"** (→ `/demo`); **secondary =
  Instagram**. Favicon/app icon = `/logo-emblem.png`. Social-share image =
  `/og-share.jpg`.

---

## 6. Real-world details (from the owner interview — all wired in)

Central source is `src/lib/site.ts` unless noted.

**Contact — Instagram only.**
- Instagram (`https://www.instagram.com/yashveerlabs/`, `@yashveerlabs`) is the
  single public contact channel and the floating button. Email
  **`yashveersr4@gmail.com`** is the written backup. Location line: **"Somewhere in
  Sector 10, Dwarka, New Delhi"** (the word "somewhere" is deliberate — privacy).
- **No phone number, no WhatsApp anywhere** (no number, no `wa.me`, no floating
  WhatsApp button), **no contact/web form.** The contact page is two cards
  (Instagram + email/location), zero `<form>` tags.

**Social links (9, footer + contact + JSON-LD `sameAs`).** Instagram, YouTube, X,
LinkedIn, Facebook, GitHub, Pinterest, Reddit, Medium. Only these real,
owner-confirmed URLs appear — no placeholder or dead icons. Brand glyphs live in
`src/components/Icon.astro`.

**Company & founder.**
- Company **Yashveer Labs** (no legal-entity name shown). Taglines: Nexli
  "Bringing clarity to complexity"; Yashveer Labs "Built in Silence. Shipped Like
  It Was Inevitable." Footer copyright **"© 2026 Yashveer Labs. All Rights
  Reserved."** plus "Made in India · Built for schools everywhere".
- **Founder page** (`src/pages/founder.astro`) is SEO/entity-tuned so a search for
  "Yashveer Singh" resolves him as **Founder of Yashveer Labs / Founder &
  Lead Engineer of Nexli**: real photo `public/founder.jpg`, Person JSON-LD
  (`jobTitle`, `worksFor`, `image`, `knowsAbout`, `sameAs` →
  LinkedIn/Instagram/X/GitHub/Medium). Bio uses the global framing above.

**Legal details (filled in).** Data fiduciary **Yashveer Labs**; DPO & grievance
officer **Yashveer Singh** (`yashveersr4@gmail.com`); **Google Firebase**
named as the principal sub-processor; jurisdiction **New Delhi, India**. Resolved at
render time by `src/lib/legal-loader.mjs` (the `../legal` source drafts are never
edited). Pages still carry "subject to final legal review" — a qualified Indian
lawyer should review before relying on them.

**Pricing — two quote-based tiers, no figures.** `src/pages/pricing.astro`:
**Founding School** (first ~10–15 schools; lowest locked rate, hands-on setup,
direct founder line, money-back) vs **Standard School** (priced by size, full
platform). The exact number is "shared as a written quote" — **no rupee figures by
design.**

**Share image & domain.** `public/og-share.jpg` is wired into `og:image` /
`twitter:image` site-wide (with alt). The production domain is intentionally the
placeholder **`https://domain.com`** (see RESUME.md open items).

**Claim grounding.** Every product claim is defensible against
`../Web/Blog/NEXLI_FACTS.md`. Automated WhatsApp delivery is **not built**, so all
product copy says **SMS + in-app + email** only.

---

## 7. How the Knowledge Base content is wired

The ~2,092 articles come from `../Web/Blog/articles/<NN-category>/<NN-slug>.md`.
That corpus is **not uniform** — 5+ different frontmatter schemas, some files with
no frontmatter, BOM prefixes, and (the build-breaker) unquoted colons in titles
that crash stock YAML parsing. Astro's built-in `glob()` loader fails the whole
build on a single bad file, which is unacceptable here.

So the KB uses a **custom Content Layer loader**: `src/lib/kb-loader.mjs` (wired in
`src/content.config.ts` as the `kb` collection). It:
1. Walks `../Web/Blog/articles/*/*.md` with Node `fs` (skips loose root files).
2. **Parses frontmatter leniently** — strict YAML first, then a fallback that
   auto-quotes scalar values (recovering colon-in-title files), then empty
   frontmatter as a last resort. Nothing is ever thrown; nothing is lost.
3. **Sanitizes each body as a string** before rendering: trims trailing boilerplate
   (`## Branding Block` / `## Call to Action` / `## FAQ`), drops a duplicate leading
   `# H1` and `**Published:**` meta line, normalises em-dashes to commas, and
   re-points stale `/blog/<category>/<slug>` cross-links to the matching
   `/knowledge-base/<category>` index (so zero dead links).
4. Renders via the loader context's `renderMarkdown` (GFM tables + heading IDs work
   and headings feed the article TOC).

`src/lib/kb.ts` then **normalizes** every entry into one `Article` shape (category
from the folder, derived title/description, keywords, reading time, slug dedup,
related-article rotation) and extracts FAQs from the raw body. The per-article
rotating brand paragraphs are parsed at build from `../Web/Blog/BRANDING_BLOCKS.md`
by `src/lib/branding-blocks.ts`. Article pages emit **Article + BreadcrumbList +
FAQPage** JSON-LD.

Legal pages work the same way: `src/lib/legal-loader.mjs` reads the `../legal`
drafts, strips internal "DRAFT / not legal advice" notes, resolves the
`[NEEDS YASHVEER]` / `[School to insert]` placeholders to the finished values in §6,
and renders them (source files untouched).

> Because all of this reads sibling folders by relative path, the `Web/Blog` and
> `legal` snapshots must be present in whatever branch is built (they are committed
> to `website`). **Changing a loader requires clearing the content cache** so
> unchanged-source articles re-render — see RESUME.md.

---

## 8. Isolation from the app and the blog process

- **From the app:** different git root dir, different branch, no shared build, no
  backend calls. The site only *reads* `Web/Blog` + `legal` markdown at build.
- **From the blog generator:** it commits article markdown to `master` in the main
  `Nexli` repo. The website lives on `website` in a separate worktree and **only
  ever stages `Website/`**, so the two never collide. To pull in newer articles,
  merge `master` into `website` and rebuild (see RESUME.md).
- **Never touched** by this project: `../Web/Blog/`, `../articles/`, the `../legal`
  source drafts, the Python generators, the Super Admin account, or any app/seed
  data. The site treats those content folders as **read-only inputs**.
- **Never touch the Nexli app's own context/resume files** (e.g. `../context/`,
  `../resume/`, `../docs/archive/continuity/`, `../Web/Blog/RESUME.md`). This
  project's only handoff docs are this `CONTEXT.md` and `RESUME.md` inside
  `Website/`.

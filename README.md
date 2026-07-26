# Nexli Web & Marketing Platform

> Designed and engineered by **Yashveer Singh** — Founder of Yashveer Labs  
> [https://github.com/yashveersingh-dev](https://github.com/yashveersingh-dev)

This repository houses the public web presentation, interactive demos, and extensive educational knowledge base for **Nexli**—a multi-tenant School Operating System built for modern educational institutions.

The project is structured around high-performance static delivery, accessibility, SEO/AEO/GEO optimization, and modular component architecture. Every page is engineered to load instantly, present clear architectural truth without marketing fluff, and provide value to school leadership and administrators.

---

## Purpose & Why This Project Exists

Enterprise school management software is notorious for poor user interfaces, opaque pricing, and slow web experiences. Evaluating an ERP is often an exhausting exercise in navigating sales funnels and buzzwords.

The Nexli web platform exists to invert this paradigm:
1. **Absolute Transparency:** Full architectural walkthroughs, live interactive demos, and comprehensive documentation available without gates or sign-up walls.
2. **High-Density Knowledge Base:** A 20-category, 2,000+ page educational resource covering CBSE/ICSE compliance, school administration, DPDP privacy laws, and campus safety.
3. **Engineering Craftsmanship:** Built with modern static-site generation and minimal JavaScript payloads to ensure near-instantaneous load times and perfect Core Web Vitals across diverse Indian network conditions.

---

## Architecture & Repository Structure

The repository is organized into distinct, specialized subsystems:

```
nexli-website/
├── Website/         # Production Astro static site (Vercel deployment target)
│   ├── src/
│   │   ├── components/  # Reusable UI primitives, cards, and interactive widgets
│   │   ├── layouts/     # Declarative page shells (BaseLayout, KbLayout, LegalLayout)
│   │   ├── lib/         # Core site configuration, SEO schemas, and markdown loaders
│   │   └── pages/       # Route definitions (Platform, Solutions, Knowledge Base, Legal)
│   └── public/          # Static assets, OG share images, and branding
├── Web/             # React/Vite interactive web application and portal preview
├── docs/            # Engineering specifications, runbooks, and test plans
├── scripts/         # Content generation, enhancement, and validation utilities
├── legal/           # Formal legal frameworks (DPDP Act, Terms, Data Processing)
└── vercel.json      # Production edge routing and build configuration
```

### Key Architectural Decisions

- **Static-First Delivery (Astro):** The core website compiles to over 2,200 static HTML pages at build time. By removing client-side hydration where unnecessary, the site achieves zero layout shift and sub-second First Contentful Paint (FCP).
- **Declarative Site Configuration (`site.ts`):** All social URLs, navigation structures, contact endpoints, and metadata are centralized in typed TypeScript schemas, eliminating route drift across the domain.
- **Edge Routing & Build Seams:** The Vercel deployment targets the `Website/` directory directly via custom install/build pipelines defined in `vercel.json`, isolating the marketing site build from experimental or backend workspace dependencies.

---

## Features

- **2,200+ Compiled Knowledge Pages:** Deeply researched guidance on school operations, legal compliance (DPDP Act 2023, POCSO, RTE), finance, and HR payroll.
- **Dynamic SEO & AEO Optimization:** Automated JSON-LD structured data generation, Open Graph metadata, semantic HTML hierarchy, and canonical routing tailored for AI and search engines.
- **Responsive Neumorphic & Glassmorphic UI:** A clean, accessible design system built with Tailwind CSS and custom design tokens.
- **Strict Verification Suite:** Comprehensive TypeScript type-checking and automated build-time validation of internal links, images, and content schemas.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Core Framework | [Astro 5.0](https://astro.build/) |
| Interactive Portals | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) |
| Styling & Design System | [Tailwind CSS v4](https://tailwindcss.com/) |
| Language | TypeScript |
| Content Processing | Markdown, YAML, custom syntax parsers |
| Hosting & Edge Network | [Vercel](https://vercel.com/) |
| CI/CD & Verification | Vitest, GitHub Actions |

---

## Installation & Local Development

### Prerequisites

- Node.js (v20+ recommended)
- npm or pnpm

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yashveersingh-dev/nexli-website.git
   cd nexli-website
   ```

2. **Run the production website locally (Astro):**
   ```bash
   cd Website
   npm install
   npm run dev
   ```
   The development server will launch at `http://localhost:4321`.

3. **Run the interactive application portal (Vite/React):**
   ```bash
   cd ../Web
   npm install
   npm run dev
   ```
   The portal preview will launch at `http://localhost:5173`.

---

## Usage & Verification

To validate the build integrity and ensure production readiness for Vercel deployment:

```bash
cd Website
npm run build
```

This compiles the entire static sitemap, validates all TypeScript schemas, generates `/dist/sitemap-index.xml`, and verifies that all 2,200+ pages build without errors.

---

## Roadmap

- [ ] **Domain & Edge CDN Cutover:** Finalize production domain binding and DNSSEC configuration.
- [ ] **Interactive Calculator Widgets:** Embed client-side fee and ROI estimation calculators within the Knowledge Base.
- [ ] **Multi-Language Support (i18n):** Expand core compliance and parent-facing guides into Hindi and regional languages.
- [ ] **Enhanced Accessibility Audit:** Complete WCAG 2.1 AAA contrast and screen-reader verification across all interactive components.

---

## Author

**Yashveer Singh**  
Founder of Yashveer Labs  
[https://github.com/yashveersingh-dev](https://github.com/yashveersingh-dev)

---

## Credits

- Built by **Yashveer Labs**, a software studio dedicated to precision engineering and resilient systems.
- Powered by the open-source ecosystems of Astro, React, Vite, and Tailwind CSS.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
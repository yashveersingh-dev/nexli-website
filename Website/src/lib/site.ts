// Central site configuration for the Nexli marketing website.
// Copy and contact values that change often live here so pages stay declarative.
import { MODULE_PAGES } from "./modules";
import { SOLUTION_PAGES } from "./solutions";

export const SITE = {
  name: "Nexli",
  tagline: "Bringing clarity to complexity",
  description:
    "Nexli is the School Operating System for modern education, bringing admissions, academics, attendance, fees, compliance, communication, safety, HR, transport, hostel and operations into a single platform.",
  // TODO(owner): replace with the real production domain once registered.
  // Intentionally a placeholder, never a real or Nexli-branded domain.
  url: "https://domain.com",
  locale: "en_IN",
  company: "Yashveer Labs",
  founder: "Yashveer Singh",
  founderTitle: "Founder & Lead Engineer",
  founded: "2026",
};

// Yashveer Labs is the software studio behind Nexli; Nexli is its first product.
export const COMPANY_TAGLINE = "Built in Silence. Shipped Like It Was Inevitable.";
export const COMPANY_FOUNDED = "January 2026";
export const NEXLI_FOUNDED = "June 2026";

// Default social-share image (shown on WhatsApp, LinkedIn, Facebook, X, etc.).
// 1200x675 JPEG (~140KB) so chat apps reliably render the preview thumbnail.
export const OG_IMAGE = "/og-share.jpg";

// --- Contact channels ---------------------------------------------------------
// Instagram is the primary, always-on contact channel; email is the written
// backup. By design there is no phone number, WhatsApp line or web form: every
// "contact" action points at a real, working profile, never a dead link.
export const INSTAGRAM_URL = "https://www.instagram.com/yashveerlabs/";
export const INSTAGRAM_HANDLE = "@yashveerlabs";
export const CONTACT_EMAIL = "yashveersr4@gmail.com";
export const EMAIL_HREF = `mailto:${CONTACT_EMAIL}`;
export const LOCATION = "Somewhere in Sector 10, Dwarka, New Delhi";

// All public profiles, in display order. Only real, owner-confirmed links live
// here, so the footer and social rows never render a placeholder or dead icon.
export interface Social {
  label: string;
  href: string;
  icon: string;
  handle?: string;
}
export const SOCIALS: Social[] = [
  { label: "Instagram", href: "https://www.instagram.com/yashveerlabs/", icon: "instagram", handle: "@yashveerlabs" },
  { label: "YouTube", href: "https://www.youtube.com/channel/UCuJh3Aaoax9Fe9HOrWPN2Og", icon: "youtube" },
  { label: "X", href: "https://x.com/yashveerlabs", icon: "x", handle: "@yashveerlabs" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/yashveerlabs/", icon: "linkedin", handle: "@yashveerlabs" },
  { label: "Facebook", href: "https://www.facebook.com/share/p/14iW5TZxEVs/", icon: "facebook" },
  { label: "GitHub", href: "https://github.com/yashveersingh-dev", icon: "github", handle: "@yashveersingh-dev" },
  { label: "Pinterest", href: "https://in.pinterest.com/yashveerlabs/", icon: "pinterest" },
  { label: "Reddit", href: "https://www.reddit.com/user/Glad_Factor_8699/", icon: "reddit" },
  { label: "Medium", href: "https://yashveerlabs.medium.com/", icon: "medium" },
];
// Canonical entity links for JSON-LD sameAs (organization + founder).
export const SAME_AS: string[] = SOCIALS.map((s) => s.href);
export const FOUNDER_SAME_AS: string[] = [
  "https://www.linkedin.com/in/yashveerlabs/",
  "https://www.instagram.com/yashveerlabs/",
  "https://x.com/yashveerlabs",
  "https://github.com/yashveersingh-dev",
  "https://yashveerlabs.medium.com/",
];

// --- Interactive demo + primary CTA -------------------------------------------
export const DEMO_HREF = "/demo";
// The site-wide primary action: a free, no-signup, in-browser product demo.
export const PRIMARY_CTA = { label: "Book Free Live Demo", href: DEMO_HREF } as const;

// --- Navigation ---------------------------------------------------------------
export interface NavLink {
  label: string;
  href: string;
  desc?: string;
  icon?: string;
}
export interface NavItem {
  label: string;
  href: string;
  items?: NavLink[];
  /** render the dropdown as a wide 2-column panel (used by Platform) */
  wide?: boolean;
}

const platformItems: NavLink[] = [
  { label: "Platform overview", href: "/platform", desc: "The whole ERP at a glance", icon: "operations" },
  ...MODULE_PAGES.map((m) => ({ label: m.nav, href: `/platform/${m.slug}`, desc: m.summary, icon: m.icon })),
  { label: "Security", href: "/security", desc: "How your data is protected", icon: "shield" },
  { label: "Compliance", href: "/compliance", desc: "CBSE, DPDP, POCSO, RTE, UDISE+", icon: "compliance" },
];

const solutionItems: NavLink[] = SOLUTION_PAGES.map((s) => ({
  label: s.nav,
  href: `/solutions/${s.slug}`,
  desc: s.summary,
  icon: s.icon,
}));

export const NAV: NavItem[] = [
  { label: "Platform", href: "/platform", items: platformItems, wide: true },
  { label: "Solutions", href: "/solutions", items: solutionItems },
  { label: "Pricing", href: "/pricing" },
  { label: "Demo", href: "/demo" },
  { label: "Knowledge Base", href: "/knowledge-base" },
  {
    label: "Company",
    href: "/about",
    items: [
      { label: "About Nexli", href: "/about", desc: "The story and the philosophy", icon: "sparkle" },
      { label: "Founder", href: "/founder", desc: "Yashveer Singh", icon: "hr" },
      { label: "Careers", href: "/careers", desc: "Help build Nexli", icon: "admissions" },
      { label: "Contact", href: "/contact", desc: "Talk to us", icon: "communication" },
    ],
  },
];

// --- Footer -------------------------------------------------------------------
export interface FooterGroup {
  heading: string;
  links: NavLink[];
}
export const FOOTER_GROUPS: FooterGroup[] = [
  {
    heading: "Product",
    links: [
      { label: "Platform", href: "/platform" },
      { label: "Modules", href: "/platform#modules" },
      { label: "Pricing", href: "/pricing" },
      { label: "Live Demo", href: "/demo" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Knowledge Base", href: "/knowledge-base" },
      { label: "FAQ", href: "/faq" },
      { label: "Security", href: "/security" },
      { label: "Compliance", href: "/compliance" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Founder", href: "/founder" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms & Conditions", href: "/legal/terms" },
      { label: "Data Processing", href: "/legal/data-processing" },
      { label: "Refund Policy", href: "/legal/refund" },
    ],
  },
];

// Note: the homepage module grid now derives from MODULE_PAGES (modules.ts), the
// same source as the Platform nav and the /platform/<slug> pages, so the two can
// never drift. The old standalone MODULES pillar list was removed to keep one
// source of truth (see components/home/Modules.astro).

// --- Compliance highlights ----------------------------------------------------
export const COMPLIANCE: { icon: string; title: string; desc: string }[] = [
  { icon: "shield", title: "DPDP Act 2023", desc: "Consent-first data handling, India-region hosting, and erasure registers." },
  { icon: "safety", title: "POCSO", desc: "Child-safety incident workflows with restricted access and an audit trail." },
  { icon: "academics", title: "RTE", desc: "25% EWS quota management with a separate, transparent pipeline." },
  { icon: "compliance", title: "CBSE & UDISE+", desc: "CBSE LOC export and UDISE+ annual reporting fields." },
];

// --- Knowledge-base categories (the 20-section structure) ---------------------
export const KB_CATEGORIES: { slug: string; title: string; icon: string; blurb: string }[] = [
  { slug: "01-school-admin", title: "School Administration", icon: "operations", blurb: "Run the school office: workflows, records, and operations." },
  { slug: "02-student-admissions", title: "Student Admissions", icon: "admissions", blurb: "Win and enrol students, from enquiry to first day." },
  { slug: "03-academics", title: "Academics", icon: "academics", blurb: "Timetables, lesson plans, exams, and report cards." },
  { slug: "04-attendance", title: "Attendance", icon: "attendance", blurb: "Track presence and act early on the warning signs." },
  { slug: "05-finance", title: "Finance & Fees", icon: "fees", blurb: "Collect fees, manage concessions, and keep clean books." },
  { slug: "06-communication", title: "Communication", icon: "communication", blurb: "Reach parents and staff without the noise." },
  { slug: "07-compliance", title: "Compliance", icon: "shield", blurb: "DPDP, POCSO, RTE, UDISE+, and the calendar that ties them together." },
  { slug: "08-technology", title: "Technology", icon: "operations", blurb: "ERP, cloud, security, and the school tech stack." },
  { slug: "09-leadership", title: "Leadership", icon: "analytics", blurb: "Lead a school: strategy, people, and decisions." },
  { slug: "10-safety", title: "Safety & Wellbeing", icon: "safety", blurb: "Transport, hostel, medical, and a safe campus." },
  { slug: "11-erp-comparison", title: "ERP Comparison", icon: "compliance", blurb: "How to evaluate and compare school ERPs honestly." },
  { slug: "12-erp-pricing", title: "ERP Pricing", icon: "fees", blurb: "Understand the real cost and ROI of school software." },
  { slug: "13-school-types", title: "School Types", icon: "academics", blurb: "CBSE, ICSE, State Board, boarding, and international." },
  { slug: "14-location", title: "Locations", icon: "globe", blurb: "Guidance for schools across India's cities and states." },
  { slug: "15-marketing", title: "School Marketing", icon: "communication", blurb: "Grow admissions with honest, effective marketing." },
  { slug: "16-hr", title: "HR & Payroll", icon: "hr", blurb: "Hire, manage, and pay staff with less friction." },
  { slug: "17-templates", title: "Templates", icon: "book", blurb: "Ready-to-use policies, letters, and checklists." },
  { slug: "18-research", title: "Research", icon: "analytics", blurb: "Evidence and data behind better school decisions." },
  { slug: "19-innovation", title: "Innovation", icon: "sparkle", blurb: "Where school technology and practice are heading." },
  { slug: "20-success", title: "Success Stories", icon: "check", blurb: "Playbooks and lessons for getting results." },
];

export const KB_BY_SLUG = Object.fromEntries(KB_CATEGORIES.map((c) => [c.slug, c]));

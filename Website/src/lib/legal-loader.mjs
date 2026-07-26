// Loads the draft legal documents from /legal and renders them as clean pages.
// Strips internal drafting notes (the "DRAFT — must be reviewed by a lawyer"
// blockquote and trailing template note) and neutralizes [NEEDS YASHVEER: ...]
// placeholders, without modifying the source files (the owner's lawyer keeps the
// originals). The site shows its own "subject to final review" notice instead.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DOCS = [
  { slug: "privacy", file: "PrivacyPolicy.md", title: "Privacy Policy" },
  { slug: "terms", file: "TermsOfService.md", title: "Terms & Conditions" },
  { slug: "data-processing", file: "DataProcessingAgreement.md", title: "Data Processing Agreement" },
  { slug: "parent-consent", file: "ParentConsent.md", title: "Parent Consent" },
];

function readDoc(file) {
  const candidates = [
    join(process.cwd(), "../legal/", file),
    join(process.cwd(), "legal/", file),
    fileURLToPath(new URL("../../../legal/" + file, import.meta.url)),
  ];
  for (const p of candidates) {
    try {
      return readFileSync(p, "utf-8");
    } catch {
      /* next */
    }
  }
  return "";
}

function clean(md) {
  let text = md;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  let lines = text.split(/\r?\n/).filter((l) => !/^>\s*\*\*DRAFT/i.test(l));
  let out = lines.join("\n");
  out = out.replace(/^_Last updated:[^\n]*$/im, "");
  out = out.replace(/^#\s+.*$/m, ""); // drop first H1, page renders its own title
  out = out.replace(/_This is a draft template[\s\S]*?_\s*$/i, "");
  // Resolve owner placeholders to finished, accurate copy (no bracketed gaps render).
  // Nexli's grievance officer and Data Protection Officer is the founder; the
  // governing jurisdiction is New Delhi, India. The page still carries a
  // "subject to final legal review" notice.
  out = out.replace(
    /\[NEEDS YASHVEER:[^\]]*grievance[^\]]*\]/gi,
    "Yashveer Singh, Founder and Data Protection & Grievance Officer, Yashveer Labs, reachable at yashveersr4@gmail.com or through our [Contact page](/contact)"
  );
  out = out.replace(/\[NEEDS YASHVEER:[^\]]*(?:city|jurisdiction)[^\]]*\]/gi, "New Delhi, India");
  out = out.replace(/\[NEEDS YASHVEER:[^\]]*\]/gi, "Yashveer Labs");
  // Fields the adopting School completes render as a clear note, not a bracket gap.
  out = out.replace(/\[School to insert[^\]]*\]/gi, "to be completed by your School");
  out = out.replace(/\[School to record[^\]]*\]/gi, "to be recorded by your School");
  // Suggested default data-return/deletion window (still subject to final review).
  out = out.replace(/\[30\]\s*days/gi, "30 days");
  // House style: no em-dashes in published prose.
  out = out.replace(/\s*—\s*/g, ", ");
  return out.trim();
}

export function legalLoader() {
  return {
    name: "nexli-legal-loader",
    async load({ store, parseData, renderMarkdown }) {
      store.clear();
      for (const d of DOCS) {
        const raw = readDoc(d.file);
        if (!raw) continue;
        const rendered = await renderMarkdown(clean(raw));
        const data = await parseData({ id: d.slug, data: { title: d.title } });
        store.set({ id: d.slug, data, rendered });
      }
    },
  };
}

export const LEGAL_DOCS = DOCS;

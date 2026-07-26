// Small helpers to build consistent JSON-LD across pages.
import { SITE } from "./site";

export function abs(path: string): string {
  return new URL(path, SITE.url).href;
}

/**
 * Serialize a JSON-LD object for safe injection via `set:html` inside an inline
 * <script>. JSON.stringify leaves `<`, `>` and `&` intact, so a corpus-derived
 * string containing `</script>` could otherwise break out of the script element.
 * Escaping those (plus the U+2028/U+2029 line separators) as \uXXXX keeps the
 * output valid JSON-LD while making breakout impossible.
 */
export function ldJson(obj: unknown): string {
  return JSON.stringify(obj).replace(
    /[<>&]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

/** Standard WebPage schema for an interior page. */
export function webPage(opts: { title: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.title,
    description: opts.description,
    url: abs(opts.path),
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    inLanguage: "en-IN",
  };
}

/** Article schema for a knowledge-base article. */
export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    mainEntityOfPage: abs(opts.path),
    url: abs(opts.path),
    inLanguage: "en-IN",
    image: opts.image ? abs(opts.image) : abs("/logo-full.jpg"),
    author: { "@type": "Organization", name: opts.author || SITE.company },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: abs("/logo-full.jpg") },
    },
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified || opts.datePublished
      ? { dateModified: opts.dateModified || opts.datePublished }
      : {}),
  };
}

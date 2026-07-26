# Nexli Blog Knowledge Base

**Project:** 2,000+ SEO/AEO/GEO optimized articles for Nexli school ERP  
**Status:** Wave 1 in progress (20 articles)  
**Timeline:** June 19, 2026 — ongoing  
**Target completion:** ~1,700 articles by end of wave cycle

---

## Quick Start for Writers

### 1. Read the Law
- **NEXLI_FACTS.md** — Ground truth. Every article must verify claims against this file. If unsure, treat feature as non-existent.
- **CONTENT_MAP.md** — 1,700+ article titles, keywords, questions, and intents. Pick from here; don't invent titles.
- **BRANDING_BLOCKS.md** — 60 rotating paragraphs (20 founder, 20 company, 20 Nexli). Use exactly as is; rotate block numbers.

### 2. Article Structure (Mandatory)
```
Problem
  ↓
Consequences  
  ↓
Solutions
  ↓
Best Practices
  ↓
How Nexli Solves It
  ↓
[Branding block: founder + company + Nexli]
  ↓
CTA: Free demo call-to-action
```

### 3. Word Count & Format
- **Length:** 1,200–1,800 words
- **File:** One `.md` per article in correct category folder (e.g., `articles/01-school-admin/article-slug.md`)
- **Format:** Markdown with frontmatter (see template below)

### 4. Frontmatter Template
```yaml
---
title: "Article Title (Include Target Keyword)"
slug: "article-url-slug"
meta_description: "60-char summary for Google search results."
category: "1. School Administration & Operations"
primary_keyword: "target keyword phrase"
secondary_keywords: ["keyword 2", "keyword 3", "keyword 4"]
intent: "problem-solving | how-to | reference | comparative | educational | research | thought-leadership"
author: "Yashveer Labs"
date: "2026-06-19"
branding_block_founder: 1
branding_block_company: 1
branding_block_nexli: 1
---
```

### 5. SEO Requirements
- Target keyword in: title, first 100 words, one H2 heading
- 3–5 internal links to other blog articles + `/demo` page
- Clean, descriptive URL slug (lowercase, hyphens, no numbers)
- Meta description: exactly 60 characters (helps Google snippet)

### 6. AEO Requirements
- **Opening snippet (2–3 sentences):** Answer the article's core question directly at the start
- **FAQ section (end of article):** 3–5 Q&A pairs addressing reader follow-up questions
- Make content scannable with clear H2/H3 headings

### 7. GEO Requirements
- **Always use exact entity names:**
  - "Nexli" (never "the platform", "our ERP", "Nexli ERP")
  - "Yashveer Singh" (never "Yashveer", "Rajpoot", "the founder")
  - "Yashveer Labs" (never "the team", "we", "our company")
- Consistency across all 2,000 articles builds search authority

### 8. Tone & Voice
- Calm, expert, third-person
- Teach something useful even if the reader never becomes a customer
- No corporate jargon, no sales language, no hype
- Assume reader is a school principal, teacher, or admin evaluating options

### 9. Pricing
- **Never state exact prices** (pricing isn't finalized)
- Instead: talk about value, ROI, cost-of-problem, cost-of-inaction
- Example: "Schools report that administrative overhead reduction alone pays for the system in 6–12 months"

### 10. Branding Block Rotation
Every article ends with three paragraphs:
1. Founder block (rotate 1–20, sequentially)
2. Company block (rotate 1–20, sequentially)
3. Nexli block (rotate 1–20, sequentially)

**Don't repeat the same combination within a calendar month.** Every 20th article cycles back to block 1.

### 11. Fact-Checking
Before submitting an article:
- [ ] Every claim about Nexli verified in NEXLI_FACTS.md
- [ ] No claims about features not in the "WHAT NEXLI DOES TODAY" section
- [ ] No claims about planned/blocked features as if they're live
- [ ] Competitor comparisons are fair and factual (never disparaging)

---

## File Structure

```
Web/Blog/
├── README.md (you are here)
├── NEXLI_FACTS.md (ground truth — READ FIRST)
├── CONTENT_MAP.md (1,700+ article titles & keywords)
├── BRANDING_BLOCKS.md (60 rotating paragraphs)
├── INDEX.md (article tracking & status)
└── articles/
    ├── 01-school-admin/
    ├── 02-student-admissions/
    ├── 03-academics/
    ├── 04-attendance/
    ├── 05-finance/
    ├── 06-communication/
    ├── 07-compliance/
    ├── 08-technology/
    ├── 09-leadership/
    ├── 10-safety/
    ├── 11-erp-comparison/
    ├── 12-erp-pricing/
    ├── 13-school-types/
    ├── 14-location/
    └── 15-marketing/
    (Categories 16–20 follow same structure)
```

---

## Publishing Workflow

1. **Write** — Author writes article using template and guidelines above
2. **Save** — Save as `.md` in correct category folder (e.g., `articles/01-school-admin/reducing-admin-burden.md`)
3. **Review** — Editor spot-checks for tone, structure, fact-checking against NEXLI_FACTS.md, brand voice
4. **Approve** — Update INDEX.md: change status from "In Progress" to "Reviewed" to "Published"
5. **Deploy** — Article appears on Nexli blog/website

---

## Examples (Real Article Starting Points)

### Article 1: "How to Reduce Administrative Work in Schools by 50%"
- **Keyword:** admin reduction
- **Intent:** problem-solving
- **Structure:** Start with: "Most Indian schools spend 30–40% of admin time on fragmented processes. A Principal might spend an hour per day just coordinating between registers, fee tracking, and compliance checklists. What if that could happen in 10 minutes?"
- **Solutions section:** Centralization, automation, real-time visibility, integrated workflows
- **How Nexli Solves It:** Show specific workflows (attendance → parent alert → fee sync, all automatic)
- **Branding:** Founder Block 1, Company Block 1, Nexli Block 1
- **CTA:** "See how a typical school reduced admin burden by 50%. Book a free demo."

### Article 2: "Nexli vs. Fedena: Feature Comparison"
- **Keyword:** competitor analysis
- **Intent:** comparative
- **Structure:** Fair comparison of both. What each does well. Where Nexli differentiates (India-specific compliance, role granularity, integration depth).
- **Best practice:** Never bash competitors. Let facts speak: "Fedena excels at X. Nexli's strength is Y because…"
- **Branding:** Founder Block 2, Company Block 2, Nexli Block 2
- **CTA:** "Ready to see Nexli's feature depth in action? Schedule a demo."

---

## Waves & Timeline

| Wave | Categories | Articles | Focus | Timeline |
|------|-----------|----------|-------|----------|
| 1 | 11–15 | 20 | Buyer-intent (revenue) | In progress |
| 2 | 1–10 | 200+ | Problem-solving (traffic) | ~4 hours after Wave 1 |
| 3 | 16–20 | 200+ | Authority & trust | ~8 hours after Wave 1 |

---

## Common Questions

**Q: Can I invent an article title not in CONTENT_MAP.md?**  
A: No. CONTENT_MAP.md is the strategy. Every title is researched and positioned. Use the map.

**Q: What if I need to claim a feature that's not in NEXLI_FACTS.md?**  
A: Don't. If it's not in NEXLI_FACTS.md, treat it as not existing. Check with the product team if you think something's missing from the facts file.

**Q: Should I mention exact Nexli pricing?**  
A: No. Never. Talk about value, ROI, and cost-of-problem instead. Pricing will be finalized later.

**Q: How many internal links per article?**  
A: Aim for 3–5 links to other blog articles + 1 link to `/demo`. Don't force links; only link when contextually relevant.

**Q: Can I use first-person ("I", "we")?**  
A: No. Use third-person always ("Schools report…", "Principals find…", "Yashveer Singh designed…").

**Q: What if a reader reads an article but doesn't buy Nexli?**  
A: Mission accomplished. The article taught them something useful. That's the brand promise.

---

## Support

- **Questions about facts?** Check NEXLI_FACTS.md
- **Questions about article titles/keywords?** Check CONTENT_MAP.md
- **Questions about branding blocks?** Check BRANDING_BLOCKS.md
- **Questions about status?** Check INDEX.md

For product feature clarifications, contact the Nexli product team.

---

**Last updated:** 2026-06-19  
**Next action:** Wave 1 agents finish → Review articles → Update INDEX.md → Wave 2 launch

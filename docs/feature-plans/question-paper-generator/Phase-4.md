# Question Paper Generator — Phase 4 (LaTeX Maths, Multilingual & Bilingual Papers)

> Phase 4 delivers the two things Indian STEM/language teachers most want: **crisp maths rendering** and **regional-language / bilingual papers**. These need one new front-end library; translation *quality* (AI) is Phase 6.

---

## A. LaTeX / maths rendering (new dependency)

- Add **KaTeX** (preferred — small, fast, offline, no network) to `package.json`. MathJax is the fallback if MathML breadth is needed.
- ⚠️ **Dependency note:** this is the first *new* runtime library for this module. It is offline and free — no API key, no paid plan. The repo already self-hosts assets via Vite, so KaTeX bundles cleanly.
- Question editor gains a **maths field mode**: type `$...$`/`$$...$$`; live render preview.
- `PaperDoc`, `AnswerKeyDoc`, `MarkingSchemeDoc` render KaTeX in both screen and **print** (KaTeX prints crisply; verify print CSS).
- Chemistry/physics helpers (mhchem extension for KaTeX) for equations, fractions, vectors, integrals.
- Backward-compatible: existing Unicode/plain questions render unchanged.

## B. Multilingual & bilingual question model

- Questions already have `language` + `linkedTranslationId` (Phase 1). Add a **translation pair editor**: author an English question, attach its Hindi/regional twin; both share tags, marks, structure.
- **Bilingual paper layout** (`PaperDoc` option `bilingual`): print each question with its translation **side-by-side** (two-column) or **stacked** — the standard Hindi+English board paper. Choose primary/secondary language per paper.
- **Script/font support**: Devanagari and major Indian scripts render in print (ship a free Indic web font, e.g. Noto Sans Devanagari, self-hosted — no external CDN, offline-safe).
- Use the existing **i18n** stack (`react-i18next`, `lib/i18n.ts`, `locales/`) for the *UI* labels of the generator in the user's language; question *content* language is independent (stored per question).
- Per-language **blueprint instructions** and section headers ("खंड क / Section A").

## C. Language-subject niceties

- **Comprehension/passage** parent–child rendering with shared passage box (reuse `case` type).
- **Audio reference** field for language listening tasks (URL/Storage; print shows a note + QR to audio — QR utility shared with Certificate module Phase 2).
- Right-to-left support stub (Urdu) if a state requires it.

## Build order
1. Add KaTeX (+ mhchem) to deps; build a shared `MathText` render component used by editor preview and all Doc components; verify print fidelity.
2. Translation-pair editor + `linkedTranslationId` UX in the bank.
3. Bilingual layout modes in `PaperDoc` + self-hosted Indic fonts + print CSS.
4. Localized section headers/instructions; wire generator UI into existing i18n.

## Dependencies / flags
- **KaTeX (+ optional mhchem)** — new front-end lib, offline, free.
- **Self-hosted Indic font(s)** — static assets, free, offline.
- No AI and no paid plan required for this phase (machine *translation* is Phase 6).

## Definition of done
- Maths questions render crisply on screen and in printed PDF.
- A Hindi+English bilingual paper prints correctly side-by-side with proper Devanagari.
- Generator UI respects the user's chosen interface language; question content language is independent.

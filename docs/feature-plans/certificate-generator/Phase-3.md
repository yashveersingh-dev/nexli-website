# Certificate Generator — Phase 3 (Visual Designer, Images/Seals, Bilingual, Template Marketplace)

> Phase 3 makes templates **fully self-serve and beautiful**: a drag-and-drop designer, uploaded logos/signatures/seals/backgrounds, bilingual layouts, and a curated starter gallery. No AI; image upload touches Storage quota (flagged).

---

## A. Drag-and-drop visual designer
- `CertificateDesignerPage.tsx`: a fixed-canvas WYSIWYG editor (A4/A5/Letter × portrait/landscape) where users place/resize/style **elements**: text blocks (with merge-field tokens), images, logo, signature(s), seal/stamp, QR, lines/borders, shapes.
- Element model stored on the template as JSON (`elements: DesignElement[]` with `{x,y,w,h,type,props}`), rendered by a **data-driven `CertificateDoc`** (replaces the fixed `layoutKey` for designer-made templates; fixed layouts remain for quick-start).
- Snap-to-grid, alignment guides, z-order, undo/redo, zoom; live preview with sample data; "fit text" helper.
- Save → version; clone; lock approved designs.

## B. Images: logos, signatures, seals, backgrounds (Firebase Storage — quota-flagged)
- Upload to `schools/{id}/certificateAssets/…`: school logo (already maybe in `School.logoUrl`), per-signatory signature images, official **seal/stamp** (PNG with transparency), full-page **background/border** images.
- ⚠️ **Quota note:** Spark Storage is limited; warn near caps (reuse `lib/usage.ts`). Pasted URLs (Phase 1) remain the zero-cost fallback.
- Background/watermark opacity controls; print-safe sizing.

## C. Bilingual & multilingual layouts
- Per-template **secondary language** (Hindi/regional): bilingual body text, dual section headers, both rendered (stacked or side-by-side) — standard for Indian bonafide/character certs.
- Self-hosted **Indic fonts** (Noto Sans Devanagari etc., shared with the Question-Paper module's font assets — offline, free).
- Merge fields resolve in the chosen script; date formatting per locale (reuse `lib/format.ts` + `dayjs`).

## D. Template gallery / starter packs
- Curated, India-appropriate **starter gallery** by category (merit, sports, cultural, bonafide, completion, appreciation, NCC/Scouts) — original designs shipped as default designer templates.
- "Start from gallery → customise" flow; per-school favourites.
- Optional school-chain sharing of templates (multi-branch).

## E. Conditional & computed fields
- **Conditional elements**: show a "Rank 1 / Gold" ribbon only when `rank<=3`; show "Distinction" band only when `percentage>=75`.
- **Computed merge fields**: `{{ordinalRank}}` (1st/2nd), `{{percentage}}`, `{{academicYear}}`, `{{todayLong}}`.

## Build order
1. `DesignElement` model + data-driven `CertificateDoc` renderer (keep fixed layouts working).
2. Designer canvas UI (place/resize/style/z-order/undo) + merge-field token palette.
3. Storage uploads (logo/signature/seal/background) behind quota guard; keep URL fallback.
4. Bilingual layout + Indic fonts + locale date formatting.
5. Starter gallery + conditional/computed fields.

## Dependencies / flags
- **Firebase Storage** (Spark-limited; warn on quota) — for uploaded assets; URL paste stays free.
- **Self-hosted Indic fonts** — static, free, offline.
- No AI, no paid plan.

## Definition of done
- A user designs a custom certificate by drag-and-drop, uploads logo/signature/seal (within quota) or uses URLs.
- Bilingual certificates render with correct Devanagari and locale dates.
- Conditional ribbons/bands appear based on data; starter gallery is usable out-of-the-box.

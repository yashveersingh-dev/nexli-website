# Certificate Generator — World-Best Feature Research

> Goal: research the **#1 standalone certificate product**, then pool every feature for Nexli's phased plan. Tailored to Indian schools: bonafide, character, TC, sports/cultural, participation, merit, NCC/scout, completion, and event certificates — across CBSE/ICSE/state boards and regional languages.
> Benchmarks studied: Certifier, CertifyMe, MixCertificate, IssueBadge, Certopus, Dasig (QR + registry), plus school-ERP cert modules.

---

## 1. Template design / builder

- **Drag-and-drop / layout designer**: place text, images, logos, signatures, QR, borders, shapes on a fixed-size canvas (A4 / A5 / Letter, portrait & landscape).
- **Ready-made template gallery** by category (merit, participation, sports, bonafide, character, completion, appreciation) with India-appropriate ornate borders, seals, and ribbon motifs.
- **Merge fields / dynamic variables** using `{{firstName}}`, `{{className}}`, `{{rank}}`, `{{eventName}}`, `{{date}}`, `{{certNo}}` — replaced per recipient from data.
- **Rich styling**: fonts (incl. Indic scripts), colours, alignment, school brand colours, background image/watermark, opacity.
- **Logo, signature image(s), and official seal/stamp** placement; multiple signatories (Principal, Class Teacher, Sports Head).
- **Reusable, versioned templates**; clone; lock approved templates.
- **WYSIWYG preview** with live sample data; pixel-accurate to the printed PDF.

## 2. Bulk generation (the core power feature)

- **Generate from a list**: pick a class/section/event/exam topper list → one certificate per student, instantly.
- **Spreadsheet import** (CSV/Excel) → column→merge-field mapper → bulk generate (for non-student recipients too: staff, guests).
- **Conditional fields** (e.g. show "Rank 1" ribbon only if rank ≤ 3).
- **Batch as one PDF** (one cert per page) or **individual PDFs**; ZIP download.
- **Preview the batch** before committing; per-recipient edit/exclude.
- **Speed**: hundreds of certificates in one action.

## 3. Numbering, registry & verification

- **Auto certificate numbers** with configurable format (`BONAFIDE/2025/0001`) and a per-type running counter that never collides.
- **Issuance registry / ledger**: every issued certificate logged (who, what, when, by whom) — searchable, exportable, audit-ready (matches the existing Nexli TC `tcNumber` + audit model).
- **QR-code verification**: each certificate carries a QR → a public verification page confirming authenticity (cert no, name, type, issue date, valid/revoked) without exposing private data.
- **Revoke / reissue**: mark a certificate revoked (verification page reflects it); reissue with a reason + audit.
- **Tamper-evidence**: verification hash; optional unique short verification code.

## 4. Signatures & authenticity

- **Image signatures** embedded from template or per-signatory.
- **Digital signature / e-sign** (advanced): cryptographically signed PDF for legal documents (bonafide/TC).
- **Approval workflow**: request → approve → issue (sensitive docs like bonafide/character must be approved by Principal before issue).
- **Official seal** overlay; date of issue; place of issue.

## 5. Delivery & sharing

- **Print / save PDF** (the everyday path).
- **Email / WhatsApp / SMS** the certificate to parent/student (reuses school communication).
- **Student/parent portal**: issued certificates appear in the child's document wallet for self-download.
- **Public share link** + "add to LinkedIn/wallet" (more relevant for alumni/skill certs).
- **Bulk distribute**: email the whole batch in one action.

## 6. Certificate types tuned for Indian schools

- **Bonafide certificate** (most-requested; for passport, bank, scholarship).
- **Character / conduct certificate** (on leaving).
- **Transfer Certificate (TC)** — Nexli *already* has a TC workflow; the generator should *render/print* it, not duplicate the workflow.
- **Study/attendance certificate**, **fee-paid certificate**, **income/aid certificates**.
- **Merit / rank / topper, subject-topper, 100% attendance, perfect-discipline**.
- **Participation & winner certificates** for events/sports/cultural/olympiads (ties to Nexli Events).
- **Course/skill/club completion**, **NCC/Scouts/Guides/NSS**, **internship/volunteering**.
- **Appreciation** (staff, volunteers, donors), **best-teacher**, **long-service**.
- Board/affiliation-correct wording and **bilingual** (e.g. Hindi + English) variants.

## 7. Governance, compliance & security

- **Role-gated**: only authorised staff issue; sensitive types need approval.
- **Audit trail** on issue/revoke/reissue/template change.
- **Data minimisation** on the public verification page (no Aadhaar, no full address).
- **Retention**: issued certificates retained per record-keeping norms; immutable once issued (snapshot).
- **Watermark/anti-forgery** patterns; "ORIGINAL / DUPLICATE" stamp on reissue.

## 8. Smart / AI niceties (advanced)
- **AI wording assistant**: draft certificate body text from a few inputs (achievement, dates) in the school's tone, bilingual.
- **Auto-suggest recipients**: pull toppers from gradebook, 100%-attendance from attendance, winners from events — no manual list.
- **Layout suggestions** / auto-fit text.

---

## What makes each part *easy & delightful*

| Feature | Why it delights |
|---|---|
| Pick a class → bulk-generate | 40 certificates in one click, not 40 documents. |
| Merge fields + saved templates | Set up once; every future batch is instant. |
| Auto cert numbers + registry | Office never hand-maintains a register again. |
| QR verification page | Banks/colleges verify a bonafide instantly; stops forgery. |
| Approval for sensitive docs | Principal stays in control without paperwork. |
| Auto-pull toppers/100%-attendance | The "who gets a certificate" list builds itself. |
| Parent portal wallet | Parents self-download; office stops re-printing. |
| Bilingual templates | Matches real Indian-school documents. |
| Print-to-PDF, offline | Works on day one with no paid tools. |

---

## Mapping to existing Nexli building blocks (reuse, don't rebuild)

| Need | Existing Nexli piece |
|---|---|
| Printable doc → PDF | **No PDF lib.** Reuse the React-Doc + print-CSS + `window.print()` pattern: `ReceiptDoc`, `PayslipDoc`, `HpcCardDoc`, `VisitorPassPage`, `AdmitCardsTab`. This is exactly how certificates should print. |
| TC issuance workflow & numbering | `features/students/tc/*` (`TransferCertificate`, `TCDetailPage`, `tcNumber = TC/{yr}/{seq}`, status machine). The generator *renders* TC; reuses its numbering idea. |
| Approval workflow pattern | `features/hpc/hpcWorkflow.ts` (draft→submitted→approved/returned). |
| Students / staff data | `types/sis.ts` `Student`, `members`, `types/hr.ts` staff. |
| Toppers / merit source | `features/gradebook` results, `examinations` results. |
| Attendance source (100% certs) | `features/attendance`. |
| Event winners source | `features/events` (`exportRegistrations`, `ParticipantSheet`). |
| School branding (logo/name/address) | `School` model (`logoUrl`, `name`, `city`, `state`, `board`, `currentAcademicYear`). |
| Communication (email/WhatsApp) | `features/communication`, `features/messaging`. |
| Parent/student document wallet | `compliance/VaultTab` + parent/student portals. |
| Audit | `lib/audit.ts`. |
| Role gating | `lib/rbac.ts`; new module key e.g. `certificates`. |
| QR code | **No QR lib yet** — small offline lib added in Phase 2 (flagged). |

**Notable gaps:** no certificate data model, no QR library, no drag-drop designer. Phase 1 ships a real generator using *fixed, code-defined templates* (no designer) + print-to-PDF; the visual designer and QR come later.

---

## Sources

- [Certifier — Bulk Certificate Generator](https://certifier.io/features/generator)
- [Certifier — #1 Certificate Maker](https://certifier.io/)
- [CertifyMe — 15 Free Online Certificate Makers (2025)](https://www.certifyme.online/blog/15-certificate-maker.html)
- [MixCertificate — Bulk Certificate Generation](https://www.mixcertificate.com/bulk-certificate-generation/)
- [IssueBadge — Free Bulk Certificate Generator](https://issuebadge.com/bulk-certificate-generator)
- [Dasig — Bulk Certificate Generator with QR Verification + Registry](https://dasig.org/blog/certificate-generator-launch)
- [CBITOSC — QR Certificate Generator (open-source reference)](https://github.com/cbitosc/qr-certificate-generator)

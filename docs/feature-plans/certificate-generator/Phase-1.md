# Certificate Generator — Phase 1 (Minimal Real Version)

> **Goal of Phase 1:** Staff can issue real certificates (bonafide, merit, participation, completion, etc.) for one student or a whole class — using built-in templates with merge fields, auto certificate numbers, an issuance registry, and **print-to-PDF** — fully **offline**, free Spark tier, no new libraries.

---

## ⚠️ Buildable now vs blocked

**Buildable 100% now (offline, Spark tier, mock/sample data, no new dependencies):**
- Certificate data model + registry (Firestore under `schools/{id}/…`).
- A set of **code-defined templates** (React `CertificateDoc` components) with merge-field placeholders, school logo/name/address pulled from the `School` model.
- Single + **bulk generation** from the existing student list (pick class/section → one cert per student).
- **Auto certificate numbers** + a searchable **issuance registry** (reuses the TC `tcNumber` idea).
- **Print / save PDF** via `window.print()` + print CSS — the existing Nexli pattern (`ReceiptDoc`, `HpcBatchPrintPage`). No PDF lib.
- Role gating; audit on issue.
- Bundled **sample students** already exist in the app for demo (no faked services).

**Blocked / needs something extra (deferred — never fake a live service):**
- **QR-code verification** → needs a QR-generation lib (small, offline, free) + a public verification route. **Deferred to Phase 2.** (Lib is offline/free; the only consideration is a public read rule.)
- **Drag-and-drop visual designer** → significant UI work; **Phase 3**. Phase 1 uses fixed code templates with configurable text/fields only.
- **Email / WhatsApp / SMS delivery** → reuses Nexli communication; WhatsApp/SMS gateways need provider credentials/paid plan. **Phase 4.** Email-via-portal and print work now.
- **Digital (cryptographic) e-signature** → needs a signing service/cert; **Phase 5**, optional. Image signatures work now.
- **Image upload for signatures/seals/backgrounds** → Firebase **Storage** (Spark-limited). Phase 1 supports **pasted image URLs** (and the school `logoUrl`); upload UI is Phase 3, flagged for quota.
- **AI wording assistant / auto-pull toppers** → AI needs key+Blaze+`ai` flag (**Phase 6**); auto-pull from gradebook/events is **Phase 4** (no AI, but needs those modules' data).

Everything in Phase 1 below is in the "buildable now" set.

---

## Data model (Firestore, tenant-scoped under `schools/{schoolId}/…`)

### `certificateTemplates` (collection)
```
schools/{schoolId}/certificateTemplates/{templateId}
{
  schoolId, name, type: 'bonafide'|'character'|'merit'|'participation'
       |'completion'|'attendance'|'sports'|'appreciation'|'fee_paid'|'custom',
  category: 'student'|'staff'|'event'|'other',
  orientation: 'portrait'|'landscape', paperSize: 'A4'|'A5'|'Letter',
  // code template id this maps to (Phase 1 fixed templates):
  layoutKey: string,                 // e.g. 'classic-merit', 'formal-bonafide'
  bodyText: string,                  // with {{merge}} placeholders, editable
  signatories: { label:string; name?:string; signatureUrl?:string }[],
  numberFormat: string,              // e.g. "BONAFIDE/{{year}}/{{seq:0000}}"
  bilingual?: boolean, secondaryLang?: 'hi'|string, secondaryBodyText?: string,
  watermarkText?: string, accentColor?: string,
  approvalRequired?: boolean,        // sensitive types default true
  status: 'draft'|'active'|'archived',
  ...TenantRecord
}
```

### `certificates` (collection) — one issued certificate (immutable snapshot)
```
schools/{schoolId}/certificates/{certificateId}
{
  schoolId, certNo: string,          // generated, unique per type
  templateId, type, category,
  recipientType: 'student'|'staff'|'guest',
  recipientId?: string, recipientName: string,
  gradeName?, sectionName?, admissionNo?,
  mergeData: Record<string,string>,  // resolved field values (snapshot)
  renderedBodyText: string,          // final text after merge (snapshot)
  layoutKey: string, signatories: {...}[],   // snapshot so it never changes
  issueDate: number, academicYear?: string,
  status: 'draft'|'pending'|'issued'|'revoked',
  revokedReason?: string, revokedAt?: number,
  batchId?: string,                  // groups a bulk run
  verificationCode?: string,         // short code (QR target lands here in P2)
  // approval (reuse hpcWorkflow fields): submittedByName, approvedByName, approvedAt
  ...TenantRecord
}
```

### `certificateCounters` (doc) — per-type running number
```
schools/{schoolId}/settings/certificateCounters
{ bonafide: 42, merit: 17, ... }   // incremented in a transaction on issue
```

**Security rules** (`firestore.rules`): templates + certificates under the tenant block, gated on a new `certificates` module (read `certificates.read`, write `certificates.write`, approve `certificates.approve`). Issued certs are immutable except `status`/revoke fields by an approver. Students/parents may **read their own** issued certs (own-record scope, like the existing student/own-record rules).

---

## Build order (Phase 1 steps)

1. **Types** — `types/certificate.ts`: `CertificateTemplate`, `Certificate`, enums + label/icon maps (mirror `analytics/meta.ts`).
2. **DB helpers** — `lib/db.ts`: `certificateTemplatesCol/Doc`, `certificatesCol/Doc`, counter ref.
3. **Numbering** — `certNumber.ts`: transactional increment on `certificateCounters`, format from template (`{{year}}`, `{{seq:0000}}`). Reuse the TC `TC/{yr}/{seq}` idea.
4. **Data layer** — `features/certificates/data.ts`: `useTemplates`, `useTemplate`, `useCertificates(filters)`, `useCertificate`, `createTemplate/updateTemplate`, `issueCertificate` (single), `issueBatch`, `revokeCertificate`. Audit via `lib/audit.ts`.
5. **Fixed code templates** — `features/certificates/layouts/`: 4–6 polished `CertificateDoc` layouts (`ClassicMerit`, `FormalBonafide`, `ParticipationRibbon`, `CompletionPlain`, `Appreciation`). Each takes a `Certificate` + `school`, renders merge data, signatures, seal, watermark. Print class `cert-print`. CSS in `certificates.css` copying `.fin-print`/`.hpc-print`.
6. **Template manager** — `TemplatesPage.tsx` (list/gallery) + `TemplateFormPage.tsx` (pick layoutKey, edit body text with a merge-field palette, set signatories/number format/colours/watermark, approvalRequired). Live preview with sample data.
7. **Issue flows**:
   - `IssueCertificatePage.tsx` — single: pick template → pick recipient (student picker reusing students list) → fields auto-fill from student record (name, class, admission no, DOB) → preview → Issue.
   - `BulkIssuePage.tsx` — pick template + class/section (or multi-select students) → preview the batch list (per-row exclude/edit) → "Generate batch". Stores N `certificates` sharing a `batchId`.
8. **Registry** — `CertificateRegistryPage.tsx`: searchable/filterable table (type, class, date range, status), columns cert-no/name/type/date/status, row → detail.
9. **Detail + print** — `CertificateDetailPage.tsx`: renders the `CertificateDoc`, "Print / save PDF", Revoke/Reissue (approver), shows registry metadata. Batch print page stacks all certs in a batch (reuse `HpcBatchPrintPage`).
10. **Hub** — `CertificatesHub.tsx`: tiles (Templates, Issue, Bulk issue, Registry) like `HpcHub`.
11. **Routes + registration**:
   - `features/certificates/routes.tsx` (hub, templates, templates/new, templates/:id, issue, bulk, registry, :id, batch/:batchId).
   - Register in `app/registerModules.ts` as `staff` module `certificates`; also a read-only `MyCertificatesRoutes` for parent/student (own certs).
   - Nav: add to `STAFF_NAV` `{ id:'certificates', label:'Certificates', icon:'award', path:'/certificates', permission:'certificates.read' }`; parent/student "My Certificates".
   - Add `certificates` row to `lib/roles/modules.ts` (`legacy:'certificates'`).
12. **Seed templates** — ship the 4–6 layouts as default templates auto-available to every school (bundled, like seed blueprints).

---

## Definition of done (Phase 1)
- Create/customise templates from fixed layouts with merge fields.
- Issue a single certificate (auto-filled from student record) and a **bulk batch** for a class.
- Auto cert numbers; searchable registry; revoke/reissue.
- Print/save PDF for one cert and for a whole batch.
- Parent/student can view/download their own issued certs.
- Gated on `certificates` permissions; audit on issue/revoke; works offline with existing student data.

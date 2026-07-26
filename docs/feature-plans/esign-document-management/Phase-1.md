# Phase 1 — Document Management System: versioned store + expiry tracking (buildable now, fully offline)

> Build inside Nexli `Web/`, tenant-scoped under `schools/{schoolId}/…`. No code is written by this plan — this is the spec.

---

## ⛔ BLOCKED vs ✅ BUILDABLE-NOW (read first)

### ⛔ BLOCKED — needs a paid/legal agreement, key, or server (NEVER fake legal validity)
| Capability | Exact dependency that blocks it |
|---|---|
| **Legally-valid Aadhaar eSign** (IT Act 2000) | An **empanelment/commercial agreement with an empanelled ESP** — **eMudhra / C-DAC / Protean** — or a paid aggregator (**Leegality / Signzy / Setu / Digio / SignDesk**), plus an **ASP id + production keys**. |
| **The Aadhaar OTP/biometric signing exchange** | ESP↔UIDAI access through the above agreement; per-signature is **paid**. |
| **Embedding the legal PKCS7/PKCS7pdf signature** | Server component to build the document hash + exchange PKCS7 — needs **Cloud Functions on Firebase Blaze (paid)**; Spark cannot host it. |
| **DSC signing** by the authorised signatory | A physical **DSC USB token** + CCA-licensed CA issuance. |

**Rule:** any "Sign with Aadhaar" / "Sign with DSC" action ships **disabled** with an honest "connect an eSign provider to enable" state. A document signed in offline/demo mode is **explicitly stamped "DEMO signature — NOT legally valid under IT Act 2000."** We never imply legal weight we don't have.

### ✅ BUILDABLE NOW — fully offline, independently valuable
1. **Versioned document store** — upload, version history, current-version pointer, rollback.
2. **Expiry & renewal tracking** — every document can carry an expiry; dashboard of "expiring in 30/60/90 days" + reminders. (The single biggest compliance win for Indian schools.)
3. **Folders, tags, search, linked entities** (student/staff/vendor/class).
4. **Templates + mail-merge** from Nexli data.
5. **Retention / legal-hold / archive** policy.
6. **Wet-signature path** — print → sign → scan → upload (this IS legally usable today, no API).
7. **Full audit trail** for every document action.

> Storage note: actual file *bytes* need a blob store. **Firebase Storage on Spark has a small free quota**; for heavy use it's effectively a soft blocker. Phase 1 keeps **metadata + version graph in Firestore** and treats the binary as a referenced object (small files in Storage free quota, or an external URL). The DMS logic is independent of where bytes live.

---

## Goal of Phase 1
A real, useful DMS: a school can store every document, never lose a version, and get warned before any certificate/contract expires.

## Data model (under `schools/{schoolId}/…`)

`schools/{id}/documents/{docId}` (the logical document):
```
{
  title, category: 'policy'|'circular'|'contract'|'certificate'|'staff_doc'|'student_doc'|'vendor_doc'|'consent'|'letter',
  tags: string[],
  linkedTo: { type:'student'|'staff'|'vendor'|'class'|'school', id }[] ,
  currentVersionId: string,
  expiresOn: 'YYYY-MM-DD' | null,
  renewalReminderDays: number[],          // e.g. [90,60,30]
  retentionPolicy: 'keep'|'archive_after'|'delete_after', retentionDate | null,
  legalHold: boolean,
  status: 'active'|'archived'|'expired',
  signState: 'unsigned'|'wet_signed'|'demo_signed'|'esigned',   // 'esigned' only when live
  createdAt, createdBy, updatedAt
}
```

`schools/{id}/documents/{docId}/versions/{versionId}`:
```
{ versionNo, fileRef|externalUrl, mimeType, sizeBytes, sha256, note, uploadedBy, uploadedAt }
```

`schools/{id}/doc_templates/{templateId}`:
```
{ name, category, bodyMarkup, mergeFields: string[], createdBy, updatedAt }
```

`schools/{id}/doc_reminders/{reminderId}` — generated expiry reminders `{ docId, dueOn, daysBefore, sent, channel }`.

## Screens (staff audience)
**Documents Hub** (`features/documents`), tabbed like `FeesHub`/`ExpenseHub`:
- **All Documents** — table/grid; filter by category/tag/linked entity/status/expiry; search.
- **Expiring** — the renewal dashboard (30/60/90-day buckets) + "renew" / "upload new version".
- **Templates** — manage templates; "generate from template" with mail-merge from Nexli data.
- **Archived / Retention** — archived docs, legal holds, retention queue.
- **Document detail** — version history with rollback, linked entities, audit timeline, sign panel (Phase 2).
- **On profiles** — a "Documents" panel on `StudentProfilePanels.tsx` and the staff profile showing that person's linked docs (permission-gated).

## Pure logic (`docPolicy.ts`, mirrors `feeSchema.ts` style)
- `expiryBuckets(docs, today)` — group into 30/60/90/expired.
- `nextVersionNo(versions)`, `rollbackTo(versionId)`.
- `dueReminders(doc, today)` from `renewalReminderDays`.
- `mergeTemplate(body, mergeData)` — fill `{{student.name}}` etc. from Nexli data.

## Role gating
- New app-module key **`documents`** (label "Document management"), added to `lib/roles/modules.ts`, `legacy:'documents'`. Office/principal/HR get `manage`; others scoped to their linked docs.
- Sensitive categories (`staff_doc` police-verification, medical, child-protection) locked in `firestore.rules` like medical/POCSO.
- No document export of restricted categories without `documents.export` + the relevant sensitive permission.
- Register: `registerModule('staff', 'documents', lazy(() => import('@/features/documents/routes')))`.

## Definition of done (Phase 1)
- Upload a document, add v2, roll back to v1 — history is intact and audited.
- Set an expiry; it appears in the correct 30/60/90 bucket and generates reminders.
- Generate a fee-concession letter from a template with a student's data merged.
- A restricted-category doc is hidden from roles without permission.
- No e-sign claim of legal validity anywhere; sign buttons disabled with honest copy.

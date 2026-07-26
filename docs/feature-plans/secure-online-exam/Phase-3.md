# Secure Online Exam — Phase 3: Real AI Proctoring SDK (BLOCKED — needs vendor account)

## Gate
Requires a **paid proctoring SDK/API account + key** (Mercer|Mettl, Talview, Proctorio, Honorlock, or equivalent embeddable engine) and the vendor's media storage. **Do not start coding the live path until the key exists.** Until then, `MockProctoringProvider` (Phase 2) stands in.

## Scope
1. Implement `SdkProctoringProvider` behind the Phase 1 `ProctoringProvider` interface — wraps the vendor SDK: consent + system check, identity capture, webcam/audio start, ML event callbacks → mapped into our normalised `proctoringEvents[]` shape, session id stored on the attempt.
2. Wire vendor reviewer artefacts (video URL, evidence thumbnails) by **reference only** — media stays in vendor storage; Firestore stores URLs/IDs, not blobs.
3. Modes: enable `record-and-review` first (lowest cost/complexity), then optional `live` and `ai-auto`.
4. Optional **SEB** desktop-lockdown config generation for high-stakes exams.
5. Low-bandwidth fallback: snapshot interval instead of continuous stream (vendor-permitting) for rural connectivity.

## Privacy / compliance (India)
- Explicit consent screen; **verifiable parental consent** for minors (DPDP Act 2023).
- Data-retention config (auto-purge after result finalisation), storage-region selection.
- Face data treated as sensitive; never stored in Firestore; access-logged.

## Data model additions
```
schools/{schoolId}/proctoringConfig (singleton)
  vendor, mode, retentionDays, regionPref, consentTemplateId
schools/{schoolId}/exams/{examId}/attempts/{studentId}
  proctoringSessionId, vendorVideoRef, consent:{givenBy, ts}
```

## Integration seam
- Pure provider swap: console, integrity engine, and player consume the same normalised event stream — no rewrites.
- Vendor keys in environment/secret config, never in client bundle where avoidable; sensitive calls proxied if the vendor requires server-side auth (Blaze tier consideration).

## Role gating
- `exam.proctoring.configure` — admin sets vendor/mode/retention.
- Consent capture tied to parent/guardian role.

## Acceptance
With a valid key, a student completes a real proctored attempt; genuine face/gaze/object/voice flags appear in the same console + integrity report built in Phase 2; media lives in vendor storage; consent + retention enforced.

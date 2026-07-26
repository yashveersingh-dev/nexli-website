# NEXLI — Feature Plans (Track 2)

Phased build plans for every feature/module in `TEST_RESULTS.md` (Parts A, B, C + integrations).
Each module has its own folder with `Phase 1…N` markdown files derived from "build it as the
world's best standalone product for that one feature" research.

## Legend
- ✅ **Built** — shipped into the Nexli web app (offline / mock-data where a paid/gov service is needed).
- 🟡 **Buildable** — can be built now fully offline; plan written, build pending/in-progress.
- ⛔ **Blocked** — needs a paid Firebase plan, paid API key, payment gateway, official WhatsApp API,
  or government approval (APAAR/DigiLocker/ABC/UPI AutoPay/proctoring/IoT). Plan + offline shell only;
  **no faked live connections.**

## Modules

### Part A — core generators & ranking
| Module | Folder | Status |
|---|---|---|
| Counselling workspace | (built in Track 1 — `features/counseling`) | ✅ Built |
| Question Paper Generator | `question-paper-generator/` | 🟡 Buildable (plan ✅) |
| Certificate Generator | `certificate-generator/` | ✅ **Built** (`features/certificates`) + plan |
| Report Card / NEP Holistic Progress Card | `report-card-hpc/` | 🟡 Buildable (plan ✅; NEP HPC already exists) |
| Ranking — marks-based | `ranking-marks/` | ✅ **Built** (`features/rankings`) |
| Ranking — attendance-based | `ranking-attendance/` | ✅ **Built** (`features/rankings`) |

### Part C — differentiators (engagement / AI / trust)
| Module | Folder | Status |
|---|---|---|
| Gamified student dashboard | `gamified-dashboard/` | 🟡 Buildable |
| Digital skills passport / portfolio | `skills-passport/` | 🟡 Buildable |
| AI at-risk early-warning | `ai-at-risk/` | ⛔ Blocked (AI key) — detection logic buildable |
| Career counselling & aptitude | `career-counselling/` | 🟡 Buildable (assessment logic) |
| Document management + e-sign | `esign-document-management/` | ⛔ Blocked (legal e-sign) — DMS buildable |

### Integrations (Indian gov / payments / messaging / platform)
| Module | Folder | Status |
|---|---|---|
| APAAR / ABC / DigiLocker / NAD | `apaar-abc-digilocker/` | ⛔ Blocked (gov approval) |
| UPI AutoPay / eNACH + auto-reconciliation | `upi-autopay-reconciliation/` | ⛔ Blocked (gateway) |
| Secure online exam + proctoring | `secure-online-exam/` | ⛔ Blocked (proctoring) — CBT engine buildable |
| IoT campus safety | `iot-campus-safety/` | ⛔ Blocked (hardware) — dashboard buildable |
| WhatsApp Business automation | `whatsapp-automation/` | ⛔ Blocked (WA API) |
| SSO / Open API / interoperability | `sso-open-api/` | ⛔ Blocked (paid) — API surface design buildable |
| Cashless campus wallet | `cashless-wallet/` | ⛔ Blocked (gateway) — ledger buildable |

_Build order (buildable-first): ranking engines → question paper → certificate → report card/HPC →
gamified dashboard → skills passport → career counselling. Blocked modules: full plan + offline shell only._

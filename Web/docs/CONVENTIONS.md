# NEXLI — Engineering Conventions

The contract every module (and every subagent) follows. Keep the build green: `cd Web && npm run build`.

## Stack
React 19 + TypeScript (strict) + Vite, installable PWA. Tailwind v4 (themed with NEXLI tokens) + the ported reference design system (`src/styles/nexli.css`) + app layer (`src/styles/app.css`). Firebase (Auth + Firestore, **Spark/free**, offline persistence). State: React context + Firestore real-time hooks; forms: React Hook Form + Zod. Import alias `@/` → `src/`.

## Non-negotiables
- **Multi-tenant isolation:** never read/write school data without a `schoolId`. Use the `db.ts` tenant helpers only. Super Admin is the sole cross-tenant role.
- **Mobile-first:** design at 320px first; prove every screen at 320/360/375/390/412/768/1024/1440/1920. No horizontal scroll, no overflow. Any action easy on desktop must be equally easy on mobile.
- **Major forms = dedicated routed pages** (`/x/new`, `/x/:id/edit`). Modals only for confirm/preview/warn/simple single-field updates.
- **AI surfaces:** build fully, then wrap the primary content in `<AILockedOverlay>` (provider-less). Gate with `useFlag('ai')`.
- **Permissions:** gate UI with `useCan('perm')`; gate modules with `useFlag('key')`. Rules are the real boundary (mirror intent in `lib/rbac.ts`).
- **Audit:** call `useAudit()` and log important mutations (`'student.edited'`, `'fee.updated'`, etc.).
- **Accessibility:** keyboard + focus-visible + ARIA; status never by color alone; respect reduced motion. WCAG 2.1 AA.
- **Performance:** animate only transform/opacity/filter; lazy-load routes; keep bundles small for old Android.

## Spine APIs (use these — don't reinvent)
- **Session:** `useSession()` → `{ status, uid, isSuperAdmin, schoolId, role, member, school, flags, can, hasFlag, reload, logout }`. Also `useCan(perm)`, `useFlag(key)`, `useAudit()`. From `@/app/providers/SessionProvider`.
- **Data (`@/lib/db`):** `tenantCol(schoolId, sub)`, `tenantDoc(schoolId, sub, id)`, `memberRef`, `schoolRef`, plus platform refs. Hooks: `useDocument<T>(ref)`, `useCollection<T>(query, deps)`.
- **RBAC (`@/lib/rbac`):** `hasPermission`, `canManagePasswords`, `ROLE_PERMISSIONS`.
- **Flags (`@/lib/featureFlags`):** `FeatureFlagKey`, `FEATURE_FLAGS`, `resolveFlags`, `DEFAULT_FLAGS`.
- **Audit (`@/lib/audit`):** `writeAuditEvent`, `AuditAction`.
- **Format (`@/lib/format`):** `formatIndian`, `formatINR`, `formatINRCompact`, `formatNumber`, `formatPercent`, `formatDate`, `formatRelative`, `initials`.
- **Hooks (`@/lib/hooks`):** `usePrefersReducedMotion`, `useInView`, `useCountUp`.
- **cn (`@/lib/cn`):** class-merge.

## UI Kit (`@/components`) — compose, don't restyle
`Icon` (name set in Icon.tsx), `Avatar`, `Badge`/`DotBadge`, `Button`, `Panel`/`PanelAction`, `KPICard`, `Skeleton`/`SkeletonText`/`Spinner`/`EmptyState`/`InfoCard`, `AILockedOverlay` (+`AI_COMING_SOON_MESSAGE`), charts `Donut`/`DonutLegend`/`Ring`/`LineChart`/`BarChart`. Reuse reference classes from nexli.css (`.panel .kpi .badge .tile .timeline .donut-wrap .grid.g-2/.g-3 .kpi-grid` etc.) + Tailwind utilities + `app.css` (`.nx-btn .nx-avatar .nx-skel .nx-empty .ai-lock .nx-info-card`). Add new shared components to `src/components` + the barrel; add module-only components under the feature folder.

## Feature module layout
```
src/features/<module>/
  routes.tsx        // export const <module>Routes: RouteObject[]  (pages, incl. /new & /:id/edit)
  nav.ts            // export const <module>Nav: NavItem[]         (sidebar/bottom-nav entries)
  pages/            // routed pages (lists, detail, dedicated forms)
  components/       // module-only components
  data.ts           // typed Firestore reads/writes via db.ts helpers (tenant-scoped)
  types.ts          // module data types (extend TenantRecord)
```
Register routes + nav in the central registry (done by the integrator to avoid conflicts). Do NOT edit other modules' folders or shared spine files unless coordinated.

## Data modeling
Tenant records extend `TenantRecord` (`id, schoolId, createdAt/By, lastModifiedAt/By, version`). Always set `schoolId`. Paginate lists (≤100/query). Prefer real-time hooks for live data. Mutations: stamp `lastModifiedAt/By`, write a `_history` entry for critical records, and log audit.

## Definition of done (per screen / module)
Matches reference quality · perfect at all 9 widths, no horizontal scroll · keyboard + SR accessible, AA contrast · reduced-motion safe · loading/empty/error/offline states · permissions + tenant scope enforced in UI (and rules) · i18n-ready strings · 60fps interactions · `npm run build` green.

**Module completion gate:** hold every module to the build-phase quality bar — 6 axes + completion criteria — and never mark a module Complete just because it functions; a module that can't pass stays **In Review** with remaining work listed. Fewer modules at exceptional quality > many generic ones. _(The gate checklist `QUALITY_REVIEW.md` and per-module tracker `MODULE_STATUS.md` are archived under `docs/archive/` — see the repo `README.md`; current status lives in `BUILD_PROGRESS.md` and `resume/RESUME.md`.)_

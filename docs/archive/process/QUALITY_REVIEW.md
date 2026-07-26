# NEXLI — Module Quality Review (completion gate)

A module is **not complete because it functions.** Before it is marked complete, run this review and record the result in `Web/context/MODULE_STATUS.md`. A module is complete only when **every** box below is checked (or a conscious, documented exception is noted).

## Review axes
1. **Spec alignment** — implements the business requirements from `NEXLI_MASTER_SPECIFICATION.md` (the relevant module section): core features, user journeys, edge cases, permissions, communication/escalation rules.
2. **Reference fidelity** — matches the visual quality of `reference/` (spacing, hierarchy, typography scale, visual rhythm, gold/obsidian/ivory usage, premium feel). Does **not** look like a generic admin template.
3. **Mobile responsiveness** — validated at **320 / 360 / 375 / 390 / 412 / 768 / 1024 / 1440 / 1920**. No horizontal scroll, no clipped content, no hidden actions, no unusable tables. Every desktop action is equally easy on mobile.
4. **Accessibility (WCAG 2.1 AA)** — keyboard navigable, visible focus, ARIA labels/roles/live-regions, AA contrast, status never color-only, reduced-motion safe, text scales to 200%.
5. **Performance** — animates only transform/opacity/filter; no jank on a 2019 mid-range Android; route is code-split; no oversized bundle regressions; lists paginated.
6. **Roles & permissions** — UI gated with `useCan`/`useFlag`; tenant-scoped reads/writes only (`schoolId`); behavior correct for every role that touches the module; sensitive data hidden from disallowed roles.

## Completion criteria (all required)
- [ ] Business requirements implemented (per spec section)
- [ ] UI quality meets the NEXLI standard (reference-grade)
- [ ] Mobile experience polished (all 9 widths)
- [ ] Permissions correctly enforced (UI + tenant scope; rules mirror)
- [ ] Edge cases handled (per spec + sensible defaults)
- [ ] Empty states designed (`EmptyState`)
- [ ] Loading states designed (`Skeleton`/`Spinner`)
- [ ] Error states designed (`ErrorState`/inline + offline)
- [ ] Accessibility requirements met (axis 4)
- [ ] Audit logging on important mutations (`useAudit`)
- [ ] `npm run build` green; no TypeScript/console errors
- [ ] `MODULE_STATUS.md` updated (with the review outcome)

## How to apply (per module, before "complete")
1. Re-read the relevant spec section + the matching reference screen.
2. Self-review against the 6 axes and the criteria above; fix gaps.
3. Spot-check the key breakpoints (≥ 320, 390, 768, 1440) for layout/scroll/clipping.
4. Verify each role's view + that disallowed roles can't see/act.
5. Update `MODULE_STATUS.md` (% / status / remaining / blockers) and the rolling context checkpoint.

> Principle: fewer modules at exceptional quality beats many generic ones. If a module can't pass, it stays **In Review** with remaining work listed — not marked complete.

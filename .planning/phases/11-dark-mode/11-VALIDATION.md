---
phase: 11
slug: dark-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | apps/web (uses vitest via package.json) |
| **Quick run command** | `cd apps/web && pnpm exec tsc --noEmit` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/web && pnpm exec tsc --noEmit`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | THEME-01 | type-check | `cd apps/web && pnpm exec tsc --noEmit` | N/A | ⬜ pending |
| 11-01-02 | 01 | 1 | THEME-01, THEME-02, THEME-03 | type-check | `cd apps/web && pnpm exec tsc --noEmit` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test files needed — dark mode is primarily a visual/CSS concern. Type-checking ensures no TypeScript errors from new components.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Toggle button switches theme class on html element | THEME-01 | Visual/CSS behavior, not unit-testable | Click theme toggle in nav header, verify page switches to dark/light mode |
| Theme persists after page reload | THEME-02 | Requires browser localStorage + page refresh | Toggle to dark mode, refresh browser, verify dark mode is still active |
| First visit uses OS preference | THEME-03 | Requires OS-level preference detection | Set OS to dark mode, open incognito window to localhost:3000, verify dark mode |
| All pages render properly in both themes | THEME-01 | Visual consistency check | Navigate to auth, dashboard, reports, teams, manager, analytics, settings pages in both themes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

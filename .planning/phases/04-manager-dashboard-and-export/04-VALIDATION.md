---
phase: 04
slug: manager-dashboard-and-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `cd apps/api && pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm vitest run --reporter=verbose`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | MGMT-01, MGMT-02, MGMT-03 | unit | `cd apps/api && pnpm vitest run src/manager/manager.service.spec.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | MGMT-01, MGMT-02, MGMT-03 | integration | `cd apps/api && pnpm vitest run src/manager/manager.service.spec.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 3 | MGMT-01, MGMT-02, MGMT-03, UI-01 | manual | N/A — browser verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/manager/manager.service.spec.ts` — stubs for MGMT-01 (getTeamReports), MGMT-02 (getPendingSubmissions), MGMT-03 (generateCsv, escapeCsvField)
- [ ] Reuses existing `createMockSupabaseService()` from `apps/api/test/setup.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile responsive layout | UI-01 | Visual verification of layout at different viewports | Open browser at 375px viewport width, verify hamburger nav, readable tables, usable forms |
| Manager dashboard page rendering | MGMT-01 | Full page interaction flow | Navigate to /manager, verify member reports display with date navigation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

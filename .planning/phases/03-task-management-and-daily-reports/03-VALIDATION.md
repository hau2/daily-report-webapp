---
phase: 3
slug: task-management-and-daily-reports
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | apps/api/vitest.config.ts |
| **Quick run command** | `cd apps/api && pnpm vitest run` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm vitest run`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | TASK-01 | unit | `cd apps/api && pnpm vitest run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | TASK-02 | unit | `cd apps/api && pnpm vitest run` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | TASK-03 | unit | `cd apps/api && pnpm vitest run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | TASK-04 | unit | `cd apps/api && pnpm vitest run` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | TASK-05 | unit | `cd apps/api && pnpm vitest run` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | TASK-06 | unit | `cd apps/api && pnpm vitest run` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | TASK-07 | integration | `cd apps/web && pnpm exec tsc --noEmit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/tasks/tasks.service.spec.ts` — stubs for TASK-01, TASK-02, TASK-03
- [ ] `apps/api/src/reports/reports.service.spec.ts` — stubs for TASK-04, TASK-05, TASK-06
- [ ] Test mocks for Supabase client (reuse existing pattern from Phase 1)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Date navigation UX | TASK-07 | Browser date picker interaction | Navigate to /dashboard, click prev/next day, verify URL and content update |
| Report submission lock UX | TASK-06 | Visual state change (buttons disabled) | Submit a report, verify edit/delete buttons disappear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

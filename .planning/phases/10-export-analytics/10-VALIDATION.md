---
phase: 10
slug: export-analytics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (backend), TypeScript type-check (frontend) |
| **Config file** | apps/api/vitest.config.ts, apps/web/tsconfig.json |
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
| 10-01-01 | 01 | 1 | EXPORT-01 | manual-only | Manual: click download icon on chart card, verify PNG saved | N/A - DOM capture | ⬜ pending |
| 10-01-02 | 01 | 1 | EXPORT-02 | manual-only | Manual: click "Download PDF" button, verify PDF opens with charts | N/A - DOM capture | ⬜ pending |
| 10-01-03 | 01 | 1 | EXPORT-03 | type-check | `cd apps/web && pnpm exec tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. This phase is purely frontend with no new backend code. Type-checking via `tsc --noEmit` covers export utility function signatures. Manual browser testing covers actual DOM capture and file download behavior.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PNG download from chart card button | EXPORT-01 | DOM capture via html-to-image requires real browser | Navigate to analytics page, click download icon on any chart card, verify PNG file downloads |
| PDF download with all charts and summary | EXPORT-02 | DOM capture + jsPDF composition requires real browser | Click "Download PDF" button on analytics page, verify PDF contains all charts and summary data |
| CSV download of raw analytics data | EXPORT-03 | File download trigger requires browser context | Click "Export CSV" button, open downloaded file in spreadsheet, verify data matches analytics view |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

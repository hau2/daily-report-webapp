---
phase: 5
slug: chrome-extension
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing project config) |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `cd apps/api && pnpm vitest run` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm vitest run`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green + manual extension testing
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | EXT-01 | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "extensionLogin"` | No — W0 | pending |
| 05-01-02 | 01 | 1 | EXT-01 | unit | `cd apps/api && pnpm vitest run src/auth/access-token.strategy.spec.ts` | No — W0 | pending |
| 05-02-01 | 02 | 2 | EXT-02 | manual-only | N/A — Chrome browser required | N/A | pending |
| 05-02-02 | 02 | 2 | EXT-03 | manual-only | N/A — Chrome contextMenus API | N/A | pending |
| 05-02-03 | 02 | 2 | EXT-04 | manual-only | N/A — extension popup UI | N/A | pending |
| 05-02-04 | 02 | 2 | EXT-05 | unit | `cd apps/api && pnpm vitest run src/tasks/tasks.service.spec.ts -t "createTask"` | Existing | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/auth/auth.service.spec.ts` — add tests for extensionLogin and extensionRefresh methods
- [ ] `apps/api/src/auth/access-token.strategy.spec.ts` — test dual extraction (cookie + Bearer header)

*Extension popup/background testing is manual-only (Chrome extension testing frameworks are heavy and not worth it for this scope).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Context menu appears on text selection | EXT-02 | Requires Chrome browser with extension loaded | 1. Load extension unpacked. 2. Navigate to any page. 3. Select text. 4. Right-click. 5. Verify "Add to Daily Report" menu item appears. |
| Popup pre-fills with selected text and URL | EXT-02, EXT-03 | Chrome extension popup UI | 1. Select text on page. 2. Right-click -> "Add to Daily Report". 3. Verify popup opens with title = selected text, source link = page URL. |
| Quick-add form submission | EXT-04 | Extension popup form | 1. Fill in estimated hours and notes. 2. Click save. 3. Verify success feedback in popup. |
| Task appears in web app | EXT-05 | End-to-end cross-app verification | 1. Create task via extension. 2. Open web app daily report. 3. Verify task appears with correct title, source link, hours. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 1
slug: foundation-and-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 with unplugin-swc for NestJS decorator support |
| **Config file** | `apps/api/vitest.config.ts` (exists), `vitest.workspace.ts` (exists at root) |
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
| 1-01-01 | 01 | 1 | AUTH-01 | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "register"` | Exists (stubs) | pending |
| 1-01-02 | 01 | 1 | AUTH-01 | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "duplicate"` | Exists (stubs) | pending |
| 1-02-01 | 02 | 2 | AUTH-02 | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "verification"` | Exists (stubs) | pending |
| 1-02-02 | 02 | 2 | AUTH-02 | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "verify"` | Exists (stubs) | pending |
| 1-03-01 | 03 | 2 | AUTH-03 | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "forgot"` | Exists (stubs) | pending |
| 1-03-02 | 03 | 2 | AUTH-03 | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "reset"` | Exists (stubs) | pending |
| 1-04-01 | 04 | 3 | AUTH-04 | unit | `cd apps/api && pnpm vitest run src/auth/auth.controller.spec.ts -t "cookie"` | Exists (stubs) | pending |
| 1-04-02 | 04 | 3 | AUTH-04 | unit | `cd apps/api && pnpm vitest run src/auth/auth.controller.spec.ts -t "refresh"` | Exists (stubs) | pending |
| 1-04-03 | 04 | 3 | AUTH-04 | unit | `cd apps/api && pnpm vitest run src/auth/auth.controller.spec.ts -t "expired"` | Exists (stubs) | pending |
| 1-05-01 | 05 | 4 | TEAM-04 | unit | `cd apps/api && pnpm vitest run src/users/users.service.spec.ts -t "update name"` | Exists (stubs) | pending |
| 1-05-02 | 05 | 4 | TEAM-04 | unit | `cd apps/api && pnpm vitest run src/users/users.service.spec.ts -t "update email"` | Exists (stubs) | pending |
| 1-05-03 | 05 | 4 | TEAM-04 | unit | `cd apps/api && pnpm vitest run src/users/users.service.spec.ts -t "update password"` | Exists (stubs) | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] `apps/api/vitest.config.ts` — exists with SWC decorator support
- [x] `apps/api/src/auth/auth.service.spec.ts` — exists with todo stubs
- [x] `apps/api/src/auth/auth.controller.spec.ts` — exists with todo stubs
- [x] `apps/api/src/users/users.service.spec.ts` — exists with todo stubs
- [ ] `apps/api/test/setup.ts` — needs update: replace Prisma mocks with Supabase mocks
- [ ] `apps/api/src/email/email.service.spec.ts` — needs creation (AUTH-02, AUTH-03 email sending)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email verification link arrives in inbox | AUTH-02 | Requires real email delivery via Resend | 1. Register new user 2. Check email 3. Click verification link 4. Confirm user marked as verified |
| Password reset email arrives in inbox | AUTH-03 | Requires real email delivery via Resend | 1. Request password reset 2. Check email 3. Click reset link 4. Set new password 5. Log in with new password |
| Session persists across browser refresh | AUTH-04 | Requires real browser with cookie storage | 1. Log in 2. Close/refresh browser tab 3. Verify still logged in |
| BFF proxy forwards cookies correctly | AUTH-04 | Requires full Next.js + NestJS stack running | 1. Log in via Next.js 2. Check cookies in DevTools 3. Verify httpOnly flag set |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

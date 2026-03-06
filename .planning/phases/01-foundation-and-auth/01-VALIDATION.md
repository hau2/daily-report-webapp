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
| **Framework** | Vitest ^3 |
| **Config file** | None — Wave 0 installs |
| **Quick run command** | `pnpm --filter api exec vitest run --reporter=verbose` |
| **Full suite command** | `pnpm turbo test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter api exec vitest run --reporter=verbose`
- **After every plan wave:** Run `pnpm turbo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | AUTH-01 | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "register"` | No — W0 | pending |
| 1-01-02 | 01 | 1 | AUTH-01 | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "duplicate"` | No — W0 | pending |
| 1-02-01 | 02 | 1 | AUTH-02 | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "verification"` | No — W0 | pending |
| 1-02-02 | 02 | 1 | AUTH-02 | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "verify"` | No — W0 | pending |
| 1-03-01 | 03 | 1 | AUTH-03 | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "forgot"` | No — W0 | pending |
| 1-03-02 | 03 | 1 | AUTH-03 | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "reset"` | No — W0 | pending |
| 1-04-01 | 04 | 1 | AUTH-04 | integration | `pnpm --filter api exec vitest run src/auth/auth.controller.spec.ts -t "cookie"` | No — W0 | pending |
| 1-04-02 | 04 | 1 | AUTH-04 | integration | `pnpm --filter api exec vitest run src/auth/auth.controller.spec.ts -t "refresh"` | No — W0 | pending |
| 1-04-03 | 04 | 1 | AUTH-04 | integration | `pnpm --filter api exec vitest run src/auth/auth.controller.spec.ts -t "expired"` | No — W0 | pending |
| 1-05-01 | 05 | 2 | TEAM-04 | unit | `pnpm --filter api exec vitest run src/users/users.service.spec.ts -t "update name"` | No — W0 | pending |
| 1-05-02 | 05 | 2 | TEAM-04 | unit | `pnpm --filter api exec vitest run src/users/users.service.spec.ts -t "update email"` | No — W0 | pending |
| 1-05-03 | 05 | 2 | TEAM-04 | unit | `pnpm --filter api exec vitest run src/users/users.service.spec.ts -t "update password"` | No — W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/vitest.config.ts` — Vitest config for NestJS (with SWC transform)
- [ ] `apps/web/vitest.config.ts` — Vitest config for Next.js (if frontend tests needed)
- [ ] `vitest.workspace.ts` — Monorepo workspace config for Vitest
- [ ] `apps/api/src/auth/auth.service.spec.ts` — Auth service unit test stubs
- [ ] `apps/api/src/auth/auth.controller.spec.ts` — Auth controller integration test stubs
- [ ] `apps/api/src/users/users.service.spec.ts` — Users service unit test stubs
- [ ] `apps/api/test/setup.ts` — Test setup with NestJS testing module and Prisma mock
- [ ] Framework install: `pnpm add -Dw vitest @vitest/coverage-v8` + `pnpm --filter api add -D unplugin-swc @swc/core`

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

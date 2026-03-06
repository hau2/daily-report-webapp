---
phase: 01-foundation-and-auth
plan: 04
subsystem: auth
tags: [resend, email, jwt, nestjs, nextjs, react-hook-form, zod]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth-02
    provides: AuthService, AuthController, EmailService, EmailModule, verify-email/forgot-password/reset-password DTOs and endpoints (committed in plan 03)

provides:
  - Fixed EmailService unit tests (class-based Resend mock resolves vi.mock hoisting issue)
  - Frontend /verify-email page: processes JWT token from URL, shows loading/success/error states
  - Frontend /forgot-password page: email form with anti-enumeration success message
  - Frontend /reset-password page: token from URL + confirm-password validation, redirects to login on success
  - Login page updated with "Forgot password?" link

affects: [05-frontend-auth]

# Tech tracking
tech-stack:
  added: []
  patterns: [
    "Anti-enumeration: forgot-password always returns 200 regardless of email existence",
    "vi.mock with class syntax for constructable mocks -- avoids ESM hoisting issue with outer-scope vars",
    "Access service internals via (service as any).resend for mock assertion in NestJS tests",
    "Reset password form uses local Zod schema with .refine() for confirm-password match (not shared schema)",
    "Error boundary pattern: form.setError('root', ...) for API-level errors on reset-password"
  ]

key-files:
  created:
    - apps/web/src/app/(auth)/verify-email/page.tsx
    - apps/web/src/app/(auth)/forgot-password/page.tsx
    - apps/web/src/app/(auth)/reset-password/page.tsx
  modified:
    - apps/api/src/email/email.service.spec.ts
    - apps/web/src/app/(auth)/login/page.tsx

key-decisions:
  - "vi.mock with inline class (class MockResend { emails = { send: vi.fn() } }) avoids ESM hoisting limitation where outer-scope variables are not accessible in vi.mock factories"
  - "forgot-password uses finally block to always show success UI regardless of API error -- prevents email enumeration"
  - "reset-password uses a local form schema extending shared resetPasswordSchema with confirmPassword field + .refine() check"

patterns-established:
  - "ESM class mock pattern: vi.mock('lib', () => ({ Class: class MockClass { method = vi.fn() } })) for constructable mocks"
  - "Service internals access: (service as any).privateProp for mock assertion when injected mock is on service instance"

requirements-completed: [AUTH-02, AUTH-03]

# Metrics
duration: 6min
completed: 2026-03-06
---

# Phase 01 Plan 04: Email Verification and Password Reset Summary

**Email verification and password reset flows complete: Resend-backed EmailService with JWT tokens, three NestJS endpoints, three Next.js pages, and fixed ESM mock pattern for EmailService tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-06T07:42:10Z
- **Completed:** 2026-03-06T07:48:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Fixed EmailService test mock: replaced broken outer-scope `vi.fn()` reference (fails due to vi.mock hoisting) with inline class mock pattern — all 25 auth+email tests pass
- Built `/verify-email` page: extracts token from URL, calls POST /auth/verify-email on mount, shows loading/success/error states with Card components
- Built `/forgot-password` page: react-hook-form + zodResolver(forgotPasswordSchema) with anti-enumeration always-success UI after submit
- Built `/reset-password` page: confirms token presence, local schema with `.refine()` for password match, redirects to /login on success with toast
- Updated `/login` page: added "Forgot password?" link beside password label pointing to /forgot-password

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix EmailService test mock (class-based Resend constructor)** - `7901b73` (fix)
2. **Task 2: Build verify-email, forgot-password, and reset-password frontend pages** - `7178505` (feat)

**Plan metadata:** _(pending docs commit)_

_Note: Backend email/auth implementation (EmailService, DTOs, AuthService methods, AuthController endpoints, AuthModule) was committed in plan 03 session. This plan verified correctness and completed the frontend pages._

## Files Created/Modified
- `apps/api/src/email/email.service.spec.ts` - Fixed vi.mock with inline class to avoid ESM hoisting issue
- `apps/web/src/app/(auth)/verify-email/page.tsx` - Token verification page with loading/success/error states
- `apps/web/src/app/(auth)/forgot-password/page.tsx` - Email form with anti-enumeration success message
- `apps/web/src/app/(auth)/reset-password/page.tsx` - New password form with confirm-password validation
- `apps/web/src/app/(auth)/login/page.tsx` - Added "Forgot password?" link

## Decisions Made
- Used `class MockResend { emails = { send: vi.fn() } }` inside `vi.mock()` instead of outer-scope variable to work around Vitest's ESM hoisting of `vi.mock` calls
- `forgot-password` page uses `finally` block to always trigger `setSubmitted(true)`, ensuring no enumeration leak even if the API throws
- `reset-password` uses a page-local Zod schema (not the shared `resetPasswordSchema`) to add the `confirmPassword` field with `.refine()` match check

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed EmailService mock: ESM vi.mock hoisting breaks outer-scope variable reference**
- **Found during:** Task 1 (verifying existing tests)
- **Issue:** Committed `email.service.spec.ts` used `const mockEmailsSend = vi.fn()` outside `vi.mock()` factory, then referenced it inside. Since `vi.mock` is hoisted before variable declarations in ESM, `mockEmailsSend` is undefined at mock evaluation time, causing "is not a constructor" error.
- **Fix:** Replaced with `vi.mock('resend', () => ({ Resend: class MockResend { emails = { send: vi.fn() } } }))` — all assertions use `(service as any).resend.emails.send` to access the instance's mock
- **Files modified:** `apps/api/src/email/email.service.spec.ts`
- **Verification:** `pnpm vitest run src/email/email.service.spec.ts` — 4/4 tests pass
- **Committed in:** `7901b73` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered
- Backend auth/email implementation was already committed by plan 03 session (including EmailService, verify-email/forgot-password/reset-password DTOs, AuthService methods, AuthController endpoints). Task 1 reduced to fixing the broken email service spec; the plan's backend implementation was verified as already complete.

## User Setup Required
Resend email delivery requires environment variables:
- `RESEND_API_KEY` - From resend.com dashboard
- `EMAIL_FROM` - Verified sender address (or `onboarding@resend.dev` for testing)
- `FRONTEND_URL` - Set to `http://localhost:3000` for development

Without `RESEND_API_KEY`, the service logs verification/reset URLs to console (development mode).

## Next Phase Readiness
- Email verification and password reset flows fully implemented end-to-end
- Login page has forgot-password link
- All 25 auth+email unit tests pass
- Next.js build succeeds with all 9 pages

## Self-Check: PASSED

All files verified:
- apps/api/src/email/email.service.spec.ts - FOUND
- apps/web/src/app/(auth)/verify-email/page.tsx - FOUND
- apps/web/src/app/(auth)/forgot-password/page.tsx - FOUND
- apps/web/src/app/(auth)/reset-password/page.tsx - FOUND
- .planning/phases/01-foundation-and-auth/01-04-SUMMARY.md - FOUND

All commits verified:
- 7901b73 (fix: EmailService mock) - FOUND
- 7178505 (feat: frontend pages) - FOUND

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-03-06*

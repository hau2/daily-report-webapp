---
phase: 01-foundation-and-auth
plan: 05
subsystem: auth
tags: [nestjs, users, profile, settings, react-hook-form, tanstack-query, zod]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    plan: 01
    provides: SupabaseService singleton, database connection
  - phase: 01-foundation-and-auth
    plan: 02
    provides: AccessTokenGuard, JWT strategy, req.user payload
  - phase: 01-foundation-and-auth
    plan: 03
    provides: api-client.ts with get/patch, useAuth hook, dashboard layout

provides:
  - GET /users/me - returns full user profile (id, email, displayName, timezone, emailVerified, createdAt, updatedAt)
  - PATCH /users/me - updates displayName, email (requires currentPassword), password (requires currentPassword, invalidates refresh token), timezone
  - /settings page with three cards: Profile, Email, Password
  - updateProfileSchema and UpdateProfileInput in shared package
  - UpdateProfileRequest interface in shared types

affects:
  - Phase 2+ (any phase that needs user profile data)
  - future settings extensions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - snake_case to camelCase mapping for DB rows via mapDbUserToUser() utility function
    - TDD: RED (failing spec) committed before GREEN (implementation)
    - Each sub-card in settings page has independent form state and mutation

key-files:
  created:
    - apps/api/src/users/users.service.ts
    - apps/api/src/users/users.controller.ts
    - apps/api/src/users/users.module.ts
    - apps/api/src/users/dto/update-profile.dto.ts
    - apps/web/src/app/settings/page.tsx
  modified:
    - apps/api/src/users/users.service.spec.ts
    - apps/api/src/app.module.ts
    - apps/web/src/app/(dashboard)/layout.tsx
    - packages/shared/src/schemas/auth.schema.ts
    - packages/shared/src/types/auth.ts
    - packages/shared/src/index.ts

key-decisions:
  - "UsersService.getProfile uses narrow SELECT (no password_hash/refresh_token_hash) to prevent accidental exposure"
  - "updateProfile fetches user with password_hash only when currentPassword is provided (single query, not always)"
  - "Password change sets refresh_token_hash to null to force re-login on all devices"
  - "Settings page splits into three independent Cards with isolated form state and mutations"
  - "Email change error handling: 401 from API sets field-level error on currentPassword field (not toast)"

patterns-established:
  - "DB row to domain type mapping: private mapDbUserToUser() function handles all snake_case -> camelCase"
  - "Password-gated updates: throw BadRequestException before hitting DB when required field missing"
  - "Settings sub-forms: each Card manages its own react-hook-form instance and useMutation"

requirements-completed: [TEAM-04]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 01 Plan 05: User Profile Management Summary

**NestJS UsersModule with GET/PATCH /users/me (argon2-gated updates, refresh token invalidation) and a settings page with three independent form cards**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T08:17:32Z
- **Completed:** 2026-03-06T08:21:00Z
- **Tasks:** 3 of 3 (Task 3 human verification approved 2026-03-06)
- **Files modified:** 10

## Accomplishments

- UsersModule: GET /users/me returns full profile (camelCase mapped, no sensitive fields), PATCH /users/me handles name/email/password/timezone updates with current password validation
- TDD: 8 unit tests written (RED) before implementation (GREEN), all passing alongside 25 existing auth tests (33 total)
- Settings page: three independent Cards (Profile, Email, Password) with react-hook-form + Zod, TanStack Query for data fetching, toast + field-level error feedback
- Dashboard layout: Settings link added next to logout button

## Task Commits

Each task was committed atomically:

1. **Task 1: Create UsersModule with GET/PATCH /users/me endpoints and unit tests** - `82cc61a` (feat)
2. **Task 2: Build settings page with profile update forms and link from dashboard** - `eecd53e` (feat)
3. **Task 3: Verify complete Phase 1 auth flow** - approved by user (all 17 steps passed)

## Files Created/Modified

- `apps/api/src/users/users.service.ts` - Profile CRUD via SupabaseService, argon2 password verification, camelCase mapping
- `apps/api/src/users/users.controller.ts` - GET/PATCH /users/me with @UseGuards(AccessTokenGuard) on class
- `apps/api/src/users/users.module.ts` - UsersModule wiring controller and service, imports SupabaseModule
- `apps/api/src/users/dto/update-profile.dto.ts` - UpdateProfileDto with class-validator decorators
- `apps/api/src/users/users.service.spec.ts` - 8 unit tests (TDD): getProfile mapping, updateProfile validation
- `apps/api/src/app.module.ts` - Added UsersModule to imports
- `apps/web/src/app/settings/page.tsx` - Settings page with ProfileCard, EmailCard, PasswordCard
- `apps/web/src/app/(dashboard)/layout.tsx` - Added Settings link in header
- `packages/shared/src/schemas/auth.schema.ts` - Added updateProfileSchema and UpdateProfileInput
- `packages/shared/src/types/auth.ts` - Added UpdateProfileRequest interface
- `packages/shared/src/index.ts` - Exported updateProfileSchema, UpdateProfileInput, UpdateProfileRequest

## Decisions Made

- Used narrow SELECT in `getProfile` (explicit column list, excludes password_hash and refresh_token_hash) to prevent accidental data exposure
- `updateProfile` only queries the user for password verification when `currentPassword` is actually provided, avoiding unnecessary DB reads
- Password change nullifies `refresh_token_hash` to force re-login, consistent with password reset flow established in Plan 04
- Settings page splits into three isolated Cards — each has its own form instance and mutation, so errors in one don't affect others
- 401 errors on email/password change render as field-level errors (not toasts) for better UX

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full Phase 1 auth system is built and end-to-end verified: register, verify email, login, session persistence (httpOnly cookies), settings, logout, password reset
- All 17 verification steps passed by human review on 2026-03-06
- Phase 2 can begin immediately — the /users/me endpoint is ready for any feature that needs user profile data

## Self-Check: PASSED

- apps/api/src/users/users.service.ts: FOUND
- apps/api/src/users/users.controller.ts: FOUND
- apps/api/src/users/users.module.ts: FOUND
- apps/api/src/users/dto/update-profile.dto.ts: FOUND
- apps/web/src/app/settings/page.tsx: FOUND
- .planning/phases/01-foundation-and-auth/01-05-SUMMARY.md: FOUND
- Commit 82cc61a (Task 1): FOUND
- Commit eecd53e (Task 2): FOUND

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-03-06*

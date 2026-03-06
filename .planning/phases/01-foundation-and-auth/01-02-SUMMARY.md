---
phase: 01-foundation-and-auth
plan: 02
subsystem: auth
tags: [nestjs, passport, jwt, argon2, httponly-cookies, supabase]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth-01
    provides: SupabaseService, test/setup.ts mock helpers, NestJS app module foundation

provides:
  - NestJS AuthModule with Passport JWT strategies (access + refresh cookie extraction)
  - AuthService: register (Argon2 hash, 409 on duplicate), login (dual httpOnly JWTs), refresh (hash rotation), logout (cookie clear + DB nullify)
  - AuthController: POST /auth/register, /auth/login, /auth/refresh, /auth/logout
  - AccessTokenGuard and RefreshTokenGuard for protecting endpoints
  - RegisterDto and LoginDto with class-validator decorators
  - 12 passing unit tests covering all auth flows

affects: [03-task-management, 04-email-auth, 05-frontend-auth]

# Tech tracking
tech-stack:
  added: ["@nestjs/testing (devDep)", "@types/express (devDep)", "passport-jwt strategy pattern"]
  patterns: [
    "httpOnly cookie auth (access_token: 15m, refresh_token: 7d at /auth/refresh)",
    "argon2 hash for both password and refresh token storage",
    "Passport strategy extraction from req.cookies (not Authorization header)",
    "vi.mock at module level for ESM native modules (argon2)",
    "import type for Express types (avoids ESM runtime resolution)"
  ]

key-files:
  created:
    - apps/api/src/auth/auth.module.ts
    - apps/api/src/auth/auth.service.ts
    - apps/api/src/auth/auth.controller.ts
    - apps/api/src/auth/dto/register.dto.ts
    - apps/api/src/auth/dto/login.dto.ts
    - apps/api/src/auth/strategies/access-token.strategy.ts
    - apps/api/src/auth/strategies/refresh-token.strategy.ts
    - apps/api/src/auth/guards/access-token.guard.ts
    - apps/api/src/auth/guards/refresh-token.guard.ts
    - apps/api/src/auth/auth.service.spec.ts
    - apps/api/src/auth/auth.controller.spec.ts
  modified:
    - apps/api/src/app.module.ts (added AuthModule import)
    - apps/api/test/setup.ts (added explicit types to fix TS2742 error)
    - apps/api/package.json (added @nestjs/testing, @types/express devDeps)

key-decisions:
  - "Express types use 'import type' throughout auth module to avoid ESM runtime resolution (express not a direct dep, only transitive via @nestjs/platform-express)"
  - "vi.mock('argon2', ...) hoisted at module level — vi.spyOn cannot spy on ESM native module exports"
  - "JwtModule.register({}) with empty config — signing options (secret, expiresIn) passed per-call in service for flexibility"
  - "refresh_token cookie path restricted to /auth/refresh to minimize cookie surface area"

patterns-established:
  - "Cookie auth pattern: access_token (15m, /) + refresh_token (7d, /auth/refresh) both httpOnly"
  - "Mock pattern: createMockSupabaseService() from test/setup.ts for all Supabase-dependent tests"
  - "ESM mock pattern: vi.mock() at top of file for native modules (argon2)"

requirements-completed: [AUTH-01, AUTH-04]

# Metrics
duration: 7min
completed: 2026-03-06
---

# Phase 01 Plan 02: NestJS Auth Backend Summary

**NestJS auth system with Argon2 password hashing, dual httpOnly JWT cookies (15m access/7d refresh) via Passport strategies, and full register/login/refresh/logout endpoints backed by 12 unit tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-06T07:31:23Z
- **Completed:** 2026-03-06T07:38:29Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- AuthService implementing register (Argon2 hash + Supabase insert, 409 ConflictException on duplicate), login (argon2.verify + dual JWT cookie set), refresh (hash verification + token rotation), and logout (cookie clear + DB nullify)
- AuthController routing POST /auth/register, /auth/login (200), /auth/refresh (RefreshTokenGuard), /auth/logout (AccessTokenGuard)
- Passport strategies extracting JWTs from cookies (not Authorization header): AccessTokenStrategy ('jwt') and RefreshTokenStrategy ('jwt-refresh' with passReqToCallback)
- 12 passing unit tests (8 service + 4 controller) covering all success and failure paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Create auth DTOs, Passport strategies, guards, and AuthModule wiring** - `6cf4ad6` (feat)
2. **Task 2: Implement AuthService and AuthController with full register/login/refresh/logout** - `f81643a` (feat)

**Plan metadata:** _(pending docs commit)_

_Note: Both tasks include implementation + tests (TDD approach with services and tests committed together after green phase)_

## Files Created/Modified
- `apps/api/src/auth/auth.module.ts` - Module wiring PassportModule, JwtModule, strategies, guards
- `apps/api/src/auth/auth.service.ts` - Core auth logic (register, login, refresh, logout)
- `apps/api/src/auth/auth.controller.ts` - REST endpoints with guards
- `apps/api/src/auth/dto/register.dto.ts` - RegisterDto with class-validator (IsEmail, MinLength(8))
- `apps/api/src/auth/dto/login.dto.ts` - LoginDto with class-validator
- `apps/api/src/auth/strategies/access-token.strategy.ts` - JWT from access_token cookie
- `apps/api/src/auth/strategies/refresh-token.strategy.ts` - JWT from refresh_token cookie + passReqToCallback
- `apps/api/src/auth/guards/access-token.guard.ts` - AuthGuard('jwt') extension
- `apps/api/src/auth/guards/refresh-token.guard.ts` - AuthGuard('jwt-refresh') extension
- `apps/api/src/auth/auth.service.spec.ts` - 8 unit tests for all AuthService methods
- `apps/api/src/auth/auth.controller.spec.ts` - 4 unit tests for AuthController delegation
- `apps/api/src/app.module.ts` - Added AuthModule import
- `apps/api/test/setup.ts` - Added explicit TypeScript types to fix TS2742 error
- `apps/api/package.json` - Added @nestjs/testing and @types/express devDependencies

## Decisions Made
- Used `import type` for Express types throughout auth module — `express` package is a transitive dep (via `@nestjs/platform-express`) but not directly in API package.json, so ESM runtime can't resolve it; `import type` is erased at compile time
- Used `vi.mock('argon2', ...)` at module level — `vi.spyOn` cannot override exports of native ESM modules (argon2 uses non-configurable exports)
- `JwtModule.register({})` with empty config — each `jwtService.signAsync` call passes `{ secret, expiresIn }` directly, enabling per-token configuration without global binding

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @types/express devDependency**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** TypeScript couldn't resolve `express` module types - `@types/express` only in pnpm virtual store, not declared in API package devDependencies
- **Fix:** `pnpm --filter @daily-report/api add --save-dev @types/express`
- **Files modified:** apps/api/package.json, pnpm-lock.yaml
- **Verification:** `tsc --noEmit` passes
- **Committed in:** `6cf4ad6` (Task 1 commit)

**2. [Rule 3 - Blocking] Added @nestjs/testing devDependency**
- **Found during:** Task 2 (running auth unit tests)
- **Issue:** Test files import `@nestjs/testing` but it wasn't in devDependencies; vitest couldn't find the package at runtime
- **Fix:** `pnpm --filter @daily-report/api add --save-dev @nestjs/testing`
- **Files modified:** apps/api/package.json, pnpm-lock.yaml
- **Verification:** Tests run successfully
- **Committed in:** `f81643a` (Task 2 commit)

**3. [Rule 3 - Blocking] Changed express imports to `import type`**
- **Found during:** Task 2 (controller spec failing at module resolution)
- **Issue:** `import { Request, Response } from 'express'` causes runtime ESM resolution failure when running vitest for auth.controller.spec.ts; `express` is not a direct dependency
- **Fix:** Changed all `import { ... } from 'express'` to `import type { ... } from 'express'` in auth.controller.ts, auth.service.ts, and strategy files
- **Files modified:** All auth/*.ts files with express imports
- **Verification:** Controller tests pass; TypeScript compiles cleanly
- **Committed in:** `f81643a` (Task 2 commit)

**4. [Rule 1 - Bug] Fixed pre-existing TS2742 error in test/setup.ts**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** `test/setup.ts` had no explicit return type on `createMockSupabaseService()`, causing TS error referencing pnpm internal path (non-portable inferred type)
- **Fix:** Added explicit `MockSupabaseService` interface and return type annotation
- **Files modified:** apps/api/test/setup.ts
- **Verification:** `tsc --noEmit` exits 0
- **Committed in:** `f81643a` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (3 blocking, 1 bug)
**Impact on plan:** All auto-fixes were required for the test suite to function in this pnpm workspace with ESM. No scope creep — no email verification or password reset endpoints added.

## Issues Encountered
- argon2 ESM module exports are non-configurable — `vi.spyOn` cannot spy on them; solution was `vi.mock('argon2', ...)` hoisted factory at module level

## User Setup Required
None - no external service configuration required (Supabase and JWT config already established in Phase 01-01).

## Next Phase Readiness
- Auth endpoints ready for integration testing once Supabase users table is provisioned
- AccessTokenGuard exported for use by protected endpoints in Plan 03 (task management)
- RefreshTokenGuard and strategies wired into AuthModule

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-03-06*

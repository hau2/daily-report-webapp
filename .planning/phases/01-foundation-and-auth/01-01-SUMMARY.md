---
phase: 01-foundation-and-auth
plan: 01
subsystem: database
tags: [supabase, supabase-js, nestjs, jwt, passport, argon2, resend, tanstack-query]

# Dependency graph
requires: []
provides:
  - SupabaseModule (Global NestJS module) providing SupabaseService with singleton client
  - SupabaseService.getClient() returning configured SupabaseClient (service_role key)
  - DbUser, DbUserInsert, DbUserUpdate types in @daily-report/shared
  - createMockSupabaseService() mock factory for unit tests
  - All Phase 1 auth dependencies installed (JWT, Passport, argon2, Resend)
  - All Prisma artifacts removed (packages, config, schema, generated client, scripts)
affects: [02-auth, 03-task-management, 04-reports, 05-chrome-extension]

# Tech tracking
tech-stack:
  added:
    - "@supabase/supabase-js ^2.49.0 (apps/api)"
    - "@nestjs/jwt ^11.0.0 (apps/api)"
    - "@nestjs/passport ^11.0.0 (apps/api)"
    - "passport ^0.7.0 (apps/api)"
    - "passport-jwt ^4.0.1 (apps/api)"
    - "argon2 ^0.43.0 (apps/api)"
    - "resend ^4.0.0 (apps/api)"
    - "@types/passport-jwt ^4.0.0 (apps/api devDep)"
    - "@tanstack/react-query ^5.0.0 (apps/web)"
  patterns:
    - "SupabaseService as singleton NestJS injectable (not request-scoped)"
    - "@Global() module pattern for cross-module service access without explicit imports"
    - "ConfigService.getOrThrow() for mandatory env vars (fails fast on missing config)"
    - "Supabase client initialized in onModuleInit (not constructor)"
    - "Supabase auth options: persistSession/autoRefreshToken/detectSessionInUrl all false (backend-only)"

key-files:
  created:
    - apps/api/src/supabase/supabase.service.ts
    - apps/api/src/supabase/supabase.module.ts
    - packages/shared/src/types/database.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/test/setup.ts
    - packages/shared/src/index.ts
    - apps/api/package.json
    - apps/web/package.json
    - package.json
    - turbo.json
    - pnpm-lock.yaml

key-decisions:
  - "Supabase JS client (not Prisma) used as data access layer per user override of original roadmap"
  - "Service-role key used for all backend queries (bypasses RLS for server-side operations)"
  - "Singleton client pattern: one client per app instance, initialized in onModuleInit"
  - "argon2 added to pnpm.onlyBuiltDependencies to allow native module compilation"

patterns-established:
  - "Global NestJS modules pattern: @Global() + provides + exports for cross-app services"
  - "Mock factory pattern: createMockSupabaseService() returns { service, mockClient, mockQueryBuilder } for easy test configuration"
  - "Database type convention: DbUser (row), DbUserInsert (insert), DbUserUpdate (partial update)"

requirements-completed: [AUTH-01, AUTH-04]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 1 Plan 01: Foundation - Supabase Client, Shared Types, Test Infrastructure Summary

**Supabase JS singleton client injected globally via NestJS @Global module, argon2/JWT/Passport/Resend installed, DbUser types added to shared package, Prisma fully removed**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T07:25:36Z
- **Completed:** 2026-03-06T07:28:49Z
- **Tasks:** 3 of 3
- **Files modified:** 9

## Accomplishments

- Removed all Prisma artifacts (packages, schema.prisma, prisma.config.ts, generated client, db:generate/db:push scripts) from all package.json and turbo.json files
- Installed all Phase 1 auth dependencies: @supabase/supabase-js, @nestjs/jwt, @nestjs/passport, passport, passport-jwt, argon2, resend, @types/passport-jwt, @tanstack/react-query
- Created @Global SupabaseModule with SupabaseService (singleton, service-role key, onModuleInit pattern)
- Added DbUser/DbUserInsert/DbUserUpdate types to @daily-report/shared matching the SQL schema
- Replaced Prisma mock factory with Supabase chainable mock builder (createMockSupabaseService)
- TypeScript compiles with zero errors; pnpm test passes with 12 todo stubs skipped

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove Prisma, install dependencies, clean up build config** - `778b038` (chore)
2. **Task 2: Create SupabaseModule/Service and update AppModule** - `7922285` (feat)
3. **Task 3: Add shared database types, update test setup with Supabase mocks** - `5f40da0` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `apps/api/src/supabase/supabase.service.ts` - Injectable SupabaseService with getClient(), onModuleInit, ConfigService.getOrThrow
- `apps/api/src/supabase/supabase.module.ts` - @Global() @Module providing/exporting SupabaseService
- `apps/api/src/app.module.ts` - Removed PrismaModule, added SupabaseModule to imports
- `apps/api/test/setup.ts` - createMockSupabaseService() replacing createMockPrismaService()
- `packages/shared/src/types/database.ts` - DbUser, DbUserInsert, DbUserUpdate interfaces
- `packages/shared/src/index.ts` - Added database type exports
- `apps/api/package.json` - Removed Prisma, added Supabase/auth packages
- `apps/web/package.json` - Added @tanstack/react-query
- `package.json` - Removed db scripts, removed Prisma from onlyBuiltDependencies, added argon2
- `turbo.json` - Removed db:generate and db:push tasks

## Decisions Made

- Used Supabase JS client (not Prisma) per user's explicit override of the roadmap decision — research confirmed this is the right approach for this stack
- Service-role key for all backend operations — bypasses RLS for server-controlled queries
- argon2 added to `pnpm.onlyBuiltDependencies` — required for native module to compile

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added argon2 to pnpm.onlyBuiltDependencies**
- **Found during:** Task 1 (pnpm install)
- **Issue:** pnpm warned "Ignored build scripts: argon2@0.43.1" — argon2 is a native C++ module that requires compilation. Without it in onlyBuiltDependencies, the package would be non-functional at runtime.
- **Fix:** Added `"argon2"` to `pnpm.onlyBuiltDependencies` in root package.json, re-ran pnpm install
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** Second pnpm install ran argon2 build successfully with no warnings
- **Committed in:** `778b038` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed TypeScript strict property initialization on SupabaseService.client**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** `private client: SupabaseClient` caused TS2564 error — property has no initializer and is not definitely assigned in constructor (correct, since it's assigned in onModuleInit)
- **Fix:** Changed to `private client!: SupabaseClient` (definite assignment assertion)
- **Files modified:** apps/api/src/supabase/supabase.service.ts
- **Verification:** `pnpm exec tsc --noEmit` exits with code 0
- **Committed in:** `7922285` (Task 2 commit)

**3. [Rule 3 - Blocking] Deleted stale dist/ directory with Prisma generated files**
- **Found during:** Task 2 (grep for Prisma references)
- **Issue:** apps/api/dist/ contained old compiled Prisma files (dist/generated/prisma/, dist/prisma/) which showed up in grep results and could cause confusion
- **Fix:** Deleted apps/api/dist/ directory entirely (it's a build artifact, regenerated by `nest build`)
- **Files modified:** None (deletion of build artifacts, gitignored)
- **Verification:** All Prisma grep checks return clean results
- **Committed in:** Not committed (dist/ is gitignored)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 1 bug, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required for this plan. (Supabase credentials will be needed in a later plan when services actually connect to the database.)

## Next Phase Readiness

- SupabaseModule available globally — any subsequent NestJS module can inject SupabaseService without importing SupabaseModule
- All Phase 1 auth dependencies (JWT, Passport, argon2, Resend) installed and ready
- DbUser types available from @daily-report/shared for use in API services
- createMockSupabaseService() available for all upcoming unit tests
- Ready for Plan 02: Auth Service and endpoints

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-03-06*

## Self-Check: PASSED

All created files found on disk. All task commits verified in git history.

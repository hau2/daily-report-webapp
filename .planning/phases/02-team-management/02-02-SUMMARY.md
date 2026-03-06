---
phase: 02-team-management
plan: 02
subsystem: api
tags: [nestjs, supabase, jwt, vitest, class-validator, typescript, email, teams]

# Dependency graph
requires:
  - phase: 02-team-management/01
    provides: "database/migrations/002_team_management.sql (teams, team_members, team_invitations DDL), shared Zod schemas and TypeScript types, Wave 0 RED test stubs (7 failing tests), extended MockQueryBuilder in test/setup.ts"
  - phase: 01-foundation-and-auth
    provides: "AccessTokenGuard, AccessTokenUser, SupabaseService, JwtService, EmailService, ConfigService patterns, test/setup.ts mock pattern"

provides:
  - apps/api/src/teams/teams.service.ts (TeamsService with createTeam, getMyTeams, inviteMember, acceptInvitation)
  - apps/api/src/teams/teams.controller.ts (TeamsController with POST /teams, GET /teams/my, POST /teams/invitations/accept, POST /teams/:id/invitations)
  - apps/api/src/teams/guards/team-manager.guard.ts (TeamManagerGuard verifying manager role via DB query)
  - apps/api/src/teams/dto/create-team.dto.ts, invite-member.dto.ts, accept-invitation.dto.ts
  - apps/api/src/teams/teams.module.ts (TeamsModule wired into AppModule)
  - apps/api/src/email/email.service.ts extended with sendTeamInvitationEmail method
  - 7 TeamsService unit tests GREEN (TEAM-01, TEAM-02, TEAM-03)

affects: [02-03-teams-frontend, 03-task-management, 04-manager-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TeamManagerGuard: NestJS CanActivate reads req.params['id'] + req.user.userId, queries team_members, returns true only if role === 'manager'"
    - "Invitation token: JWT with purpose='team-invitation', teamId, inviteeEmail, expiresIn='7d'; stored as SHA-256 hash in team_invitations"
    - "Re-invite pattern: UPDATE team_invitations SET used_at=now() WHERE team_id AND invitee_email AND used_at IS NULL before INSERT (handles partial unique index)"
    - "Route ordering: literal POST /teams/invitations/accept declared before parameterized POST /teams/:id/invitations in controller to prevent :id matching 'invitations'"
    - "DTO strict TypeScript: use ! (definite-assignment assertion) on class-validator decorated properties"

key-files:
  created:
    - apps/api/src/teams/teams.service.ts
    - apps/api/src/teams/teams.controller.ts
    - apps/api/src/teams/teams.module.ts
    - apps/api/src/teams/guards/team-manager.guard.ts
    - apps/api/src/teams/dto/create-team.dto.ts
    - apps/api/src/teams/dto/invite-member.dto.ts
    - apps/api/src/teams/dto/accept-invitation.dto.ts
  modified:
    - apps/api/src/email/email.service.ts
    - apps/api/src/teams/teams.service.spec.ts
    - apps/api/src/app.module.ts

key-decisions:
  - "Route literal before param: POST /teams/invitations/accept declared before POST /teams/:id/invitations — NestJS matches routes top-to-bottom, literal wins over :id"
  - "TeamManagerGuard injected into TeamsModule providers (not just imports) so it can be provided as a DI token alongside TeamsService"
  - "! suffix on DTO properties for strict TypeScript compliance — class-validator decorators initialize at runtime, not compile-time"
  - "eslint-disable for any cast on Supabase join result in getMyTeams — the inferred type for joined queries returns array of objects Supabase JS cannot statically represent"

patterns-established:
  - "Pattern 1: NestJS CanActivate guard for resource-scoped role enforcement — compose with AccessTokenGuard via @UseGuards(AccessTokenGuard, RoleGuard)"
  - "Pattern 2: JWT invitation token flow — sign with purpose claim, store hash, verify + purpose check + email match at accept time"
  - "Pattern 3: Re-invite before insert — mark prior pending rows as used before inserting new invitation to honor partial unique index"

requirements-completed: [TEAM-01, TEAM-02, TEAM-03]

# Metrics
duration: 4min
completed: 2026-03-06
---

# Phase 2 Plan 2: TeamsService Implementation Summary

**NestJS TeamsModule with full CRUD service, JWT invitation flow with SHA-256 token hash, TeamManagerGuard, and all 7 unit tests GREEN**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T10:26:12Z
- **Completed:** 2026-03-06T10:30:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Implemented all four TeamsService methods (createTeam, getMyTeams, inviteMember, acceptInvitation) with sequential DB inserts, JWT invitation tokens, SHA-256 hashing, and re-invite handling
- Replaced all 7 Wave 0 RED stubs with real test implementations — all 40 API tests pass (7 new team tests + 33 existing auth/user tests with zero regressions)
- Wired TeamsModule into AppModule with correct route ordering (literal `invitations/accept` before parameterized `:id/invitations`) and EmailModule/SupabaseModule/JwtModule imports

## Task Commits

Each task was committed atomically:

1. **Task 1: TeamsService, DTOs, guard, email method (RED to GREEN)** - `d197787` (feat)
2. **Task 2: TeamsController and wire TeamsModule into AppModule** - `380761f` (feat)

**Plan metadata:** (docs commit hash — see below)

## Files Created/Modified
- `apps/api/src/teams/teams.service.ts` - TeamsService: createTeam, getMyTeams, inviteMember, acceptInvitation
- `apps/api/src/teams/teams.controller.ts` - TeamsController with 4 routes, AccessTokenGuard, TeamManagerGuard
- `apps/api/src/teams/teams.module.ts` - TeamsModule imports JwtModule, SupabaseModule, EmailModule
- `apps/api/src/teams/guards/team-manager.guard.ts` - TeamManagerGuard queries team_members for manager role
- `apps/api/src/teams/dto/create-team.dto.ts` - CreateTeamDto with class-validator
- `apps/api/src/teams/dto/invite-member.dto.ts` - InviteMemberDto with class-validator
- `apps/api/src/teams/dto/accept-invitation.dto.ts` - AcceptInvitationDto with class-validator
- `apps/api/src/email/email.service.ts` - Added sendTeamInvitationEmail (dev log + Resend HTML template)
- `apps/api/src/teams/teams.service.spec.ts` - 7 real unit tests replacing Wave 0 RED stubs
- `apps/api/src/app.module.ts` - Added TeamsModule to imports array

## Decisions Made
- Route literal declared before parameterized in TeamsController: NestJS matches routes top-to-bottom, so `invitations/accept` must appear before `:id/invitations` to avoid the string "invitations" matching the team ID parameter.
- DTO properties use `!` (definite-assignment assertion): TypeScript strict mode requires definite assignment, but class-validator decorators initialize properties at runtime. The `!` assertion is the standard NestJS convention.
- `any` cast on Supabase join result in `getMyTeams`: The Supabase JS v2 client infers a complex array-of-objects type for joined selects that TypeScript cannot express without `any`; this is an accepted pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict mode DTO property errors**
- **Found during:** Task 2 (TypeScript compile verification)
- **Issue:** DTO class properties without `!` assertion failed `strictPropertyInitialization` check
- **Fix:** Added `!` suffix to all three DTO property declarations
- **Files modified:** `apps/api/src/teams/dto/create-team.dto.ts`, `invite-member.dto.ts`, `accept-invitation.dto.ts`
- **Verification:** `pnpm exec tsc --noEmit` exits cleanly
- **Committed in:** `380761f` (Task 2 commit)

**2. [Rule 1 - Bug] Supabase join type incompatibility in getMyTeams map callback**
- **Found during:** Task 2 (TypeScript compile verification)
- **Issue:** Supabase JS v2 infers joined select as `{ teams: { id: any; ... }[] }[]` (array of teams per member row), incompatible with the explicit `Record<string, unknown>` annotation in the map callback
- **Fix:** Changed annotation to `any` with eslint-disable comment to avoid masking the intent
- **Files modified:** `apps/api/src/teams/teams.service.ts`
- **Verification:** `pnpm exec tsc --noEmit` exits cleanly; 7 tests still pass
- **Committed in:** `380761f` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - TypeScript type correctness)
**Impact on plan:** Both fixes necessary for TypeScript clean build. No scope creep, no behavior changes.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The SQL migration `database/migrations/002_team_management.sql` must be applied to Supabase before running the teams API endpoints.

## Next Phase Readiness

- All three TEAM requirements (TEAM-01, TEAM-02, TEAM-03) implemented and tested
- Backend API complete: `/teams` CRUD, invitation send, invitation accept
- Ready for Plan 02-03: Teams frontend UI (team list, team detail, invite form, join page)
- No blockers

---
*Phase: 02-team-management*
*Completed: 2026-03-06*

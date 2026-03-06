---
phase: 02-team-management
plan: 01
subsystem: database
tags: [supabase, postgres, zod, vitest, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    provides: users table DDL, update_updated_at_column() trigger function, shared package structure, test/setup.ts mock pattern, Vitest test framework

provides:
  - database/migrations/002_team_management.sql (teams, team_members, team_invitations DDL + partial unique index + teams updated_at trigger)
  - packages/shared Team and TeamMember TypeScript interfaces
  - packages/shared createTeamSchema, inviteMemberSchema, acceptInvitationSchema Zod schemas
  - packages/shared CreateTeamInput, InviteMemberInput, AcceptInvitationInput inferred types
  - apps/api/test/setup.ts extended with in, not, is, order, limit mock query builder methods
  - apps/api/src/teams/teams.service.spec.ts Wave 0 RED stubs (7 failing tests covering TEAM-01, TEAM-02, TEAM-03)

affects: [02-02-teamsservice-implementation, 02-03-teams-frontend, 03-task-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SQL migration follows 001_initial_schema.sql conventions: UUID PKs, TIMESTAMPTZ, ON DELETE RESTRICT/CASCADE, reused trigger function"
    - "Partial unique index pattern: WHERE used_at IS NULL prevents duplicate pending invitations per team+email"
    - "Wave 0 TDD: spec file with deliberately failing stubs (expect(true).toBe(false)) before implementation exists"
    - "mockQueryBuilder chainable method extension: add vi.fn().mockReturnThis() for each new Supabase query method needed"

key-files:
  created:
    - database/migrations/002_team_management.sql
    - packages/shared/src/types/team.ts
    - packages/shared/src/schemas/team.schema.ts
    - apps/api/src/teams/teams.service.spec.ts
  modified:
    - packages/shared/src/index.ts
    - apps/api/test/setup.ts

key-decisions:
  - "Token hash stored as SHA-256 (not argon2) in team_invitations — invitations have inherent JWT entropy; no password-stretching needed"
  - "Invitations module kept inside TeamsModule (not separate module) to avoid circular injection"
  - "team_invitations uses partial unique index on (team_id, invitee_email) WHERE used_at IS NULL to allow re-invitations after accepting"
  - "Wave 0 spec imports TeamsService (does not exist yet) but Vitest resolves the import as undefined; all 7 tests fail at assertion level, not import level"

patterns-established:
  - "Pattern 1: SQL migration reuses update_updated_at_column() function from 001; no need to recreate trigger function per table"
  - "Pattern 2: Zod schema file exports both schema constants and z.infer<> types; index.ts re-exports both separately"

requirements-completed: [TEAM-01, TEAM-02, TEAM-03]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 2 Plan 1: Team Management Foundation Summary

**SQL schema for teams/team_members/team_invitations with partial unique index, shared Zod schemas and TypeScript interfaces, and 7 Wave 0 RED test stubs covering all three TEAM requirements**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T10:21:40Z
- **Completed:** 2026-03-06T10:23:46Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created `database/migrations/002_team_management.sql` with all three tables, a partial unique index preventing duplicate pending invitations, and an `updated_at` trigger for the teams table reusing the existing trigger function
- Created `packages/shared/src/types/team.ts` and `packages/shared/src/schemas/team.schema.ts`, exporting Team, TeamMember, and all three Zod schemas plus their inferred types from `packages/shared/src/index.ts`
- Extended `apps/api/test/setup.ts` MockQueryBuilder with `in`, `not`, `is`, `order`, `limit` chainable mock methods and created `apps/api/src/teams/teams.service.spec.ts` with 7 failing RED stubs covering TEAM-01, TEAM-02, TEAM-03

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and shared types/schemas** - `0ca2c0d` (feat)
2. **Task 2: Wave 0 — extend mock query builder and write failing TeamsService spec** - `af179cb` (test)

**Plan metadata:** (docs commit hash — see below)

## Files Created/Modified
- `database/migrations/002_team_management.sql` - DDL for teams, team_members, team_invitations with partial unique index and updated_at trigger
- `packages/shared/src/types/team.ts` - Team and TeamMember TypeScript interfaces
- `packages/shared/src/schemas/team.schema.ts` - createTeamSchema, inviteMemberSchema, acceptInvitationSchema with inferred types
- `packages/shared/src/index.ts` - Re-exports for all new types and schemas (modified)
- `apps/api/test/setup.ts` - Extended MockQueryBuilder interface and mockQueryBuilder object with 5 new chainable methods (modified)
- `apps/api/src/teams/teams.service.spec.ts` - 7 Wave 0 RED stubs covering createTeam, inviteMember, acceptInvitation behaviors

## Decisions Made
- SHA-256 used for token_hash in team_invitations (not argon2): JWT tokens have sufficient built-in entropy; password-stretching is unnecessary overhead for invitation tokens. Follows the pattern documented in RESEARCH.md.
- Invitations logic will live inside TeamsModule, not a separate module, to avoid circular injection while accessing the same DB tables.
- Partial unique index `WHERE used_at IS NULL` enables re-inviting the same email to the same team after an accepted invitation without violating the uniqueness constraint.
- Wave 0 spec successfully imports the non-existent TeamsService (Vitest resolves as undefined at runtime); all 7 tests fail at the assertion level rather than crashing with a module error, producing a clean RED state.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The SQL migration file must be applied to Supabase manually before running Plan 02-02's service implementation.

## Next Phase Readiness

- All foundational artifacts are in place for Plan 02-02 (TeamsService implementation and GREEN pass)
- The 7 failing stubs define the exact behaviors TeamsService must implement
- The extended mock query builder supports all Supabase JS chaining patterns the service will use
- No blockers

---
*Phase: 02-team-management*
*Completed: 2026-03-06*

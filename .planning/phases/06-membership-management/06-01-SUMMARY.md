---
phase: 06-membership-management
plan: 01
subsystem: api
tags: [nestjs, supabase, membership, soft-delete, guard]

# Dependency graph
requires:
  - phase: 04-team-management
    provides: teams CRUD, team_members table, TeamManagerGuard, invitation system
provides:
  - removeMember endpoint (DELETE /teams/:id/members/:userId)
  - leaveTeam endpoint (POST /teams/:id/leave)
  - transferOwnership endpoint (POST /teams/:id/transfer-ownership)
  - cancelInvitation endpoint (DELETE /teams/:id/invitations/:email)
  - deleteTeam endpoint (DELETE /teams/:id)
  - getPendingInvitations endpoint (GET /teams/:id/invitations)
  - departed member historical data in manager dashboard
  - TeamMember leftAt field (soft-delete pattern)
affects: [06-02, 06-03, 07-stress-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns: [soft-delete via left_at column, departed member inclusion for historical reports]

key-files:
  created:
    - apps/api/src/teams/dto/transfer-ownership.dto.ts
  modified:
    - packages/shared/src/types/team.ts
    - packages/shared/src/types/manager.ts
    - packages/shared/src/schemas/team.schema.ts
    - packages/shared/src/index.ts
    - apps/api/src/teams/teams.service.ts
    - apps/api/src/teams/teams.controller.ts
    - apps/api/src/teams/teams.service.spec.ts
    - apps/api/src/teams/guards/team-manager.guard.ts
    - apps/api/src/manager/manager.service.ts
    - apps/api/src/manager/manager.service.spec.ts

key-decisions:
  - "Soft-delete for member removal/leave using left_at timestamp on team_members"
  - "Hard-delete cascade for team deletion (tasks, reports, invitations, members, team)"
  - "Manager dashboard includes departed members who have reports for the requested date (MEMB-06)"

patterns-established:
  - "Soft-delete pattern: filter .is('left_at', null) on all active-member queries"
  - "Departed member historical inclusion: query reports first, then include departed users with matching data"

requirements-completed: [MEMB-01, MEMB-02, MEMB-03, MEMB-04, MEMB-05, MEMB-06]

# Metrics
duration: 5min
completed: 2026-03-08
---

# Phase 6 Plan 1: Membership Management Backend Summary

**5 membership lifecycle endpoints (remove, leave, transfer, cancel, delete) with soft-delete via left_at and departed member historical report inclusion**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-08T11:33:18Z
- **Completed:** 2026-03-08T11:37:54Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Full membership lifecycle API: remove member, leave team, transfer ownership, cancel invitation, delete team
- Soft-delete pattern using left_at timestamp preserves historical data for departed members
- Manager dashboard (getTeamReports) now includes departed members who have reports for the requested date
- TeamManagerGuard updated to reject departed members from owner-only actions
- 21 unit tests covering all new service methods plus existing functionality

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared types, schemas, and DTOs for membership management** - `7cc5b73` (feat)
2. **Task 2: Backend service methods, controller endpoints, and unit tests** - `6f97132` (feat)

## Files Created/Modified
- `packages/shared/src/types/team.ts` - Added leftAt field to TeamMember interface
- `packages/shared/src/types/manager.ts` - Added departed field to TeamMemberReport
- `packages/shared/src/schemas/team.schema.ts` - Added transferOwnershipSchema
- `packages/shared/src/index.ts` - Exported new schemas and types
- `apps/api/src/teams/dto/transfer-ownership.dto.ts` - DTO for transfer ownership endpoint
- `apps/api/src/teams/teams.service.ts` - 5 new methods + getPendingInvitations + left_at filters
- `apps/api/src/teams/teams.controller.ts` - 6 new endpoints
- `apps/api/src/teams/teams.service.spec.ts` - 21 unit tests (15 new)
- `apps/api/src/teams/guards/team-manager.guard.ts` - Added left_at filter to reject departed members
- `apps/api/src/manager/manager.service.ts` - Updated getTeamReports for departed members, filtered getPendingSubmissions
- `apps/api/src/manager/manager.service.spec.ts` - Updated mocks for new left_at filter chain

## Decisions Made
- Soft-delete via left_at for remove/leave preserves member history and enables MEMB-06
- Hard-delete cascade for team deletion cleans up all related data (tasks, reports, invitations, members)
- getPendingInvitations added (not in original plan) to support frontend listing for cancel invitation feature

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed manager service spec mocks for left_at filter chain**
- **Found during:** Task 2 (verification)
- **Issue:** Adding `.is('left_at', null)` to manager service queries broke existing manager spec mocks because the terminal call in the chain changed from `eq` to `is`
- **Fix:** Updated setupGetTeamReportsMocks and setupGetPendingMocks to resolve on `is` instead of `eq` for the members query builder, and reordered mock call sequence to match new code flow
- **Files modified:** apps/api/src/manager/manager.service.spec.ts
- **Verification:** All 79 tests pass
- **Committed in:** 6f97132 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix was necessary for test correctness after adding left_at filter. No scope creep.

## Issues Encountered
None beyond the mock fix described in deviations.

## User Setup Required
None - no external service configuration required. The left_at column must exist in the team_members table (database migration needed separately).

## Next Phase Readiness
- All backend endpoints ready for frontend consumption in 06-02
- Soft-delete pattern established for consistent use across the codebase
- Database migration for left_at column on team_members table is a prerequisite

## Self-Check: PASSED

All 12 key files verified present. Both task commits (7cc5b73, 6f97132) verified in git log.

---
*Phase: 06-membership-management*
*Completed: 2026-03-08*

---
phase: 04-manager-dashboard-and-export
plan: 01
subsystem: api
tags: [nestjs, supabase, csv-export, manager-dashboard, guards]

# Dependency graph
requires:
  - phase: 03-task-management-and-daily-reports
    provides: Tasks and DailyReport models, TasksService patterns
  - phase: 02-team-management
    provides: TeamManagerGuard, team_members table
provides:
  - ManagerService with getTeamReports, getPendingSubmissions, generateCsv
  - ManagerController with three guarded REST endpoints
  - Shared types TeamMemberReport, PendingMember, TeamReportsResponse
affects: [04-02-PLAN, 04-03-PLAN, frontend-manager-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-table mock query builders for complex multi-join tests, call-order-based from() mocking]

key-files:
  created:
    - apps/api/src/manager/manager.service.ts
    - apps/api/src/manager/manager.service.spec.ts
    - apps/api/src/manager/manager.controller.ts
    - apps/api/src/manager/manager.module.ts
    - packages/shared/src/types/manager.ts
  modified:
    - packages/shared/src/index.ts
    - apps/api/src/app.module.ts

key-decisions:
  - "Call-order-based mock pattern: sequential from() calls return different query builders via mockImplementation counter, avoiding table-name switching that breaks on re-entrant calls"
  - "CSV escaping as private method on ManagerService rather than shared utility -- scope limited to export feature"

patterns-established:
  - "Multi-table query testing: create separate mock query builder per from() call with call-index tracking"
  - "CSV export via @Res passthrough:false with explicit error handling since NestJS exception filters are bypassed"

requirements-completed: [MGMT-01, MGMT-02, MGMT-03]

# Metrics
duration: 4min
completed: 2026-03-06
---

# Phase 4 Plan 1: Manager Dashboard Backend Summary

**ManagerModule with team report aggregation, pending submission tracking, and CSV export behind TeamManagerGuard**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T14:55:37Z
- **Completed:** 2026-03-06T14:59:42Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- ManagerService with three methods: getTeamReports (aggregates member reports+tasks), getPendingSubmissions (finds members without submitted reports), generateCsv (flattened CSV with proper field escaping)
- Three REST endpoints at /teams/:id/reports, /teams/:id/reports/pending, /teams/:id/reports/export all behind AccessTokenGuard + TeamManagerGuard
- Shared types (TeamMemberReport, PendingMember, TeamReportsResponse) exported from @daily-report/shared for frontend consumption
- 6 unit tests with per-table mock query builders covering all service methods

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared types + test stubs + ManagerService implementation** - `9a7cf9b` (feat - TDD red/green)
2. **Task 2: ManagerController + ManagerModule + register in AppModule** - `1e3ec2a` (feat)

## Files Created/Modified
- `packages/shared/src/types/manager.ts` - TeamMemberReport, PendingMember, TeamReportsResponse interfaces
- `packages/shared/src/index.ts` - Re-exports manager types
- `apps/api/src/manager/manager.service.ts` - Manager query logic (getTeamReports, getPendingSubmissions, generateCsv)
- `apps/api/src/manager/manager.service.spec.ts` - 6 unit tests for all manager service methods
- `apps/api/src/manager/manager.controller.ts` - REST endpoints under /teams/:id/reports with date validation
- `apps/api/src/manager/manager.module.ts` - Module importing SupabaseModule, providing service and guard
- `apps/api/src/app.module.ts` - Added ManagerModule to imports

## Decisions Made
- Call-order-based mock pattern: sequential from() calls return different query builders via a call-index counter, cleaner than table-name switching for complex multi-table queries
- CSV escaping kept as private method on ManagerService rather than shared utility -- scope is limited to the export feature
- @Res(passthrough: false) for CSV export endpoint with explicit try/catch since NestJS exception filters are bypassed when using raw Response

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in test file**
- **Found during:** Task 2 (verification)
- **Issue:** `_resolve` helper function in mock query builder was typed as regular function but assigned to Mock-typed field, causing TS2322
- **Fix:** Removed unused `_resolve` helper from createMockQueryBuilder
- **Files modified:** apps/api/src/manager/manager.service.spec.ts
- **Verification:** `tsc --noEmit` passes cleanly
- **Committed in:** 1e3ec2a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type fix in test helper. No scope creep.

## Issues Encountered
- Mock chaining for multi-eq queries required careful ordering: `mockReturnValueOnce(self)` for intermediate `.eq()` calls, `mockResolvedValueOnce(data)` only for the terminal call. Resolved by creating setup helper functions that correctly sequence mock returns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three manager API endpoints ready for frontend consumption
- Shared types available for the dashboard UI (Plan 02) and any additional frontend work
- CSV export endpoint ready for direct browser download

---
*Phase: 04-manager-dashboard-and-export*
*Completed: 2026-03-06*

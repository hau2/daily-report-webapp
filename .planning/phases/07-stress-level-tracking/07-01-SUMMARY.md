---
phase: 07-stress-level-tracking
plan: 01
subsystem: api, database
tags: [stress-level, nestjs, zod, supabase, postgres]

requires:
  - phase: 03-task-management
    provides: daily_reports table and tasks service
provides:
  - stress_level column on daily_reports table
  - StressLevel type and submitReportSchema in shared package
  - Submit endpoint accepts optional stressLevel body
  - Manager team reports include stressLevel per member
affects: [07-02-frontend, 08-dashboard-enhancements]

tech-stack:
  added: []
  patterns: [convenience field on aggregated response types]

key-files:
  created:
    - database/migrations/006_stress_level.sql
    - apps/api/src/tasks/dto/submit-report.dto.ts
  modified:
    - packages/shared/src/types/task.ts
    - packages/shared/src/types/manager.ts
    - packages/shared/src/schemas/task.schema.ts
    - packages/shared/src/index.ts
    - apps/api/src/tasks/tasks.service.ts
    - apps/api/src/tasks/tasks.controller.ts
    - apps/api/src/manager/manager.service.ts

key-decisions:
  - "StressLevel convenience field added directly on TeamMemberReport to simplify frontend consumption"
  - "stress_level column nullable by default for backward compatibility with existing reports"

patterns-established:
  - "DTO + Body decorator pattern for submit endpoint parameters"

requirements-completed: [STRESS-01, STRESS-02]

duration: 2min
completed: 2026-03-08
---

# Phase 7 Plan 1: Stress Level Backend and Schema Summary

**Stress level column on daily_reports with StressLevel shared type, Zod submit schema, and backend API integration for submit and manager endpoints**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-08T16:25:27Z
- **Completed:** 2026-03-08T16:26:53Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Database migration adding nullable stress_level column to daily_reports
- StressLevel type, submitReportSchema, and SubmitReportInput exported from shared package
- Submit report endpoint accepts optional stressLevel in request body
- Manager team reports endpoint returns stressLevel per member

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration and shared types/schemas for stress level** - `34666cd` (feat)
2. **Task 2: Backend API updates for stress level on submit and manager view** - `b3c1916` (feat)

## Files Created/Modified
- `database/migrations/006_stress_level.sql` - Adds stress_level column to daily_reports
- `apps/api/src/tasks/dto/submit-report.dto.ts` - DTO for submit report with optional stressLevel
- `packages/shared/src/types/task.ts` - StressLevel type, stressLevel on DailyReport
- `packages/shared/src/types/manager.ts` - stressLevel convenience field on TeamMemberReport
- `packages/shared/src/schemas/task.schema.ts` - submitReportSchema with optional stressLevel enum
- `packages/shared/src/index.ts` - Exports StressLevel, submitReportSchema, SubmitReportInput
- `apps/api/src/tasks/tasks.service.ts` - submitReport accepts stressLevel, mapReport includes it
- `apps/api/src/tasks/tasks.controller.ts` - Submit endpoint accepts SubmitReportDto body
- `apps/api/src/manager/manager.service.ts` - mapReport and getTeamReports include stressLevel

## Decisions Made
- StressLevel convenience field added directly on TeamMemberReport so frontend does not need to access `report.stressLevel`
- stress_level column is nullable for backward compatibility with existing reports (null means not set)
- Migration must be run manually via Supabase SQL editor (no automated migration runner detected)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
Migration `database/migrations/006_stress_level.sql` must be run against the Supabase database before using stress level features.

## Next Phase Readiness
- Backend API fully supports stress level on submit and manager view
- Shared types and schemas ready for frontend consumption in plan 07-02
- Migration file ready to apply

---
*Phase: 07-stress-level-tracking*
*Completed: 2026-03-08*

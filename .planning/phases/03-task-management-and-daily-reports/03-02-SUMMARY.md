---
phase: 03-task-management-and-daily-reports
plan: 02
subsystem: api
tags: [nestjs, supabase, crud, daily-reports, tasks]

# Dependency graph
requires:
  - phase: 03-task-management-and-daily-reports
    plan: 01
    provides: daily_reports/tasks DB tables, Task/DailyReport types, Zod schemas, RED test stubs
  - phase: 02-team-management
    provides: teams/team_members tables, SupabaseModule, AccessTokenGuard
provides:
  - TasksService with full CRUD + report submission + status guards
  - TasksController with 5 REST endpoints (POST /tasks, PATCH /tasks/:id, DELETE /tasks/:id, GET /reports/daily, POST /reports/:id/submit)
  - TasksModule wired into AppModule
  - CreateTaskDto and UpdateTaskDto with class-validator decorators
affects: [03-03-PLAN, 03-04-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Upsert with onConflict for getOrCreateReport to handle race conditions"
    - "Combined assertReportOwner returns status to avoid extra assertReportEditable query"
    - "Private mapReport/mapTask helpers for snake_case DB -> camelCase TS mapping"

key-files:
  created:
    - apps/api/src/tasks/tasks.service.ts
    - apps/api/src/tasks/tasks.controller.ts
    - apps/api/src/tasks/tasks.module.ts
    - apps/api/src/tasks/dto/create-task.dto.ts
    - apps/api/src/tasks/dto/update-task.dto.ts
  modified:
    - apps/api/src/tasks/tasks.service.spec.ts
    - apps/api/src/app.module.ts

key-decisions:
  - "Single controller (no prefix) handles both /tasks and /reports routes for v1 simplicity"
  - "assertReportOwner returns { status } to combine ownership + editability check in one DB call"
  - "Inline regex validation for query params (date, teamId) instead of separate DTO classes"
  - "UpdateTaskDto sourceLink uses @ValidateIf to allow empty string (clear) or valid URL"

patterns-established:
  - "Task CRUD pattern: fetch task -> get report_id -> assertReportOwner -> check status -> mutate"
  - "Report lifecycle: draft -> submitted (one-way, enforced by status guard)"

requirements-completed: [TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, TASK-06]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 03 Plan 02: Task CRUD and Daily Report API Summary

**NestJS TasksService with create/update/delete/get/submit endpoints, report status guards, and 12 GREEN unit tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T14:15:53Z
- **Completed:** 2026-03-06T14:19:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Implemented TasksService with getOrCreateReport (upsert), createTask, updateTask, deleteTask, getDailyReport, submitReport
- Created CreateTaskDto and UpdateTaskDto with class-validator decorators matching Zod schemas
- Built TasksController with 5 REST endpoints all protected by AccessTokenGuard
- All 12 RED test stubs turned GREEN; full suite passes at 52 tests with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: TasksService, DTOs, and GREEN tests** - `6b279be` (feat)
2. **Task 2: TasksController, TasksModule, and wire into AppModule** - `4d7fd2a` (feat)

## Files Created/Modified
- `apps/api/src/tasks/tasks.service.ts` - TasksService with CRUD + submit + report status guards
- `apps/api/src/tasks/tasks.controller.ts` - REST controller with 5 endpoints
- `apps/api/src/tasks/tasks.module.ts` - NestJS module importing SupabaseModule
- `apps/api/src/tasks/dto/create-task.dto.ts` - Create task validation DTO
- `apps/api/src/tasks/dto/update-task.dto.ts` - Update task validation DTO
- `apps/api/src/tasks/tasks.service.spec.ts` - 12 GREEN tests replacing RED stubs
- `apps/api/src/app.module.ts` - Added TasksModule import

## Decisions Made
- Single controller with no prefix handles both /tasks and /reports routes -- simplicity for v1 given tight coupling between tasks and reports
- assertReportOwner returns { status } to combine ownership + editability check, avoiding a second DB query
- Inline regex validation for date/teamId query params rather than creating separate DTO classes
- UpdateTaskDto uses @ValidateIf for sourceLink to allow empty string (clear link) or valid URL

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- submitReport test mock needed careful eq() call tracking to intercept the task count query (non-single array result) -- resolved by counting eq() invocations and returning thenable at correct position

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend API complete for task management and daily report workflow
- Plan 03 (frontend) can consume all 5 endpoints: POST /tasks, PATCH /tasks/:id, DELETE /tasks/:id, GET /reports/daily, POST /reports/:id/submit
- Report lifecycle enforced: draft -> submitted with status guard on all mutations

---
*Phase: 03-task-management-and-daily-reports*
*Completed: 2026-03-06*

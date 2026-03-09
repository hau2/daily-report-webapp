---
phase: 10-export-analytics
plan: 02
subsystem: ui
tags: [chart-card, export-toolbar, png, pdf, csv, recharts, analytics]

requires:
  - phase: 10-export-analytics
    provides: ChartCard, ExportToolbar components and export utility functions
provides:
  - Fully functional PNG download on all 8 analytics chart cards
  - PDF export of all visible charts from active tab
  - CSV export of raw analytics data for team and member tabs
affects: []

tech-stack:
  added: []
  patterns: [chartRefsCollector prop for DOM element collection, onDataReady callback for data surfacing]

key-files:
  created: []
  modified:
    - apps/web/src/components/analytics/team-overview.tsx
    - apps/web/src/components/analytics/member-analytics.tsx
    - apps/web/src/app/(dashboard)/manager/[teamId]/analytics/page.tsx

key-decisions:
  - "Wrapper div with ref pattern for chart element collection (parent collects via useEffect)"
  - "onDataReady callback surfaces fetched data to parent for CSV export without re-fetching"

patterns-established:
  - "chartRefsCollector prop: parent passes MutableRefObject, child populates via useEffect"
  - "onDataReady callback: child notifies parent when data is fetched, avoiding prop drilling"

requirements-completed: [EXPORT-01, EXPORT-02, EXPORT-03]

duration: 2min
completed: 2026-03-09
---

# Phase 10 Plan 02: Export Integration Summary

**Wired ChartCard PNG buttons onto all 8 analytics charts and added ExportToolbar with PDF/CSV export to analytics page header**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T07:03:14Z
- **Completed:** 2026-03-09T07:05:14Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- All 8 chart cards (4 team + 4 member) wrapped with ChartCard for individual PNG download
- ExportToolbar added to analytics page header with PDF and CSV buttons
- CSV export generates correct data for both team overview and individual member tabs

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace Card with ChartCard in team-overview and member-analytics** - `e611810` (feat)
2. **Task 2: Add ExportToolbar to analytics page with PDF and CSV export** - `0bccdcf` (feat)

## Files Created/Modified
- `apps/web/src/components/analytics/team-overview.tsx` - Replaced 4 chart Cards with ChartCard, added chartRefsCollector and onDataReady props
- `apps/web/src/components/analytics/member-analytics.tsx` - Replaced 4 chart Cards with ChartCard, added chartRefsCollector and onDataReady props
- `apps/web/src/app/(dashboard)/manager/[teamId]/analytics/page.tsx` - Added ExportToolbar, ref collectors, data state, CSV/PDF export handlers

## Decisions Made
- Used wrapper div with ref pattern for chart element collection (parent collects DOM elements via useEffect)
- onDataReady callback surfaces fetched analytics data to parent for CSV export without duplicating fetch logic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 (Export Analytics) is fully complete
- All EXPORT requirements (01, 02, 03) satisfied
- Ready for next phase

---
*Phase: 10-export-analytics*
*Completed: 2026-03-09*

---
phase: 10-export-analytics
plan: 01
subsystem: ui
tags: [html-to-image, jspdf, csv, png, pdf, export, recharts]

requires:
  - phase: 08-analytics-dashboard
    provides: analytics types and dashboard pages
provides:
  - PNG export utility (exportPng)
  - PDF export utility (exportAnalyticsPdf)
  - CSV builder functions (teamAnalyticsToCsv, memberAnalyticsToCsv, downloadCsv)
  - ChartCard component with PNG download button
  - ExportToolbar component with PDF and CSV buttons
affects: [10-02-integration]

tech-stack:
  added: [html-to-image, jspdf, vitest (web)]
  patterns: [multi-section CSV builder, html-to-image capture, jsPDF landscape report]

key-files:
  created:
    - apps/web/src/lib/export-png.ts
    - apps/web/src/lib/export-pdf.ts
    - apps/web/src/lib/export-csv.ts
    - apps/web/src/lib/__tests__/export-csv.test.ts
    - apps/web/src/components/analytics/chart-card.tsx
    - apps/web/src/components/analytics/export-toolbar.tsx
    - apps/web/vitest.config.ts
  modified:
    - apps/web/package.json

key-decisions:
  - "Added vitest as devDependency for web app to support CSV unit tests"
  - "pixelRatio 2 for PNG (high quality), 1.5 for PDF (smaller file size per research)"

patterns-established:
  - "Export utilities as standalone lib functions imported by components"
  - "ChartCard wraps any chart with PNG export capability via ref"
  - "ExportToolbar uses getChartElements callback so parent controls DOM collection"

requirements-completed: [EXPORT-01, EXPORT-02, EXPORT-03]

duration: 2min
completed: 2026-03-09
---

# Phase 10 Plan 01: Export Utilities Summary

**PNG/PDF/CSV export utilities with html-to-image and jsPDF, plus ChartCard and ExportToolbar components**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T06:58:54Z
- **Completed:** 2026-03-09T07:01:07Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Three export utility functions (PNG, PDF, CSV) with correct TypeScript types
- 11 passing unit tests for CSV builder functions
- ChartCard component with PNG download button and loading state
- ExportToolbar component with PDF and CSV export buttons

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create export utility functions** - `5b732d3` (feat)
2. **Task 2: Create ChartCard and ExportToolbar components** - `72d7031` (feat)

## Files Created/Modified
- `apps/web/src/lib/export-png.ts` - PNG export using html-to-image toPng with 2x pixelRatio
- `apps/web/src/lib/export-pdf.ts` - PDF generation using jsPDF landscape A4 with title page
- `apps/web/src/lib/export-csv.ts` - Multi-section CSV builders for team and member analytics
- `apps/web/src/lib/__tests__/export-csv.test.ts` - 11 unit tests for CSV functions
- `apps/web/src/components/analytics/chart-card.tsx` - Card wrapper with PNG download button
- `apps/web/src/components/analytics/export-toolbar.tsx` - PDF and CSV export buttons bar
- `apps/web/vitest.config.ts` - Vitest config with path alias for web app
- `apps/web/package.json` - Added html-to-image, jspdf, vitest dependencies

## Decisions Made
- Added vitest as devDependency for web app to support CSV unit tests (previously only api had vitest)
- Used pixelRatio 2 for PNG exports (high quality) and 1.5 for PDF (smaller file size, per research findings)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added vitest configuration for web app**
- **Found during:** Task 1
- **Issue:** Web app had no vitest setup; tests could not run without vitest.config.ts
- **Fix:** Installed vitest as devDependency and created vitest.config.ts with path alias
- **Files modified:** apps/web/package.json, apps/web/vitest.config.ts
- **Verification:** `pnpm vitest run` runs successfully with 11 passing tests
- **Committed in:** 5b732d3

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Vitest setup was required to run the CSV tests. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All export utilities and components ready for Plan 02 to wire into existing analytics dashboard
- ChartCard can wrap any existing chart component
- ExportToolbar can be placed in dashboard header

---
*Phase: 10-export-analytics*
*Completed: 2026-03-09*

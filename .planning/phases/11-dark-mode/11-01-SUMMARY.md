---
phase: 11-dark-mode
plan: 01
subsystem: ui
tags: [next-themes, dark-mode, tailwindcss, theming, css-variables]

# Dependency graph
requires:
  - phase: 08-dashboard-analytics
    provides: Analytics components with Recharts charts
  - phase: 10-export-analytics
    provides: ChartCard and ExportToolbar components
provides:
  - ThemeProvider wrapper for next-themes with class-based dark mode
  - ThemeToggle component cycling light/dark/system
  - Full dark mode support across all pages and analytics charts
affects: []

# Tech tracking
tech-stack:
  added: [next-themes (already installed, now wired)]
  patterns: [class-based dark mode via next-themes, semantic color tokens, CSS variable chart colors]

key-files:
  created:
    - apps/web/src/providers/theme-provider.tsx
    - apps/web/src/components/theme-toggle.tsx
  modified:
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/(dashboard)/layout.tsx
    - apps/web/src/app/(auth)/layout.tsx
    - apps/web/src/app/(dashboard)/reports/[date]/page.tsx
    - apps/web/src/app/(dashboard)/manager/[teamId]/page.tsx
    - apps/web/src/app/(dashboard)/settings/page.tsx
    - apps/web/src/app/(dashboard)/dashboard/page.tsx
    - apps/web/src/app/(dashboard)/manager/page.tsx
    - apps/web/src/components/analytics/team-overview.tsx
    - apps/web/src/components/analytics/member-analytics.tsx
    - apps/web/src/components/analytics/summary-card.tsx

key-decisions:
  - "ThemeProvider wraps QueryProvider (outermost) for consistent theme on all child components"
  - "Semantic stress/status colors kept with dark: variants rather than replaced with CSS variables (carry meaning)"
  - "Chart colors use CSS variables (--chart-1 through --chart-5) for automatic dark mode adaptation"
  - "Tooltip backgrounds use bg-popover for dark mode support"

patterns-established:
  - "Dark mode: use bg-background/bg-muted instead of bg-white/bg-gray-50"
  - "Dark mode: use text-foreground/text-muted-foreground instead of text-gray-*"
  - "Dark mode: status badges use dark: variant pattern (e.g., dark:bg-green-900/30 dark:text-green-400)"
  - "Charts: use var(--chart-N) CSS variables instead of hex colors"

requirements-completed: [THEME-01, THEME-02, THEME-03]

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 11 Plan 01: Dark Mode Summary

**Full dark mode with theme toggle cycling light/dark/system, localStorage persistence, and semantic color tokens across all pages and charts**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T07:44:45Z
- **Completed:** 2026-03-09T07:49:02Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- ThemeProvider wired with next-themes using class strategy, OS preference detection, and localStorage persistence
- ThemeToggle component in both desktop and mobile navigation with Sun/Moon/Monitor icons
- All hardcoded bg-white, bg-gray-50, text-gray-* classes replaced with semantic tokens
- Chart hex colors replaced with CSS variables for automatic dark mode adaptation
- Status badges (stress, submission, pending) have proper dark: variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire ThemeProvider and create theme toggle component** - `d248be3` (feat)
2. **Task 2: Replace all hardcoded colors with semantic dark-compatible tokens** - `950651a` (feat)

## Files Created/Modified
- `apps/web/src/providers/theme-provider.tsx` - ThemeProvider wrapper for next-themes
- `apps/web/src/components/theme-toggle.tsx` - Theme toggle with light/dark/system cycling
- `apps/web/src/app/layout.tsx` - Added ThemeProvider and suppressHydrationWarning
- `apps/web/src/app/(dashboard)/layout.tsx` - ThemeToggle in nav, semantic colors
- `apps/web/src/app/(auth)/layout.tsx` - bg-muted instead of bg-gray-50
- `apps/web/src/app/(dashboard)/reports/[date]/page.tsx` - Dark variants for status badges
- `apps/web/src/app/(dashboard)/manager/[teamId]/page.tsx` - Dark variants for pending/status panels
- `apps/web/src/app/(dashboard)/settings/page.tsx` - Semantic text colors
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` - Semantic text colors
- `apps/web/src/app/(dashboard)/manager/page.tsx` - hover:bg-muted instead of hover:bg-gray-50
- `apps/web/src/components/analytics/team-overview.tsx` - CSS variable chart colors, dark heatmap cells
- `apps/web/src/components/analytics/member-analytics.tsx` - CSS variable chart colors, dark badges
- `apps/web/src/components/analytics/summary-card.tsx` - Dark trend colors

## Decisions Made
- ThemeProvider wraps QueryProvider as outermost wrapper for consistent theme access
- Semantic stress/status colors kept with dark: variants (green/yellow/red carry meaning)
- Chart hex colors replaced with CSS variables for automatic dark mode support
- Tooltip backgrounds use bg-popover for proper dark mode rendering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dark mode is fully functional across all pages
- No further phases planned (this is the final phase)

---
*Phase: 11-dark-mode*
*Completed: 2026-03-09*

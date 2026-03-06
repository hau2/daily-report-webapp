---
phase: 05-chrome-extension
plan: 02
subsystem: extension
tags: [chrome-extension, mv3, vite, context-menu, popup, bearer-auth]

# Dependency graph
requires:
  - phase: 05-chrome-extension
    provides: Bearer token auth endpoints (extension-login, extension-refresh)
provides:
  - Chrome extension workspace with MV3 manifest and Vite build
  - Background service worker with context menu registration
  - Popup UI with login and quick-add task forms
  - API client with Bearer auth and transparent 401 token refresh
  - Token storage via chrome.storage.local
affects: [05-chrome-extension]

# Tech tracking
tech-stack:
  added: [vite, "@types/chrome"]
  patterns: [plain Vite with custom plugin for manifest/icon copy, relative base for extension compatibility]

key-files:
  created:
    - apps/extension/package.json
    - apps/extension/tsconfig.json
    - apps/extension/vite.config.ts
    - apps/extension/manifest.json
    - apps/extension/src/background.ts
    - apps/extension/src/popup/popup.html
    - apps/extension/src/popup/popup.ts
    - apps/extension/src/popup/popup.css
    - apps/extension/src/lib/auth.ts
    - apps/extension/src/lib/api.ts
    - apps/extension/src/icons/icon-16.png
    - apps/extension/src/icons/icon-48.png
    - apps/extension/src/icons/icon-128.png
  modified: []

key-decisions:
  - "Plain Vite with custom plugin instead of @crxjs/vite-plugin (beta) -- simpler and more reliable for MV3 extension"
  - "Relative base path (./) in Vite config -- Chrome extensions load files relative to extension root, not absolute paths"
  - "Vite root set to src/ so popup HTML outputs to dist/popup/popup.html matching manifest paths"
  - "Auto-select first team for single-team users, dropdown for multi-team -- matches web app Phase 3 behavior"

patterns-established:
  - "Extension auth via chrome.storage.local with Bearer tokens (not cookies)"
  - "Context menu stores pendingTask in chrome.storage.local, popup reads and clears it on open"
  - "Plain Vite build with closeBundle plugin for copying manifest and static assets"

requirements-completed: [EXT-01, EXT-02, EXT-03, EXT-04, EXT-05]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 5 Plan 2: Chrome Extension UI Summary

**MV3 Chrome extension with context menu task capture, login popup, and quick-add form using Bearer auth**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T16:20:50Z
- **Completed:** 2026-03-06T16:24:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created apps/extension as a pnpm workspace package with Vite build tooling
- Built MV3 manifest with contextMenus, storage, and activeTab permissions
- Implemented token storage (auth.ts) and Bearer auth fetch wrapper with 401 refresh (api.ts)
- Background service worker registers "Add to Daily Report" context menu on text selection
- Popup UI has login view and quick-add task form with client-side validation
- Extension builds to dist/ and can be loaded unpacked in Chrome

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold extension workspace with build tooling and auth/API libraries** - `df85510` (feat)
2. **Task 2: Build background service worker and popup UI** - `2571942` (feat)

## Files Created/Modified
- `apps/extension/package.json` - Workspace package with Vite build scripts
- `apps/extension/tsconfig.json` - TypeScript config with chrome types
- `apps/extension/vite.config.ts` - Vite config with manifest/icon copy plugin, relative base
- `apps/extension/manifest.json` - MV3 manifest with contextMenus, storage, activeTab permissions
- `apps/extension/src/lib/auth.ts` - Token storage utilities via chrome.storage.local
- `apps/extension/src/lib/api.ts` - Fetch wrapper with Bearer auth and 401 token refresh
- `apps/extension/src/background.ts` - Service worker with context menu registration and pendingTask storage
- `apps/extension/src/popup/popup.html` - Login and quick-add form views
- `apps/extension/src/popup/popup.ts` - Login flow, quick-add flow, logout, session expiry handling
- `apps/extension/src/popup/popup.css` - Clean minimal styling for popup (360px width)
- `apps/extension/src/icons/icon-{16,48,128}.png` - Placeholder blue square icons

## Decisions Made
- Used plain Vite with custom closeBundle plugin instead of @crxjs/vite-plugin (beta) -- simpler, more reliable, and the extension is small enough not to need CRXJS HMR
- Set Vite base to './' for relative asset paths -- Chrome extensions cannot use absolute paths
- Set Vite root to src/ directory so HTML files output to correct paths matching manifest
- Auto-select first team for single-team users, show dropdown for multi-team -- consistent with web app behavior

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Vite output paths for Chrome extension compatibility**
- **Found during:** Task 2 (Build verification)
- **Issue:** Vite default absolute paths (/popup/popup.js) don't work in Chrome extensions; HTML was output to wrong directory nesting
- **Fix:** Set `base: './'` for relative paths and `root` to src/ for correct HTML output structure
- **Files modified:** apps/extension/vite.config.ts
- **Verification:** Build produces correct relative paths in dist/popup/popup.html
- **Committed in:** 2571942 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for extension to load correctly in Chrome. No scope creep.

## Issues Encountered
None beyond the auto-fixed Vite path issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Extension can be loaded unpacked in Chrome via chrome://extensions
- All auth and task creation flows are wired up to the backend API endpoints from Plan 01
- Plan 03 (verification) can test the full extension flow end-to-end

---
*Phase: 05-chrome-extension*
*Completed: 2026-03-06*

## Self-Check: PASSED

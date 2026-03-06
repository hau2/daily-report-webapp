---
phase: 05-chrome-extension
plan: 01
subsystem: auth
tags: [jwt, bearer-token, cors, chrome-extension, passport-jwt]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    provides: Cookie-based JWT auth with access/refresh token pair
provides:
  - Bearer token authentication via Authorization header
  - POST /auth/extension-login returning tokens in response body
  - POST /auth/extension-refresh for token rotation without cookies
  - CORS support for chrome-extension:// origins
affects: [05-chrome-extension]

# Tech tracking
tech-stack:
  added: []
  patterns: [dual JWT extraction (cookie + Bearer), generateTokens refactor for reuse]

key-files:
  created:
    - apps/api/src/auth/dto/extension-refresh.dto.ts
  modified:
    - apps/api/src/auth/auth.service.ts
    - apps/api/src/auth/auth.service.spec.ts
    - apps/api/src/auth/auth.controller.ts
    - apps/api/src/auth/strategies/access-token.strategy.ts
    - apps/api/src/main.ts

key-decisions:
  - "Extracted generateTokens() private method from generateTokensAndSetCookies for reuse by extension endpoints"
  - "Cookie extractor first, Bearer header second in AccessTokenStrategy -- web app priority, extension fallback"
  - "RefreshTokenStrategy left unchanged -- extension uses dedicated /auth/extension-refresh endpoint with body-based token"
  - "CORS allows any chrome-extension:// origin (extension ID changes between dev loads)"

patterns-established:
  - "Dual JWT extraction pattern: cookie-first with Bearer fallback for cross-platform auth"
  - "Extension endpoints return tokens in body instead of setting cookies"

requirements-completed: [EXT-01, EXT-05]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 5 Plan 1: Bearer Token Auth for Chrome Extension Summary

**Dual JWT extraction (cookie + Bearer) with extension-login and extension-refresh endpoints returning tokens in response body**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T16:16:45Z
- **Completed:** 2026-03-06T16:18:41Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added extensionLogin and extensionRefresh methods to AuthService with full test coverage (7 new tests)
- Refactored generateTokens as reusable private method, called by both cookie-based and extension-based auth flows
- AccessTokenStrategy now extracts JWT from cookie OR Authorization Bearer header
- Added POST /auth/extension-login and POST /auth/extension-refresh controller endpoints
- Updated CORS to allow chrome-extension:// origins alongside the frontend URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Add extension auth methods to AuthService with tests** - `4e7a0f0` (feat, TDD)
2. **Task 2: Add dual JWT extraction, extension endpoints, update CORS** - `9ae567e` (feat)

## Files Created/Modified
- `apps/api/src/auth/dto/extension-refresh.dto.ts` - DTO for extension refresh endpoint (refreshToken field)
- `apps/api/src/auth/auth.service.ts` - extensionLogin, extensionRefresh methods + generateTokens refactor
- `apps/api/src/auth/auth.service.spec.ts` - 7 new tests for extension auth flows
- `apps/api/src/auth/auth.controller.ts` - POST /auth/extension-login and POST /auth/extension-refresh endpoints
- `apps/api/src/auth/strategies/access-token.strategy.ts` - Dual extractor (cookie + Bearer header)
- `apps/api/src/main.ts` - CORS updated to allow chrome-extension:// origins

## Decisions Made
- Extracted generateTokens() from generateTokensAndSetCookies to avoid code duplication between cookie-based and extension-based auth
- Cookie extractor listed first in AccessTokenStrategy so web app requests take priority over Bearer header
- RefreshTokenStrategy left unchanged -- extension uses dedicated endpoint that manually verifies the token from request body
- CORS allows any chrome-extension:// origin since the extension ID changes between dev installs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend Bearer token auth ready for Chrome extension to consume
- Extension can now authenticate via POST /auth/extension-login and refresh via POST /auth/extension-refresh
- GET /auth/me works with Authorization: Bearer header for extension-based auth checks

---
*Phase: 05-chrome-extension*
*Completed: 2026-03-06*

## Self-Check: PASSED

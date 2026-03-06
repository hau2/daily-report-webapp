---
phase: 02-team-management
plan: 03
subsystem: ui
tags: [react, next.js, tanstack-query, react-hook-form, zod, jwt, invitation, teams]

# Dependency graph
requires:
  - phase: 02-team-management-02
    provides: "Team API endpoints: POST /teams, GET /teams/my, POST /teams/:id/invitations, POST /teams/invitations/accept"
  - phase: 01-foundation-and-auth
    provides: "useAuth hook, api-client, shared Zod schemas, UI component library, Next.js App Router patterns"
provides:
  - "Login page with ?next= redirect support (preserves invitation token through auth flow)"
  - "/join page: invitation accept flow for authenticated and unauthenticated users"
  - "/teams list page with role badges and create team link"
  - "/teams/new create team form"
  - "/teams/[id] team detail with manager-only invite form"
  - "Dashboard page with team context: create prompt or team links"
  - "Badge UI component (shadcn/ui pattern with cva)"
affects: [03-daily-reports, 04-review-workflow, 05-chrome-extension]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Local useMutation in login page overrides useAuth().login to support ?next= redirect without modifying shared hook"
    - "JWT payload decoded client-side (atob) to display inviteeEmail — verification deferred to backend"
    - "Team detail page fetches /teams/my and filters by id — avoids need for /teams/:id endpoint not built in Plan 02"

key-files:
  created:
    - apps/web/src/app/(auth)/join/page.tsx
    - apps/web/src/app/(dashboard)/teams/page.tsx
    - apps/web/src/app/(dashboard)/teams/new/page.tsx
    - "apps/web/src/app/(dashboard)/teams/[id]/page.tsx"
    - apps/web/src/components/ui/badge.tsx
  modified:
    - apps/web/src/app/(auth)/login/page.tsx
    - apps/web/src/app/(dashboard)/dashboard/page.tsx

key-decisions:
  - "Login page uses local useMutation instead of useAuth().login — enables ?next= redirect without modifying shared hook used by other pages"
  - "JWT payload decoded client-side with atob() to extract inviteeEmail for display; backend validates token on accept"
  - "Team detail page reuses GET /teams/my data (filter by id) rather than requiring a new GET /teams/:id endpoint"
  - "Badge component created inline (not via CLI) matching existing shadcn/ui cva pattern — was missing from component library"

patterns-established:
  - "Page-level mutation for ?next= redirect: when redirect target varies by page context, use local useMutation rather than shared hook"
  - "Client-side JWT decode pattern: split('.')[1] + atob() for display only, backend authoritative for validation"

requirements-completed: [TEAM-01, TEAM-02, TEAM-03]

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 02 Plan 03: Team Management Frontend Summary

**Next.js team management UI: create-team form, team detail with manager invite form, JWT-decoded invitation accept page, and login ?next= redirect for full invitation flow**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T10:31:56Z
- **Completed:** 2026-03-06T10:34:37Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Login page now reads `?next=` param and redirects there after successful login, enabling the invitation flow to work end-to-end
- `/join` page handles unauthenticated users (redirects to login/register with token preserved), authenticated users (accept button with email mismatch warning), and missing token (error card)
- Teams pages built: `/teams` list with role badges, `/teams/new` creation form, `/teams/[id]` detail with manager-only invite form and member placeholder

## Task Commits

Each task was committed atomically:

1. **Task 1: Login ?next= redirect and /join invitation accept page** - `57590b0` (feat)
2. **Task 2: Teams pages and dashboard team prompt** - `950410c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/src/app/(auth)/login/page.tsx` - Updated to read ?next= searchParam and redirect after login
- `apps/web/src/app/(auth)/join/page.tsx` - Invitation accept page with auth state handling
- `apps/web/src/app/(dashboard)/teams/page.tsx` - Teams list with role badges and create button
- `apps/web/src/app/(dashboard)/teams/new/page.tsx` - Create team form (react-hook-form + createTeamSchema)
- `apps/web/src/app/(dashboard)/teams/[id]/page.tsx` - Team detail with manager-only InviteForm component
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` - Added team context: create prompt or team links
- `apps/web/src/components/ui/badge.tsx` - New Badge UI component (cva pattern, default/secondary/destructive/outline variants)

## Decisions Made
- Login page uses its own `useMutation` calling `/auth/login` directly rather than delegating to `useAuth().login`, because `useAuth().login` hardcodes `router.push('/dashboard')` in its `onSuccess`. This avoids modifying the shared hook (which would affect every call site) while enabling per-page redirect customization.
- JWT payload decoded client-side with `atob()` to display `inviteeEmail` in the UI. The backend performs actual cryptographic verification on accept — client-side decode is display-only.
- Team detail page uses `GET /teams/my` data and filters by `id` in the UI, avoiding the need for a `GET /teams/:id` endpoint that wasn't built in Plan 02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Badge UI component created from scratch**
- **Found during:** Task 2 (teams pages)
- **Issue:** The plan references `@/components/ui/badge` (Badge component) but this file did not exist in `apps/web/src/components/ui/` — only button, card, form, input, label, sonner were present
- **Fix:** Created `badge.tsx` following the existing cva + cn pattern matching the project's shadcn/ui style
- **Files modified:** `apps/web/src/components/ui/badge.tsx`
- **Verification:** TypeScript compiles cleanly after creation
- **Committed in:** `950410c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Badge component is essential for displaying team roles. No scope creep — it's a UI primitive referenced by the plan.

## Issues Encountered
- `useAuth().login` redirect is baked into the hook's `onSuccess` at `/dashboard`. Since the plan required the login page to support `?next=`, the login page was rewritten to use a page-local `useMutation` instead of the hook mutation. The shared `useAuth` hook is unmodified and still used everywhere else.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full team management flow is complete: create team, invite members, accept invitations
- TEAM-01, TEAM-02, TEAM-03 requirements fulfilled
- Phase 03 (daily reports) can assume teams exist and users are members; team_id available from `/teams/my`
- Note: Member list on `/teams/[id]` shows placeholder — a `GET /teams/:id/members` endpoint would be needed to display actual members (deferred to future scope)

## Self-Check: PASSED

All 7 files confirmed on disk. Commits 57590b0 and 950410c confirmed in git log.

---
*Phase: 02-team-management*
*Completed: 2026-03-06*

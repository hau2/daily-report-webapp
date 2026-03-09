# Roadmap: Daily Report

## Overview

This roadmap delivers a daily reporting web app where team members log tasks throughout the day and submit reports to their manager, with a Chrome extension for frictionless task capture. v1.0 delivered the core platform (auth, teams, tasks, manager dashboard, Chrome extension). v1.1 adds team membership lifecycle management, stress level tracking on reports, and an analytics dashboard for team owners.

## Milestones

- v1.0 MVP - Phases 1-5 (shipped 2026-03-07)
- v1.1 Team Membership Management - Phases 6-8 (complete)
- v1.2 Verification, Export & Theming - Phases 9-11 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 MVP (Phases 1-5) - SHIPPED 2026-03-07</summary>

- [x] **Phase 1: Foundation and Auth** - Monorepo scaffold, database schema, user registration/login, session management (completed 2026-03-06)
- [x] **Phase 2: Team Management** - Team creation, member invitations, role separation (manager vs member) (completed 2026-03-06)
- [x] **Phase 3: Task Management and Daily Reports** - Task CRUD, daily report view, end-of-day review, report submission (completed 2026-03-06)
- [x] **Phase 4: Manager Dashboard and Export** - Manager views, submission tracking, CSV export, responsive design (completed 2026-03-06)
- [x] **Phase 5: Chrome Extension** - Highlight-to-add workflow, auto-captured URLs, extension auth (completed 2026-03-07)

</details>

### v1.1 Team Membership Management (In Progress)

- [x] **Phase 6: Membership Management** - Remove member, leave team, transfer ownership, cancel invitation, delete team, historical data preservation
- [x] **Phase 7: Stress Level Tracking** - Stress level selection on report submission, visibility for team owner (completed 2026-03-08)
- [x] **Phase 8: Dashboard Analytics** - Submission rate, hours worked, stress trend, and task volume charts with time range toggle (completed 2026-03-08)

### v1.2 Verification, Export & Theming (In Progress)

- [ ] **Phase 9: Email Verification Enforcement** - Block unverified users from all features, resend verification, redirect flow
- [x] **Phase 10: Export Analytics** - Download charts as PNG/PDF, export raw analytics data as CSV (completed 2026-03-09)
- [ ] **Phase 11: Dark Mode** - Light/dark theme toggle with OS preference detection and persistent user preference

## Phase Details

<details>
<summary>v1.0 Phase Details (Phases 1-5)</summary>

### Phase 1: Foundation and Auth
**Goal**: Users can create accounts, log in, and maintain sessions across the application
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, TEAM-04
**Success Criteria** (what must be TRUE):
  1. User can sign up with email and password and receive a verification email
  2. User can log in and their session persists across browser refreshes without re-entering credentials
  3. User can reset a forgotten password via an email link
  4. User can update their profile (name, email, password) from a settings page
  5. Monorepo builds and runs locally with NestJS API, Next.js frontend, and Supabase database connected
**Plans:** 5/5 plans complete

Plans:
- [x] 01-01-PLAN.md — Remove Prisma, install Supabase JS + auth deps, create SupabaseModule, shared types, test mocks
- [x] 01-02-PLAN.md — NestJS auth backend (register, login, dual JWT cookies, refresh, logout)
- [x] 01-03-PLAN.md — Next.js auth pages (login, register), API client, auth hook, protected dashboard
- [x] 01-04-PLAN.md — Email verification and password reset (Resend EmailService, backend endpoints, frontend pages)
- [x] 01-05-PLAN.md — User profile settings (UsersModule, GET/PATCH /users/me, settings page)

### Phase 2: Team Management
**Goal**: Users can form teams with clear manager/member roles and invite others to join
**Depends on**: Phase 1
**Requirements**: TEAM-01, TEAM-02, TEAM-03
**Success Criteria** (what must be TRUE):
  1. User can create a new team and is automatically assigned as manager/owner
  2. Manager can send an email invitation link to add new members to the team
  3. An invited user can click the invitation link and join the team as a member
**Plans:** 4/4 plans complete

Plans:
- [x] 02-01-PLAN.md — DB migration (teams/team_members/team_invitations), shared Team types/schemas, Wave 0 test stubs
- [x] 02-02-PLAN.md — TeamsModule backend (service, controller, DTOs, TeamManagerGuard, invitation email method)
- [x] 02-03-PLAN.md — Frontend teams pages (/teams, /teams/new, /teams/[id]), /join accept page, login ?next= redirect
- [x] 02-04-PLAN.md — Human verification of complete Phase 2 end-to-end flows

### Phase 3: Task Management and Daily Reports
**Goal**: Users can log tasks throughout the day, review and adjust them, and submit a daily report
**Depends on**: Phase 2
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, TASK-06, TASK-07
**Success Criteria** (what must be TRUE):
  1. User can create a task with title, estimated hours, source link, and notes
  2. User can edit or delete any task before submitting the daily report
  3. User can view all of today's tasks as a daily report and adjust hours during end-of-day review
  4. User can submit the daily report, which locks it from further editing
  5. User can navigate to previous days to view or edit past reports (if not yet submitted)
**Plans:** 4/4 plans complete

Plans:
- [x] 03-01-PLAN.md — DB migration (daily_reports/tasks), shared Task types/schemas, Wave 0 test stubs
- [x] 03-02-PLAN.md — TasksModule backend (service, controller, DTOs, report status guard, all tests GREEN)
- [x] 03-03-PLAN.md — Frontend daily report page (/reports/[date]), task CRUD, date navigation, report submission
- [x] 03-04-PLAN.md — Human verification of complete Phase 3 end-to-end flows

### Phase 4: Manager Dashboard and Export
**Goal**: Managers can see their team's daily reports, track who has submitted, and export data
**Depends on**: Phase 3
**Requirements**: MGMT-01, MGMT-02, MGMT-03, UI-01
**Success Criteria** (what must be TRUE):
  1. Manager can view any team member's daily report for any date
  2. Manager can see a clear list of members who have not submitted their report today
  3. Manager can export team reports to a CSV file
  4. The web app is responsive and usable on mobile browsers for both members and managers
**Plans:** 3/3 plans complete

Plans:
- [x] 04-01-PLAN.md — Backend ManagerModule (shared types, service with tests, controller, 3 endpoints behind TeamManagerGuard)
- [x] 04-02-PLAN.md — Frontend manager dashboard pages (/manager, /manager/[teamId]), CSV export, mobile-responsive nav
- [x] 04-03-PLAN.md — Human verification of complete Phase 4 end-to-end flows

### Phase 5: Chrome Extension
**Goal**: Users can capture tasks directly from any webpage without switching to the web app
**Depends on**: Phase 3
**Requirements**: EXT-01, EXT-02, EXT-03, EXT-04, EXT-05
**Success Criteria** (what must be TRUE):
  1. User can log in to the Chrome extension to link it with their web app account
  2. User can highlight text on any webpage and trigger a quick-add popup pre-filled with the highlighted text and current page URL
  3. User can enter estimated hours and optional notes in the popup and save the task
  4. Tasks created via the extension appear immediately in the user's daily report on the web app
**Plans:** 3/3 plans complete

Plans:
- [x] 05-01-PLAN.md — Backend auth changes: dual JWT extraction (cookie + Bearer), extension-login/refresh endpoints, CORS update
- [x] 05-02-PLAN.md — Chrome extension build: MV3 workspace, service worker, context menu, popup (login + quick-add), Bearer auth API client
- [x] 05-03-PLAN.md — Human verification of complete Phase 5 end-to-end flows

</details>

### Phase 6: Membership Management
**Goal**: Team owners and members have full control over team membership lifecycle -- removing, leaving, transferring, and dissolving teams while preserving historical data
**Depends on**: Phase 2 (teams and membership already exist)
**Requirements**: MEMB-01, MEMB-02, MEMB-03, MEMB-04, MEMB-05, MEMB-06
**Success Criteria** (what must be TRUE):
  1. Owner can remove a member from the team, and that member no longer sees the team or can submit reports to it
  2. Member can leave a team voluntarily, and the team disappears from their team list
  3. Owner can transfer ownership to another member, after which the previous owner becomes a regular member and the new owner gains all owner capabilities
  4. Owner can cancel a pending invitation, preventing the invitee from joining via that link
  5. Owner can delete a team entirely (with confirmation), removing it from all members' team lists
  6. After a member departs (removed or left), their historical daily reports remain visible to the owner
**Plans:** 3/3 plans complete

Plans:
- [x] 06-01-PLAN.md — Backend: shared types, 5 membership management endpoints (remove, leave, transfer, cancel, delete), manager service update for historical data, unit tests
- [x] 06-02-PLAN.md — Frontend: team detail page UI for all membership actions (remove member, leave team, transfer ownership, cancel invitation, delete team)
- [x] 06-03-PLAN.md — Human verification of all Phase 6 end-to-end flows

### Phase 7: Stress Level Tracking
**Goal**: Daily reports capture how stressed a member is feeling, giving owners visibility into team wellbeing
**Depends on**: Phase 3 (daily reports exist), Phase 6 (membership context)
**Requirements**: STRESS-01, STRESS-02
**Success Criteria** (what must be TRUE):
  1. Member sees a stress level selector (Low / Medium / High) on the daily report page and can choose one before submitting
  2. Owner can see each member's selected stress level when viewing that member's daily report
**Plans:** 2/2 plans complete

Plans:
- [x] 07-01-PLAN.md — Backend: DB migration (stress_level column), shared types/schemas, submit endpoint accepts stressLevel, manager endpoint returns stressLevel
- [x] 07-02-PLAN.md — Frontend: stress level selector on daily report page, stress level badge on manager dashboard

### Phase 8: Dashboard Analytics
**Goal**: Owners can visualize team trends over time through an analytics dashboard with Team Overview and Individual Member views, featuring summary KPI cards, multiple chart types, and time range filtering
**Depends on**: Phase 7 (stress data needed for stress trend chart), Phase 4 (manager views exist)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. Owner can view a submission rate chart showing the percentage of members who submitted their report, plotted over time
  2. Owner can view an hours worked chart showing total hours per member over time
  3. Owner can view a stress level trend chart showing team stress distribution over time
  4. Owner can view a task volume chart showing number of tasks per member over time
  5. Owner can toggle between week, month, and quarter time ranges, and all charts update accordingly
**Plans:** 3/3 plans complete

Plans:
- [x] 08-01-PLAN.md — Backend: shared analytics types, team analytics endpoint (aggregates), member analytics endpoint (individual), unit tests
- [x] 08-02-PLAN.md — Frontend: analytics page shell with tabs/time range, Team Overview tab with 4 summary cards + 4 charts (Recharts)
- [x] 08-03-PLAN.md — Frontend: Individual Member tab with member selector, 4 summary cards, 4 charts (hours, stress, tasks, submission calendar)

### Phase 9: Email Verification Enforcement
**Goal**: Unverified users are blocked from all app features until they verify their email, with a clear verification flow and resend option
**Depends on**: Phase 1 (auth system with existing email verification)
**Requirements**: VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04
**Success Criteria** (what must be TRUE):
  1. Unverified user cannot access any protected feature (dashboard, tasks, teams, reports, analytics)
  2. Unverified user is redirected to a "verify your email" page with a resend button
  3. Invited user must have a verified email before they can accept a team invitation
  4. User can request a new verification email if the original expired or was lost
**Plans:** 2 plans

Plans:
- [x] 09-01-PLAN.md — Backend: EmailVerifiedGuard (global APP_GUARD), resend-verification endpoint with rate limiting, /auth/me returns emailVerified
- [ ] 09-02-PLAN.md — Frontend: /verify-required page with resend button, auth hook email verification redirect, 403 interception in API client

### Phase 10: Export Analytics
**Goal**: Owners can download analytics charts as images, generate PDF reports, and export raw data as CSV
**Depends on**: Phase 8 (analytics dashboard exists)
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03
**Success Criteria** (what must be TRUE):
  1. Owner can click a download button on any chart to save it as a PNG image
  2. Owner can download a full analytics report as a PDF containing all charts and summary data
  3. Owner can export raw analytics data as a CSV file for use in spreadsheets
**Plans:** 2/2 plans complete

Plans:
- [ ] 10-01-PLAN.md — Export utility functions (PNG/PDF/CSV) and reusable ChartCard + ExportToolbar components
- [ ] 10-02-PLAN.md — Wire ChartCard into analytics charts, add ExportToolbar with PDF/CSV export to analytics page

### Phase 11: Dark Mode
**Goal**: Users can switch between light and dark themes, with their preference persisted and OS defaults respected
**Depends on**: Phase 1 (auth/user system exists)
**Requirements**: THEME-01, THEME-02, THEME-03
**Success Criteria** (what must be TRUE):
  1. User can toggle between light and dark mode via a button in the navigation/header
  2. User's theme preference persists across sessions (stored in localStorage or user profile)
  3. On first visit, the app defaults to the user's OS/browser color scheme preference (prefers-color-scheme)
**Plans:** 1 plan

Plans:
- [ ] 11-01-PLAN.md — Wire next-themes ThemeProvider, add toggle to nav header, replace all hardcoded gray/white colors with semantic dark-compatible tokens

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Auth | v1.0 | 5/5 | Complete | 2026-03-06 |
| 2. Team Management | v1.0 | 4/4 | Complete | 2026-03-06 |
| 3. Task Management and Daily Reports | v1.0 | 4/4 | Complete | 2026-03-06 |
| 4. Manager Dashboard and Export | v1.0 | 3/3 | Complete | 2026-03-06 |
| 5. Chrome Extension | v1.0 | 3/3 | Complete | 2026-03-07 |
| 6. Membership Management | v1.1 | 3/3 | Complete | 2026-03-08 |
| 7. Stress Level Tracking | v1.1 | 2/2 | Complete | 2026-03-08 |
| 8. Dashboard Analytics | v1.1 | 3/3 | Complete | 2026-03-08 |
| 9. Email Verification Enforcement | v1.2 | 1/2 | In progress | - |
| 10. Export Analytics | 2/2 | Complete   | 2026-03-09 | - |
| 11. Dark Mode | v1.2 | 0/1 | Not started | - |

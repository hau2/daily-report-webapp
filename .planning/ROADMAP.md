# Roadmap: Daily Report

## Overview

This roadmap delivers a daily reporting web app where team members log tasks throughout the day and submit reports to their manager, with a Chrome extension for frictionless task capture. The build follows the dependency chain: auth foundation first, then team structure, then task/report workflow, then manager visibility and export, and finally the Chrome extension which depends on all prior APIs being stable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Auth** - Monorepo scaffold, database schema, user registration/login, session management (completed 2026-03-06)
- [x] **Phase 2: Team Management** - Team creation, member invitations, role separation (manager vs member) (completed 2026-03-06)
- [ ] **Phase 3: Task Management and Daily Reports** - Task CRUD, daily report view, end-of-day review, report submission
- [ ] **Phase 4: Manager Dashboard and Export** - Manager views, submission tracking, CSV export, responsive design
- [ ] **Phase 5: Chrome Extension** - Highlight-to-add workflow, auto-captured URLs, extension auth

## Phase Details

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
- [ ] 01-01-PLAN.md — Remove Prisma, install Supabase JS + auth deps, create SupabaseModule, shared types, test mocks
- [ ] 01-02-PLAN.md — NestJS auth backend (register, login, dual JWT cookies, refresh, logout)
- [ ] 01-03-PLAN.md — Next.js auth pages (login, register), API client, auth hook, protected dashboard
- [ ] 01-04-PLAN.md — Email verification and password reset (Resend EmailService, backend endpoints, frontend pages)
- [ ] 01-05-PLAN.md — User profile settings (UsersModule, GET/PATCH /users/me, settings page)

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
- [ ] 02-01-PLAN.md — DB migration (teams/team_members/team_invitations), shared Team types/schemas, Wave 0 test stubs
- [ ] 02-02-PLAN.md — TeamsModule backend (service, controller, DTOs, TeamManagerGuard, invitation email method)
- [ ] 02-03-PLAN.md — Frontend teams pages (/teams, /teams/new, /teams/[id]), /join accept page, login ?next= redirect
- [ ] 02-04-PLAN.md — Human verification of complete Phase 2 end-to-end flows

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
**Plans:** 3/4 plans executed

Plans:
- [ ] 03-01-PLAN.md — DB migration (daily_reports/tasks), shared Task types/schemas, Wave 0 test stubs
- [ ] 03-02-PLAN.md — TasksModule backend (service, controller, DTOs, report status guard, all tests GREEN)
- [ ] 03-03-PLAN.md — Frontend daily report page (/reports/[date]), task CRUD, date navigation, report submission
- [ ] 03-04-PLAN.md — Human verification of complete Phase 3 end-to-end flows

### Phase 4: Manager Dashboard and Export
**Goal**: Managers can see their team's daily reports, track who has submitted, and export data
**Depends on**: Phase 3
**Requirements**: MGMT-01, MGMT-02, MGMT-03, UI-01
**Success Criteria** (what must be TRUE):
  1. Manager can view any team member's daily report for any date
  2. Manager can see a clear list of members who have not submitted their report today
  3. Manager can export team reports to a CSV file
  4. The web app is responsive and usable on mobile browsers for both members and managers
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Chrome Extension
**Goal**: Users can capture tasks directly from any webpage without switching to the web app
**Depends on**: Phase 3
**Requirements**: EXT-01, EXT-02, EXT-03, EXT-04, EXT-05
**Success Criteria** (what must be TRUE):
  1. User can log in to the Chrome extension to link it with their web app account
  2. User can highlight text on any webpage and trigger a quick-add popup pre-filled with the highlighted text and current page URL
  3. User can enter estimated hours and optional notes in the popup and save the task
  4. Tasks created via the extension appear immediately in the user's daily report on the web app
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Auth | 5/5 | Complete   | 2026-03-06 |
| 2. Team Management | 4/4 | Complete   | 2026-03-06 |
| 3. Task Management and Daily Reports | 3/4 | In Progress|  |
| 4. Manager Dashboard and Export | 0/0 | Not started | - |
| 5. Chrome Extension | 0/0 | Not started | - |

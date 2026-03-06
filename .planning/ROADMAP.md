# Roadmap: Daily Report

## Overview

This roadmap delivers a daily reporting web app where team members log tasks throughout the day and submit reports to their manager, with a Chrome extension for frictionless task capture. The build follows the dependency chain: auth foundation first, then team structure, then task/report workflow, then manager visibility and export, and finally the Chrome extension which depends on all prior APIs being stable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Auth** - Monorepo scaffold, database schema, user registration/login, session management
- [ ] **Phase 2: Team Management** - Team creation, member invitations, role separation (manager vs member)
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
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Team Management
**Goal**: Users can form teams with clear manager/member roles and invite others to join
**Depends on**: Phase 1
**Requirements**: TEAM-01, TEAM-02, TEAM-03
**Success Criteria** (what must be TRUE):
  1. User can create a new team and is automatically assigned as manager/owner
  2. Manager can send an email invitation link to add new members to the team
  3. An invited user can click the invitation link and join the team as a member
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

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
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

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
| 1. Foundation and Auth | 0/0 | Not started | - |
| 2. Team Management | 0/0 | Not started | - |
| 3. Task Management and Daily Reports | 0/0 | Not started | - |
| 4. Manager Dashboard and Export | 0/0 | Not started | - |
| 5. Chrome Extension | 0/0 | Not started | - |

# Requirements: Daily Report

**Defined:** 2026-03-06
**Core Value:** Make daily reporting effortless -- quick task entry throughout the day, easy review and adjustment at end of day, clear visibility for managers.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can create account with email and password
- [x] **AUTH-02**: User receives email verification after signup
- [x] **AUTH-03**: User can reset password via email link
- [x] **AUTH-04**: User session persists across browser refresh (httpOnly cookie)

### Team Management

- [x] **TEAM-01**: User can create a new team (creator becomes manager/owner)
- [x] **TEAM-02**: Manager can invite members via email link
- [x] **TEAM-03**: Invited user can join team via invitation link
- [x] **TEAM-04**: User can update their profile (name, email, password)

### Task Management

- [x] **TASK-01**: User can create a task with title, estimated hours, source link, and notes
- [x] **TASK-02**: User can edit a task (title, hours, link, notes) before report is submitted
- [x] **TASK-03**: User can delete a task before report is submitted
- [x] **TASK-04**: User can view today's tasks as a daily report
- [x] **TASK-05**: User can adjust hours on tasks during end-of-day review
- [x] **TASK-06**: User can submit daily report to manager (draft -> submitted, locks editing)
- [x] **TASK-07**: User can navigate to view/edit reports from previous days

### Manager Dashboard

- [x] **MGMT-01**: Manager can view each team member's daily report by date
- [x] **MGMT-02**: Manager can see a list of members who haven't submitted today
- [x] **MGMT-03**: Manager can export team reports to CSV file

### Chrome Extension

- [x] **EXT-01**: User can log in to the extension to link their account
- [ ] **EXT-02**: User can highlight text on any webpage and trigger quick-add popup
- [ ] **EXT-03**: Extension auto-captures current page URL as source link (user can edit it)
- [ ] **EXT-04**: User can enter estimated hours and optional notes in the quick-add popup
- [x] **EXT-05**: Task created via extension appears in user's daily report on the web app

### UI/UX

- [x] **UI-01**: Web app is responsive and usable on mobile browsers

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Authentication

- **AUTH-05**: User can log in with Google OAuth

### Team Management

- **TEAM-05**: User can belong to multiple teams with separate reports per team
- **TEAM-06**: Team has configurable submission reminders (e.g., "submit by 6pm")

### Task Management

- **TASK-08**: User can re-add common tasks from templates / recent tasks

### Manager Dashboard

- **MGMT-04**: Manager can leave comments/feedback on submitted reports
- **MGMT-05**: Manager can export reports to native Excel (.xlsx) format
- **MGMT-06**: Manager can view weekly/monthly summary dashboard with aggregated hours

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Live timer / stopwatch | This is a daily report tool, not a time tracker. Manual hour estimation is the intended workflow. |
| Screenshot monitoring | Destroys trust. Source links provide sufficient work evidence. |
| Approval/reject workflow | Adds bureaucratic friction. Manager viewing is sufficient for v1. |
| Category/tag system | Scope creep. Task title + source link provides enough context. |
| Real-time notifications (WebSocket) | Daily reports are async by nature. Page refresh is sufficient. |
| Billable vs non-billable hours | Turns product into invoicing tool. Different product category. |
| Gantt charts / project management | Not a PM tool. Link to Jira/GitLab for project tracking. |
| AI-generated summaries | Premature. Reports are already short (3-5 items). |
| Native mobile app | Web responsive design is sufficient for v1. |
| Slack/Teams bot | Focus on web + extension as input channels. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| TEAM-01 | Phase 2 | Complete |
| TEAM-02 | Phase 2 | Complete |
| TEAM-03 | Phase 2 | Complete |
| TEAM-04 | Phase 1 | Complete |
| TASK-01 | Phase 3 | Complete |
| TASK-02 | Phase 3 | Complete |
| TASK-03 | Phase 3 | Complete |
| TASK-04 | Phase 3 | Complete |
| TASK-05 | Phase 3 | Complete |
| TASK-06 | Phase 3 | Complete |
| TASK-07 | Phase 3 | Complete |
| MGMT-01 | Phase 4 | Complete |
| MGMT-02 | Phase 4 | Complete |
| MGMT-03 | Phase 4 | Complete |
| EXT-01 | Phase 5 | Complete |
| EXT-02 | Phase 5 | Pending |
| EXT-03 | Phase 5 | Pending |
| EXT-04 | Phase 5 | Pending |
| EXT-05 | Phase 5 | Complete |
| UI-01 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation*

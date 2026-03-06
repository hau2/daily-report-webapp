# Requirements: Daily Report

**Defined:** 2026-03-06
**Core Value:** Make daily reporting effortless — quick task entry throughout the day, easy review and adjustment at end of day, clear visibility for managers.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can create account with email and password
- [ ] **AUTH-02**: User receives email verification after signup
- [ ] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User session persists across browser refresh (httpOnly cookie)

### Team Management

- [ ] **TEAM-01**: User can create a new team (creator becomes manager/owner)
- [ ] **TEAM-02**: Manager can invite members via email link
- [ ] **TEAM-03**: Invited user can join team via invitation link
- [ ] **TEAM-04**: User can update their profile (name, email, password)

### Task Management

- [ ] **TASK-01**: User can create a task with title, estimated hours, source link, and notes
- [ ] **TASK-02**: User can edit a task (title, hours, link, notes) before report is submitted
- [ ] **TASK-03**: User can delete a task before report is submitted
- [ ] **TASK-04**: User can view today's tasks as a daily report
- [ ] **TASK-05**: User can adjust hours on tasks during end-of-day review
- [ ] **TASK-06**: User can submit daily report to manager (draft -> submitted, locks editing)
- [ ] **TASK-07**: User can navigate to view/edit reports from previous days

### Manager Dashboard

- [ ] **MGMT-01**: Manager can view each team member's daily report by date
- [ ] **MGMT-02**: Manager can see a list of members who haven't submitted today
- [ ] **MGMT-03**: Manager can export team reports to CSV file

### Chrome Extension

- [ ] **EXT-01**: User can log in to the extension to link their account
- [ ] **EXT-02**: User can highlight text on any webpage and trigger quick-add popup
- [ ] **EXT-03**: Extension auto-captures current page URL as source link (user can edit it)
- [ ] **EXT-04**: User can enter estimated hours and optional notes in the quick-add popup
- [ ] **EXT-05**: Task created via extension appears in user's daily report on the web app

### UI/UX

- [ ] **UI-01**: Web app is responsive and usable on mobile browsers

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
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| TEAM-01 | — | Pending |
| TEAM-02 | — | Pending |
| TEAM-03 | — | Pending |
| TEAM-04 | — | Pending |
| TASK-01 | — | Pending |
| TASK-02 | — | Pending |
| TASK-03 | — | Pending |
| TASK-04 | — | Pending |
| TASK-05 | — | Pending |
| TASK-06 | — | Pending |
| TASK-07 | — | Pending |
| MGMT-01 | — | Pending |
| MGMT-02 | — | Pending |
| MGMT-03 | — | Pending |
| EXT-01 | — | Pending |
| EXT-02 | — | Pending |
| EXT-03 | — | Pending |
| EXT-04 | — | Pending |
| EXT-05 | — | Pending |
| UI-01 | — | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 0
- Unmapped: 24

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after initial definition*

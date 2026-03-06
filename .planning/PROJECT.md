# Daily Report

## What This Is

A web application where team members can log their daily tasks, track hours, and submit reports to their manager. Anyone can sign up, create a team, and start tracking work. Comes with a Chrome extension for quick-adding tasks by highlighting text on Jira, GitLab, or any webpage.

## Core Value

Make daily reporting effortless — quick task entry throughout the day, easy review and adjustment at end of day, clear visibility for managers.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can sign up and log in with email/password
- [ ] User can create a team and invite members
- [ ] Team has flat structure: 1 owner/manager + members
- [ ] User can add tasks to their daily report (title, hours, source link, notes)
- [ ] User can review, edit, and adjust hours for tasks at end of day
- [ ] User can submit daily report to manager
- [ ] Manager can view each member's daily report
- [ ] Manager can see who hasn't submitted their report today
- [ ] Manager can export reports to CSV/Excel
- [ ] Chrome extension: highlight text on any page to quick-add a task with estimated hours
- [ ] Chrome extension: captures source URL (Jira, GitLab, etc.) automatically

### Out of Scope

- Mobile app — web-first, responsive design is sufficient for v1
- Real-time notifications — not needed for daily report workflow
- Time tracking / timer — users estimate and adjust hours manually
- Category/tag system for tasks — keep it simple, just title + hours + notes
- Approval workflow (approve/reject reports) — manager only views for v1
- Weekly/monthly aggregation dashboard — v1 focuses on daily view + export

## Context

- Target users: any company or team that requires daily task reporting
- Common pain point: people forget what they worked on, reporting is tedious
- Chrome extension solves this by capturing tasks as they work throughout the day
- Supabase provides PostgreSQL database with built-in auth infrastructure (though auth will be custom via NestJS)
- The app should be multi-tenant: each team is independent, users can belong to multiple teams

## Constraints

- **Tech Stack**: NestJS (backend), Next.js (frontend), Supabase (PostgreSQL database)
- **Chrome Extension**: Manifest V3 (current Chrome extension standard)
- **Deployment**: Frontend on Vercel, Backend on VPS (Docker)
- **Auth**: Email/password only for v1, managed by NestJS backend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for database | PostgreSQL with managed hosting, familiar tooling | — Pending |
| Flat team structure | Simplicity for v1, covers most small-to-medium team needs | — Pending |
| Extension: quick-add only | Minimal scope for extension, full features on web | — Pending |
| Email/password auth only | Simplest to implement, sufficient for v1 | — Pending |
| No approval workflow | Manager views only, reduces complexity | — Pending |

---
*Last updated: 2026-03-06 after initialization*

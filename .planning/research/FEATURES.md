# Feature Research

**Domain:** Daily report / time tracking / team task logging SaaS
**Researched:** 2026-03-06
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password authentication | Every SaaS has login. Users won't adopt a tool without accounts. | LOW | NestJS + JWT. Already in PROJECT.md scope. |
| Task entry (title, hours, source link, notes) | Core value prop. Without this, the product literally doesn't exist. | LOW | Simple CRUD form. Keep fields minimal -- title, hours, link, notes. |
| Daily report view (today's tasks) | Users need to see what they logged today as a coherent report before submitting. | LOW | Chronological list grouped by day. Editable until submitted. |
| Edit/adjust tasks before submission | Users estimate hours throughout the day, then correct at end of day. Competitors all allow editing before finalization. | LOW | In-place editing on daily view. Lock after submission. |
| Submit daily report | The act of "sending" the report to the manager gives the workflow its structure. Without it, it's just a personal task list. | LOW | Status flag on daily report: draft -> submitted. Simple state transition. |
| Manager dashboard (view team reports) | Managers are the buyers. They need to see who did what. Every competitor (DailyBot, Geekbot, Jell) provides this. | MEDIUM | List of team members, click to expand daily report. Filter by date. |
| "Who hasn't submitted" indicator | The #1 manager pain point. DailyBot, Geekbot, and Standuply all surface this prominently. Without it, managers must manually check each person. | LOW | Query: team members minus submitted reports for today. Red/green status. |
| Team creation and member invitations | Multi-tenant SaaS pattern. Users need to create a workspace and bring their team in. | MEDIUM | Invite via email link. Join flow. Standard SaaS pattern. |
| Basic role separation (owner/manager vs member) | Managers see dashboards, members see their own reports. Without roles, no access control. | LOW | Two roles: manager (team creator) and member. Already scoped in PROJECT.md. |
| Export to CSV/Excel | Managers need to pull data into spreadsheets for their own reporting upstream. Every competitor offers this. DailyBot exports to PDF/CSV/XLS. | LOW | Server-side CSV generation. Excel via a library like exceljs. |
| Date navigation | Users need to view and edit reports from previous days, not just today. Managers need to review historical reports. | LOW | Date picker on both member and manager views. |
| Responsive web design | Users fill in reports from laptops, tablets, occasionally phones. PROJECT.md explicitly scopes out native mobile. | MEDIUM | Mobile-friendly layouts for task entry. CSS/Tailwind responsive. |
| Basic profile/account settings | Users expect to change their name, email, password. Baseline SaaS hygiene. | LOW | Simple settings page. |

### Differentiators (Competitive Advantage)

Features that set the product apart from Geekbot, DailyBot, Jell, Standuply, and generic time trackers like Toggl/Clockify.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Chrome extension: highlight-to-add-task | **Primary differentiator.** No daily report tool captures tasks at the source like this. Geekbot/DailyBot live in Slack -- they don't go where the work happens. Highlighting text on Jira/GitLab and instantly adding it as a task with the source URL auto-captured is unique and powerful. | HIGH | Manifest V3. Content script for text selection. Popup for hours/notes. Message passing to backend API. |
| Auto-captured source URLs | The extension grabs the current page URL (Jira ticket, GitLab MR, Confluence page) automatically. This creates traceable reports -- managers can click through to the actual work artifact. Competitors don't do this. | LOW | `chrome.tabs` API to get current URL. Stored as source_link on task. Low complexity because it's part of extension flow. |
| "Log as you go" workflow | Instead of end-of-day recall ("what did I do today?"), users capture tasks throughout the day via the extension. This solves the core pain: people forget what they worked on. Standuply/Geekbot only ask at a scheduled time. | MEDIUM | UX design challenge more than technical. Extension makes tasks easy to add mid-work. Daily view lets you review/adjust at EOD. |
| Submission reminders (configurable) | Automated nudges at a configurable time ("Submit your report by 6pm"). Geekbot has "smart reminders" that learn response patterns. For v1, a simple configurable deadline is sufficient and valuable. | MEDIUM | Cron job or scheduled task. Email or in-app notification. Team-level setting for deadline time. |
| Multi-team membership | Users can belong to multiple teams (e.g., a contractor on two projects). Most standup bots tie to a single Slack channel. A standalone app can handle this natively. | MEDIUM | User-team many-to-many relationship. Team switcher in UI. Separate reports per team. |
| Quick task templates / recent tasks | "I do the same standup meeting every day" -- let users re-add common tasks with one click. Reduces friction for repetitive work. | LOW | Store frequently used task titles. "Add again" button on past tasks. |
| Weekly/monthly summary view | Managers and members want to see aggregated hours over a week or month. This is explicitly out of scope for v1 (PROJECT.md) but is a natural post-launch addition with high demand. | MEDIUM | Aggregate queries. Simple table/chart. Date range picker. |
| Manager comments/feedback on reports | Managers can leave a note on a submitted report ("Looks good" or "Can you clarify X?"). Adds a lightweight feedback loop without full approval workflow. | LOW | Comment field on daily_report. Notification to member. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific product.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live timer / stopwatch | "Real" time tracking tools have timers. Users might ask for one. | Fundamentally changes the product. This is a daily report tool, not a time tracker. Timers add complexity (what if user forgets to stop?), create anxiety, and shift from "estimate your effort" to "monitor your minutes." Toggl and Clockify own this space -- don't compete. PROJECT.md explicitly excludes this. | Manual hour entry with easy adjustment. The extension captures tasks; users estimate hours. |
| Screenshot monitoring / activity tracking | Hubstaff offers this. Some managers want proof of work. | Destroys trust. Toggl deliberately avoids this for philosophical reasons and it's a selling point. Surveillance features reduce employee engagement and create hostile culture. This product's value is *reporting*, not *monitoring*. | Transparent reports with source links. The source URL is the "proof" -- click through to the Jira ticket or GitLab MR. |
| Approval/reject workflow | Managers might want to formally approve or reject reports. | Adds bureaucratic friction. If a report is "rejected," what happens? User re-submits? Creates back-and-forth that slows everyone down. For most teams, viewing is sufficient. PROJECT.md explicitly excludes this for v1. | Manager comments/feedback on reports (lightweight). Manager can flag issues without blocking the workflow. |
| Complex category/tag system | Users want to categorize tasks (e.g., "development", "meetings", "admin"). | Scope creep. Tags require a management UI, filtering UI, tag-based reporting, tag standardization across team. Every tag system grows uncontrolled. For v1, task title + source link provides enough context. | Source URL implicitly categorizes work (Jira = dev, GitLab = code, Confluence = docs). Add lightweight categories only if validated post-launch. |
| Real-time notifications / live updates | "I want to see reports as they're submitted in real time." | WebSocket infrastructure for minimal value. Daily reports are inherently asynchronous -- managers review at end of day, not watching a live feed. Adds technical complexity (WebSocket server, connection management) for a workflow that's batch-oriented. | Dashboard refreshes on page load. Simple "last updated" timestamp. Email digest option. |
| Billable vs. non-billable hour tracking | Freelancers and agencies want to separate billable hours. | Turns the product into an invoicing tool. Requires client management, billing rates, invoice generation. Completely different product category. | Keep hours simple (total hours per task). If billing data is needed, export to CSV and handle in dedicated billing software. |
| Gantt charts / project management | "Can we see tasks on a timeline?" | This is not a project management tool. Building Gantt charts means competing with Jira, Asana, Monday.com. Massive scope expansion for a feature that doesn't align with "daily reporting." | Link to external project management tools via source URLs. The report documents what was done, not what's planned. |
| OAuth / social login (Google, GitHub) | Users expect "Login with Google" on modern SaaS. | Not problematic per se, but adds complexity for v1. Requires OAuth provider setup, token management, account linking. PROJECT.md scopes to email/password for v1. | Email/password for v1. Add Google OAuth as a v1.x enhancement once core is solid. It's an incremental addition, not a v1 blocker. |
| AI-generated summaries of daily reports | "Use AI to summarize what the team did today." | Premature optimization. The reports are already short (task title + hours). AI summarization adds cost (API calls), complexity, and limited value on reports that are 3-5 bullet points. | Let the data speak for itself. If summaries become needed at scale, it's a v2+ feature. |

## Feature Dependencies

```
[Authentication]
    |-- requires --> [User registration / login]
    |-- enables --> [Team creation]
                        |-- enables --> [Member invitations]
                        |-- enables --> [Role separation (manager/member)]
                                            |-- enables --> [Manager dashboard]
                                            |-- enables --> [Who hasn't submitted]

[Task entry (CRUD)]
    |-- enables --> [Daily report view]
                        |-- enables --> [Submit daily report]
                                            |-- enables --> [Manager dashboard]
                                            |-- enables --> [Export to CSV/Excel]
                                            |-- enables --> [Who hasn't submitted]

[Chrome extension (highlight-to-add)]
    |-- requires --> [Authentication] (user must be logged in)
    |-- requires --> [Task entry API] (backend endpoint to create tasks)
    |-- enhances --> [Daily report view] (tasks appear in daily view)

[Submission reminders]
    |-- requires --> [Submit daily report] (must have submission concept)
    |-- requires --> [Team creation] (reminders are team-scoped)

[Multi-team membership]
    |-- requires --> [Team creation]
    |-- complicates --> [Daily report view] (which team's report am I viewing?)
    |-- complicates --> [Chrome extension] (which team does this task go to?)

[Weekly/monthly summary]
    |-- requires --> [Daily report view] (aggregates daily data)
    |-- requires --> [Date navigation]

[Manager comments]
    |-- requires --> [Submit daily report]
    |-- requires --> [Manager dashboard]
```

### Dependency Notes

- **Chrome extension requires Authentication + Task API:** Extension is useless without a logged-in user and a backend to receive tasks. Build auth and task CRUD first.
- **Manager dashboard requires Team + Roles + Submitted reports:** The entire manager experience depends on teams existing, roles being assigned, and reports being submitted. This is the longest dependency chain.
- **Multi-team membership complicates Chrome extension:** If a user is on multiple teams, the extension needs a team selector. Defer multi-team to v1.x to keep extension simple.
- **Weekly/monthly summary requires daily data:** Can only be built after daily report flow is complete and has real data. Natural v1.x feature.
- **Export requires submitted reports:** Nothing to export until the submit flow works end-to-end.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept.

- [ ] **Email/password auth** -- gate everything behind login
- [ ] **Team creation + member invitations** -- multi-tenant foundation
- [ ] **Role separation (manager/member)** -- access control for dashboard
- [ ] **Task entry (title, hours, source link, notes)** -- core data model
- [ ] **Daily report view with edit/adjust** -- review before submitting
- [ ] **Submit daily report** -- formalize the report for the manager
- [ ] **Manager dashboard (view reports, see who hasn't submitted)** -- the reason managers buy this
- [ ] **Export to CSV** -- managers need data extraction (Excel via CSV is sufficient for v1)
- [ ] **Date navigation** -- view historical reports
- [ ] **Chrome extension: highlight text to add task** -- primary differentiator, ship in v1 or lose the unique value prop
- [ ] **Responsive design** -- usable on mobile browsers

### Add After Validation (v1.x)

Features to add once core is working and users provide feedback.

- [ ] **Submission reminders** -- add when users report they forget to submit
- [ ] **Quick task templates / recent tasks** -- add when users report repetitive entry
- [ ] **Manager comments on reports** -- add when managers ask for a feedback channel
- [ ] **Excel export (native .xlsx)** -- add when CSV proves insufficient
- [ ] **Multi-team membership** -- add when users request belonging to multiple teams
- [ ] **Google OAuth** -- add when signup friction is validated as a problem
- [ ] **PDF export** -- add when managers need formatted reports for stakeholders

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Weekly/monthly summary dashboard** -- requires aggregation UI, only valuable after consistent daily data exists
- [ ] **Team analytics (average hours, submission rates over time)** -- only valuable at scale
- [ ] **API for integrations** -- only when third-party integration demand emerges
- [ ] **Slack/Teams bot for submitting reports** -- alternative input channel, only if chat-based competitors are losing users to us
- [ ] **AI-generated team summaries** -- premature until report volume justifies it
- [ ] **Custom report templates** -- only when diverse team needs are validated

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Task entry (CRUD) | HIGH | LOW | P1 |
| Daily report view + edit | HIGH | LOW | P1 |
| Submit daily report | HIGH | LOW | P1 |
| Email/password auth | HIGH | LOW | P1 |
| Team creation + invitations | HIGH | MEDIUM | P1 |
| Manager dashboard | HIGH | MEDIUM | P1 |
| Who hasn't submitted | HIGH | LOW | P1 |
| Chrome extension (highlight-to-add) | HIGH | HIGH | P1 |
| Auto-captured source URLs | HIGH | LOW | P1 |
| Export to CSV | MEDIUM | LOW | P1 |
| Date navigation | MEDIUM | LOW | P1 |
| Responsive design | MEDIUM | MEDIUM | P1 |
| Submission reminders | MEDIUM | MEDIUM | P2 |
| Quick task templates | MEDIUM | LOW | P2 |
| Manager comments | MEDIUM | LOW | P2 |
| Multi-team membership | MEDIUM | MEDIUM | P2 |
| Google OAuth | MEDIUM | MEDIUM | P2 |
| Weekly/monthly summary | MEDIUM | MEDIUM | P3 |
| Team analytics | LOW | HIGH | P3 |
| Slack/Teams bot | LOW | HIGH | P3 |
| AI summaries | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- these define the product
- P2: Should have, add in v1.x based on user feedback
- P3: Nice to have, defer until product-market fit

## Competitor Feature Analysis

| Feature | Geekbot | DailyBot | Jell | Toggl Track | Our Approach |
|---------|---------|----------|------|-------------|--------------|
| Task entry | Via Slack bot questions | Via Slack/Teams bot | Via web + Slack | Timer-based | Web form + Chrome extension highlight-to-add |
| Input channel | Slack, MS Teams | Slack, Teams, Discord, G Chat | Slack, Teams, web | Web, desktop, mobile, browser extension | Web + Chrome extension (capture at source) |
| Manager visibility | Slack channel summary | Chat channel or email digest | Web dashboard + Slack | Reports & analytics | Dedicated manager dashboard with submission tracking |
| Who hasn't reported | Yes (follow-up reminders) | Yes (status tracking) | Yes | N/A (different product) | Yes, prominent on manager dashboard |
| Export | Webhooks, API | PDF, CSV, XLS | Limited | CSV, PDF, Excel | CSV for v1, Excel/PDF for v1.x |
| Reminders | Smart reminders (learns patterns) | Configurable notifications | Configurable | Timer reminders | Configurable deadline reminders (v1.x) |
| Source linking | No | No | No | No | Yes -- auto-captured URL from extension |
| Multi-team | Per-channel (Slack native) | Per-channel | Yes | Per-workspace | Yes (v1.x) |
| Browser extension | No | No | No | Yes (timer) | Yes (highlight text to add task) |
| Pricing model | Free for <=10, then per user | Free tier, then per user | Per user/month | Free tier, then per user | TBD |

**Key competitive insight:** Geekbot, DailyBot, and Standuply are all Slack/Teams-native. They live in chat. Our product lives where the work happens (Jira, GitLab, browser) via the Chrome extension, and provides a dedicated web dashboard instead of dumping reports into a chat channel. This is the fundamental differentiation -- capture at the source, review in a purpose-built UI.

## Sources

- [Geekbot - Daily Standup Tools](https://geekbot.com/blog/daily-standup-tools-software-and-apps/) - Feature analysis
- [DailyBot vs Standuply](https://www.dailybot.com/alternatives/standuply) - Competitor comparison
- [Friday.app - Standuply Alternatives](https://friday.app/p/standuply-alternatives) - Async standup feature landscape
- [Toggl vs Hubstaff](https://toggl.com/blog/hubstaff-vs-toggl) - Time tracking philosophy (trust vs monitoring)
- [Clockify vs Toggl](https://hubstaff.com/blog/clockify-vs-toggl/) - Feature comparison in time tracking space
- [SaaSykit - Roles & Permissions](https://saasykit.com/docs/multi-tenancy/roles-and-permissions) - Multi-tenant role patterns
- [SaaSykit - Team Management](https://saasykit.com/docs/multi-tenancy/team-management-and-invitations) - Invitation flow patterns
- [Jira Product Discovery Chrome Extension](https://support.atlassian.com/jira-product-discovery/docs/learn-to-install-and-use-the-chrome-extension/) - Text capture from browser
- [Fellow.app - Standup Tools](https://fellow.app/blog/must-try-daily-standup-software/) - Reminder and notification patterns
- [ClickUp - Standup Software](https://clickup.com/blog/daily-standup-software/) - Daily standup tool features

---
*Feature research for: Daily report / time tracking / team task logging SaaS*
*Researched: 2026-03-06*

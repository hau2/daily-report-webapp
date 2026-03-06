# Pitfalls Research

**Domain:** Daily Report / Time Tracking Web App with Chrome Extension
**Researched:** 2026-03-06
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Multi-Tenant Data Leakage Through Missing Team Isolation

**What goes wrong:**
User A on Team X can see or modify data belonging to Team Y. This happens when team_id filtering is inconsistent across queries, or when new endpoints/tables are added without tenant scoping. In a daily report app where managers view member reports, a single missing WHERE clause can expose an entire team's work data to unauthorized users.

**Why it happens:**
Developers add team_id checks in the initial endpoints but forget them when adding new features, export routes, or admin queries. The app uses Supabase as a database (not as a full client-side SDK), so RLS policies may not be the primary enforcement layer -- the NestJS backend handles authorization. This means every single query must include tenant scoping manually. One missed query = data leak.

**How to avoid:**
- Implement a NestJS interceptor or middleware that injects `team_id` into every request context after authentication. Every service method should receive the team context from this, never from user-supplied route params alone.
- Create a base repository or query builder wrapper that automatically appends `WHERE team_id = :teamId` to all tenant-scoped queries.
- Add integration tests that authenticate as User A (Team X) and attempt to access Team Y resources -- assert 403 on every endpoint.
- If using Supabase RLS as a secondary defense layer: enable it on all tables with tenant_id, even though NestJS is the primary gate. Defense in depth.

**Warning signs:**
- API endpoints accept team_id as a URL parameter without verifying the user belongs to that team.
- New tables are created without a team_id column or without corresponding RLS policies.
- No integration tests exist that test cross-tenant access denial.

**Phase to address:**
Phase 1 (Foundation) -- establish the tenant isolation pattern in the database schema and NestJS guard layer before any feature code is written. Retrofitting tenant isolation is extremely expensive.

---

### Pitfall 2: Timezone Chaos in Daily Reports

**What goes wrong:**
"Today's report" means different things to users in different timezones. A user in Tokyo submits their report at 11pm JST, which is 2pm UTC -- the system records it as "today" in UTC but the user considers it yesterday's work. Managers see reports attributed to wrong days. Aggregate exports show incorrect daily totals. Daylight saving transitions cause reports to appear duplicated or missing.

**Why it happens:**
PostgreSQL's `TIMESTAMPTZ` stores everything in UTC internally, which is correct. But the concept of "a daily report for March 6" is fundamentally a local-date concept, not a UTC concept. Developers either: (a) store everything in UTC and derive dates server-side (wrong date for non-UTC users), or (b) let the frontend send local dates without storing the timezone (impossible to reconcile later).

**How to avoid:**
- Store each user's IANA timezone in their profile (e.g., `Asia/Tokyo`, `America/New_York`). Never use UTC offsets -- they don't handle DST.
- The `report_date` column should be a `DATE` type, representing the user's local calendar date, not derived from a timestamp.
- Store timestamps as `TIMESTAMPTZ` for audit/ordering, but use the explicit `report_date` DATE field for "which day is this report for."
- When a user creates tasks throughout the day, the report_date is determined by `NOW() AT TIME ZONE user_timezone` -- the user's local date.
- Manager views that span multiple timezones should show the report_date (local to each member), not try to normalize to a single timezone.

**Warning signs:**
- No timezone field in the user profile table.
- Report dates are derived from `CURRENT_DATE` or `NOW()` without timezone conversion.
- Users near midnight or across DST boundaries report tasks on the wrong day.
- Tests only run in UTC and never test timezone edge cases.

**Phase to address:**
Phase 1 (Database Schema) -- the schema must include user timezone and explicit report_date from day one. Migrating date-derived-from-timestamp data to explicit dates is a data migration nightmare.

---

### Pitfall 3: Chrome Extension Service Worker Termination Loses Draft Tasks

**What goes wrong:**
The user highlights text on a Jira page, the extension popup opens, they start filling in hours and notes -- then the Manifest V3 service worker terminates (after 30 seconds of inactivity or 5 minutes total). The draft task data is lost. The user has to start over. They stop using the extension.

**Why it happens:**
Manifest V3 replaced persistent background pages with service workers that terminate when idle. Developers store state in the service worker's in-memory variables (which vanish on termination) instead of in `chrome.storage`. The popup closing also terminates its own state. Communication between content script, service worker, and popup can fail silently when the service worker is dead.

**How to avoid:**
- Never store state in service worker global variables. Use `chrome.storage.local` for all draft data.
- When the user highlights text and triggers quick-add, immediately persist the captured data (title, source URL) to `chrome.storage.local` before opening the popup.
- The popup should read from `chrome.storage.local` on open, not from a message passed by the service worker.
- Register all event listeners synchronously at the top level of the service worker script. Async registration causes missed events.
- Do not use `setTimeout`/`setInterval` in the service worker -- use `chrome.alarms` API instead.
- The extension's core flow (highlight -> capture -> persist -> popup -> submit) should work even if the service worker restarts between steps.

**Warning signs:**
- State stored in `let`/`const` variables at service worker top level.
- Popup receives data via `chrome.runtime.sendMessage` instead of reading from storage.
- Users report "blank popup" or "lost my task" intermittently.
- Extension works in development (service worker kept alive by DevTools) but fails in production.

**Phase to address:**
Phase dedicated to Chrome Extension development -- design the data flow around storage persistence from the start, not as a fix after users complain.

---

### Pitfall 4: Supabase Service Role Key in Wrong Context

**What goes wrong:**
The NestJS backend uses Supabase's `service_role` key (which bypasses RLS) for all database operations. This means RLS policies are effectively decorative -- they exist but never enforce anything. A single application bug (missing auth guard, IDOR vulnerability) exposes all data because the database layer provides no safety net.

Alternatively: the `anon` key is accidentally used where `service_role` is needed, causing mysterious "empty result" responses because RLS blocks everything.

**Why it happens:**
Supabase provides two keys: `anon` (respects RLS) and `service_role` (bypasses RLS). When using Supabase as "just a database" with a NestJS backend, developers default to `service_role` for convenience -- "the backend handles auth anyway." This eliminates the entire defense-in-depth benefit of RLS.

**How to avoid:**
- Use the `anon` key with proper JWT forwarding for user-scoped operations. Set Supabase's JWT secret in NestJS, sign JWTs that include user claims (user_id, team_id), and pass them to Supabase so RLS policies enforce access control at the database level.
- Reserve the `service_role` key strictly for admin operations (migrations, background jobs, user management) and never for user-initiated requests.
- Create a NestJS Supabase service that uses REQUEST scope -- each request gets a Supabase client initialized with the current user's JWT, not a singleton with the service role key.
- Store keys only in environment variables, never in frontend code or client-accessible configs.

**Warning signs:**
- A single Supabase client instance shared across all requests (singleton pattern with service_role key).
- RLS policies exist on tables but no user JWT is ever sent to Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` appears in more than 1-2 files.

**Phase to address:**
Phase 1 (Authentication & Database Setup) -- the Supabase client pattern must be established before any feature code uses it. Switching from service_role-everywhere to per-user JWT requires touching every database call.

---

### Pitfall 5: Daily Report UX So Tedious Users Stop Submitting

**What goes wrong:**
The daily report submission process requires too many steps: open app, create task, fill in 4 fields, repeat for each task, review all tasks, click submit. Users skip days, then backfill inaccurately from memory. Managers get unreliable data. The entire product value collapses -- if people don't submit reports, the tool is worthless.

Nearly 70% of site visitors abandon forms when they encounter friction. A daily report is a form users must fill out every single day -- the friction tolerance is near zero.

**Why it happens:**
Developers build the CRUD for tasks and reports first, then add the Chrome extension as an afterthought. The core web interface becomes the primary entry point, and it's built with data completeness in mind (all fields required) rather than speed-of-entry in mind. The Chrome extension -- which should be the primary input method -- is treated as a bonus feature.

**How to avoid:**
- Design the Chrome extension quick-add as the *primary* input method, not a secondary one. The web interface is for review and adjustment, not initial entry.
- Quick-add flow: highlight text -> one click -> task created with title (from selection) and source URL (from current page). Hours can default to 0 and be filled in during end-of-day review.
- Make hours the only field that truly needs manual input. Title comes from highlighted text or page title, source URL is auto-captured, notes are optional.
- End-of-day review: show all tasks, let user adjust hours with inline editing (click on hours, type, tab to next), then one-click submit.
- Auto-save everything. Never require explicit save for individual tasks. The only deliberate action should be "submit report."
- Allow submitting even with 0-hour tasks (user can estimate later or manager can ask).

**Warning signs:**
- Task creation form has more than 2 required fields.
- No keyboard shortcuts for common actions.
- Users must navigate to a separate page to add each task.
- Submission requires clicking through a confirmation dialog.
- No auto-save -- users lose unsaved tasks on accidental navigation.

**Phase to address:**
Phase 1 (UI/UX Design) -- the interaction design must prioritize speed over completeness from day one. Building a form-heavy interface first and then trying to simplify it later means rewriting the entire frontend.

---

### Pitfall 6: Authentication Token Desync Between Next.js SSR and Client

**What goes wrong:**
The NestJS backend issues a JWT on login. The Next.js frontend uses it for both server-side rendering (SSR) and client-side API calls. But the token handling diverges: SSR reads from cookies (httpOnly), client-side reads from memory/localStorage. Tokens expire at different times. The user sees a logged-in page that immediately fails on the first client-side API call, or vice versa. Refresh token flows work in the browser but break during SSR.

**Why it happens:**
Next.js App Router runs components on the server by default. Server Components can't access localStorage or React state -- they can only read cookies from the request. Client Components can access both. This dual execution environment means authentication state must be synchronized across two fundamentally different runtimes. Developers build auth for one context and discover it breaks in the other.

**How to avoid:**
- Use httpOnly cookies as the single source of truth for auth tokens. Both SSR and client-side requests include cookies automatically.
- Set up Next.js API route handlers (or rewrites) as a proxy to the NestJS backend. This way, all requests to the backend go through the same origin, avoiding cross-origin cookie issues entirely.
- If the frontend is on `app.example.com` and backend on `api.example.com`, use Next.js rewrites to proxy `/api/*` to the NestJS backend. The browser only ever talks to `app.example.com`.
- Implement token refresh in NestJS middleware that sets new cookies on responses, so refresh happens transparently.
- Never store JWT in localStorage for this architecture -- it creates the dual-state problem.

**Warning signs:**
- Auth works on first page load (SSR) but breaks on client navigation, or vice versa.
- Different token storage mechanisms for SSR vs. client.
- CORS configuration needed between frontend and backend origins.
- Users are randomly logged out during SPA-style navigation.

**Phase to address:**
Phase 1 (Authentication) -- the auth flow design must account for SSR from the start. Bolting on SSR-compatible auth to an existing client-only auth flow requires rewriting the entire auth layer.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `service_role` key for all Supabase queries | Simpler setup, no JWT forwarding | Zero database-level access control; every app bug = data leak | Never in production -- set up per-user JWT from day one |
| Storing report dates as UTC timestamps (no explicit date field) | One less column, simpler schema | Wrong dates for non-UTC users, impossible to fix without data migration | Never -- add `report_date DATE` from start |
| Skipping team_id foreign key and index on new tables | Faster table creation during prototyping | Missing tenant isolation on those tables, slow queries at scale | Only during local prototyping; must add before any deployment |
| Hardcoding timezone to server's locale | Works for single-timezone teams | Breaks for any remote/distributed team | Only if contractually single-timezone forever |
| Single Supabase client singleton (not request-scoped) | Simpler NestJS module setup | Auth context shared between concurrent requests; user A sees user B's data | Never -- always use request-scoped Supabase clients |
| Building full task CRUD before Chrome extension | Familiar development pattern | Optimizes for the wrong input method; extension becomes an afterthought | Only if extension is explicitly deprioritized to v2 |

## Integration Gotchas

Common mistakes when connecting components of this stack.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| NestJS + Supabase | Using `@supabase/supabase-js` with a global singleton client | Create request-scoped Supabase clients via NestJS provider with `scope: Scope.REQUEST`. Each request gets its own client initialized with the user's JWT. |
| Next.js + NestJS API | Direct client-side fetch to NestJS API (different origin) | Use Next.js rewrites or API route handlers as a proxy. Same-origin requests avoid CORS and cookie issues entirely. |
| Chrome Extension + NestJS API | Sending auth tokens via `chrome.runtime.sendMessage` to service worker for API calls | Store auth token in `chrome.storage.local`. Content scripts and popup read token from storage. Service worker handles API calls with token from storage, not from message passing (messages fail when service worker is terminated). |
| Chrome Extension + Jira/GitLab pages | Injecting content scripts with broad `matches` patterns like `<all_urls>` | Use `activeTab` permission + user gesture (highlight -> right-click or keyboard shortcut). Narrow host permissions to known patterns like `*.atlassian.net`, `*.gitlab.com`. Reduces permission warnings on install. |
| Supabase connection from Vercel-hosted Next.js | Using direct database connection string | Use Supabase connection pooler (Supavisor) with transaction mode for serverless environments. Set `connection_limit=1` per serverless function instance. Pass `?pgbouncer=true` in connection string if using Prisma. |
| NestJS + CSV/Excel Export | Loading entire dataset into memory, then converting to CSV | Stream data in chunks using NestJS `StreamableFile`. Fetch data with cursor-based pagination, pipe through a CSV transform stream. For very large exports (>10k rows), generate file async and provide download link. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No index on `(team_id, report_date)` | Manager's daily view slows down as team history grows | Add composite index `CREATE INDEX idx_reports_team_date ON reports(team_id, report_date DESC)` | ~50 team members x 365 days = 18k rows per team; noticeable at 5+ teams |
| Loading all team members' reports in one query | Dashboard times out for large teams | Paginate member list; load reports per-member on demand or with cursor pagination | 20+ team members with 10+ tasks each = 200+ rows per day |
| No pagination on report history/export | Export endpoint OOMs or times out | Implement cursor-based pagination; stream CSV for exports; limit date ranges | 6+ months of history for teams of 10+ |
| Chrome extension fetches full task list on popup open | Popup takes seconds to open, feels unresponsive | Only fetch today's quick-add state from `chrome.storage.local`. Full task list lives in web app only. | 20+ tasks per day |
| N+1 queries loading tasks for each team member's report | Manager view fires one query per team member | Use a single query with JOIN: `SELECT * FROM reports JOIN tasks ON reports.id = tasks.report_id WHERE reports.team_id = :teamId AND reports.report_date = :date` | 10+ team members |
| Supabase free tier connection limits | Random `too many connections` errors under moderate load | Use Supavisor pooler; keep NestJS connection pool size to 5-10; close connections properly | 15+ concurrent users (Supabase free tier: ~15 direct connections) |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Chrome extension `<all_urls>` permission | Users see scary permission warning ("read and change all your data on all websites"), leading to low install rates; extension can theoretically scrape any page | Use `activeTab` for on-demand access. Add specific host permissions only for Jira/GitLab domains. Use optional permissions for additional domains. |
| Exposing Supabase `service_role` key in frontend or extension | Complete database access bypass -- attacker can read/write/delete all data across all tenants | Store `service_role` key only in NestJS backend environment variables. Frontend and extension should never have this key. They authenticate via NestJS API which mediates all database access. |
| Team invite links without expiration | Old invite links circulate indefinitely; former employees or strangers join teams | Set invite token expiration (72 hours). Allow team owner to revoke outstanding invites. One-time use tokens are even safer. |
| No rate limiting on report submission API | Malicious user floods system with reports; API abuse for scraping team data | NestJS `@nestjs/throttler` with per-user rate limits. Report submission: max 5 submits per hour per user. Task creation: max 100 tasks per day per user. |
| IDOR on report/task endpoints (e.g., `GET /tasks/:taskId`) | User can enumerate task IDs and read other users' tasks across teams | Always verify ownership: `WHERE task.id = :taskId AND task.user_id = :userId AND task.team_id = :teamId`. Never rely on obscurity of IDs. Use UUIDs to make enumeration harder (but don't rely on it for security). |
| Chrome extension content script reading sensitive page data | If the content script runs on banking or email pages, it could capture sensitive text | Limit content script injection to user-initiated actions only (via `activeTab`). Never auto-inject. Never send page content anywhere except the selected text the user explicitly highlighted. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring all fields to create a task | Users abandon mid-entry; the quick-add promise is broken | Only require title (auto-captured from highlight). Hours default to 0 (fill during review). Notes and source URL are optional (source auto-captured). |
| No end-of-day review flow | Users submit incomplete reports with wrong hours; manager data is unreliable | Dedicated "review and submit" view: show all today's tasks, inline-edit hours, one-click submit. Badge or notification at configured end-of-day time. |
| Report submission is destructive (can't edit after submit) | Users are anxious about submitting; delay submission; submit incorrect data because they can't fix it | Allow editing submitted reports within a grace period (e.g., until midnight or next day). Mark edits with timestamp so manager sees original + edited. |
| Extension popup looks/feels different from web app | Users feel disoriented switching between extension and web app | Share design tokens (colors, fonts, spacing). Extension popup should feel like a small slice of the web app, not a different product. |
| Manager view shows raw data dump instead of actionable summary | Managers spend too long parsing reports; stop checking them | Show summary first: total hours per member, submission status (submitted/pending/missing). Drill down to task details on click. Highlight anomalies (0-hour tasks, >12 hour days, missing reports). |
| No feedback after Chrome extension quick-add | User isn't sure if the task was captured; adds it again; duplicates pile up | Show brief toast/notification: "Task added: [title truncated]". Animate the extension badge count. Provide undo for 5 seconds. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Authentication:** Often missing token refresh flow -- verify that expired tokens are refreshed silently, not just that login works
- [ ] **Team invitation:** Often missing the "user already has account" flow -- verify that invited users with existing accounts are added to the team without creating a duplicate account
- [ ] **Report submission:** Often missing timezone handling -- verify that a user in UTC+9 creating a task at 11pm sees it on today's report, not tomorrow's
- [ ] **Chrome extension quick-add:** Often missing offline/error handling -- verify that if the API is unreachable, the task is queued in `chrome.storage.local` and retried when connectivity returns
- [ ] **Manager report view:** Often missing the "no report submitted" state -- verify that missing reports are shown explicitly (as "not submitted"), not silently omitted from the list
- [ ] **CSV export:** Often missing proper encoding for non-ASCII characters -- verify that exported CSV opens correctly in Excel with names/notes in non-Latin scripts (UTF-8 BOM for Excel compatibility)
- [ ] **Multi-team user:** Often missing team-switching UX -- verify that a user belonging to 3 teams can switch context without confusion about which team's report they're editing
- [ ] **Extension auth:** Often missing re-authentication flow -- verify that when the user's session expires, the extension prompts login instead of silently failing to submit tasks

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Multi-tenant data leakage | HIGH | Audit all queries for tenant_id filtering. Add RLS policies as defense-in-depth. Write cross-tenant integration tests for every endpoint. Notify affected users if data was exposed. |
| Timezone-incorrect report dates | HIGH | Add timezone column to user profiles. Backfill with best-guess timezones. Create `report_date` column. Write migration to recalculate dates from timestamps + timezone. Cannot be 100% accurate retroactively. |
| Service worker state loss in extension | MEDIUM | Refactor all state to `chrome.storage.local`. Replace message-passing data flow with storage-based flow. Re-register all event listeners at top level. Requires extension update push to all users. |
| Service role key overuse | MEDIUM | Create request-scoped Supabase service. Replace all service_role usage in user-facing code paths with per-user JWT. Audit remaining service_role usage. Enable RLS on all tables. |
| UX too tedious, low adoption | HIGH | Redesign task entry flow around minimal input. Prioritize Chrome extension as primary input. Add auto-save. Reduce required fields. This is essentially a product redesign, not a bug fix. |
| Auth token desync (SSR vs client) | MEDIUM | Migrate to httpOnly cookie-only auth. Set up Next.js API proxy for all backend calls. Remove localStorage token storage. Test SSR + client navigation flows end-to-end. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Multi-tenant data leakage | Phase 1: Database Schema + Auth Guards | Integration tests attempting cross-tenant access on every endpoint return 403 |
| Timezone chaos | Phase 1: Database Schema + User Profile | Create task at 11pm in UTC+9; verify report_date is correct local date |
| Service worker state loss | Chrome Extension Phase | Kill service worker mid-flow (via DevTools); reopen popup; verify draft data persists |
| Supabase key misuse | Phase 1: Backend Setup | Grep codebase for `service_role`; verify it appears only in admin/migration code |
| UX friction kills adoption | Phase 1: UI/UX Design | Time the full flow: highlight text -> task submitted in < 10 seconds via extension |
| Auth token desync | Phase 1: Authentication | Log in, navigate via SSR link, make client API call, refresh page -- auth persists across all |
| CSV export timeout/OOM | Export Feature Phase | Export 10,000 tasks across 6 months for a 20-person team without timeout or memory spike |
| IDOR on task/report endpoints | Phase 1: Auth Guards | Authenticated user attempts to access another user's task by ID -- returns 403, not the task |
| Connection pool exhaustion | Phase 1: Backend Setup | Simulate 20 concurrent users; verify no connection errors; monitor pool usage |
| Extension permission over-request | Chrome Extension Phase | Verify `manifest.json` uses `activeTab` not `<all_urls>`; check Chrome Web Store permission warnings |

## Sources

- [Postgres RLS Implementation Guide - Best Practices, and Common Pitfalls](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [Multi-tenant data isolation with PostgreSQL Row Level Security (AWS)](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Row Level Security for Tenants in Postgres (Crunchy Data)](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)
- [Setup Supabase with Nest.js](https://blog.andriishupta.dev/setup-supabase-with-nestjs)
- [Using Supabase RLS with a custom auth provider](https://medium.com/@gracew/using-supabase-rls-with-a-custom-auth-provider-b31564172d5c)
- [Time zone management in PostgreSQL (CYBERTEC)](https://www.cybertec-postgresql.com/en/time-zone-management-in-postgresql/)
- [Best practices for timestamps and time zones in databases (Tinybird)](https://www.tinybird.co/blog/database-timestamps-timezones)
- [Migrate to a service worker - Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers)
- [Chrome Extension V3: Mitigate service worker timeout issue](https://medium.com/@bhuvan.gandhi/chrome-extension-v3-mitigate-service-worker-timeout-issue-in-the-easiest-way-fccc01877abd)
- [Changes to Cross-Origin Requests in Chrome Extension Content Scripts (Chromium)](https://www.chromium.org/Home/chromium-security/extension-content-script-fetches/)
- [How to Use SameSite Strict Cookies with Next.js and a Separate Backend](https://www.chintristan.io/blog/how-to-use-samesite-strict-cookies-with-next-js-and-a-separate-backend)
- [Setting HTTP-only cookies via proxy in Next.js (with NestJS backend)](https://github.com/vercel/next.js/discussions/85600)
- [Streaming Large Datasets to Clients in NestJS](https://medium.com/@sushilm2011/streaming-large-datasets-to-clients-in-nestjs-fa126f2118bb)
- [Connect to your database - Supabase Docs (Connection Pooling)](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Top 5 Issues Businesses Face With Employee Time Tracking Software](https://lifthcm.com/article/top-issues-with-employee-time-tracking-software)
- [Form abandonment: How to avoid it (Fullstory)](https://www.fullstory.com/blog/form-abandonment/)
- [NestJS Multi-Tenant Authentication Guide](https://medium.com/@mohantaankit2002/multi-tenant-authentication-in-a-single-nestjs-api-the-ultimate-guide-94aed88632c4)

---
*Pitfalls research for: Daily Report / Time Tracking Web App with Chrome Extension*
*Researched: 2026-03-06*

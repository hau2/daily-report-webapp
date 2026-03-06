# Architecture Research

**Domain:** Daily report / time tracking web application (multi-tenant, team-based)
**Researched:** 2026-03-06
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
                          +---------------------------------------------+
                          |              CLIENT LAYER                    |
                          |                                             |
                          |  +------------------+  +------------------+ |
                          |  | Next.js Frontend |  | Chrome Extension | |
                          |  | (Vercel)         |  | (Manifest V3)   | |
                          |  |                  |  |                  | |
                          |  | - App Router     |  | - Content Script | |
                          |  | - Server Comps   |  | - Service Worker | |
                          |  | - Route Handlers |  | - Popup UI       | |
                          |  +--------+---------+  +--------+---------+ |
                          +-----------|----------------------|-----------+
                                      |                      |
                          +-----------v----------------------v-----------+
                          |              API LAYER                       |
                          |                                              |
                          |  +----------------------------------------+  |
                          |  |           NestJS Backend               |  |
                          |  |           (VPS / Docker)               |  |
                          |  |                                        |  |
                          |  |  +----------+  +----------+  +------+ |  |
                          |  |  | Auth     |  | Reports  |  | Teams| |  |
                          |  |  | Module   |  | Module   |  | Mod  | |  |
                          |  |  +----------+  +----------+  +------+ |  |
                          |  |  +----------+  +----------+           |  |
                          |  |  | Tasks    |  | Export   |           |  |
                          |  |  | Module   |  | Module   |           |  |
                          |  |  +----------+  +----------+           |  |
                          |  +------------------+---------------------+  |
                          +---------------------|------------------------+
                                                |
                          +---------------------v------------------------+
                          |              DATA LAYER                      |
                          |                                              |
                          |  +----------------------------------------+  |
                          |  |        Supabase (PostgreSQL)           |  |
                          |  |                                        |  |
                          |  |  - Connection pooling (Supavisor)     |  |
                          |  |  - Row Level Security (RLS)           |  |
                          |  |  - Migrations via Drizzle Kit         |  |
                          |  +----------------------------------------+  |
                          +----------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Next.js Frontend** | UI rendering, form management, report views, manager dashboards | App Router with Server Components for data display, Client Components for forms |
| **Next.js Route Handlers** | BFF proxy layer: forward auth-bearing requests to NestJS, add server-side cookies, handle token refresh | `app/api/[...proxy]/route.ts` forwarding to NestJS |
| **Chrome Extension Content Script** | Detect text selection on web pages, show "Add Task" context UI, capture page URL and title | Injected into Jira/GitLab/any page via `content_scripts` manifest entry |
| **Chrome Extension Service Worker** | Relay API calls from content script to NestJS, manage auth tokens in `chrome.storage` | Background service worker with `chrome.runtime.onMessage` listener |
| **Chrome Extension Popup** | Quick task review, auth status, link to full web app | Small React/Preact popup rendering recent tasks |
| **NestJS Auth Module** | User registration, login, JWT issuance, token refresh, password hashing | Passport.js local strategy, bcrypt, JWT access + refresh tokens |
| **NestJS Teams Module** | Team CRUD, member invitations, role management (owner/manager vs member) | Guards checking team membership, invitation tokens |
| **NestJS Tasks Module** | Task CRUD scoped to user + team + date, hours tracking | Endpoints: create, update, delete, list by date |
| **NestJS Reports Module** | Daily report submission, report status (draft/submitted), manager views | Aggregate tasks by user+date, submission workflow |
| **NestJS Export Module** | CSV/Excel generation from report data | Streaming response with `exceljs` or `csv-stringify` |
| **Supabase PostgreSQL** | Persistent data storage, connection pooling, RLS enforcement | Accessed via Drizzle ORM through connection pooler |

## Recommended Project Structure

### Monorepo Layout (pnpm workspaces or Turborepo)

```
daily-report/
├── apps/
│   ├── web/                        # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                # App Router pages + layouts
│   │   │   │   ├── (auth)/         # Login, register routes
│   │   │   │   ├── (dashboard)/    # Main app routes
│   │   │   │   │   ├── reports/    # Daily report view/edit
│   │   │   │   │   ├── team/       # Team management
│   │   │   │   │   └── manager/    # Manager dashboard
│   │   │   │   └── api/            # Route Handlers (BFF proxy)
│   │   │   │       └── [...proxy]/ # Catch-all proxy to NestJS
│   │   │   ├── components/         # React components
│   │   │   │   ├── ui/             # Primitives (Button, Input, etc.)
│   │   │   │   ├── tasks/          # Task-related components
│   │   │   │   ├── reports/        # Report-related components
│   │   │   │   └── layout/         # Shell, sidebar, header
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   ├── lib/                # Utilities, API client, auth helpers
│   │   │   └── types/              # Shared TypeScript types
│   │   └── next.config.ts
│   │
│   ├── api/                        # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/               # Auth module
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── guards/
│   │   │   │   └── dto/
│   │   │   ├── users/              # Users module
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── dto/
│   │   │   ├── teams/              # Teams module
│   │   │   │   ├── teams.module.ts
│   │   │   │   ├── teams.controller.ts
│   │   │   │   ├── teams.service.ts
│   │   │   │   ├── guards/
│   │   │   │   └── dto/
│   │   │   ├── tasks/              # Tasks module
│   │   │   │   ├── tasks.module.ts
│   │   │   │   ├── tasks.controller.ts
│   │   │   │   ├── tasks.service.ts
│   │   │   │   └── dto/
│   │   │   ├── reports/            # Reports module
│   │   │   │   ├── reports.module.ts
│   │   │   │   ├── reports.controller.ts
│   │   │   │   ├── reports.service.ts
│   │   │   │   └── dto/
│   │   │   ├── export/             # Export module
│   │   │   │   ├── export.module.ts
│   │   │   │   ├── export.controller.ts
│   │   │   │   └── export.service.ts
│   │   │   ├── database/           # Database module
│   │   │   │   ├── database.module.ts
│   │   │   │   ├── drizzle.provider.ts
│   │   │   │   └── schema/         # Drizzle schema definitions
│   │   │   │       ├── users.ts
│   │   │   │       ├── teams.ts
│   │   │   │       ├── tasks.ts
│   │   │   │       └── reports.ts
│   │   │   ├── common/             # Shared utilities
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── interceptors/
│   │   │   │   └── pipes/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── drizzle.config.ts
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   │
│   └── extension/                  # Chrome Extension
│       ├── src/
│       │   ├── content/            # Content script
│       │   │   ├── content.ts      # Text selection listener
│       │   │   └── ui.ts           # Injected quick-add UI
│       │   ├── background/         # Service worker
│       │   │   └── service-worker.ts
│       │   ├── popup/              # Popup UI
│       │   │   ├── popup.html
│       │   │   ├── popup.ts
│       │   │   └── popup.css
│       │   ├── lib/                # Shared utilities
│       │   │   ├── api.ts          # API client
│       │   │   └── storage.ts      # chrome.storage wrapper
│       │   └── types/
│       ├── manifest.json
│       └── vite.config.ts          # Build with Vite + CRXJS or WXT
│
├── packages/
│   └── shared/                     # Shared types and constants
│       ├── src/
│       │   ├── types/              # DTOs, interfaces shared across apps
│       │   └── constants/          # Shared enums, config constants
│       └── package.json
│
├── pnpm-workspace.yaml
├── turbo.json                      # Turborepo config (optional)
└── package.json
```

### Structure Rationale

- **`apps/web`:** Next.js App Router as the primary user interface. Server Components fetch data for display; Client Components handle interactive forms. Route Handlers act as a BFF proxy, forwarding requests to NestJS while managing cookies and CSRF.
- **`apps/api`:** NestJS follows its standard module-per-domain pattern. Each module (auth, teams, tasks, reports, export) encapsulates its controller, service, DTOs, and guards. The database module centralizes Drizzle ORM configuration.
- **`apps/extension`:** Chrome extension built with Vite for fast iteration. Content script, service worker, and popup are separate entry points. The service worker centralizes all API communication.
- **`packages/shared`:** TypeScript types and constants shared between frontend, backend, and extension. Prevents type drift between components.

## Architectural Patterns

### Pattern 1: Module-Per-Domain (NestJS)

**What:** Each business domain (auth, teams, tasks, reports) gets its own NestJS module with controller, service, and DTOs. Modules declare their dependencies explicitly via `imports`.
**When to use:** Always in NestJS -- this is the framework's core organizational pattern.
**Trade-offs:** Adds file overhead for small features, but pays off immediately for maintainability and testability.

**Example:**
```typescript
// tasks/tasks.module.ts
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService], // Export if Reports module needs it
})
export class TasksModule {}
```

### Pattern 2: BFF Proxy via Next.js Route Handlers

**What:** Next.js Route Handlers act as a Backend-for-Frontend layer. The browser never talks directly to NestJS. Instead, requests go through Next.js which adds auth cookies, handles token refresh, and forwards to NestJS.
**When to use:** When the frontend and backend are deployed separately (Vercel + VPS). This avoids CORS issues and keeps JWT tokens in HTTP-only cookies managed by the Next.js server.
**Trade-offs:** Adds one network hop but eliminates CORS complexity, keeps tokens secure (never exposed to client JS), and provides a clean surface for caching.

**Example:**
```typescript
// app/api/[...proxy]/route.ts
export async function GET(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const upstreamUrl = `${NESTJS_URL}${request.nextUrl.pathname.replace('/api', '')}`;

  const response = await fetch(upstreamUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
```

### Pattern 3: Service Worker as API Gateway (Chrome Extension)

**What:** All API communication from the Chrome extension routes through the background service worker. Content scripts and popup never call fetch directly to the backend. Instead, they send messages to the service worker, which handles auth and API calls.
**When to use:** Always in Manifest V3 extensions. Content scripts run in the page's security context and cannot bypass CSP restrictions. The service worker runs in the extension's own context with unrestricted fetch.
**Trade-offs:** Adds message-passing boilerplate but is required by MV3 architecture. Service workers are ephemeral (wake on demand, sleep when idle), so auth tokens must be stored in `chrome.storage.local`, not in memory.

**Example:**
```typescript
// background/service-worker.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ADD_TASK') {
    chrome.storage.local.get('access_token').then(({ access_token }) => {
      fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message.payload),
      })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true; // Keep message channel open for async response
  }
});

// content/content.ts
document.addEventListener('mouseup', () => {
  const selection = window.getSelection()?.toString().trim();
  if (selection && selection.length > 3) {
    // Show floating "Add Task" button near selection
    showQuickAddUI(selection, window.location.href);
  }
});

function addTask(title: string, sourceUrl: string) {
  chrome.runtime.sendMessage(
    { type: 'ADD_TASK', payload: { title, sourceUrl, hours: 0 } },
    (response) => { /* handle response */ }
  );
}
```

### Pattern 4: Date-Partitioned Task Ownership

**What:** Tasks are always scoped to a (user_id, team_id, date) tuple. A "daily report" is not a separate entity in the database -- it is a virtual aggregate of all tasks for a user on a given date, plus a submission record. This keeps the data model flat and avoids sync issues between tasks and reports.
**When to use:** For daily report systems where the report is simply "all my tasks today."
**Trade-offs:** Querying a report means aggregating tasks (slightly more complex query), but avoids the much worse problem of tasks and reports getting out of sync.

**Example:**
```typescript
// Drizzle schema
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  date: date('date').notNull(),              // The day this task belongs to
  title: text('title').notNull(),
  hours: real('hours').notNull().default(0),
  sourceUrl: text('source_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// A "report" is the submission status for a user+team+date
export const reportSubmissions = pgTable('report_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  date: date('date').notNull(),
  submittedAt: timestamp('submitted_at'),
  status: text('status').notNull().default('draft'), // 'draft' | 'submitted'
}, (table) => ({
  uniqueReport: unique().on(table.userId, table.teamId, table.date),
}));
```

## Data Flow

### Primary Flow: Task Creation from Web App

```
[User fills task form in Next.js]
    |
    v
[Client Component] --POST /api/tasks--> [Next.js Route Handler (BFF)]
    |                                         |
    |                                    [Reads cookie, adds Bearer token]
    |                                         |
    v                                         v
[Response rendered] <----JSON---- [NestJS TasksController]
                                        |
                                   [TasksService.create()]
                                        |
                                   [Drizzle ORM INSERT]
                                        |
                                   [Supabase PostgreSQL]
```

### Secondary Flow: Quick-Add from Chrome Extension

```
[User selects text on Jira/GitLab page]
    |
    v
[Content Script detects selection]
    |
    v
[Shows floating "Add Task" button]
    |
    v (user clicks)
[chrome.runtime.sendMessage({ type: 'ADD_TASK', payload })]
    |
    v
[Service Worker receives message]
    |
    v
[Reads token from chrome.storage.local]
    |
    v
[fetch() POST to NestJS /tasks endpoint directly]
    |
    v
[NestJS TasksController] --> [TasksService] --> [Supabase PostgreSQL]
    |
    v
[sendResponse() back to content script]
    |
    v
[Content Script shows success toast]
```

**Note:** The Chrome extension calls NestJS directly (not through Next.js BFF) because the extension's service worker has its own security context and does not need the cookie-based auth that the BFF provides. The extension stores a JWT in `chrome.storage.local` and sends it as a Bearer token.

### Auth Flow: Login

```
[User enters email + password in Next.js login page]
    |
    v
[Server Action or Route Handler] --POST /auth/login--> [NestJS AuthController]
    |                                                         |
    |                                               [Validate credentials]
    |                                               [bcrypt.compare()]
    |                                                         |
    |                                               [Issue JWT access + refresh tokens]
    |                                                         |
    v                                                         v
[Set HTTP-only cookies] <------ { accessToken, refreshToken } ------
    |
    v
[Redirect to /dashboard]
```

### Manager View Flow: Viewing Team Reports

```
[Manager navigates to /manager/reports?date=2026-03-06]
    |
    v
[Next.js Server Component]
    |
    v
[Route Handler fetches from NestJS: GET /reports?teamId=X&date=Y]
    |
    v
[NestJS ReportsController]
    |
    v
[ReportsService aggregates:
  - All team members
  - Their tasks for the date
  - Submission status per member
  - Total hours per member]
    |
    v
[Returns { members: [{ user, tasks, submitted, totalHours }] }]
    |
    v
[Server Component renders report grid with submission status indicators]
```

### Export Flow

```
[Manager clicks "Export to Excel"]
    |
    v
[Client-side triggers download: GET /api/export?teamId=X&startDate=Y&endDate=Z]
    |
    v
[Next.js Route Handler proxies to NestJS with streaming response]
    |
    v
[NestJS ExportController]
    |
    v
[ExportService queries tasks + report submissions]
    |
    v
[Generates Excel/CSV using exceljs or csv-stringify]
    |
    v
[Streams file back with Content-Disposition: attachment header]
```

### Key Data Flows Summary

1. **Task CRUD:** Client Component -> Next.js BFF -> NestJS -> Supabase. Standard REST with JWT in HTTP-only cookies.
2. **Extension Quick-Add:** Content Script -> Service Worker -> NestJS -> Supabase. Direct API call with Bearer token from chrome.storage.
3. **Report Viewing:** Server Component -> Route Handler -> NestJS -> Supabase. Server-rendered for fast initial load.
4. **Auth:** Login sets HTTP-only cookies on Next.js domain. Refresh token rotation handled by BFF. Extension uses separate JWT stored in chrome.storage.
5. **Export:** Streaming download proxied through BFF to avoid CORS and add auth.

## Database Schema Overview

```
+------------------+       +------------------+       +------------------+
|     users        |       |     teams        |       | team_members     |
+------------------+       +------------------+       +------------------+
| id (PK)          |<---+  | id (PK)          |<---+  | id (PK)          |
| email            |    |  | name             |    |  | user_id (FK)     |---> users.id
| password_hash    |    |  | created_by (FK)  |----+  | team_id (FK)     |---> teams.id
| display_name     |    |  | created_at       |       | role             |  (owner|member)
| created_at       |    |  +------------------+       | joined_at        |
+------------------+    |                             +------------------+
                        |
                        |
+------------------+    |  +---------------------+
|     tasks        |    |  | report_submissions   |
+------------------+    |  +---------------------+
| id (PK)          |    |  | id (PK)              |
| user_id (FK)     |----+  | user_id (FK)         |---> users.id
| team_id (FK)     |------>| team_id (FK)         |---> teams.id
| date             |       | date                 |
| title            |       | status               |  (draft|submitted)
| hours            |       | submitted_at         |
| source_url       |       +---------------------+
| notes            |       | UNIQUE(user_id,      |
| created_at       |       |   team_id, date)     |
| updated_at       |       +---------------------+
+------------------+
| INDEX(user_id,   |
|   team_id, date) |
+------------------+

+---------------------+
|   invitations       |
+---------------------+
| id (PK)             |
| team_id (FK)        |---> teams.id
| email               |
| token               |
| invited_by (FK)     |---> users.id
| status              |  (pending|accepted|expired)
| created_at          |
| expires_at          |
+---------------------+
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Monolith NestJS is perfectly fine. Single Supabase instance. No caching needed. |
| 1k-10k users | Add Redis for session/token caching. Index `tasks(user_id, team_id, date)` composite index is critical. Consider Supabase connection pooling via Supavisor (enabled by default). |
| 10k-100k users | Query optimization: materialized views for manager dashboard aggregations. Consider read replicas for report queries. Export module may need background job processing (Bull queue). |
| 100k+ users | Not a concern for v1. Would involve partitioning tasks table by date range, dedicated read replicas, CDN for static assets, and potentially splitting export into a separate microservice. |

### Scaling Priorities

1. **First bottleneck: Database queries for manager dashboard.** The "who submitted today" query scans all team members' tasks for a date. Fix: composite index on `(team_id, date, user_id)` and ensure the query is a single JOIN, not N+1.
2. **Second bottleneck: Export generation for large date ranges.** Generating Excel for 50 team members over 30 days is CPU-intensive. Fix: move to background job with Bull queue, notify manager when file is ready for download.
3. **Third bottleneck: Connection pool exhaustion.** Many concurrent users hitting NestJS, each needing a database connection. Fix: Supabase Supavisor connection pooler (use transaction mode), keep Drizzle queries efficient.

## Anti-Patterns

### Anti-Pattern 1: Reports as Separate Entities with Task Copies

**What people do:** Create a `reports` table that duplicates task data when a report is "submitted," treating the report as a snapshot.
**Why it's wrong:** Data gets out of sync. Users edit tasks after submission, leading to confusion about which is "correct." Double storage. Complex reconciliation logic.
**Do this instead:** A report is a virtual aggregate. The `report_submissions` table only tracks whether a user has submitted for a given date. The actual report content is always queried live from the `tasks` table. If immutability is needed later (v2+), add a `locked_at` timestamp to tasks upon submission.

### Anti-Pattern 2: Direct Supabase Client Calls from Frontend

**What people do:** Import `@supabase/supabase-js` in the Next.js frontend and query the database directly, bypassing NestJS.
**Why it's wrong:** Splits business logic between RLS policies (Supabase) and NestJS services. Makes the NestJS backend irrelevant for half the operations. RLS policies become increasingly complex as business rules grow. Two sources of truth for authorization.
**Do this instead:** All data access goes through NestJS. Supabase is used as a managed PostgreSQL database accessed via Drizzle ORM from the NestJS backend. RLS provides a defense-in-depth layer but is not the primary authorization mechanism.

### Anti-Pattern 3: Storing Auth Tokens in localStorage (Web App)

**What people do:** Store JWT access tokens in localStorage or sessionStorage, accessible to any JavaScript on the page.
**Why it's wrong:** Vulnerable to XSS attacks. Any injected script can steal the token.
**Do this instead:** Store tokens in HTTP-only, Secure, SameSite cookies managed by the Next.js BFF layer. The browser sends them automatically; client-side JavaScript never sees them.

### Anti-Pattern 4: N+1 Queries in Manager Dashboard

**What people do:** For each team member, make a separate query to fetch their tasks for the day.
**Why it's wrong:** 50-member team = 50 database queries per page load. Slow and wasteful.
**Do this instead:** Single query with JOIN that fetches all team members, their tasks for the date, and submission status. Use Drizzle's relational queries or raw SQL with proper JOINs.

### Anti-Pattern 5: Chrome Extension Polling for Auth State

**What people do:** Have the extension periodically check if the user is still logged in by calling the API on a timer.
**Why it's wrong:** Wastes resources, wakes the service worker unnecessarily, and MV3 service workers are designed to be ephemeral.
**Do this instead:** Check auth state lazily -- only when the user interacts with the extension (opens popup, tries to add a task). If the token is expired, prompt re-login.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase PostgreSQL | Drizzle ORM via `postgres` driver with connection pooling | Use Supavisor (Transaction mode). Disable prepared statements when using transaction pooling. Connection string from Supabase dashboard. |
| Vercel (Next.js hosting) | Git-based deploy, environment variables for NestJS API URL | Set `NESTJS_API_URL` env var. Use Vercel's edge network for static assets. |
| VPS/Docker (NestJS hosting) | Docker Compose with NestJS container, optional Redis container | Expose only port 443 (HTTPS). Use reverse proxy (Caddy or Traefik) for TLS. |
| Chrome Web Store | Extension packaging and distribution | Manifest V3, declare permissions: `activeTab`, `storage`, `host_permissions` for API domain. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Next.js <-> NestJS | HTTP REST via BFF proxy (Route Handlers) | JWT in HTTP-only cookies. Next.js adds Bearer header when proxying. All endpoints are JSON. |
| Chrome Extension <-> NestJS | HTTP REST directly from Service Worker | JWT Bearer token from chrome.storage. No cookie-based auth. CORS must allow extension origin. |
| Content Script <-> Service Worker | `chrome.runtime.sendMessage()` / `onMessage` | Async message passing. Service worker wakes on demand. Return `true` from listener for async `sendResponse`. |
| NestJS <-> Supabase | Drizzle ORM over PostgreSQL connection (TCP) | Connection string with pooler. Schema managed by Drizzle Kit migrations. |
| NestJS Modules (internal) | Direct service injection via NestJS DI | Modules export services they want to share. Reports module imports Tasks module to aggregate. |

## Build Order (Dependency Chain)

This ordering reflects technical dependencies -- what must exist before the next thing can be built.

```
Phase 1: Foundation
  ├── Database schema + Drizzle setup (everything depends on this)
  ├── NestJS project scaffold + Auth module (JWT, register, login)
  └── Next.js project scaffold + basic layout

Phase 2: Core Domain
  ├── NestJS Teams module (team CRUD, member management)
  ├── NestJS Tasks module (task CRUD, scoped to user+team+date)
  └── Next.js pages: team management, task entry form

Phase 3: Reports
  ├── NestJS Reports module (aggregation, submission status)
  ├── Next.js: daily report view, submit action
  └── Next.js: manager dashboard (team report overview)

Phase 4: Export + Polish
  ├── NestJS Export module (CSV/Excel generation)
  ├── Next.js: export UI for managers
  └── UI polish, error handling, loading states

Phase 5: Chrome Extension
  ├── Extension scaffold (manifest, service worker, content script)
  ├── Auth flow (login in popup, store token)
  ├── Content script (text selection, quick-add UI)
  └── Service worker (API relay to NestJS)
```

**Why this order:**
- **Database first** because every module depends on schema being defined.
- **Auth before anything** because all endpoints need JWT guards.
- **Teams before Tasks** because tasks are scoped to a team.
- **Tasks before Reports** because reports are aggregations of tasks.
- **Chrome Extension last** because it is a client of the already-built API -- it adds no new backend functionality, only a new entry point.

## Sources

- [NestJS Official Documentation](https://docs.nestjs.com)
- [NestJS Architecture & Advanced Patterns](https://learn.nestjs.com/p/architecture-and-advanced-patterns)
- [Supabase Architecture Docs](https://supabase.com/docs/guides/getting-started/architecture)
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Best Practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Drizzle ORM with Supabase](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase)
- [nestjs-drizzle NestJS Module](https://github.com/knaadh/nestjs-drizzle)
- [Chrome Extensions Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Chrome Extensions Content Scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Next.js Backend for Frontend Guide](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [NestJS + Next.js Auth Pattern (Hashnode)](https://abhik.hashnode.dev/next-x-nest-connecting-your-nextjs-app-to-a-nestjs-backend)
- [Anuko Time Tracker Database Structure](https://www.anuko.com/time-tracker/faq/database-tables.htm)
- [Best ORM for NestJS in 2025 (DEV Community)](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c)
- [Multi-Tenant RLS with Supabase (DEV Community)](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)

---
*Architecture research for: Daily Report / Time Tracking Web App*
*Researched: 2026-03-06*

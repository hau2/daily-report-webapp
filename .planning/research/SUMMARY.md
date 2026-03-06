# Project Research Summary

**Project:** Daily Report Web App
**Domain:** Daily report / team task logging SaaS with Chrome extension
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

This is a multi-tenant team productivity tool where members log daily tasks and managers review submitted reports. The competitive landscape is dominated by Slack-native bots (Geekbot, DailyBot, Standuply) that capture standups in chat channels. This product differentiates by capturing tasks at the source via a Chrome extension (highlight text on Jira/GitLab, auto-capture the URL) and presenting them in a purpose-built web dashboard. The architecture is a three-app monorepo: Next.js frontend on Vercel, NestJS backend in Docker on a VPS, and a WXT-based Chrome extension -- all sharing TypeScript types through a shared package and backed by Supabase-managed PostgreSQL via Prisma ORM.

The recommended approach is to build foundation-first along the dependency chain: database schema and auth, then team/task CRUD, then the report submission and manager dashboard, then export, and finally the Chrome extension. The extension depends on a working backend API and auth system, so it comes last in build order, but it must be treated as the primary input method in UX design from the start. The daily report view is not a data-entry screen -- it is a review-and-submit screen for tasks already captured via the extension throughout the day.

The top risks are: (1) multi-tenant data leakage if team_id scoping is inconsistent across queries, (2) timezone bugs that attribute reports to the wrong calendar day, (3) Chrome extension service worker termination losing draft task data under Manifest V3, and (4) authentication token desync between Next.js SSR and client-side rendering. All four must be addressed in the foundation phase by establishing the correct patterns before feature code is written. Retrofitting any of these is significantly more expensive than getting them right initially.

## Key Findings

### Recommended Stack

The stack centers on NestJS 10 (backend), Next.js 16 with React 19 (frontend), and WXT (Chrome extension), all in TypeScript on Node.js 22 LTS. The monorepo uses pnpm workspaces with Turborepo for build orchestration. Data lives in Supabase-managed PostgreSQL accessed through Prisma 7 ORM, chosen over Drizzle for its schema-first migrations, Prisma Studio, and mature NestJS integration -- performance differences are irrelevant at this product's scale (tens of reports per team daily).

**Core technologies:**
- **NestJS 10 + Passport + JWT:** Backend API with modular architecture, decorator-based auth guards, and first-class TypeScript
- **Next.js 16 (App Router):** Frontend with React Server Components for fast loads, Route Handlers as BFF proxy to NestJS
- **Prisma 7:** Schema-first ORM with auto-migrations, type-safe client, and built-in Studio for development
- **Supabase (PostgreSQL):** Managed database with connection pooling via Supavisor; used as pure database, not as auth/realtime provider
- **WXT 0.20:** Chrome extension framework with Vite-based HMR, React support, automatic Manifest V3 generation
- **shadcn/ui + Tailwind CSS 4:** Copy-to-project component library on accessible Radix primitives with utility-first CSS
- **TanStack Query 5 + Zustand 5:** Server state caching (API data) and client UI state (sidebar, modals) kept separate
- **React Hook Form + Zod 4:** Uncontrolled form components with TypeScript-first schema validation shared across frontend and backend
- **Argon2:** Password hashing (OWASP recommended, no 72-byte limit like bcrypt)
- **Vitest 3 + Playwright 1.50:** Unit/integration testing and E2E testing across the monorepo

### Expected Features

**Must have (table stakes) -- ship in v1:**
- Email/password authentication with JWT
- Team creation, member invitations, role separation (manager/member)
- Task entry (title, hours, source link, notes) with edit before submission
- Daily report view with submit action
- Manager dashboard with "who hasn't submitted" indicator
- Export to CSV
- Date navigation for historical reports
- Chrome extension: highlight text to add task with auto-captured source URL
- Responsive web design

**Should have (differentiators) -- v1.x after validation:**
- Submission reminders (configurable deadline)
- Quick task templates / recent tasks
- Manager comments on submitted reports
- Multi-team membership
- Google OAuth login
- Native Excel (.xlsx) export

**Defer (v2+):**
- Weekly/monthly summary dashboards
- Team analytics and trends
- Slack/Teams bot integration
- AI-generated summaries
- Custom report templates

**Anti-features (explicitly avoid):**
- Live timer/stopwatch (this is a reporting tool, not a time tracker)
- Screenshot monitoring (destroys trust, wrong product category)
- Approval/reject workflow (adds bureaucratic friction)
- Complex tag/category systems (scope creep)
- Real-time WebSocket updates (batch-oriented workflow, not worth the complexity)

### Architecture Approach

The system follows a three-layer architecture: client layer (Next.js + Chrome extension), API layer (NestJS with module-per-domain), and data layer (Supabase PostgreSQL). The Next.js frontend acts as a BFF proxy -- the browser never talks directly to NestJS, which eliminates CORS issues and keeps JWT tokens in httpOnly cookies. The Chrome extension bypasses the BFF and calls NestJS directly via its service worker, storing its own JWT in `chrome.storage.local`. A daily report is not a separate database entity; it is a virtual aggregate of tasks for a (user_id, team_id, date) tuple, with a `report_submissions` table tracking only the submission status.

**Major components:**
1. **NestJS Auth Module** -- registration, login, JWT issuance/refresh, Argon2 password hashing, Passport guards
2. **NestJS Teams Module** -- team CRUD, invitation tokens, role-based guards (manager vs member)
3. **NestJS Tasks Module** -- task CRUD scoped to user + team + date, source URL storage
4. **NestJS Reports Module** -- aggregate tasks into daily reports, track submission status, manager views
5. **NestJS Export Module** -- CSV/Excel generation with streaming for large datasets
6. **Next.js BFF Proxy** -- Route Handlers forwarding requests with httpOnly cookie auth to NestJS
7. **Chrome Extension** -- content script (text selection), service worker (API gateway), popup (quick review)

### Critical Pitfalls

1. **Multi-tenant data leakage** -- every query must include team_id scoping. Build a NestJS interceptor that injects team context. Write cross-tenant integration tests for every endpoint from day one. Enable Supabase RLS as defense-in-depth.
2. **Timezone chaos in daily reports** -- store each user's IANA timezone in their profile. Use an explicit `report_date DATE` column determined by the user's local date, not derived from UTC timestamps. Test across DST boundaries.
3. **Chrome extension service worker termination** -- never store state in service worker memory. Persist draft task data to `chrome.storage.local` immediately on text highlight. Popup reads from storage, not from message passing. Register all event listeners synchronously.
4. **Auth token desync between SSR and client** -- use httpOnly cookies as the single auth source. Route all API calls through Next.js BFF proxy (same-origin requests). Never store JWT in localStorage.
5. **UX friction kills adoption** -- design the Chrome extension as the primary input method, not an afterthought. Quick-add flow should take under 10 seconds. The web daily view is for review and submission, not initial data entry.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Database, Auth, Project Scaffold)
**Rationale:** Every feature depends on the database schema, authentication, and project structure. The tenant isolation pattern, timezone handling, and auth token flow must be established before any feature code. Research unanimously identifies these as "get wrong and retrofitting costs 10x."
**Delivers:** Monorepo scaffold (apps/web, apps/api, apps/extension, packages/shared), Prisma schema with all tables, NestJS auth module (register, login, JWT with httpOnly cookies), Next.js BFF proxy setup, basic layout shell.
**Addresses:** Email/password auth, basic profile settings, project structure.
**Avoids:** Multi-tenant data leakage (team_id scoping from start), timezone chaos (user timezone + report_date in schema), auth token desync (httpOnly cookies + BFF proxy from start), Supabase service_role key misuse (request-scoped client pattern).

### Phase 2: Core Domain (Teams + Tasks)
**Rationale:** Teams and tasks are the data foundation for everything else. Teams must exist before tasks (tasks are team-scoped). The task entry UX should be designed for minimal friction even in the web interface.
**Delivers:** Team creation, member invitation flow, role separation (manager/member), task CRUD (title, hours, source link, notes), daily task list view with inline editing.
**Addresses:** Team creation + invitations, role separation, task entry, edit/adjust before submission, date navigation.
**Avoids:** IDOR on task endpoints (ownership verification), N+1 queries (composite index on tasks).

### Phase 3: Reports + Manager Experience
**Rationale:** Reports are virtual aggregates of tasks, so they depend on the task system. The manager dashboard is the primary value proposition for buyers (managers). The "who hasn't submitted" indicator is the single most requested manager feature across all competitors.
**Delivers:** Submit daily report action (draft -> submitted), manager dashboard with team report overview, submission status indicators, date-range filtering.
**Addresses:** Submit daily report, manager dashboard, "who hasn't submitted" indicator, responsive design for dashboard.
**Avoids:** Reports-as-separate-entities anti-pattern (virtual aggregate only), N+1 queries in manager view (single JOIN query).

### Phase 4: Export + Polish
**Rationale:** Export requires completed report data to be useful. This phase also handles error states, loading indicators, and edge cases that make the product feel production-ready.
**Delivers:** CSV export for managers, comprehensive error handling, loading states, form validation polish, empty states, responsive design pass.
**Addresses:** Export to CSV, responsive design, basic profile/account settings.
**Avoids:** Export OOM/timeout (streaming + pagination), CSV encoding issues (UTF-8 BOM for Excel).

### Phase 5: Chrome Extension
**Rationale:** The extension is a client of the existing API -- it adds no new backend endpoints, only a new entry point. Building it last ensures the API it depends on is stable. However, UX decisions from Phase 2 (task entry form design) should already anticipate the extension as the primary input method.
**Delivers:** WXT Chrome extension with content script (text selection detection), service worker (API gateway with auth), popup UI (quick review, login), auto-captured source URLs.
**Addresses:** Chrome extension highlight-to-add, auto-captured source URLs, "log as you go" workflow.
**Avoids:** Service worker state loss (chrome.storage.local from start), extension permission over-request (activeTab, not all_urls), auth polling (lazy auth check only on interaction).

### Phase Ordering Rationale

- **Dependency chain drives order:** Database -> Auth -> Teams -> Tasks -> Reports -> Export -> Extension. Each layer requires the one below it.
- **Architecture research confirms:** The build order matches the dependency chain identified in ARCHITECTURE.md exactly.
- **Extension last but designed first:** The extension is the last thing built but should inform UX decisions from Phase 2 onward. Task entry forms should be minimal (only title required) because the extension will auto-populate title from highlighted text and source URL from the current page.
- **Manager dashboard in Phase 3 (not later):** Managers are the buyers. Getting the dashboard right early enables internal dogfooding and stakeholder demos.
- **Export deferred to Phase 4:** Low complexity but depends on having real report data. Not worth building until the report flow is complete.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Auth):** The httpOnly cookie + BFF proxy + NestJS JWT integration is well-documented individually but the combined pattern (especially token refresh across SSR and client) has nuances. Research specific Next.js 16 + NestJS auth examples.
- **Phase 5 (Chrome Extension):** Manifest V3 service worker lifecycle, WXT framework conventions, and content script injection patterns all warrant targeted research. The service worker termination problem is well-known but solutions are framework-specific.

Phases with standard patterns (skip deep research):
- **Phase 2 (Teams + Tasks):** Standard NestJS CRUD modules with guards. Well-documented pattern.
- **Phase 3 (Reports + Manager Dashboard):** SQL aggregation queries and React dashboard components. Standard patterns.
- **Phase 4 (Export):** CSV/Excel generation with exceljs is straightforward and well-documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official releases and npm. Versions confirmed current as of March 2026. Clear rationale for every choice with alternatives documented. |
| Features | HIGH | Feature landscape validated against 5+ competitors (Geekbot, DailyBot, Jell, Standuply, Toggl). Dependency chain is clear. MVP scope is well-defined. |
| Architecture | HIGH | Standard NestJS + Next.js + PostgreSQL patterns. BFF proxy pattern documented in Next.js official guides. Chrome extension architecture follows Manifest V3 best practices. |
| Pitfalls | HIGH | Each pitfall sourced from production post-mortems, official documentation warnings, or established security guidance (OWASP, Chrome developer docs). Recovery strategies included. |

**Overall confidence:** HIGH

### Gaps to Address

- **ORM discrepancy between research files:** STACK.md recommends Prisma 7 while ARCHITECTURE.md references Drizzle ORM throughout (schema examples, drizzle.config.ts, drizzle.provider.ts). The implementation must pick one. Recommendation: follow STACK.md and use Prisma. Architecture patterns (module-per-domain, date-partitioned ownership, virtual report aggregates) are ORM-agnostic and transfer directly. Schema examples in ARCHITECTURE.md should be mentally translated from Drizzle syntax to Prisma schema syntax.
- **Supabase RLS vs. NestJS-only auth:** PITFALLS.md recommends request-scoped Supabase clients with per-user JWT for RLS enforcement, but STACK.md positions Supabase as "pure database" with NestJS handling all auth. Decision: use NestJS as primary auth gate with Prisma (which doesn't use Supabase JS client). Enable RLS as defense-in-depth but do not depend on it for authorization logic. This simplifies the architecture since Prisma connects via standard PostgreSQL connection string, not the Supabase JS SDK.
- **Chrome extension team selector for multi-team users:** FEATURES.md notes multi-team membership "complicates" the extension (needs team selector). Since multi-team is deferred to v1.x, the v1 extension can assume single-team. But the task API should already support team_id so the extension can be extended later without API changes.
- **Email delivery for invitations and reminders:** No research file covers email infrastructure (transactional email provider, templates). This will need to be addressed during Phase 2 planning when building the invitation flow.
- **Deployment pipeline details:** GitHub Actions CI/CD is mentioned in STACK.md but no research covers the VPS deployment strategy (Docker registry, deployment automation, SSL/TLS setup). Needs attention during Phase 1 planning.

## Sources

### Primary (HIGH confidence)
- [NestJS Official Documentation](https://docs.nestjs.com) -- framework patterns, auth, modules, Prisma recipe
- [Next.js Official Documentation](https://nextjs.org/docs) -- App Router, Route Handlers, BFF pattern
- [Prisma Documentation](https://www.prisma.io/docs) -- ORM setup, NestJS integration, migrations
- [Chrome Extensions Developer Documentation](https://developer.chrome.com/docs/extensions) -- Manifest V3, service workers, content scripts, message passing
- [Supabase Documentation](https://supabase.com/docs) -- PostgreSQL hosting, connection pooling, RLS
- [WXT Framework](https://wxt.dev/) -- Chrome extension framework documentation

### Secondary (MEDIUM confidence)
- [Geekbot](https://geekbot.com), [DailyBot](https://www.dailybot.com), [Jell](https://jell.com) -- competitor feature analysis
- [Toggl Track](https://toggl.com) -- time tracking philosophy (trust vs. monitoring)
- [AWS Multi-tenant RLS Guide](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) -- tenant isolation patterns
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) -- Argon2 recommendation
- Community comparisons (DEV.to, Hashnode, Medium) -- NestJS + Supabase integration patterns

### Tertiary (LOW confidence)
- [WXT vs Plasmo comparison analyses](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/) -- framework recommendation based on 2025 community sentiment, may shift
- nanoid version/usage -- low-impact choice, easily swapped

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*

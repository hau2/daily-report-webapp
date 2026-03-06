# Phase 4: Manager Dashboard and Export - Research

**Researched:** 2026-03-06
**Domain:** Manager dashboard (team report viewing, submission tracking, CSV export), mobile responsiveness
**Confidence:** HIGH

## Summary

Phase 4 adds manager-facing features on top of the existing task/report infrastructure built in Phases 2-3. The core work is: (1) new backend endpoints that let managers query their team members' reports by date, (2) an endpoint to identify members who have not submitted today, (3) a CSV export endpoint, (4) new frontend pages under a `/manager` route group, and (5) a mobile-responsiveness pass across the entire app.

The database schema already has all required tables (`daily_reports`, `tasks`, `team_members`, `teams`, `users`). The `team_members.role` column distinguishes managers from members. The existing `TeamManagerGuard` enforces manager-only access. No new database migrations are needed -- all manager queries are read-only views over existing data.

**Primary recommendation:** Build 3 new backend endpoints in a dedicated `ManagerController` (or extend `TasksController`), add manager dashboard pages in the frontend, and use a responsive-first approach for all new UI while retrofitting the existing nav header for mobile.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MGMT-01 | Manager can view each team member's daily report by date | Backend: new endpoint `GET /teams/:id/reports?date=YYYY-MM-DD` returns all members' reports. Frontend: manager dashboard page with member selector and date navigation. Reuses existing `DailyReportWithTasks` type and `mapReport`/`mapTask` helpers. |
| MGMT-02 | Manager can see a list of members who haven't submitted today | Backend: new endpoint `GET /teams/:id/reports/pending?date=YYYY-MM-DD` compares team_members against daily_reports with status='submitted'. Frontend: "Not Submitted" panel on manager dashboard. |
| MGMT-03 | Manager can export team reports to CSV file | Backend: new endpoint `GET /teams/:id/reports/export?date=YYYY-MM-DD` returns CSV with `Content-Type: text/csv`. No external CSV library needed -- simple string concatenation for flat task rows. Frontend: download button that triggers browser file download. |
| UI-01 | Web app is responsive and usable on mobile browsers | Retrofit existing dashboard layout header to use hamburger/collapsible nav on small screens. Ensure all new manager pages use responsive grid (already partially done with `sm:` breakpoints in Phase 3). |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | ^11.0.0 | Backend framework | Already in use |
| Next.js 15 (App Router) | ^15.3.0 | Frontend framework | Already in use |
| @tanstack/react-query | ^5.0.0 | Data fetching/caching | Already in use |
| @supabase/supabase-js | ^2.49+ | Database client | Already in use |
| date-fns | ^4.1.0 | Date formatting/manipulation | Already in use |
| Tailwind CSS | ^4.0.0 | Styling (responsive utilities) | Already in use |
| shadcn/ui components | N/A | Card, Badge, Button, etc. | Already in use |

### Supporting (no new installs needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.469.0 | Icons (hamburger menu, download, etc.) | Already installed, use for mobile nav toggle and export button icons |
| sonner | ^2.0.7 | Toast notifications | Already installed, use for export success/error feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual CSV string building | papaparse / csv-stringify | Overkill for flat row export -- task rows are simple, no special characters to worry about beyond basic escaping |
| New NestJS module for manager | Extend existing Tasks module | Separate module is cleaner for authorization concerns; tasks module already handles member-facing task CRUD |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
├── manager/                    # NEW module
│   ├── manager.module.ts
│   ├── manager.controller.ts   # GET /teams/:id/reports, /pending, /export
│   └── manager.service.ts      # Query logic for team reports
apps/web/src/app/(dashboard)/
├── manager/                    # NEW route group
│   ├── page.tsx                # /manager -> redirect to /manager/[teamId]
│   └── [teamId]/
│       └── page.tsx            # Main manager dashboard for a team
```

### Pattern 1: Manager Module with TeamManagerGuard
**What:** Separate NestJS module for manager-only endpoints, reusing existing `TeamManagerGuard` from teams module.
**When to use:** All manager dashboard endpoints.
**Example:**
```typescript
// apps/api/src/manager/manager.controller.ts
@Controller('teams/:id')
@UseGuards(AccessTokenGuard, TeamManagerGuard)
export class ManagerController {
  @Get('reports')
  async getTeamReports(
    @Param('id') teamId: string,
    @Query('date') date: string,
  ) { ... }

  @Get('reports/pending')
  async getPendingSubmissions(
    @Param('id') teamId: string,
    @Query('date') date: string,
  ) { ... }

  @Get('reports/export')
  async exportTeamReports(
    @Param('id') teamId: string,
    @Query('date') date: string,
    @Res() res: Response,
  ) { ... }
}
```

### Pattern 2: CSV Export via NestJS Response Object
**What:** Use `@Res()` to stream CSV content with proper headers for browser download.
**When to use:** Export endpoint.
**Example:**
```typescript
@Get('reports/export')
async exportTeamReports(
  @Param('id') teamId: string,
  @Query('date') date: string,
  @Res() res: Response,
) {
  const csv = await this.managerService.generateCsv(teamId, date);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="team-report-${date}.csv"`);
  res.send(csv);
}
```

### Pattern 3: Frontend Download Trigger
**What:** Use `window.open()` or anchor element click to trigger CSV download from the API.
**When to use:** Export button on manager dashboard.
**Example:**
```typescript
function handleExport(teamId: string, date: string) {
  const url = `${API_URL}/teams/${teamId}/reports/export?date=${date}`;
  // Use fetch with credentials to handle auth cookies
  fetch(url, { credentials: 'include' })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-report-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
}
```

### Pattern 4: Mobile-Responsive Nav (Hamburger Pattern)
**What:** Collapsible navigation on small screens using existing Tailwind breakpoints.
**When to use:** Dashboard layout header.
**Example:**
```typescript
// Toggle visibility of nav links on small screens
<nav className="hidden sm:flex items-center gap-4">
  {/* Desktop nav links */}
</nav>
<button className="sm:hidden" onClick={toggleMenu}>
  {/* Hamburger icon from lucide-react */}
</button>
{isMenuOpen && (
  <nav className="sm:hidden flex flex-col gap-2 p-4 border-t">
    {/* Mobile nav links */}
  </nav>
)}
```

### Anti-Patterns to Avoid
- **Fetching all reports then filtering client-side:** Query only the needed date range server-side. The database has `idx_daily_reports_team_date` index for this.
- **Building CSV on the frontend:** Keep export server-side to avoid loading all data into client memory and to leverage the existing auth guard.
- **Adding a new table for "pending submissions":** This is a computed view (team_members LEFT JOIN daily_reports). No schema changes needed.
- **Creating a separate auth mechanism for CSV downloads:** Reuse httpOnly cookie auth. The `fetch` with `credentials: 'include'` handles this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV field escaping | Custom regex escaping | Simple rule: wrap fields containing commas/quotes/newlines in double quotes, escape internal quotes by doubling | Edge cases are minimal for this data (task titles, hours, URLs) but must handle commas in titles |
| Date validation | Custom date parser | Reuse existing `DATE_REGEX` pattern from TasksController + `date-fns` `isValid` | Already established pattern |
| Manager authorization | Per-endpoint role checks | Reuse `TeamManagerGuard` at controller level | Already implemented in Phase 2, tested and working |
| Mobile responsive grid | Custom media queries | Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) | Already used in Phase 3 report page |

**Key insight:** Phase 4 is primarily a data aggregation and display phase. All the building blocks (database schema, auth guards, UI components, query patterns) exist from Phases 1-3. The work is composing them into manager-facing views.

## Common Pitfalls

### Pitfall 1: TeamManagerGuard Route Conflict
**What goes wrong:** NestJS route parameter matching conflicts when `teams/:id/reports` overlaps with existing `teams/:id/members` or `teams/:id/invitations`.
**Why it happens:** Both the existing TeamsController and new ManagerController would match `teams/:id/*` routes.
**How to avoid:** Either (a) use the same TeamsController and add methods there, or (b) use a separate ManagerController but ensure no route conflicts. The manager routes (`/reports`, `/reports/pending`, `/reports/export`) don't conflict with existing routes (`/members`, `/invitations`).
**Warning signs:** 404s or wrong controller handling requests.

### Pitfall 2: CSV Export Authentication
**What goes wrong:** CSV download fails because `window.open()` doesn't send httpOnly cookies in some configurations.
**Why it happens:** `window.open()` creates a new browsing context that may or may not carry cookies depending on SameSite settings.
**How to avoid:** Use `fetch()` with `credentials: 'include'` to download the CSV as a blob, then create an object URL for download. This guarantees cookies are sent.
**Warning signs:** 401 errors on export, or export working in dev but failing in production.

### Pitfall 3: "Not Submitted" Query Missing Draft Reports
**What goes wrong:** Members who created a draft but didn't submit are shown as "submitted" because a `daily_reports` row exists.
**Why it happens:** Querying for the existence of a `daily_reports` row without checking `status = 'submitted'`.
**How to avoid:** The pending query must explicitly check `status = 'submitted'`. A member with a draft report should appear in the "not submitted" list.
**Warning signs:** Members disappear from pending list as soon as they add their first task (which creates a draft report).

### Pitfall 4: Mobile Nav Not Closing on Route Change
**What goes wrong:** User taps a link in mobile menu, navigates to new page, but menu stays open.
**Why it happens:** React state for menu open doesn't reset on navigation.
**How to avoid:** Listen to `pathname` changes (from `usePathname()`) and close the menu in a `useEffect`.
**Warning signs:** Menu stays open after tapping a link.

### Pitfall 5: NestJS @Res() Bypasses Interceptors
**What goes wrong:** When using `@Res()` decorator for CSV export, NestJS interceptors and exception filters don't work as expected.
**Why it happens:** `@Res()` puts NestJS in "library-specific mode" where you manage the response manually.
**How to avoid:** Use `@Res({ passthrough: true })` if you still want NestJS to handle some response logic, but for CSV download, manual response is fine since you're setting custom headers anyway. Just ensure error handling is explicit in the controller method.
**Warning signs:** Uncaught errors returning raw stack traces instead of formatted error responses.

## Code Examples

### Team Reports Query (Backend)
```typescript
// Get all team members' reports for a specific date
async getTeamReports(teamId: string, date: string) {
  const client = this.supabaseService.getClient();

  // 1. Get team members
  const { data: members } = await client
    .from('team_members')
    .select('user_id, role')
    .eq('team_id', teamId);

  const userIds = members.map(m => m.user_id);

  // 2. Get user details
  const { data: users } = await client
    .from('users')
    .select('id, email, display_name')
    .in('id', userIds);

  // 3. Get reports for the date
  const { data: reports } = await client
    .from('daily_reports')
    .select('*')
    .eq('team_id', teamId)
    .eq('report_date', date)
    .in('user_id', userIds);

  // 4. Get tasks for those reports
  const reportIds = (reports ?? []).map(r => r.id);
  let tasks = [];
  if (reportIds.length > 0) {
    const { data } = await client
      .from('tasks')
      .select('*')
      .in('report_id', reportIds)
      .order('sort_order')
      .order('created_at');
    tasks = data ?? [];
  }

  // 5. Assemble per-member view
  // ... map users -> reports -> tasks
}
```

### Pending Submissions Query (Backend)
```typescript
// Get members who haven't submitted for a date
async getPendingSubmissions(teamId: string, date: string) {
  const client = this.supabaseService.getClient();

  // 1. All team members
  const { data: members } = await client
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  // 2. Members who have submitted
  const { data: submitted } = await client
    .from('daily_reports')
    .select('user_id')
    .eq('team_id', teamId)
    .eq('report_date', date)
    .eq('status', 'submitted');

  const submittedIds = new Set((submitted ?? []).map(r => r.user_id));
  const pendingIds = (members ?? [])
    .map(m => m.user_id)
    .filter(id => !submittedIds.has(id));

  // 3. Get user details for pending members
  // ...
}
```

### CSV Generation (Backend)
```typescript
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCsv(rows: Array<{
  memberName: string;
  memberEmail: string;
  reportDate: string;
  status: string;
  taskTitle: string;
  hours: number;
  sourceLink: string;
  notes: string;
}>): string {
  const header = 'Member Name,Email,Date,Report Status,Task,Hours,Source Link,Notes\n';
  const body = rows.map(r =>
    [r.memberName, r.memberEmail, r.reportDate, r.status,
     r.taskTitle, r.hours.toString(), r.sourceLink, r.notes]
      .map(f => escapeCsvField(f ?? ''))
      .join(',')
  ).join('\n');
  return header + body;
}
```

### Mobile-Responsive Dashboard Layout (Frontend)
```typescript
// Existing header with mobile hamburger
'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

function DashboardHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-10 border-b bg-white px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Daily Report</h1>
        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
          {/* ... existing nav links ... */}
        </div>
        {/* Mobile toggle */}
        <button className="sm:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {/* Mobile nav */}
      {menuOpen && (
        <nav className="sm:hidden mt-3 flex flex-col gap-3 border-t pt-3">
          {/* ... nav links stacked vertically ... */}
        </nav>
      )}
    </header>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side rendered dashboards | Client-side SPA with React Query | Standard since ~2022 | Already using this approach. Manager dashboard follows same pattern. |
| Custom XLSX export libraries | CSV for v1, native XLSX deferred to v2 | Per REQUIREMENTS.md | Simpler implementation. MGMT-05 (xlsx) explicitly deferred. |

**Deprecated/outdated:**
- None relevant -- all current stack components are current versions.

## Open Questions

1. **Should the manager dashboard use a single page with tabs or separate pages per member?**
   - What we know: Teams can be small (3-10 members), reports are per-date.
   - What's unclear: Whether managers want to see all reports at once or one at a time.
   - Recommendation: Single page showing all members for a given date, with expandable/collapsible report sections per member. This matches the "see who has submitted" requirement naturally.

2. **Should CSV export cover a single date or a date range?**
   - What we know: MGMT-03 says "export team reports to CSV file" without specifying range.
   - What's unclear: Whether single-date export is sufficient.
   - Recommendation: Start with single-date export (matches the dashboard view). Date range export can be added later without API changes.

3. **Should the "Manager" nav link always be visible or only for users with manager role?**
   - What we know: The frontend already fetches `/teams/my` which returns role per team.
   - What's unclear: If a user is a member of one team and manager of another.
   - Recommendation: Show "Manager" link conditionally based on whether user has manager role in any team. Filter the manager dashboard to only show teams where they're manager.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `cd apps/api && pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MGMT-01 | Manager gets team member reports by date | unit | `cd apps/api && pnpm vitest run src/manager/manager.service.spec.ts -t "getTeamReports"` | No -- Wave 0 |
| MGMT-02 | Manager gets pending submissions list | unit | `cd apps/api && pnpm vitest run src/manager/manager.service.spec.ts -t "getPending"` | No -- Wave 0 |
| MGMT-03 | Manager exports CSV for team | unit | `cd apps/api && pnpm vitest run src/manager/manager.service.spec.ts -t "generateCsv"` | No -- Wave 0 |
| MGMT-03 | CSV escaping edge cases | unit | `cd apps/api && pnpm vitest run src/manager/manager.service.spec.ts -t "escapeCsv"` | No -- Wave 0 |
| UI-01 | Mobile responsive layout | manual-only | N/A -- visual verification in browser at 375px viewport | N/A |

### Sampling Rate
- **Per task commit:** `cd apps/api && pnpm vitest run --reporter=verbose`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + manual mobile viewport check before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/manager/manager.service.spec.ts` -- covers MGMT-01, MGMT-02, MGMT-03
- [ ] Test stubs for: getTeamReports, getPendingSubmissions, generateCsv, CSV field escaping
- [ ] Reuses existing `createMockSupabaseService()` from `apps/api/test/setup.ts`

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `apps/api/src/tasks/`, `apps/api/src/teams/`, `apps/web/src/app/(dashboard)/` -- established patterns for controllers, services, guards, and frontend pages
- Database schema: `database/migrations/002_team_management.sql`, `003_task_management.sql` -- confirms all needed tables and indexes exist
- `packages/shared/src/types/task.ts` -- DailyReport, Task, DailyReportWithTasks types
- `apps/api/src/teams/guards/team-manager.guard.ts` -- existing manager authorization guard

### Secondary (MEDIUM confidence)
- NestJS `@Res()` behavior with interceptors -- based on NestJS documentation patterns for file/stream responses
- Tailwind responsive design utilities -- standard Tailwind CSS patterns already used in the project

### Tertiary (LOW confidence)
- None -- all findings verified against the existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all dependencies already installed and working
- Architecture: HIGH -- follows exact patterns established in Phases 1-3 (NestJS module, guard, service, controller + Next.js pages with React Query)
- Pitfalls: HIGH -- identified from direct code inspection (route conflicts, @Res decorator behavior, draft vs submitted distinction)

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable -- no external dependency changes expected)

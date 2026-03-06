# Phase 3: Task Management and Daily Reports - Research

**Researched:** 2026-03-06
**Domain:** Task CRUD, daily report lifecycle (draft/submitted), date-based navigation
**Confidence:** HIGH

## Summary

Phase 3 introduces the core product feature: task logging and daily report submission. The domain involves two new database tables (`tasks` and `daily_reports`), a NestJS `TasksModule` with CRUD endpoints, a report submission/locking mechanism, and frontend pages for task entry, daily review, and date navigation.

The architecture follows established project patterns exactly: Supabase JS client with service-role key (no Prisma), NestJS modules with DTOs and guards, shared Zod schemas and TypeScript types in `packages/shared`, and Next.js App Router pages using `@tanstack/react-query` with the existing `api-client.ts`. No new dependencies are required -- the existing stack handles everything.

**Primary recommendation:** Model `daily_reports` as an explicit table (not derived) with a `status` field (`draft`/`submitted`) and a `submitted_at` timestamp. Tasks belong to a daily_report via `report_id`. The report's status controls editability -- all mutation endpoints check `status !== 'submitted'` before allowing changes.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TASK-01 | User can create a task with title, estimated hours, source link, and notes | TasksService.createTask + POST /tasks endpoint + CreateTaskDto + task creation form |
| TASK-02 | User can edit a task (title, hours, link, notes) before report is submitted | TasksService.updateTask + PATCH /tasks/:id with report status guard |
| TASK-03 | User can delete a task before report is submitted | TasksService.deleteTask + DELETE /tasks/:id with report status guard |
| TASK-04 | User can view today's tasks as a daily report | GET /reports/daily?date=YYYY-MM-DD returns report + tasks; daily report page |
| TASK-05 | User can adjust hours on tasks during end-of-day review | Same as TASK-02 -- PATCH /tasks/:id updates estimated_hours |
| TASK-06 | User can submit daily report (draft->submitted, locks editing) | POST /reports/:id/submit sets status='submitted' and submitted_at |
| TASK-07 | User can navigate to view/edit reports from previous days | Date picker/navigation on report page; same GET endpoint with date param |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | (existing) | Database access via service-role client | Project decision: Supabase JS, not Prisma |
| @nestjs/common, @nestjs/core | (existing) | Backend framework | Established in Phase 1 |
| class-validator, class-transformer | (existing) | DTO validation | Established pattern in Phase 2 DTOs |
| zod | (existing) | Shared schema validation | Established in packages/shared |
| @tanstack/react-query | (existing) | Frontend data fetching/caching | Established in Phase 1-2 frontend |
| react-hook-form | (existing) | Form state management | Established in auth/settings pages |
| sonner | (existing) | Toast notifications | Established in Phase 1 |

### Supporting (may need to install)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | latest | Date formatting, day navigation, date arithmetic | Format display dates, compute today/yesterday, date picker logic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| date-fns | dayjs | date-fns is tree-shakeable and more standard in modern projects; dayjs is smaller but mutable API |
| date-fns | Native Intl/Date | Sufficient for simple formatting but cumbersome for date arithmetic (add/subtract days) |
| Separate daily_reports table | Derive reports from tasks grouped by date | Explicit table gives clear status tracking, submission timestamp, and avoids complex queries |

**Installation:**
```bash
pnpm add date-fns --filter @daily-report/web
```

Note: date-fns is only needed on the frontend for display formatting and date navigation. The backend uses ISO date strings and PostgreSQL DATE type natively.

## Architecture Patterns

### Database Schema

```sql
-- Migration: 003_task_management
-- Two tables: daily_reports (report-level metadata) and tasks (individual work items)

CREATE TABLE IF NOT EXISTS daily_reports (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id      UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  report_date  DATE        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id, report_date)
);

CREATE TABLE IF NOT EXISTS tasks (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id       UUID        NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  estimated_hours NUMERIC(4,2) NOT NULL CHECK (estimated_hours > 0 AND estimated_hours <= 24),
  source_link     TEXT,
  notes           TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_daily_reports_user_date ON daily_reports (user_id, report_date);
CREATE INDEX idx_daily_reports_team_date ON daily_reports (team_id, report_date);
CREATE INDEX idx_tasks_report_id ON tasks (report_id);

-- Reuse existing updated_at trigger function
CREATE TRIGGER daily_reports_updated_at
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Key design decisions:**

1. **`daily_reports` is explicit, not derived.** A report has a lifecycle (draft -> submitted). Deriving status from tasks would require complex queries and lose the submission timestamp.

2. **`team_id` on daily_reports.** The roadmap notes "task API designed with team_id from Phase 3 to support future multi-team" (TEAM-05 is v2). For v1, a user belongs to one team, but the schema is ready for multi-team.

3. **UNIQUE (user_id, team_id, report_date)** prevents duplicate reports. One report per user per team per day.

4. **`NUMERIC(4,2)` for estimated_hours.** Supports values like 0.25 (15 min) to 24.00. CHECK constraint prevents zero/negative and over-24 values.

5. **`sort_order` on tasks.** Enables drag-to-reorder in future (v2) without schema changes. Default 0 for now.

6. **Tasks cascade-delete with report.** If a report is deleted, its tasks go with it. This is defensive -- reports should not be deleted in v1.

### Recommended Project Structure

```
apps/api/src/
  tasks/
    tasks.module.ts          # NestJS module
    tasks.controller.ts      # REST endpoints
    tasks.service.ts         # Business logic
    tasks.service.spec.ts    # Unit tests
    dto/
      create-task.dto.ts
      update-task.dto.ts
    guards/
      report-owner.guard.ts  # Ensures user owns the report

apps/web/src/app/(dashboard)/
  reports/
    page.tsx                 # /reports -> redirects to today
    [date]/
      page.tsx               # /reports/2026-03-06 -> daily report view

packages/shared/src/
  types/
    task.ts                  # Task, DailyReport interfaces
  schemas/
    task.schema.ts           # Zod schemas for create/update task
```

### Pattern 1: Report Auto-Creation (Get-or-Create)

**What:** When a user views or adds a task for a date, the backend auto-creates the `daily_reports` row if it doesn't exist.
**When to use:** GET /reports/daily and POST /tasks endpoints.
**Example:**
```typescript
// In TasksService
async getOrCreateReport(userId: string, teamId: string, date: string): Promise<DailyReport> {
  const client = this.supabaseService.getClient();

  // Try to find existing report
  const { data: existing } = await client
    .from('daily_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .eq('report_date', date)
    .maybeSingle();

  if (existing) return existing;

  // Create new draft report
  const { data: created, error } = await client
    .from('daily_reports')
    .insert({ user_id: userId, team_id: teamId, report_date: date, status: 'draft' })
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return created;
}
```

### Pattern 2: Report Status Guard

**What:** Before any task mutation (create/update/delete), verify the parent report is still in `draft` status.
**When to use:** All POST/PATCH/DELETE /tasks endpoints.
**Example:**
```typescript
// In TasksService, before any task mutation
async assertReportEditable(reportId: string): Promise<void> {
  const client = this.supabaseService.getClient();
  const { data } = await client
    .from('daily_reports')
    .select('status')
    .eq('id', reportId)
    .single();

  if (data?.status === 'submitted') {
    throw new ForbiddenException('Cannot modify tasks in a submitted report');
  }
}
```

### Pattern 3: Date-Based API Design

**What:** Reports are queried by date string (YYYY-MM-DD), not by report ID.
**When to use:** Frontend date navigation.
**Example:**
```typescript
// GET /reports/daily?date=2026-03-06&teamId=xxx
// Returns: { report: DailyReport, tasks: Task[] }
// If no report exists for that date, returns null/empty (or auto-creates)
```

### Anti-Patterns to Avoid
- **Storing dates as TIMESTAMPTZ for report_date:** Use PostgreSQL DATE type. Avoids timezone conversion issues when querying "today's report."
- **Client-side date for "today":** The server should accept a date parameter but validate it. Do not let the client determine "today" without the user's timezone context.
- **Separate endpoints for "review mode" vs "normal mode":** TASK-05 (adjust hours during review) uses the same PATCH /tasks/:id endpoint. There is no separate review state -- the UI simply presents tasks differently during end-of-day review.
- **Storing total hours on the report:** Derive total from SUM(tasks.estimated_hours). Storing it creates sync issues.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom date string manipulation | date-fns `format()`, `parseISO()` | Edge cases with timezones, locale, parsing |
| Form validation | Manual onChange handlers | react-hook-form + Zod resolver | Already used in auth/settings, consistent pattern |
| Data fetching/caching | Manual fetch + useState | @tanstack/react-query | Already established, handles refetching, cache invalidation |
| Toast notifications | Custom notification system | sonner `toast.success/error` | Already installed and used throughout |
| UUID generation | Custom ID generation | PostgreSQL gen_random_uuid() | Database-generated, guaranteed unique |
| Query builder chaining | Raw SQL strings | Supabase JS .from().select().eq() | Project pattern, type-safe, consistent |

**Key insight:** This phase introduces zero new libraries for the backend. The entire task/report domain is handled by existing patterns (NestJS module + Supabase queries + class-validator DTOs). The only potential new dependency is date-fns on the frontend for date navigation UX.

## Common Pitfalls

### Pitfall 1: Timezone Mismatch on "Today"
**What goes wrong:** User in UTC+8 creates a task at 10 PM local time. Server (UTC) thinks it's the next day. Task appears on wrong date.
**Why it happens:** Using server-side `new Date()` for report_date without considering user timezone.
**How to avoid:** The `report_date` is always sent by the client as a YYYY-MM-DD string based on the user's local date. The backend stores it as PostgreSQL DATE (no timezone). The `users.timezone` column (created in Phase 1) can be used for server-initiated operations later (Phase 4 reminders), but for Phase 3 the client determines the date.
**Warning signs:** Tests pass in CI (UTC) but fail for developers in non-UTC timezones; reports appear on wrong day in production.

### Pitfall 2: Race Condition on Report Auto-Creation
**What goes wrong:** Two simultaneous requests for the same user+team+date both try to INSERT a daily_report, one hits the UNIQUE constraint.
**Why it happens:** Check-then-insert without transaction or upsert.
**How to avoid:** Use Supabase `.upsert()` with `onConflict: 'user_id,team_id,report_date'` or catch the 23505 duplicate key error and re-fetch. The UNIQUE constraint is the safety net.
**Warning signs:** Intermittent 500 errors when user rapidly creates tasks.

### Pitfall 3: Forgetting to Check Report Status Before Mutations
**What goes wrong:** User submits report, then a delayed PATCH request modifies a task in the submitted report.
**Why it happens:** Only checking status on the frontend (hide edit buttons) but not enforcing on the backend.
**How to avoid:** Every task mutation endpoint (create, update, delete) must call `assertReportEditable()` before making changes. The frontend hides UI controls as UX convenience, but the backend is the authority.
**Warning signs:** Submitted reports show different data than when submitted.

### Pitfall 4: N+1 Queries When Fetching Report With Tasks
**What goes wrong:** Fetching a report, then individually fetching each task.
**Why it happens:** Not thinking about the query pattern upfront.
**How to avoid:** Single endpoint returns `{ report, tasks }`. Two Supabase queries (one for report, one for tasks by report_id) is fine and efficient. Supabase JS doesn't support JOINs elegantly for this pattern, so two queries is the established approach (same as teams two-step fetch pattern in Phase 2).
**Warning signs:** Slow page loads, multiple network waterfalls.

### Pitfall 5: Losing Team Context
**What goes wrong:** User creates tasks without a team_id, or the API doesn't know which team the report belongs to.
**Why it happens:** In v1, users have one team, but the schema supports multiple. The frontend needs to resolve which team to use.
**How to avoid:** The frontend fetches the user's team (from `/teams/my`) and passes `teamId` when creating/fetching reports. If user has exactly one team, auto-select it. If multiple teams exist (future), show a team selector.
**Warning signs:** "team_id cannot be null" database errors; tasks appearing under wrong team.

## Code Examples

### Shared Types (packages/shared/src/types/task.ts)
```typescript
export interface Task {
  id: string;
  reportId: string;
  title: string;
  estimatedHours: number;
  sourceLink: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReport {
  id: string;
  userId: string;
  teamId: string;
  reportDate: string;       // YYYY-MM-DD
  status: 'draft' | 'submitted';
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReportWithTasks {
  report: DailyReport;
  tasks: Task[];
  totalHours: number;
}
```

### Shared Zod Schemas (packages/shared/src/schemas/task.schema.ts)
```typescript
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  estimatedHours: z.number().positive().max(24),
  sourceLink: z.string().url().max(2000).optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  teamId: z.string().uuid(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  estimatedHours: z.number().positive().max(24).optional(),
  sourceLink: z.string().url().max(2000).optional().or(z.literal('')).or(z.null()),
  notes: z.string().max(2000).optional().or(z.null()),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

### NestJS DTO Pattern (following Phase 2 convention)
```typescript
// apps/api/src/tasks/dto/create-task.dto.ts
import { IsString, IsNumber, IsOptional, IsUrl, IsUUID, Min, Max, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsNumber()
  @Min(0.01)
  @Max(24)
  estimatedHours!: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  sourceLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  reportDate!: string;

  @IsUUID()
  teamId!: string;
}
```

### API Endpoints

```
POST   /tasks                    - Create a task (auto-creates report if needed)
PATCH  /tasks/:id                - Update a task
DELETE /tasks/:id                - Delete a task
GET    /reports/daily?date=YYYY-MM-DD&teamId=UUID  - Get report + tasks for a date
POST   /reports/:id/submit       - Submit report (draft -> submitted)
```

### Frontend Query Pattern (following established convention)
```typescript
// Fetch daily report
const { data, isLoading } = useQuery({
  queryKey: ['reports', 'daily', date, teamId],
  queryFn: () => api.get<DailyReportWithTasks>(`/reports/daily?date=${date}&teamId=${teamId}`),
  enabled: !!teamId,
});

// Create task mutation
const createTask = useMutation({
  mutationFn: (input: CreateTaskInput) => api.post<Task>('/tasks', input),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'daily', date, teamId] });
    toast.success('Task added');
  },
  onError: (error: Error) => toast.error(error.message),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma ORM | Supabase JS client | Phase 1 user override | All queries use .from().select().eq() pattern |
| Single auth cookie | Dual JWT (access + refresh) | Phase 1 | All authenticated endpoints use AccessTokenGuard |
| Supabase joins | Two-step fetch pattern | Phase 2 | Fetch IDs first, then fetch related rows by IDs |

**Relevant to this phase:**
- The two-step fetch pattern (established in Phase 2 TeamsService) applies when loading report + tasks. However, since tasks reference report_id directly, a simple `.eq('report_id', id)` query suffices -- no need for the two-step pattern for the task-to-report relationship.

## Open Questions

1. **Team selection UX for v1**
   - What we know: Schema supports multi-team (team_id on daily_reports). In v1, users typically have one team.
   - What's unclear: Should the UI auto-select the user's only team, or always show a team dropdown?
   - Recommendation: Auto-select if user has exactly one team. Store selected team in query params or local state. This avoids UI complexity while being forward-compatible.

2. **Past report editing policy**
   - What we know: TASK-07 says users can "view or edit past reports (if not yet submitted)."
   - What's unclear: Should there be a time limit on editing past draft reports (e.g., can't edit reports from 30 days ago)?
   - Recommendation: No time limit for v1. The `status` field is the only editing gate. Time-based restrictions can be added later.

3. **Empty reports**
   - What we know: Auto-creating report rows when viewing a date is convenient.
   - What's unclear: Should empty draft reports (no tasks) be submittable?
   - Recommendation: Prevent submitting empty reports (no tasks). The submit endpoint should check task count > 0.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `cd apps/api && pnpm vitest run src/tasks/tasks.service.spec.ts` |
| Full suite command | `cd apps/api && pnpm vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TASK-01 | Create task with title, hours, link, notes | unit | `cd apps/api && pnpm vitest run src/tasks/tasks.service.spec.ts -t "createTask"` | Wave 0 |
| TASK-02 | Edit task before submission | unit | `cd apps/api && pnpm vitest run src/tasks/tasks.service.spec.ts -t "updateTask"` | Wave 0 |
| TASK-03 | Delete task before submission | unit | `cd apps/api && pnpm vitest run src/tasks/tasks.service.spec.ts -t "deleteTask"` | Wave 0 |
| TASK-04 | View today's tasks as daily report | unit | `cd apps/api && pnpm vitest run src/tasks/tasks.service.spec.ts -t "getDailyReport"` | Wave 0 |
| TASK-05 | Adjust hours during review | unit | Same as TASK-02 (PATCH endpoint) | Wave 0 |
| TASK-06 | Submit report locks editing | unit | `cd apps/api && pnpm vitest run src/tasks/tasks.service.spec.ts -t "submitReport"` | Wave 0 |
| TASK-07 | Navigate previous days | manual-only | Browser test: navigate to /reports/2026-03-05 | N/A |

### Sampling Rate
- **Per task commit:** `cd apps/api && pnpm vitest run src/tasks/tasks.service.spec.ts`
- **Per wave merge:** `cd apps/api && pnpm vitest run`
- **Phase gate:** Full suite green + manual browser verification

### Wave 0 Gaps
- [ ] `apps/api/src/tasks/tasks.service.spec.ts` -- covers TASK-01 through TASK-06
- [ ] `apps/api/test/setup.ts` -- existing mock setup is sufficient (createMockSupabaseService already has all needed methods)
- [ ] No new framework install needed -- Vitest already configured

## Sources

### Primary (HIGH confidence)
- Project codebase inspection -- all patterns derived from existing Phase 1 and Phase 2 implementation
- `database/migrations/001_initial_schema.sql` and `002_team_management.sql` -- schema patterns
- `apps/api/src/teams/teams.service.ts` -- service layer patterns (two-step fetch, error handling)
- `apps/api/src/teams/teams.controller.ts` -- controller patterns (guards, DTOs, route ordering)
- `apps/api/test/setup.ts` -- test mock patterns
- `apps/web/src/app/(dashboard)/teams/page.tsx` -- frontend query/display patterns
- `.planning/STATE.md` -- accumulated project decisions

### Secondary (MEDIUM confidence)
- PostgreSQL DATE type behavior -- well-established, no timezone component stored
- NUMERIC(4,2) precision for hours -- standard PostgreSQL numeric type

### Tertiary (LOW confidence)
- None -- all findings based on project codebase and PostgreSQL fundamentals

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - zero new backend dependencies; all patterns established in Phase 1-2
- Architecture: HIGH - schema design follows established migration patterns; API follows NestJS conventions already in use
- Pitfalls: HIGH - identified from real project decisions (timezone handling, two-step fetch, status enforcement)

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable domain, no external dependency changes)

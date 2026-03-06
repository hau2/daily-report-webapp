# Phase 2: Team Management - Research

**Researched:** 2026-03-06
**Domain:** Team membership, role-based access, invitation tokens, Supabase JS client patterns
**Confidence:** HIGH

---

## Summary

Phase 2 adds the team layer that all subsequent phases (task management, manager dashboard) depend on. The core work is: a `teams` table, a `team_members` join table with a `role` column distinguishing managers from members, and a JWT-based invitation flow that mirrors the already-implemented email-verification and password-reset flows.

The codebase already has all the primitives needed. Resend email delivery is working. The JWT `purpose` claim pattern used for `email-verification` and `password-reset` can be reused verbatim for `team-invitation`. The `SupabaseService` singleton, `AccessTokenGuard`, DTOs via `class-validator`, and the shared Zod schema + type pattern in `packages/shared` are all established conventions that must be followed exactly.

The invitation accept flow has one significant asymmetry: the invitee may or may not already have an account. If they do not, they must register first before the invitation link can be consumed. The simplest correct approach is to require the invitee to be logged in when they click the accept link — the frontend redirects unauthenticated users to `/register?next=/join?token=...` so the token survives the registration redirect.

**Primary recommendation:** Model this as three NestJS modules: `TeamsModule` (CRUD + membership reads), `InvitationsModule` (send + accept, owns the token lifecycle). Keep all role enforcement in NestJS; Supabase RLS remains defence-in-depth only (service-role key bypasses it anyway).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEAM-01 | User can create a new team (creator becomes manager/owner) | `teams` table with `created_by` FK; insert team row + insert team_members row as `manager` in a sequential pair of Supabase calls |
| TEAM-02 | Manager can invite members via email link | Invitation token = JWT with `purpose: 'team-invitation'`, `teamId`, `inviteeEmail`; sent via existing `EmailService.sendX` pattern; stored as pending row in `team_invitations` table |
| TEAM-03 | Invited user can join team via invitation link | Frontend `/join?token=...` page; backend `POST /teams/invitations/accept`; verify JWT, verify invitee email matches logged-in user, insert `team_members` row, mark invitation used |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.49.0 | All DB reads/writes via service-role client | Already in use; no Prisma |
| `@nestjs/jwt` | ^11.0.0 | Sign/verify invitation token (reuses `JWT_SECRET`) | Already in use for auth tokens |
| `resend` | ^4.0.0 | Send invitation email | Already in use via `EmailService` |
| `class-validator` | ^0.14.0 | DTO validation decorators | Already in use |
| `zod` | (in shared) | Frontend form validation + shared types | Already in use |
| `@tanstack/react-query` | (in web) | Data fetching + mutation | Already in use |
| `react-hook-form` + `@hookform/resolvers` | (in web) | Forms | Already in use |

### No New Dependencies Required

All required libraries are already installed. Phase 2 requires zero new `npm install` calls.

---

## Architecture Patterns

### Database Schema (new tables)

```sql
-- Migration: 002_team_management
CREATE TABLE IF NOT EXISTS teams (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('manager', 'member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_invitations (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id      UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_by   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email TEXT       NOT NULL,
  token_hash   TEXT        NOT NULL,   -- hashed JWT; prevents token reuse after revocation
  used_at      TIMESTAMPTZ,            -- NULL = pending
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Why `token_hash`?** The raw JWT is sent only in the email link. Storing a hash (argon2 or SHA-256) means a leaked DB row cannot be replayed. The existing codebase already uses this pattern for `refresh_token_hash`. For invitations, a simple SHA-256 hash is sufficient (no password-stretching needed; the JWT already has entropy from the secret). Use `crypto.createHash('sha256').update(token).digest('hex')` — no new library.

**Why `team_invitations` table?** The JWT alone would suffice for stateless verification, but a DB row lets the manager revoke invitations and prevents the same token being accepted twice. Both are real requirements.

### NestJS Module Structure

```
apps/api/src/
├── teams/
│   ├── teams.module.ts
│   ├── teams.controller.ts      # POST /teams, GET /teams/my
│   ├── teams.service.ts
│   ├── teams.service.spec.ts
│   └── dto/
│       ├── create-team.dto.ts
│       └── invite-member.dto.ts
└── (invitation logic lives inside TeamsModule, not a separate module)
    # POST /teams/:id/invitations  — send invite
    # POST /teams/invitations/accept — accept invite (no :id, token carries teamId)
```

Keep invitations inside `TeamsModule` rather than a separate module — it accesses the same tables and avoids circular injection.

### Pattern: JWT Invitation Token

**Follows exactly the same pattern as email-verification and password-reset tokens.**

```typescript
// Source: apps/api/src/auth/auth.service.ts (existing pattern)

// Sign (in TeamsService.inviteMember)
const token = await this.jwtService.signAsync(
  {
    sub: invitingUserId,
    purpose: 'team-invitation',
    teamId: team.id,
    inviteeEmail: dto.email,   // email is canonical; must match at accept time
  },
  { secret: jwtSecret, expiresIn: '7d' },  // 7 days is reasonable for invitations
);

// Store hash to prevent replay
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
await client.from('team_invitations').insert({
  team_id: team.id,
  invited_by: invitingUserId,
  invitee_email: dto.email,
  token_hash: tokenHash,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});

// Verify (in TeamsService.acceptInvitation)
const payload = await this.jwtService.verifyAsync(dto.token, { secret: jwtSecret });
if (payload.purpose !== 'team-invitation') throw new BadRequestException('Invalid token');
// Check invitee email matches logged-in user's email
if (payload.inviteeEmail !== currentUser.email) throw new ForbiddenException('Invitation is for a different email address');
// Check token not already used
const hash = crypto.createHash('sha256').update(dto.token).digest('hex');
const { data: inv } = await client
  .from('team_invitations')
  .select('*')
  .eq('token_hash', hash)
  .single();
if (!inv || inv.used_at) throw new BadRequestException('Invitation already used or not found');
// Insert member + mark used
await client.from('team_members').insert({ team_id: payload.teamId, user_id: currentUser.userId, role: 'member' });
await client.from('team_invitations').update({ used_at: new Date().toISOString() }).eq('id', inv.id);
```

### Pattern: Role Guard (Manager-Only Actions)

Do not use a Passport strategy for this. A simple NestJS guard that reads `req.user` (already populated by `AccessTokenGuard`) and queries the DB is the correct approach.

```typescript
// apps/api/src/teams/guards/team-manager.guard.ts
@Injectable()
export class TeamManagerGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AccessTokenUser;
    const teamId = req.params['id'];  // from route param
    const client = this.supabaseService.getClient();
    const { data } = await client
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.userId)
      .single();
    return data?.role === 'manager';
  }
}
```

Apply with `@UseGuards(AccessTokenGuard, TeamManagerGuard)` on manager-only endpoints.

### Pattern: Invite Email (extends existing EmailService)

Add `sendTeamInvitationEmail(to: string, inviterName: string, teamName: string, token: string)` to the existing `EmailService` class. Follow the same HTML template pattern used by `sendVerificationEmail`.

```typescript
// URL pattern matches existing auth patterns
const invitationUrl = `${this.frontendUrl}/join?token=${token}`;
```

### Frontend: Accept Invitation Page

```
apps/web/src/app/
└── (auth)/              # existing unauthenticated route group
    └── join/
        └── page.tsx     # reads ?token=..., requires login first
```

**Flow:**
1. User clicks link: `/join?token=<jwt>`
2. Frontend checks `isAuthenticated` (from `useAuth`)
3. If not authenticated: redirect to `/login?next=/join?token=<jwt>` (or `/register?next=...`)
4. If authenticated: call `POST /teams/invitations/accept` with `{ token }`
5. On success: redirect to `/dashboard` with toast "You joined [team name]!"

**Note:** The `/join` page should be in the `(auth)` route group (no navbar) OR in a new ungrouped route. Do NOT put it under `(dashboard)` because unauthenticated users must be able to land there and be redirected. Use the `(auth)` group's layout (which does not enforce auth) or a standalone layout.

### Shared Package Additions

```typescript
// packages/shared/src/types/team.ts
export interface Team {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'manager' | 'member';
  joinedAt: Date;
  // Joined from users table:
  email?: string;
  displayName?: string | null;
}

// packages/shared/src/schemas/team.schema.ts
export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
});
export const inviteMemberSchema = z.object({
  email: z.string().email(),
});
export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});
```

Export these from `packages/shared/src/index.ts`.

### Frontend: Team Management UI Pages

```
apps/web/src/app/(dashboard)/
├── teams/
│   ├── page.tsx          # List user's teams + "Create team" button
│   ├── new/
│   │   └── page.tsx      # Create team form
│   └── [id]/
│       └── page.tsx      # Team detail: member list + invite form (manager only)
```

### Anti-Patterns to Avoid

- **Do not use Supabase Auth for invitations.** Supabase has a built-in invite flow but the project explicitly uses NestJS for all auth. Use the JWT pattern.
- **Do not create a separate `InvitationsModule`.** It would create circular dependency with `TeamsModule` and provides no benefit at this scale.
- **Do not store the raw JWT in `team_invitations`.** Store only the hash.
- **Do not skip the `invitee_email` match check.** Without it, any logged-in user who intercepts the link can join the team.
- **Do not use `Promise.all` for insert team + insert team_members.** The member insert has a FK dependency on the team row — they must be sequential.
- **Do not put `/join` page under `(dashboard)` layout.** That layout redirects unauthenticated users, breaking the invitation landing experience.
- **Do not add a `filter` query method to mockQueryBuilder in tests without first checking setup.ts.** The existing mock returns `this` for chainable methods; add `filter: vi.fn().mockReturnThis()` if needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP client | `EmailService` (Resend, already exists) | Rate limits, deliverability, SPF/DKIM handled |
| Token signing | Custom HMAC tokens | `JwtService.signAsync` with `purpose` claim | Already established pattern; expiry built in |
| Token replay prevention | In-memory set | `team_invitations.used_at` + `token_hash` DB column | Survives server restarts |
| Password hashing of token | argon2 | `crypto.createHash('sha256')` | Invitations need no stretch; argon2 overkill here |
| Role checking | Middleware | `TeamManagerGuard` (NestJS CanActivate) | Composable with `AccessTokenGuard` |
| Form validation | Manual checks | `class-validator` DTOs (backend) + Zod (frontend) | Established project pattern |

**Key insight:** Every hard part of this phase (auth, tokens, email, DB client) already exists. Phase 2 is mostly wiring these primitives together in a new domain module.

---

## Common Pitfalls

### Pitfall 1: Invitation for unregistered email address

**What goes wrong:** Manager invites `newuser@example.com` who has no account. User clicks link, lands on `/join`, is redirected to `/login`, logs in with a different email, then the accept call fails because `payload.inviteeEmail !== currentUser.email`.

**Why it happens:** The invitation is scoped to a specific email, but registration allows any email.

**How to avoid:** The `/join` page should clearly show "This invitation was sent to `newuser@example.com`. Please log in or register with that email address." Display the `inviteeEmail` decoded from the JWT payload (safe to decode client-side without verification — verification happens on the backend).

**Warning signs:** Users reporting "This invitation is for a different email address" error after registering.

### Pitfall 2: Duplicate team membership

**What goes wrong:** User accepts the same invitation twice (replays the URL), or manager sends two invitations to the same person.

**How to avoid:**
- `team_members` has `UNIQUE (team_id, user_id)` — second insert returns Postgres error code `23505`.
- `team_invitations.used_at` is set on first accept — subsequent calls see non-null `used_at` and return 400.
- Catch `23505` in service and throw `ConflictException('Already a member of this team')`.

### Pitfall 3: Manager removes themselves from team

**What goes wrong:** Manager uses "remove member" UI on themselves, leaving a team with no manager.

**How to avoid:** For Phase 2 (v1), the only "remove" operation is implicit (no remove UI at all in Phase 2 scope). Teams and members are not removable in Phase 2. Note this as a future requirement. The service should return a 400 if someone attempts to remove the last manager.

### Pitfall 4: `team_invitations` token_hash uniqueness collision

**What goes wrong:** Two invitations for the same team+email result in two active rows. The second accept attempt hits the first row's hash (impossible with SHA-256 given different tokens), or querying by hash returns stale results.

**How to avoid:** When manager re-invites the same email, mark the previous invitation as used before creating a new one (or add a unique constraint on `(team_id, invitee_email)` where `used_at IS NULL` — a partial unique index in Postgres).

### Pitfall 5: Vitest mock for `crypto` module

**What goes wrong:** `crypto.createHash` is a Node built-in. In Vitest ESM mode, `vi.mock('crypto', ...)` behaves differently from the `argon2` pattern.

**How to avoid:** Do not mock `crypto` in tests. Instead, spy on the specific service method or pass the token hash as a parameter in tests. Alternatively, extract the hash utility into a testable function and unit-test it separately.

### Pitfall 6: Missing `filter` or `in` method on mock query builder

**What goes wrong:** If the service code chains `.in('role', ['manager'])` or `.not('used_at', 'is', null)`, the existing `createMockSupabaseService` mock does not have those methods.

**How to avoid:** Add any new chainable methods needed (`in`, `not`, `is`, `filter`, `order`, `limit`) to the mock builder in `test/setup.ts` at the start of the phase.

---

## Code Examples

Verified patterns from existing codebase:

### Create a row and read it back (Supabase JS pattern in use)

```typescript
// Source: apps/api/src/auth/auth.service.ts
const { data: user, error } = await client
  .from('users')
  .insert({ email: dto.email, password_hash: passwordHash, ... })
  .select()
  .single();

if (error) {
  if (error.code === '23505') throw new ConflictException('...');
  throw new Error(`Database error: ${error.message}`);
}
```

### JWT sign with purpose claim (exact pattern to replicate)

```typescript
// Source: apps/api/src/auth/auth.service.ts
const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
const token = await this.jwtService.signAsync(
  { sub: userId, purpose: 'team-invitation', teamId, inviteeEmail },
  { secret: jwtSecret, expiresIn: '7d' },
);
```

### JWT verify with purpose check

```typescript
// Source: apps/api/src/auth/auth.service.ts
let payload: { sub: string; purpose: string; teamId: string; inviteeEmail: string };
try {
  payload = await this.jwtService.verifyAsync(dto.token, { secret: jwtSecret });
} catch {
  throw new BadRequestException('Invalid or expired invitation link');
}
if (payload.purpose !== 'team-invitation') {
  throw new BadRequestException('Invalid or expired invitation link');
}
```

### Controller with AccessTokenGuard (exact import paths)

```typescript
// Source: apps/api/src/users/users.controller.ts
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AccessTokenUser } from '../auth/strategies/access-token.strategy';

@Controller('teams')
@UseGuards(AccessTokenGuard)
export class TeamsController { ... }
```

### Frontend mutation pattern

```typescript
// Source: apps/web/src/hooks/use-auth.ts
const mutation = useMutation({
  mutationFn: (data: CreateTeamInput) =>
    api.post<Team>('/teams', data),
  onSuccess: () => {
    toast.success('Team created');
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    router.push('/teams');
  },
  onError: (error: Error) => {
    toast.error(error.message || 'Failed to create team');
  },
});
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `cd apps/api && pnpm vitest run --reporter=verbose src/teams` |
| Full suite command | `cd apps/api && pnpm vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEAM-01 | `createTeam` inserts team row + team_members row as manager | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts -t "createTeam"` | Wave 0 |
| TEAM-01 | `createTeam` returns team with `role: 'manager'` | unit | same file | Wave 0 |
| TEAM-02 | `inviteMember` rejects non-manager caller | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts -t "inviteMember"` | Wave 0 |
| TEAM-02 | `inviteMember` stores `token_hash` + sends email | unit | same file | Wave 0 |
| TEAM-03 | `acceptInvitation` rejects wrong email | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts -t "acceptInvitation"` | Wave 0 |
| TEAM-03 | `acceptInvitation` rejects already-used invitation | unit | same file | Wave 0 |
| TEAM-03 | `acceptInvitation` inserts member + marks invitation used | unit | same file | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd apps/api && pnpm vitest run src/teams`
- **Per wave merge:** `cd apps/api && pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/teams/teams.service.spec.ts` — covers TEAM-01, TEAM-02, TEAM-03
- [ ] `apps/api/src/teams/teams.controller.ts` — no spec required (integration covered by service spec + manual test)
- [ ] `test/setup.ts` may need `in`, `not`, `order`, `limit` methods added to `mockQueryBuilder` if service uses them

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase built-in invite | NestJS JWT invite | Project decision (Phase 1) | All auth stays in NestJS; no Supabase Auth coupling |
| Separate auth service | Reuse existing `JwtService` | Phase 1 established | No new JWT infrastructure needed |

**Nothing in Phase 2 is deprecated or novel.** Every pattern is a direct extension of Phase 1 patterns.

---

## Open Questions

1. **What happens when a logged-out user clicks the invite link?**
   - What we know: `/join?token=...` must be accessible before login, but the accept API requires authentication.
   - What's unclear: Should `/join` be in `(auth)` route group (no nav) or standalone?
   - Recommendation: Place `/join` in `(auth)` route group. The layout there does not enforce auth. The page itself checks `isAuthenticated` and redirects to `/login?next=...` if needed. After login, the `next` param is used to redirect back.

2. **Should the `next` redirect preserve the token through login?**
   - What we know: The current login page does not support a `?next=` redirect parameter.
   - What's unclear: Does the login page need to be modified?
   - Recommendation: Yes, the login page should read `searchParams.get('next')` and after successful login, call `router.push(next ?? '/dashboard')`. This is a small, self-contained addition to the existing login page.

3. **Does Phase 2 need a "my teams" dashboard widget or is a dedicated `/teams` page sufficient?**
   - What we know: Phase 3 (tasks) and Phase 4 (manager dashboard) both need `team_id` context. Phase 2's success criteria only requires create, invite, and join flows.
   - Recommendation: Build `/teams` (list + create) and `/teams/[id]` (detail + invite) as standalone pages. The dashboard page (`/dashboard`) can show a "no team yet" prompt linking to `/teams/new`. Keep the dashboard page itself minimal for now.

---

## Sources

### Primary (HIGH confidence)

- Existing codebase — `apps/api/src/auth/auth.service.ts`, `apps/api/src/users/users.service.ts`, `apps/api/src/email/email.service.ts` — JWT pattern, Supabase JS pattern, Resend email pattern all directly inspected
- Existing codebase — `apps/api/test/setup.ts` — mock query builder capabilities confirmed
- Existing codebase — `apps/api/vitest.config.ts` — test runner configuration confirmed
- `database/migrations/001_initial_schema.sql` — schema conventions (UUID PKs, `updated_at` trigger, FK style) directly inspected
- `packages/shared/src/` — type and schema conventions directly inspected

### Secondary (MEDIUM confidence)

- Supabase JS docs pattern for `UNIQUE` constraint error code `23505` — consistent with existing code handling in `auth.service.ts`
- Node.js `crypto.createHash('sha256')` — standard Node built-in, no version concerns

### Tertiary (LOW confidence)

- None — all findings are grounded in direct codebase inspection or well-established Node/NestJS/Supabase patterns.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already present and in use
- Architecture: HIGH — direct extension of patterns visible in codebase
- Pitfalls: HIGH — derived from actual code patterns and Supabase JS behavior
- Test map: HIGH — test framework and mock infrastructure directly inspected

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (stable stack; no fast-moving dependencies)

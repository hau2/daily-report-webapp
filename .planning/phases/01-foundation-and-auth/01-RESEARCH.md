# Phase 1: Foundation and Auth - Research

**Researched:** 2026-03-06
**Domain:** Monorepo scaffold, Supabase JS database access, NestJS JWT authentication, email verification
**Confidence:** HIGH

## Summary

Phase 1 delivers the foundation for the Daily Report application: a working monorepo with NestJS API and Next.js frontend connected to Supabase, plus a complete authentication system (register, login, session persistence, email verification, password reset, and profile settings).

The existing codebase has a partially scaffolded monorepo with Prisma as the ORM. The user has explicitly overridden this -- all Prisma code must be removed and replaced with `@supabase/supabase-js` for database operations. This is the single largest architectural change from the existing scaffold. The backend uses the service role key to bypass RLS and perform admin-level CRUD; the frontend uses the anon key only for communicating with the NestJS API (not directly with Supabase for data). Auth is fully custom via NestJS (JWT access/refresh tokens in httpOnly cookies), not Supabase Auth.

**Primary recommendation:** Replace Prisma with a `SupabaseModule`/`SupabaseService` that wraps `createClient` with the service role key. Keep all auth logic in NestJS. Use Resend for transactional emails. Create database tables via SQL (managed outside the application).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use Supabase JS client (`@supabase/supabase-js`) for ALL database operations -- NOT Prisma
- No direct PostgreSQL connection strings
- Backend uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for server-side operations
- Frontend uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side
- Frontend env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Backend env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `JWT_SECRET`, `PORT=3001`
- No Prisma ORM, no prisma schema, no database migrations managed by app
- Supabase handles database schema/tables via its dashboard or SQL editor
- Service role key used in backend for admin-level database operations

### Claude's Discretion
- Auth flow architecture (JWT strategy, cookie handling, BFF proxy)
- Frontend component library and form handling
- Monorepo tooling (pnpm + Turborepo)
- Test framework setup
- Email service for verification/reset

### Deferred Ideas (OUT OF SCOPE)
None -- context covers phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create account with email and password | NestJS auth module + SupabaseService for user storage + Argon2 password hashing |
| AUTH-02 | User receives email verification after signup | Resend email service + JWT verification token + verify endpoint |
| AUTH-03 | User can reset password via email link | Resend email service + JWT reset token + reset endpoint |
| AUTH-04 | User session persists across browser refresh (httpOnly cookie) | Dual JWT strategy (access + refresh) in httpOnly cookies with cookie-based extraction |
| TEAM-04 | User can update their profile (name, email, password) | UsersService with SupabaseService for update operations + profile settings page |
</phase_requirements>

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | ^11.0.0 | Backend API framework | Already installed. Modular DI, decorator-based, first-class TypeScript |
| Next.js | ^15.3.0 (15.5.12 installed) | Frontend framework | Already installed. App Router with React Server Components |
| React | ^19.0.0 | UI library | Already installed. Ships with Next.js 15 |
| TypeScript | ^5.7.0 | Language | Already installed across all packages |
| pnpm | ^10.30.3 | Package manager | Already configured as packageManager |
| Turborepo | ^2.5.0 | Monorepo build orchestration | Already configured with turbo.json |
| Vitest | ^4.0.18 | Test framework | Already configured with workspace and SWC plugin for decorators |
| Tailwind CSS | ^4.0.0 | Utility-first CSS | Already installed in apps/web |
| shadcn/ui | new-york style | Component library | Already initialized (components.json, button/card/form/input/label/sonner) |
| react-hook-form | ^7.54.0 | Form management | Already installed in apps/web |
| zod | ^3.24.0 | Schema validation | Already installed in shared package with auth schemas |

### To Install (Phase 1 additions)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.98 | Database client | ALL database operations in backend. Replaces Prisma. |
| @nestjs/jwt | ^11 | JWT token signing/verification | Access and refresh token generation |
| @nestjs/passport | ^11 | Auth framework integration | Passport strategy registration and guards |
| passport | ^0.7 | Auth middleware | Required peer dependency for @nestjs/passport |
| passport-jwt | ^4.0 | JWT strategy | Extract and validate JWT from cookies |
| @types/passport-jwt | latest | TypeScript types | Type definitions for passport-jwt |
| argon2 | ^0.41 | Password hashing | Hash passwords with Argon2id (OWASP recommended) |
| resend | ^4 | Transactional email | Email verification, password reset emails |
| @tanstack/react-query | ^5.90 | Server state management | API data fetching and caching on frontend |

### To Remove (Prisma migration)

| Library | Reason |
|---------|--------|
| @prisma/client | User locked decision: use Supabase JS, not Prisma |
| prisma (devDep) | No longer needed |
| pg | No direct PostgreSQL connection |
| @types/pg | No longer needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/supabase-js | Prisma 7 | User explicitly chose Supabase JS. No ORM, no schema file, no migrations. Simpler but less type-safe without generated types. |
| Resend | Nodemailer + SMTP | Resend has cleaner API, no SMTP config, better deliverability. Nodemailer requires SMTP provider setup. |
| Custom NestJS module | nestjs-supabase-js package | Custom module is simpler (10 lines), avoids third-party dependency for trivial wrapping. |
| argon2 | bcrypt | Argon2 is OWASP-recommended, memory-hard, no 72-byte limit. Use argon2. |

**Installation:**
```bash
# In apps/api -- add new dependencies
cd apps/api
pnpm add @supabase/supabase-js @nestjs/jwt @nestjs/passport passport passport-jwt argon2 resend
pnpm add -D @types/passport-jwt

# In apps/api -- remove Prisma
pnpm remove @prisma/client pg @types/pg
pnpm remove -D prisma

# In apps/web -- add TanStack Query
cd apps/web
pnpm add @tanstack/react-query
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 target)

```
daily-report-webapp/
  apps/
    api/                          # NestJS backend
      src/
        auth/
          auth.module.ts          # AuthModule (imports JwtModule, PassportModule)
          auth.controller.ts      # POST /auth/register, /auth/login, /auth/refresh, /auth/logout, /auth/verify-email, /auth/forgot-password, /auth/reset-password
          auth.service.ts         # Registration, login, token generation, verification, password reset
          strategies/
            access-token.strategy.ts   # Validates access JWT from cookie
            refresh-token.strategy.ts  # Validates refresh JWT from cookie
          guards/
            access-token.guard.ts
            refresh-token.guard.ts
          dto/
            register.dto.ts
            login.dto.ts
            forgot-password.dto.ts
            reset-password.dto.ts
        users/
          users.module.ts
          users.controller.ts     # GET /users/me, PATCH /users/me
          users.service.ts        # Profile CRUD via SupabaseService
          dto/
            update-profile.dto.ts
        email/
          email.module.ts
          email.service.ts        # Resend wrapper for verification + reset emails
        supabase/
          supabase.module.ts      # Global module providing SupabaseService
          supabase.service.ts     # Wraps createClient with service_role key
        app.module.ts
        main.ts
      test/
        setup.ts                  # Mock SupabaseService factory
    web/                          # Next.js frontend
      src/
        app/
          (auth)/                 # Route group for auth pages
            login/page.tsx
            register/page.tsx
            verify-email/page.tsx
            forgot-password/page.tsx
            reset-password/page.tsx
          (dashboard)/            # Route group for protected pages
            layout.tsx            # Auth check wrapper
            page.tsx              # Dashboard home (placeholder)
          settings/
            page.tsx              # Profile settings
          layout.tsx
          page.tsx                # Landing/redirect
        lib/
          api-client.ts           # Fetch wrapper for NestJS API calls
          auth.ts                 # Auth helper functions (check session, redirect)
          supabase.ts             # Browser Supabase client (anon key, for future direct use)
        hooks/
          use-auth.ts             # Auth state hook
        providers/
          query-provider.tsx      # TanStack Query provider
  packages/
    shared/                       # Shared types and Zod schemas
      src/
        types/
          user.ts
          auth.ts
          database.ts             # Supabase Database type definitions
        schemas/
          auth.schema.ts
```

### Pattern 1: SupabaseService (replaces PrismaService)

**What:** A global NestJS service that wraps `createClient` from `@supabase/supabase-js` with the service role key for server-side database operations.
**When to use:** Every service that needs database access injects SupabaseService.

```typescript
// apps/api/src/supabase/supabase.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  /**
   * Returns the Supabase client configured with service_role key.
   * This client bypasses Row Level Security (RLS).
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}
```

```typescript
// apps/api/src/supabase/supabase.module.ts
import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
```

### Pattern 2: Dual JWT Strategy with httpOnly Cookies

**What:** Two Passport strategies (access and refresh) that extract JWTs from httpOnly cookies instead of Authorization headers. Access token is short-lived (15min), refresh token is long-lived (7d).
**When to use:** All authenticated endpoints use AccessTokenGuard. Only /auth/refresh uses RefreshTokenGuard.

```typescript
// Access token strategy -- extracts from 'access_token' cookie
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.access_token ?? null,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

```typescript
// Setting cookies in auth service
async login(user: { id: string; email: string }, res: Response) {
  const payload = { sub: user.id, email: user.email };

  const accessToken = await this.jwtService.signAsync(payload, {
    secret: this.configService.get('JWT_SECRET'),
    expiresIn: '15m',
  });

  const refreshToken = await this.jwtService.signAsync(payload, {
    secret: this.configService.get('JWT_SECRET'),
    expiresIn: '7d',
  });

  // Store hashed refresh token in database
  const hashedRefreshToken = await argon2.hash(refreshToken);
  await this.supabaseService.getClient()
    .from('users')
    .update({ refresh_token_hash: hashedRefreshToken })
    .eq('id', user.id);

  // Set httpOnly cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/auth/refresh', // Only sent to refresh endpoint
  });
}
```

### Pattern 3: Supabase CRUD Operations (replaces Prisma queries)

**What:** Using `supabase.from('table').select/insert/update/delete` instead of Prisma's query builder.
**When to use:** All data access. This is the core pattern replacing Prisma's `prisma.user.findUnique()` style.

```typescript
// BEFORE (Prisma):
const user = await this.prisma.user.findUnique({
  where: { email },
});

// AFTER (Supabase JS):
const { data: user, error } = await this.supabaseService.getClient()
  .from('users')
  .select('*')
  .eq('email', email)
  .single();

if (error) throw new InternalServerErrorException('Database error');
```

```typescript
// Insert
const { data, error } = await this.supabaseService.getClient()
  .from('users')
  .insert({
    email,
    password_hash: hashedPassword,
    display_name: displayName ?? null,
    timezone: 'UTC',
    email_verified: false,
  })
  .select()
  .single();

// Update
const { data, error } = await this.supabaseService.getClient()
  .from('users')
  .update({ display_name: newName })
  .eq('id', userId)
  .select()
  .single();

// Delete (not needed for Phase 1)
const { error } = await this.supabaseService.getClient()
  .from('users')
  .delete()
  .eq('id', userId);
```

### Pattern 4: Email Service with Resend

**What:** A NestJS service wrapping the Resend SDK for sending transactional emails.
**When to use:** Email verification after signup, password reset links.

```typescript
// apps/api/src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromAddress: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.getOrThrow('RESEND_API_KEY'));
    this.fromAddress = this.configService.getOrThrow('EMAIL_FROM');
    this.frontendUrl = this.configService.getOrThrow('FRONTEND_URL');
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: 'Verify your email - Daily Report',
      html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email address.</p>`,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.resend.emails.send({
      from: this.fromAddress,
      to,
      subject: 'Reset your password - Daily Report',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    });
  }
}
```

### Pattern 5: Frontend API Client

**What:** A thin fetch wrapper that calls the NestJS API with credentials included (for cookie transmission).
**When to use:** All frontend-to-API communication.

```typescript
// apps/web/src/lib/api-client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Send httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  post: <T>(endpoint: string, body: unknown) =>
    apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  get: <T>(endpoint: string) => apiClient<T>(endpoint),
  patch: <T>(endpoint: string, body: unknown) =>
    apiClient<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
};
```

### Anti-Patterns to Avoid

- **Using Supabase Auth alongside NestJS auth:** The project constraint says NestJS handles all auth. Do NOT use `supabase.auth.signUp()`, `supabase.auth.signInWithPassword()`, or any Supabase Auth methods. Supabase is used as a pure database.
- **Storing JWT in localStorage:** Use httpOnly cookies exclusively. The requirement AUTH-04 explicitly says httpOnly cookie.
- **Creating the Supabase client per request:** For this project (service_role key, no user-scoped RLS), a singleton client is appropriate. Do NOT use `Scope.REQUEST`.
- **Exposing service_role key to frontend:** The service role key must ONLY exist in backend env. The frontend uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` and communicates through the NestJS API.
- **Using Prisma-style `$transaction`:** Supabase JS does not support client-side transactions. If needed, use a Supabase database function (RPC).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | argon2 package | Cryptographic edge cases, timing attacks, salt management |
| JWT token management | Manual JWT parsing | @nestjs/jwt + passport-jwt | Token expiry, signature verification, strategy pattern |
| Email delivery | Raw SMTP/fetch | Resend SDK | Deliverability, SPF/DKIM, bounce handling, rate limiting |
| Form validation (FE) | Manual onChange handlers | react-hook-form + zod | Re-render performance, error state, async validation |
| Cookie security | Manual Set-Cookie header | Express res.cookie() | httpOnly, secure, sameSite flags, path scoping |
| API data caching | Manual useEffect + useState | TanStack Query | Cache invalidation, background refetch, loading states |

**Key insight:** Auth and email are security-critical domains where subtle bugs create vulnerabilities. Every component in the auth chain (hashing, token signing, cookie settings, email delivery) should use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: Forgetting `credentials: 'include'` in Frontend Fetch

**What goes wrong:** httpOnly cookies are not sent with API requests, so every authenticated request returns 401.
**Why it happens:** `fetch()` does not send cookies to cross-origin requests by default. The frontend (port 3000) and API (port 3001) are different origins.
**How to avoid:** Always set `credentials: 'include'` in fetch calls. Configure CORS on NestJS with `credentials: true` and explicit `origin` (not wildcard `*`).
**Warning signs:** "User logs in successfully but immediately gets 401 on the next request."

### Pitfall 2: CORS Configuration Mismatch

**What goes wrong:** Browsers block requests or refuse to set cookies.
**Why it happens:** When `credentials: true` is set, CORS `origin` cannot be `*`. It must be the exact frontend origin (`http://localhost:3000`).
**How to avoid:** Set `origin: process.env.FRONTEND_URL` in `app.enableCors()` and ensure `FRONTEND_URL=http://localhost:3000` in backend env.
**Warning signs:** "CORS errors in browser console" or "Set-Cookie header present but cookie not stored."

### Pitfall 3: Supabase JS Error Handling

**What goes wrong:** Errors silently return `null` data instead of throwing exceptions.
**Why it happens:** Supabase JS returns `{ data, error }` objects instead of throwing. If you don't check `error`, you operate on null data.
**How to avoid:** Always destructure and check `error` before using `data`. Create a helper that throws NestJS exceptions on error.
**Warning signs:** "500 errors with 'Cannot read property of null'" in API logs.

### Pitfall 4: Refresh Token Cookie Path

**What goes wrong:** Refresh token cookie is sent with every request, exposing it unnecessarily.
**Why it happens:** Default cookie path is `/`, so the cookie is included in all requests.
**How to avoid:** Set `path: '/auth/refresh'` on the refresh token cookie so it's only sent when hitting the refresh endpoint.
**Warning signs:** Refresh token visible in all request headers (check DevTools Network tab).

### Pitfall 5: Missing `sameSite` Cookie Attribute

**What goes wrong:** Cookies not sent in cross-origin context (dev) or CSRF vulnerability (prod).
**Why it happens:** Modern browsers default `sameSite` to `Lax` which may block cross-site POST requests.
**How to avoid:** Explicitly set `sameSite: 'lax'` for development. In production with same domain, `sameSite: 'strict'` is safest.
**Warning signs:** Cookies set on login but not sent on subsequent requests.

### Pitfall 6: Prisma Artifacts Left Behind

**What goes wrong:** Build errors from leftover Prisma imports, generated files, or prisma scripts.
**Why it happens:** The existing scaffold has Prisma fully wired in (PrismaModule, PrismaService, generated client, schema.prisma, db:generate/db:push scripts).
**How to avoid:** Completely remove: `apps/api/prisma/` directory, `apps/api/src/prisma/` directory, `apps/api/src/generated/` directory, Prisma packages from package.json, `db:generate`/`db:push` scripts from package.json and turbo.json, `pnpm.onlyBuiltDependencies` entries for `@prisma/engines` and `prisma`.
**Warning signs:** TypeScript errors referencing `PrismaClient` or `PrismaService`.

## Code Examples

### Supabase Database SQL Schema (for manual execution in Supabase dashboard)

```sql
-- Execute this in the Supabase SQL Editor to create the users table.
-- This is NOT managed by the application. It is provided as reference.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  email_verified BOOLEAN NOT NULL DEFAULT false,
  refresh_token_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS as defense-in-depth (service_role key bypasses it)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Index for email lookups (login, registration checks)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### NestJS Auth Module Registration

```typescript
// apps/api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // Signing options passed per-call
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

### Auth Controller Endpoint Shape

```typescript
// apps/api/src/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  @Post('register')
  register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {}

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {}

  @UseGuards(AccessTokenGuard)
  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {}

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {}

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {}

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {}
}
```

### Mock SupabaseService for Testing

```typescript
// apps/api/test/setup.ts
import { vi } from 'vitest';

export function createMockSupabaseService() {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const mockClient = {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  };

  return {
    getClient: vi.fn().mockReturnValue(mockClient),
    _mockClient: mockClient,
    _mockQueryBuilder: mockQueryBuilder,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma schema + migrations | Supabase JS + dashboard SQL | User decision (Phase 1) | No schema file in repo; tables managed in Supabase dashboard |
| bcrypt for password hashing | Argon2id | 2023+ (OWASP update) | Memory-hard, no 72-byte limit, GPU-resistant |
| JWT in Authorization header | JWT in httpOnly cookies | Security best practice | Prevents XSS token theft |
| Single JWT (access only) | Dual JWT (access + refresh) | Standard practice | Short-lived access (15m) + long-lived refresh (7d) |
| Nodemailer + SMTP | Resend SDK | 2023+ | Simpler API, better deliverability, no SMTP config |

**Deprecated/outdated:**
- **PrismaModule / PrismaService** (existing in codebase): Must be fully removed and replaced with SupabaseModule / SupabaseService
- **Prisma generated client** (`apps/api/src/generated/`): Gitignored but exists locally; directory should be deleted
- **DATABASE_URL / DIRECT_URL** in .env.example: Replace with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
- **db:generate / db:push scripts**: Remove from package.json and turbo.json

## Open Questions

1. **Supabase TypeScript type generation**
   - What we know: `npx supabase gen types typescript --project-id "$REF"` generates a `database.types.ts` file with Row/Insert/Update types per table. This can be passed to `createClient<Database>()` for type-safe queries.
   - What's unclear: Whether the user wants to set up the Supabase CLI and generate types, or use manual type definitions in the shared package.
   - Recommendation: For Phase 1, define types manually in `packages/shared/src/types/database.ts` matching the SQL schema. Add `supabase gen types` as a later enhancement. This avoids requiring Supabase CLI setup as a dependency.

2. **Resend domain verification**
   - What we know: Resend requires DNS verification (SPF/DKIM records) for custom sending domains. Without it, emails are sent from `onboarding@resend.dev` (test mode only, limited to verified addresses).
   - What's unclear: Whether the user has a domain configured in Resend.
   - Recommendation: Use Resend's test mode for development (send to verified email addresses only). Document the domain setup requirement for production in a README or .env.example comment.

3. **Frontend Supabase client usage**
   - What we know: The CONTEXT.md specifies `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the frontend.
   - What's unclear: What the frontend Supabase client is used for in Phase 1, since all auth and data operations go through the NestJS API.
   - Recommendation: Create the frontend Supabase client file (`apps/web/src/lib/supabase.ts`) for future use but do NOT use it for Phase 1 auth/data. All Phase 1 frontend operations go through the NestJS API via fetch.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 with unplugin-swc for NestJS decorator support |
| Config file | `apps/api/vitest.config.ts` (exists), `vitest.workspace.ts` (exists at root) |
| Quick run command | `cd apps/api && pnpm test` (runs `vitest run --reporter=verbose`) |
| Full suite command | `pnpm test` (root, runs via Turborepo across all packages) |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Register creates user with hashed password; rejects duplicate email | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "register"` | Exists (todo stubs) |
| AUTH-02 | Signup sends verification email; verify endpoint marks user verified | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "verification"` | Exists (todo stubs) |
| AUTH-03 | Forgot-password sends email; reset validates token and updates password | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "forgot\|reset"` | Exists (todo stubs) |
| AUTH-04 | Login sets httpOnly cookies; refresh issues new access token; expired triggers refresh | unit | `cd apps/api && pnpm vitest run src/auth/auth.controller.spec.ts -t "cookie\|refresh\|expired"` | Exists (todo stubs) |
| TEAM-04 | Update name, email (requires password), password (requires current + hashes new) | unit | `cd apps/api && pnpm vitest run src/users/users.service.spec.ts` | Exists (todo stubs) |

### Sampling Rate

- **Per task commit:** `cd apps/api && pnpm vitest run --reporter=verbose`
- **Per wave merge:** `pnpm test` (root Turborepo)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [x] `apps/api/vitest.config.ts` -- exists with SWC decorator support
- [x] `apps/api/test/setup.ts` -- exists but has Prisma mocks (must be updated to Supabase mocks)
- [x] `apps/api/src/auth/auth.service.spec.ts` -- exists with todo stubs
- [x] `apps/api/src/auth/auth.controller.spec.ts` -- exists with todo stubs
- [x] `apps/api/src/users/users.service.spec.ts` -- exists with todo stubs
- [ ] `apps/api/src/email/email.service.spec.ts` -- needs creation (covers AUTH-02, AUTH-03 email sending)
- [ ] `apps/api/test/setup.ts` -- needs update: replace `createMockPrismaService()` with `createMockSupabaseService()`

## Sources

### Primary (HIGH confidence)
- [Supabase JS Client - npm](https://www.npmjs.com/package/@supabase/supabase-js) - Version ^2.98, installation, API
- [Supabase TypeScript Support Docs](https://supabase.com/docs/reference/javascript/typescript-support) - Type generation pattern
- [Supabase Generating Types](https://supabase.com/docs/guides/api/rest/generating-types) - CLI commands for type generation
- [Supabase Service Role Troubleshooting](https://supabase.com/docs/guides/troubleshooting/performing-administration-tasks-on-the-server-side-with-the-servicerole-secret-BYM4Fa) - Server-side client config with `persistSession: false`
- [Supabase JS Client Initializing](https://supabase.com/docs/reference/javascript/initializing) - createClient API
- Existing codebase analysis (apps/api/package.json, apps/web/package.json, prisma/schema.prisma, etc.)

### Secondary (MEDIUM confidence)
- [NestJS JWT Auth with Refresh Tokens - Elvis Duru](https://www.elvisduru.com/blog/nestjs-jwt-authentication-refresh-token) - Dual strategy pattern, guard architecture
- [NestJS Cookie-Based JWT Auth](https://tigran.tech/nestjs-cookie-based-jwt-authentication/) - Cookie extraction strategy
- [NestJS Supabase Integration (adrianmjim)](https://github.com/adrianmjim/nestjs-supabase-js) - Module/service pattern for NestJS
- [Resend Node.js SDK](https://resend.com/docs/send-with-nodejs) - Email sending API
- [Using Resend with NestJS](https://shaoxuandev10.medium.com/using-resend-with-a-nestjs-backend-a-step-by-step-guide-54a449d1b3d4) - NestJS integration pattern
- [argon2 npm](https://www.npmjs.com/package/argon2) - Password hashing API

### Tertiary (LOW confidence)
- [nestjs-supabase-js npm](https://www.npmjs.com/package/nestjs-supabase-js) - Community wrapper (not recommended; custom module is simpler)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified against installed versions in node_modules (NestJS 11.1.16, Next.js 15.5.12); Supabase JS v2.98 confirmed via npm
- Architecture: HIGH - Patterns well-documented across official Supabase docs and NestJS community; existing scaffold structure understood
- Pitfalls: HIGH - Common issues well-documented in community articles; Prisma-to-Supabase migration pitfalls identified from existing codebase analysis
- Email (Resend): MEDIUM - API is straightforward but domain verification requirements not fully validated

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- stable ecosystem, no major releases expected)

---
*Phase: 01-foundation-and-auth*
*Research completed: 2026-03-06*

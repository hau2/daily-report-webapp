# Phase 1: Foundation and Auth - Research

**Researched:** 2026-03-06
**Domain:** Monorepo scaffolding, NestJS authentication (JWT + httpOnly cookies), Prisma ORM, Supabase PostgreSQL, Next.js BFF proxy
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire project foundation: a pnpm + Turborepo monorepo with NestJS backend, Next.js frontend, and a shared types package, all connected to a Supabase-hosted PostgreSQL database via Prisma 7 ORM. The authentication system uses NestJS Passport with JWT access/refresh tokens stored in httpOnly cookies, with Argon2 for password hashing. The Next.js frontend acts as a BFF (Backend-for-Frontend) proxy -- the browser never talks directly to NestJS, which eliminates CORS issues and keeps tokens secure.

The most critical decision in this phase is getting the auth token flow right from the start. The architecture uses httpOnly cookies as the single source of truth for authentication state, ensuring consistency between Next.js Server Components (SSR) and Client Components (CSR). Token refresh is handled transparently through the BFF proxy layer. Email verification and password reset use JWT-based tokens sent via Resend (transactional email API). The user profile settings page (TEAM-04) is straightforward CRUD once authentication is in place.

**Primary recommendation:** Build in strict order -- (1) monorepo scaffold, (2) database schema + Prisma, (3) NestJS auth module with JWT + cookies, (4) Next.js BFF proxy + auth pages, (5) email verification/password reset, (6) profile settings page. Each layer depends on the one before it.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create account with email and password | NestJS auth module with Passport local strategy, Argon2 hashing, Prisma user creation, registration endpoint |
| AUTH-02 | User receives email verification after signup | JWT-based verification token, Resend transactional email API, verification endpoint that marks user as verified |
| AUTH-03 | User can reset password via email link | Forgot-password endpoint generates JWT token, Resend sends reset email, reset endpoint validates token + updates password |
| AUTH-04 | User session persists across browser refresh (httpOnly cookie) | JWT access + refresh tokens in httpOnly cookies, BFF proxy forwards cookies automatically, token refresh via dedicated endpoint |
| TEAM-04 | User can update their profile (name, email, password) | Authenticated PATCH /users/profile endpoint, validate current password for sensitive changes, Prisma update |
</phase_requirements>

## Standard Stack

### Core (Phase 1 Specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | ^10.4 | Backend API framework | Project constraint. Modular architecture, decorator-based DI, first-class TypeScript. |
| Next.js | ^16.1 | Frontend framework | Project constraint. App Router with React Server Components. Proxy feature replaces middleware for BFF. |
| React | ^19 | UI library | Ships with Next.js 16. Required by shadcn/ui. |
| TypeScript | ^5.7 | Language | Non-negotiable for NestJS + Next.js. Shared types across monorepo. |
| Node.js | ^22 LTS | Runtime | Current Active LTS. Required by all stack components. |
| Prisma | ^7.2 | Database ORM | Project decision (over Drizzle). Schema-first, auto-migrations, type-safe client, NestJS integration. |
| @prisma/client | ^7.2 | Query client | Auto-generated from Prisma schema. **CRITICAL:** Set `moduleFormat = "cjs"` for NestJS compatibility. |
| @prisma/adapter-pg | latest | PostgreSQL adapter | Required by Prisma 7 for PostgreSQL connections. New adapter pattern in v7. |
| @nestjs/passport | ^10 | Auth framework | NestJS official Passport integration. Strategy pattern for JWT. |
| @nestjs/jwt | ^10 | JWT handling | NestJS official JWT module. Signing, verification, token expiry. |
| passport-jwt | ^4.0 | JWT strategy | Standard Passport strategy for extracting JWT from cookies/headers. |
| passport-local | ^1.0 | Local strategy | Email/password login validation via Passport. |
| argon2 | ^0.41 | Password hashing | OWASP recommended. Memory-hard (resists GPU attacks). No 72-byte limit like bcrypt. |
| @nestjs/config | ^3 | Environment config | Type-safe env loading with `.env` files. Validation support. |
| class-validator | ^0.14 | DTO validation | NestJS native validation pipe. Decorators like `@IsEmail()`, `@MinLength()`. |
| class-transformer | ^0.5 | DTO transformation | Converts JSON to typed classes. `whitelist: true` strips unknown properties. |
| resend | ^4 | Transactional email | Developer-focused email API. Free tier: 3,000 emails/month, 100/day. SDK for Node.js. |

### Frontend (Phase 1 Specific)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | ^4.0 | Utility-first CSS | All styling. CSS-first config (no tailwind.config.js in v4). |
| shadcn/ui | ^3.5 (CLI) | Component library | Initialize in Phase 1. Copy components as needed (Button, Input, Form, Card, Toast). |
| react-hook-form | ^7.54 | Form management | Login, register, forgot password, profile settings forms. |
| @hookform/resolvers | ^3.9 | Schema validation bridge | Connects react-hook-form to Zod. |
| zod | ^4.3 | Schema validation | Form validation + shared type definitions. Use across frontend and backend. |
| lucide-react | ^0.469 | Icons | Default icon set for shadcn/ui. |

### Monorepo Tooling

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pnpm | ^9 | Package manager | All dependency management. Workspaces for monorepo. |
| Turborepo | ^2 | Build orchestration | `turbo.json` defines build/dev/lint/test pipelines. Caches outputs. |

**Installation (Phase 1 only):**
```bash
# Root monorepo setup
pnpm init
pnpm add -Dw turbo typescript

# apps/api (NestJS Backend)
cd apps/api
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express rxjs reflect-metadata
pnpm add @nestjs/passport @nestjs/jwt passport passport-jwt passport-local
pnpm add @nestjs/config
pnpm add prisma @prisma/client @prisma/adapter-pg pg
pnpm add class-validator class-transformer
pnpm add argon2
pnpm add resend
pnpm add -D @nestjs/cli @nestjs/schematics @nestjs/testing
pnpm add -D @types/passport-jwt @types/passport-local @types/pg

# apps/web (Next.js Frontend)
cd apps/web
pnpm add next react react-dom
pnpm add react-hook-form @hookform/resolvers zod
pnpm add tailwindcss @tailwindcss/postcss
pnpm add -D @types/react @types/react-dom
npx shadcn@latest init

# packages/shared
cd packages/shared
pnpm add zod
pnpm add -D typescript

# Root dev dependencies
cd ../..
pnpm add -Dw vitest @vitest/coverage-v8
pnpm add -Dw eslint prettier
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | Nodemailer + SMTP | Nodemailer requires SMTP server config; Resend is API-first with better DX. Resend free tier (3k/month) is sufficient for development and initial launch. |
| Resend | @nestjs-modules/mailer | Heavier setup with template engines. Resend SDK is simpler for programmatic email. |
| Argon2 | bcrypt | bcrypt has 72-byte password limit, less GPU-resistant. No reason to use bcrypt in a greenfield project. |
| Prisma 7 | Drizzle ORM | Project decision: Prisma chosen for schema-first workflow, auto-migrations, Studio, and mature NestJS integration. |
| Next.js Proxy | API rewrites | Proxy (new in Next.js 16) provides full request control. Rewrites are simpler but limited. |

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
daily-report-webapp/
  apps/
    web/                          # Next.js 16 frontend
      src/
        app/
          (auth)/                 # Auth route group (login, register, forgot-password, reset-password, verify-email)
            login/page.tsx
            register/page.tsx
            forgot-password/page.tsx
            reset-password/page.tsx
            verify-email/page.tsx
            layout.tsx            # Auth layout (centered card)
          (dashboard)/            # Protected route group
            settings/page.tsx     # Profile settings (TEAM-04)
            layout.tsx            # Dashboard layout with nav
          api/
            auth/
              [...path]/route.ts  # BFF proxy: /api/auth/* -> NestJS /auth/*
            users/
              [...path]/route.ts  # BFF proxy: /api/users/* -> NestJS /users/*
          layout.tsx              # Root layout
          page.tsx                # Landing/redirect
        components/
          ui/                     # shadcn/ui components
          auth/                   # Auth-specific components (LoginForm, RegisterForm, etc.)
          layout/                 # Shell, header, sidebar
        lib/
          api.ts                  # Client-side fetch wrapper
          auth.ts                 # Auth utility helpers
          utils.ts                # shadcn/ui cn() helper
        types/                    # Frontend-specific types
      next.config.ts
      postcss.config.mjs
      tailwind.config.ts          # Only if needed; Tailwind v4 uses CSS-first config
    api/                          # NestJS backend
      src/
        auth/
          auth.module.ts
          auth.controller.ts
          auth.service.ts
          strategies/
            jwt.strategy.ts
            jwt-refresh.strategy.ts
            local.strategy.ts
          guards/
            jwt-auth.guard.ts
            jwt-refresh.guard.ts
            local-auth.guard.ts
          dto/
            register.dto.ts
            login.dto.ts
            forgot-password.dto.ts
            reset-password.dto.ts
        users/
          users.module.ts
          users.controller.ts
          users.service.ts
          dto/
            update-profile.dto.ts
        mail/
          mail.module.ts
          mail.service.ts         # Resend integration
        prisma/
          prisma.module.ts
          prisma.service.ts
        common/
          decorators/
            current-user.decorator.ts
          filters/
            http-exception.filter.ts
          interceptors/
            transform.interceptor.ts
        app.module.ts
        main.ts
      prisma/
        schema.prisma
        migrations/
      nest-cli.json
      tsconfig.json
  packages/
    shared/                       # Shared types and schemas
      src/
        types/
          user.ts                 # User interface/type
          auth.ts                 # Auth-related types (login response, etc.)
        schemas/
          auth.schema.ts          # Zod schemas for auth validation (shared frontend/backend)
        index.ts                  # Barrel export
      package.json
      tsconfig.json
    tsconfig/                     # Shared TypeScript configs
      base.json
      nestjs.json
      nextjs.json
  .env.example                    # Required environment variables
  .gitignore
  turbo.json
  pnpm-workspace.yaml
  package.json
```

### Pattern 1: JWT Access + Refresh Tokens in httpOnly Cookies

**What:** NestJS issues two JWT tokens on login: a short-lived access token (15 minutes) and a long-lived refresh token (30 days). Both are stored in httpOnly, Secure, SameSite=Strict cookies. The access token is used for API requests; the refresh token is used to obtain new access tokens without re-login.

**When to use:** Always for this project. This is the auth pattern.

**Example:**
```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(user: User, res: Response) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    });

    // Store refresh token hash in database for rotation/revocation
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    // Set httpOnly cookies
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/auth/refresh',  // Only sent to refresh endpoint
    });

    return { message: 'Login successful' };
  }
}
```

### Pattern 2: Next.js BFF Proxy via Route Handlers

**What:** Next.js Route Handlers act as a proxy between the browser and NestJS. The browser sends requests to `/api/auth/login`, Next.js forwards them to `NESTJS_URL/auth/login`, and pipes back the response including Set-Cookie headers. The browser never knows NestJS exists.

**When to use:** For all API calls from the web frontend. This ensures same-origin cookies work correctly.

**Example:**
```typescript
// app/api/auth/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const NESTJS_URL = process.env.NESTJS_API_URL!;

async function proxyRequest(request: NextRequest, method: string) {
  const path = request.nextUrl.pathname.replace('/api', '');
  const url = `${NESTJS_URL}${path}`;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  // Forward cookies from browser to NestJS
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  const body = method !== 'GET' ? await request.text() : undefined;

  const response = await fetch(url, { method, headers, body });

  // Create NextResponse and pipe back Set-Cookie headers from NestJS
  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
  });

  // Forward Set-Cookie headers so httpOnly cookies propagate to browser
  response.headers.forEach((value, key) => {
    nextResponse.headers.set(key, value);
  });

  return nextResponse;
}

export async function GET(request: NextRequest) { return proxyRequest(request, 'GET'); }
export async function POST(request: NextRequest) { return proxyRequest(request, 'POST'); }
export async function PATCH(request: NextRequest) { return proxyRequest(request, 'PATCH'); }
export async function DELETE(request: NextRequest) { return proxyRequest(request, 'DELETE'); }
```

### Pattern 3: Prisma 7 Service for NestJS

**What:** A NestJS service wrapping PrismaClient with the Prisma 7 adapter pattern. Must use `moduleFormat = "cjs"` in the generator to work with NestJS CommonJS.

**When to use:** All database operations in NestJS.

**Example:**
```prisma
// prisma/schema.prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String    @map("password_hash")
  displayName       String?   @map("display_name")
  timezone          String    @default("UTC")
  emailVerified     Boolean   @default(false) @map("email_verified")
  refreshTokenHash  String?   @map("refresh_token_hash")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  teamMembers       TeamMember[]
  tasks             Task[]
  reportSubmissions ReportSubmission[]

  @@map("users")
}

model Team {
  id        String   @id @default(uuid())
  name      String
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")

  creator           User               @relation(fields: [createdBy], references: [id])
  members           TeamMember[]
  tasks             Task[]
  reportSubmissions ReportSubmission[]
  invitations       Invitation[]

  @@map("teams")
}

model TeamMember {
  id       String   @id @default(uuid())
  userId   String   @map("user_id")
  teamId   String   @map("team_id")
  role     String   @default("member") // 'owner' | 'member'
  joinedAt DateTime @default(now()) @map("joined_at")

  user User @relation(fields: [userId], references: [id])
  team Team @relation(fields: [teamId], references: [id])

  @@unique([userId, teamId])
  @@map("team_members")
}

model Task {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  teamId    String   @map("team_id")
  date      DateTime @db.Date
  title     String
  hours     Float    @default(0)
  sourceUrl String?  @map("source_url")
  notes     String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id])
  team Team @relation(fields: [teamId], references: [id])

  @@index([userId, teamId, date])
  @@map("tasks")
}

model ReportSubmission {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  teamId      String    @map("team_id")
  date        DateTime  @db.Date
  status      String    @default("draft") // 'draft' | 'submitted'
  submittedAt DateTime? @map("submitted_at")

  user User @relation(fields: [userId], references: [id])
  team Team @relation(fields: [teamId], references: [id])

  @@unique([userId, teamId, date])
  @@map("report_submissions")
}

model Invitation {
  id        String   @id @default(uuid())
  teamId    String   @map("team_id")
  email     String
  token     String   @unique
  invitedBy String   @map("invited_by")
  status    String   @default("pending") // 'pending' | 'accepted' | 'expired'
  createdAt DateTime @default(now()) @map("created_at")
  expiresAt DateTime @map("expires_at")

  team    Team @relation(fields: [teamId], references: [id])
  inviter User @relation(fields: [invitedBy], references: [id])

  @@map("invitations")
}
```

```typescript
// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Pattern 4: Email Verification and Password Reset via JWT Tokens

**What:** Email verification and password reset both use short-lived JWT tokens. On signup, a verification token is created and emailed via Resend. For password reset, a reset token is created on request and emailed. Both tokens are verified by dedicated endpoints.

**When to use:** AUTH-02 (email verification) and AUTH-03 (password reset).

**Example:**
```typescript
// auth.service.ts (email verification)
async sendVerificationEmail(user: User) {
  const token = this.jwtService.sign(
    { sub: user.id, type: 'email-verification' },
    {
      secret: this.configService.get('JWT_VERIFICATION_SECRET'),
      expiresIn: '24h',
    },
  );

  const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;

  await this.mailService.sendVerificationEmail(user.email, user.displayName, verificationUrl);
}

async verifyEmail(token: string) {
  const payload = this.jwtService.verify(token, {
    secret: this.configService.get('JWT_VERIFICATION_SECRET'),
  });

  if (payload.type !== 'email-verification') {
    throw new UnauthorizedException('Invalid token type');
  }

  await this.prisma.user.update({
    where: { id: payload.sub },
    data: { emailVerified: true },
  });
}
```

```typescript
// mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
  }

  async sendVerificationEmail(to: string, name: string, verificationUrl: string) {
    await this.resend.emails.send({
      from: this.configService.get('EMAIL_FROM'),
      to,
      subject: 'Verify your email address',
      html: `<p>Hi ${name},</p><p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
    await this.resend.emails.send({
      from: this.configService.get('EMAIL_FROM'),
      to,
      subject: 'Reset your password',
      html: `<p>Hi ${name},</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    });
  }
}
```

### Anti-Patterns to Avoid

- **Storing JWT in localStorage:** Vulnerable to XSS. Use httpOnly cookies exclusively for the web app.
- **Single JWT without refresh:** Short-lived tokens without refresh force frequent re-login. Always use access + refresh token pair.
- **Prisma 7 without `moduleFormat = "cjs"`:** NestJS uses CommonJS. Prisma 7 defaults to ESM. Without this setting, imports will fail at runtime.
- **Direct browser-to-NestJS API calls:** Bypasses the BFF proxy, breaks same-origin cookie flow, introduces CORS complexity. All web frontend requests must go through Next.js Route Handlers.
- **Supabase JS client in NestJS:** The project uses Prisma ORM for database access, not the Supabase JS SDK. Do not import `@supabase/supabase-js` in the backend.
- **Global Prisma instance without lifecycle hooks:** Always implement `OnModuleInit` and `OnModuleDestroy` to manage connection lifecycle properly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom crypto functions | argon2 | Crypto is hard to get right. Argon2 handles salt generation, timing attacks, memory hardness. |
| JWT creation/verification | Manual token handling | @nestjs/jwt | NestJS module handles signing, verification, expiry, secret management. |
| Auth guard boilerplate | Custom middleware parsing tokens | @nestjs/passport + passport-jwt | Passport handles token extraction, strategy selection, guard patterns. |
| Form validation (frontend) | Manual onChange handlers | react-hook-form + zod | RHF handles uncontrolled components, validation, error states. Zod provides type-safe schemas. |
| Form validation (backend) | Manual req.body checks | class-validator + ValidationPipe | NestJS decorators validate DTOs automatically. `whitelist: true` strips unknown fields. |
| Email delivery | SMTP client setup | Resend SDK | Resend handles delivery, bounce management, rate limiting. Free tier sufficient for development. |
| UI components | Custom button/input/form components | shadcn/ui | Accessible, styled, copy-to-project. Radix primitives handle keyboard nav, ARIA, focus. |
| Monorepo build orchestration | Custom scripts | Turborepo | Caches builds, parallelizes tasks, understands dependency graph between packages. |

**Key insight:** Phase 1 has zero custom business logic beyond the auth flow itself. Every component (hashing, JWT, validation, email, UI) has a mature library that handles edge cases you will not think of.

## Common Pitfalls

### Pitfall 1: Auth Token Desync Between SSR and Client

**What goes wrong:** Next.js Server Components read auth from cookies during SSR. Client Components may attempt separate token management (localStorage, React state). Tokens expire at different times. User sees a logged-in page that fails on the first client-side API call.

**Why it happens:** Next.js App Router runs components on the server by default. Server Components can read cookies but not localStorage. Client Components can access both. This dual execution environment creates two auth state sources.

**How to avoid:**
- Use httpOnly cookies as the SINGLE source of truth. Both SSR and client requests include cookies automatically.
- Route ALL API calls through Next.js Route Handlers (BFF proxy). Same-origin requests carry cookies without configuration.
- Never store JWT in localStorage, sessionStorage, or React state for the web app.
- Token refresh happens at the BFF layer, transparent to both Server and Client Components.

**Warning signs:** Auth works on first page load (SSR) but breaks on client navigation, or vice versa. Different token storage for SSR vs. client.

### Pitfall 2: Prisma 7 ESM/CJS Module Format Mismatch

**What goes wrong:** Prisma 7 generates ESM by default. NestJS uses CommonJS. Import statements fail at runtime with cryptic module resolution errors.

**Why it happens:** Prisma v7 changed the default module format from CJS to ESM. NestJS projects typically run as CommonJS unless explicitly converted.

**How to avoid:**
- Set `moduleFormat = "cjs"` in the Prisma schema generator block.
- Set the `output` path to a known location (e.g., `"../src/generated/prisma"`).
- Import from the generated path: `import { PrismaClient } from '../generated/prisma/client'`.

**Warning signs:** `ERR_REQUIRE_ESM`, `SyntaxError: Cannot use import statement outside a module`, or `Module not found` errors after `prisma generate`.

### Pitfall 3: Cookie Domain and Path Misconfiguration

**What goes wrong:** Cookies set by NestJS don't reach the browser because the domain or path doesn't match. Refresh token cookie sent to every endpoint (wasting bandwidth, security risk) or not sent to the refresh endpoint.

**Why it happens:** When Next.js BFF proxies to NestJS, the Set-Cookie headers from NestJS must reference the Next.js domain, not the NestJS domain. Path scoping on refresh token cookies must be explicit.

**How to avoid:**
- NestJS sets cookies with `domain` matching the frontend domain (or omit domain to default to the origin).
- Access token cookie: `path: '/'` (sent to all endpoints).
- Refresh token cookie: `path: '/api/auth/refresh'` (sent only to the refresh endpoint via BFF proxy).
- In development, use `secure: false` and `sameSite: 'lax'` since HTTPS is not available on localhost.
- Use environment-specific cookie config: production uses `secure: true`, `sameSite: 'strict'`.

**Warning signs:** Login succeeds but subsequent API calls return 401. Cookies visible in browser DevTools but not sent with requests.

### Pitfall 4: Missing Email Verification Check

**What goes wrong:** Users register and can immediately access all features without verifying their email. Password reset emails go to unverified addresses. Fake signups pollute the database.

**Why it happens:** Developers build registration and login first, then add email verification later as an afterthought. By then, the auth flow works without it, and adding the check requires touching every protected endpoint.

**How to avoid:**
- Add `emailVerified: boolean` to the User model from the start.
- The login endpoint should check `emailVerified` and return a clear error message directing users to verify.
- Provide a "resend verification email" endpoint for users who didn't receive the email.
- Allow unverified users to log in to a limited "verify your email" interstitial page, not the full dashboard.

**Warning signs:** No `emailVerified` column in the users table. Login works without verification check.

### Pitfall 5: Supabase Connection String Confusion

**What goes wrong:** Prisma uses the wrong connection string (direct vs. pooler), causing connection limits to be hit or migrations to fail.

**Why it happens:** Supabase provides multiple connection strings: direct (port 5432), session pooler (port 5432 via pooler.supabase.com), and transaction pooler (port 6543). Each has different use cases.

**How to avoid:**
- Use the **session pooler** connection string (port 5432 via `pooler.supabase.com`) for the application runtime (`DATABASE_URL`).
- Use the **direct** connection string for Prisma migrations and `prisma db push` (set as `DIRECT_URL` in `.env`).
- In `schema.prisma`, set `directUrl = env("DIRECT_URL")` in the datasource block for migration commands.
- Do NOT use the transaction pooler (port 6543) with Prisma unless deploying to serverless.

**Warning signs:** `too many connections` errors, migrations hanging or failing, `prepared statement already exists` errors.

### Pitfall 6: Timezone Not in User Profile Schema

**What goes wrong:** Reports from users in different timezones are attributed to the wrong calendar day. A user in UTC+9 creating a task at 11pm sees it on tomorrow's report instead of today's.

**Why it happens:** The `timezone` field is forgotten in the initial user schema. All date logic defaults to UTC. Retrofitting timezone support requires a data migration.

**How to avoid:**
- Include `timezone String @default("UTC")` in the User model from day one (already in the schema above).
- Phase 1 doesn't need to implement timezone-aware logic yet (that's for Phase 3 tasks/reports), but the column MUST exist now.
- The profile settings page should include timezone selection.

**Warning signs:** No timezone column in the users table. All date operations use UTC without user timezone consideration.

## Code Examples

### Environment Variables (.env.example)

```bash
# Database (Supabase)
DATABASE_URL="postgres://prisma.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres"
DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@[REGION].supabase.co:5432/postgres"

# JWT Secrets (generate with: openssl rand -base64 64)
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_VERIFICATION_SECRET="your-verification-secret"
JWT_RESET_SECRET="your-reset-secret"

# NestJS
PORT=3001
FRONTEND_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="Daily Report <noreply@yourdomain.com>"

# Next.js
NESTJS_API_URL="http://localhost:3001"
```

### Turborepo Configuration

```json
// turbo.json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

### pnpm Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

### NestJS Main Bootstrap

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parsing for httpOnly JWT cookies
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,        // Auto-transform payloads to DTO instances
    }),
  );

  // CORS - allow Next.js frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,       // Required for cookies
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

### JWT Strategy (Cookie Extraction)

```typescript
// auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract from httpOnly cookie
        (req: Request) => req?.cookies?.access_token ?? null,
        // Fallback to Authorization header (for Chrome extension)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
```

### Current User Decorator

```typescript
// common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma `prisma-client-js` generator | Prisma `prisma-client` generator with adapter pattern | Prisma 7 (2025) | Must use `@prisma/adapter-pg` for PostgreSQL. Generator name changed. |
| Prisma CJS default output | Prisma ESM default output | Prisma 7 (2025) | Must set `moduleFormat = "cjs"` for NestJS compatibility |
| Next.js middleware for request interception | Next.js proxy.ts for BFF pattern | Next.js 16 (2025) | Proxy provides full request/response control. Middleware still works but proxy is preferred for BFF. |
| bcrypt for password hashing | Argon2id | OWASP 2024 update | Argon2id is now the primary recommendation. bcrypt is acceptable but not preferred. |
| Supabase PgBouncer | Supabase Supavisor | Supabase 2024 | Supavisor replaced PgBouncer. `?pgbouncer=true` still works as a compatibility flag. |
| Route Handlers as catch-all proxy | Next.js 16 proxy.ts (Edge) | Next.js 16 (2025) | Route Handlers still work fine and are simpler. proxy.ts is for advanced edge-level interception. |

**Deprecated/outdated:**
- `prisma-client-js` generator name: Replaced by `prisma-client` in Prisma 7
- Storing refresh tokens in localStorage: Never secure. Always use httpOnly cookies.
- NestJS `@UseGuards(AuthGuard('jwt'))` without custom guard class: Still works, but custom guard classes are cleaner and more testable.

## Open Questions

1. **Resend domain verification for development**
   - What we know: Resend requires domain verification for production sending. Free tier allows sending from `onboarding@resend.dev` for testing.
   - What's unclear: Whether to set up a custom domain now or use Resend's test domain during Phase 1 development.
   - Recommendation: Use Resend's test domain for development. Set up custom domain before production deployment. This does not block Phase 1.

2. **Next.js 16 proxy.ts vs. Route Handlers for BFF**
   - What we know: Next.js 16 introduced a `proxy.ts` convention for request interception at the edge. Route Handlers are the established pattern for BFF proxying.
   - What's unclear: Whether proxy.ts is stable enough for production BFF use, or if Route Handlers remain the pragmatic choice.
   - Recommendation: Use Route Handlers for the BFF proxy. They are well-documented, stable, and sufficient. Switch to proxy.ts only if Route Handlers prove limiting.

3. **Docker Compose for local development**
   - What we know: The roadmap mentions Docker for backend deployment. Local development could use Docker Compose to run NestJS alongside a local PostgreSQL, or connect directly to Supabase.
   - What's unclear: Whether to include a docker-compose.yml for local dev in Phase 1 or defer to a later phase.
   - Recommendation: Connect directly to Supabase during development (it's already a managed service). Docker Compose is for production deployment and can be deferred to a pre-deployment phase.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^3 |
| Config file | None -- Wave 0 must create `vitest.config.ts` at monorepo root and per-app |
| Quick run command | `pnpm turbo test --filter=api` |
| Full suite command | `pnpm turbo test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Register with email/password creates user with hashed password | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "register"` | No -- Wave 0 |
| AUTH-01 | Register with duplicate email returns 409 | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "duplicate"` | No -- Wave 0 |
| AUTH-02 | Signup triggers verification email with valid token | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "verification"` | No -- Wave 0 |
| AUTH-02 | Verify endpoint marks user as verified | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "verify"` | No -- Wave 0 |
| AUTH-03 | Forgot-password sends reset email with valid token | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "forgot"` | No -- Wave 0 |
| AUTH-03 | Reset-password validates token and updates password | unit | `pnpm --filter api exec vitest run src/auth/auth.service.spec.ts -t "reset"` | No -- Wave 0 |
| AUTH-04 | Login sets httpOnly access + refresh cookies | integration | `pnpm --filter api exec vitest run src/auth/auth.controller.spec.ts -t "cookie"` | No -- Wave 0 |
| AUTH-04 | Refresh endpoint issues new access token | integration | `pnpm --filter api exec vitest run src/auth/auth.controller.spec.ts -t "refresh"` | No -- Wave 0 |
| AUTH-04 | Expired access token is refreshed via refresh token | integration | `pnpm --filter api exec vitest run src/auth/auth.controller.spec.ts -t "expired"` | No -- Wave 0 |
| TEAM-04 | Update profile changes name | unit | `pnpm --filter api exec vitest run src/users/users.service.spec.ts -t "update name"` | No -- Wave 0 |
| TEAM-04 | Update email requires current password | unit | `pnpm --filter api exec vitest run src/users/users.service.spec.ts -t "update email"` | No -- Wave 0 |
| TEAM-04 | Update password requires current password and hashes new password | unit | `pnpm --filter api exec vitest run src/users/users.service.spec.ts -t "update password"` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter api exec vitest run --reporter=verbose`
- **Per wave merge:** `pnpm turbo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/vitest.config.ts` -- Vitest config for NestJS (with SWC transform)
- [ ] `apps/web/vitest.config.ts` -- Vitest config for Next.js (if frontend tests needed in Phase 1)
- [ ] `vitest.workspace.ts` -- Monorepo workspace config for Vitest
- [ ] `apps/api/src/auth/auth.service.spec.ts` -- Auth service unit tests
- [ ] `apps/api/src/auth/auth.controller.spec.ts` -- Auth controller integration tests
- [ ] `apps/api/src/users/users.service.spec.ts` -- Users service unit tests
- [ ] `apps/api/test/setup.ts` -- Test setup with NestJS testing module and Prisma mock
- [ ] Framework install: `pnpm add -Dw vitest @vitest/coverage-v8` + `pnpm --filter api add -D unplugin-swc @swc/core`

## Sources

### Primary (HIGH confidence)
- [NestJS Authentication Documentation](https://docs.nestjs.com/security/authentication) -- Official Passport/JWT setup guide
- [NestJS Prisma Recipe](https://docs.nestjs.com/recipes/prisma) -- Official Prisma integration
- [Prisma NestJS Guide](https://www.prisma.io/docs/guides/nestjs) -- Official Prisma guide for NestJS
- [Supabase Prisma Documentation](https://supabase.com/docs/guides/database/prisma) -- Connection string configuration
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) -- Official auth patterns
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) -- Official setup guide
- [Prisma Generators Reference](https://www.prisma.io/docs/orm/prisma-schema/overview/generators) -- moduleFormat documentation

### Secondary (MEDIUM confidence)
- [NestJS + Prisma 7 Complete Guide (DEV Community, 2026)](https://dev.to/manendrav/how-to-set-up-nestjs-with-prisma-and-postgresql-2026-complete-guide-2da7) -- Prisma 7 moduleFormat CJS config verified against official docs
- [Refresh Tokens with httpOnly Cookies (DEV Community)](https://dev.to/zenstok/part-33-how-to-implement-refresh-tokens-through-http-only-cookie-in-nestjs-and-react-265e) -- Cookie config and token extraction patterns
- [Next.js 16 Proxy vs Middleware BFF Guide](https://u11d.com/blog/nextjs-16-proxy-vs-middleware-bff-guide/) -- proxy.ts feature explanation
- [NestJS Cookie-based JWT Authentication](https://tigran.tech/nestjs-cookie-based-jwt-authentication/) -- httpOnly cookie implementation
- [Setting HTTP-only cookies via proxy in Next.js v16 (GitHub Discussion)](https://github.com/vercel/next.js/discussions/85600) -- Community-validated BFF cookie forwarding
- [Secure Next.js BFF with Session Cookies](https://cybersierra.co/blog/secure-nextjs-bff-sessions/) -- BFF pattern security analysis
- [pnpm + Turborepo + NestJS + Next.js Monorepo Setup](https://medium.com/@chengchao60827/how-to-setup-a-monorepo-project-using-nextjs-nestjs-turborepo-and-pnpm-e0d3ade0360d) -- Monorepo scaffold walkthrough
- [Resend Node.js SDK](https://resend.com/nodejs) -- Email sending API
- [nestjs-resend GitHub](https://github.com/jiangtaste/nestjs-resend) -- NestJS Resend integration
- [Resend Pricing (2026)](https://userjot.com/blog/resend-pricing-in-2025) -- Free tier verification: 3,000/month, 100/day
- [Argon2 npm package](https://www.npmjs.com/package/argon2) -- Password hashing library
- [NestJS Argon2 Security Service (DEV Community)](https://dev.to/imzihad21/comprehensive-encryption-and-security-service-in-nestjs-argon2-hashing-token-generation-and-aes-encryption-595o) -- Argon2 integration pattern

### Tertiary (LOW confidence)
- [NestJS email authentication starter (GitHub)](https://github.com/marcomelilli/nestjs-email-authentication) -- Reference implementation; older code, patterns still valid
- [Next.js 16 proxy.ts stability](https://u11d.com/blog/nextjs-16-proxy-vs-middleware-bff-guide/) -- Relatively new feature, recommend Route Handlers for stability

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries verified via official docs, npm, and recent community guides. Versions confirmed current.
- Architecture: HIGH -- BFF proxy + httpOnly cookies is a well-documented pattern for Next.js + separate backend. Prisma 7 NestJS integration has multiple verified sources.
- Pitfalls: HIGH -- Each pitfall sourced from official docs, community post-mortems, or established security guidance. The Prisma 7 CJS issue is particularly well-documented.
- Email infrastructure: MEDIUM -- Resend is the recommended choice based on DX and free tier. Nodemailer + SMTP is a viable fallback if Resend doesn't work out.

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- stable stack, mature libraries)

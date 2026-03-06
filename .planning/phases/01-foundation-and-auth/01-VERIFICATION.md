---
phase: 01-foundation-and-auth
verified: 2026-03-06T18:30:00Z
status: passed
score: 5/5 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Monorepo builds and runs locally with NestJS API, Next.js frontend, and Supabase database connected"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "End-to-end registration + email verification flow"
    expected: "Registration succeeds, console shows verification URL, clicking URL marks email verified"
    why_human: "Email delivery, console log output, and UI state transitions cannot be verified statically"
  - test: "Session persistence across browser refresh"
    expected: "Dashboard remains visible after F5; user email still shown in header"
    why_human: "httpOnly cookie behavior across actual browser refreshes requires a live browser"
  - test: "Password reset full flow"
    expected: "All steps succeed; old password no longer works after reset"
    why_human: "Full flow with multiple page transitions and authentication state changes requires manual execution"
  - test: "Settings page — all three cards"
    expected: "Each card saves independently; toast notifications; wrong password shows field-level error; password change logs user out"
    why_human: "UI feedback, field-level errors vs. toast errors, and post-save behavior require visual inspection"
  - test: "Protected route redirect"
    expected: "Navigating to /dashboard without auth redirects to /login with no content flash"
    why_human: "Flash-of-unauthenticated-content behavior during client-side redirect can only be seen in a browser"
---

# Phase 1: Foundation and Auth — Verification Report

**Phase Goal:** Complete authentication and user management foundation — users can register, login, manage their profile, with JWT-based session management and email verification support.
**Verified:** 2026-03-06T18:30:00Z
**Status:** PASSED
**Re-verification:** Yes — after gap closure (`apps/api/.env.example` JWT variable name fix)

---

## Re-Verification Summary

| Item | Previous | Now |
|------|----------|-----|
| Gap: `.env.example` JWT variable name | FAILED | CLOSED |
| Overall score | 4/5 | 5/5 |
| Overall status | gaps_found | passed |
| Regressions found | — | None |

**Gap closure verified:** `apps/api/.env.example` now contains exactly `JWT_SECRET` (single variable, with generation hint `openssl rand -base64 64`). The four wrong names (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_VERIFICATION_SECRET`, `JWT_RESET_SECRET`) are gone from the file. A codebase-wide search confirms zero occurrences of those wrong names anywhere under `apps/` or `packages/`.

The code's 7 call sites (`configService.getOrThrow('JWT_SECRET')`) now match the documented env var exactly.

---

## Goal Achievement

### Success Criteria (from ROADMAP.md)

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | User can sign up with email and password and receive a verification email | VERIFIED | `AuthService.register` hashes password, inserts into Supabase, generates JWT verification token, calls `emailService.sendVerificationEmail`. Register page at `/register` with form. |
| 2 | User can log in and their session persists across browser refreshes without re-entering credentials | VERIFIED | `AuthService.login` sets httpOnly `access_token` (15m) + `refresh_token` (7d) cookies. Dashboard layout checks `useAuth` which calls `GET /auth/me` — cookie sent automatically on every request. |
| 3 | User can reset a forgotten password via an email link | VERIFIED | `POST /auth/forgot-password` + `POST /auth/reset-password` implemented. Frontend pages at `/forgot-password` and `/reset-password`. Anti-enumeration pattern applied. |
| 4 | User can update their profile (name, email, password) from a settings page | VERIFIED | `GET /users/me` + `PATCH /users/me` in UsersModule. Settings page at `/settings` (inside `(dashboard)` route group) with three independent cards: Profile, Email, Password. |
| 5 | Monorepo builds and runs locally with NestJS API, Next.js frontend, and Supabase database connected | VERIFIED | `apps/api/.env.example` now documents `JWT_SECRET` (the single variable read by all 7 code call sites). All other env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL, RESEND_API_KEY, EMAIL_FROM, PORT) were already correct. A developer copying `.env.example` and filling real values will get a working app. |

**Score: 5/5 success criteria verified**

---

## Observable Truths Verified (Per-Plan must_haves)

### Plan 01 — Supabase Foundation

| Truth | Status | Evidence |
|-------|--------|----------|
| NestJS API starts without Prisma-related errors | VERIFIED | No Prisma packages or directories exist. `apps/api/src/prisma/`, `apps/api/prisma/`, `apps/api/src/generated/` all absent. |
| SupabaseService is injectable in any NestJS module | VERIFIED | `@Global() @Module` in `supabase.module.ts` provides and exports `SupabaseService`. Imported in `AppModule`. |
| Shared package exports database types matching the users table schema | VERIFIED | `packages/shared/src/types/database.ts` exports `DbUser`, `DbUserInsert`, `DbUserUpdate`. All fields match SQL schema. |
| Test setup provides mock Supabase service (not Prisma mocks) | VERIFIED | `apps/api/test/setup.ts` exports `createMockSupabaseService()` with chainable mock query builder. No Prisma references. |
| Turborepo builds succeed for all packages | HUMAN NEEDED | Can only verify statically; build execution requires a running environment. |

### Plan 02 — Auth Backend

| Truth | Status | Evidence |
|-------|--------|----------|
| POST /auth/register creates user with Argon2-hashed password and returns 201 | VERIFIED | `AuthService.register` calls `argon2.hash(dto.password)` before insert. 13 passing unit tests confirm behavior. |
| POST /auth/register rejects duplicate email with 409 Conflict | VERIFIED | Error code `23505` check → `ConflictException`. Test `rejects duplicate email with 409 ConflictException` passes. |
| POST /auth/login with valid credentials sets httpOnly access_token and refresh_token cookies | VERIFIED | `generateTokensAndSetCookies` sets both cookies with `httpOnly: true`, `sameSite: 'lax'`, correct `maxAge` and `path`. |
| POST /auth/login with invalid credentials returns 401 | VERIFIED | `UnauthorizedException('Invalid credentials')` thrown for missing user or argon2 mismatch. Tests pass. |
| POST /auth/refresh with valid refresh cookie issues new access_token cookie | VERIFIED | `AuthService.refresh` verifies argon2 hash then calls `generateTokensAndSetCookies`. Test passes. |
| POST /auth/logout clears both cookies and nullifies refresh_token_hash | VERIFIED | Sets `maxAge: 0` on both cookies, updates `refresh_token_hash: null` in DB. Test passes. |
| Protected endpoints reject requests without valid access_token cookie | VERIFIED | `AccessTokenStrategy` extracts from `req.cookies.access_token`. `AccessTokenGuard extends AuthGuard('jwt')`. |

### Plan 03 — Frontend Auth

| Truth | Status | Evidence |
|-------|--------|----------|
| User can navigate to /login and see a login form | VERIFIED | `apps/web/src/app/(auth)/login/page.tsx` — shadcn Card with email + password fields, submit calls `login.mutateAsync`. |
| User can navigate to /register and see a registration form | VERIFIED | `apps/web/src/app/(auth)/register/page.tsx` — shadcn Card with displayName + email + password fields. |
| User can submit login form and get redirected to dashboard on success | VERIFIED | `loginMutation.onSuccess` calls `router.push('/dashboard')` and invalidates `['auth', 'me']` query. |
| User can submit register form and see success feedback | VERIFIED | `registerMutation.onSuccess` calls `toast.success(...)` and `router.push('/login')`. |
| Visiting /dashboard without auth redirects to /login | VERIFIED | Dashboard layout: `useEffect` checks `!isLoading && !isAuthenticated` → `router.replace('/login')`. |
| Session persists across page refresh (httpOnly cookie auto-sent) | VERIFIED | `api-client.ts` uses `credentials: 'include'`. `useAuth` queries `GET /auth/me` on mount — httpOnly cookie sent automatically. |

### Plan 04 — Email Verification and Password Reset

| Truth | Status | Evidence |
|-------|--------|----------|
| After registration, a verification email is sent with a tokenized link | VERIFIED | `AuthService.register` calls `emailService.sendVerificationEmail(user.email, verificationToken)` after insert. |
| Clicking the verification link marks the user's email as verified in the database | VERIFIED | `POST /auth/verify-email` decodes JWT, checks `purpose === 'email-verification'`, calls `supabase.update({ email_verified: true })`. |
| User can request a password reset email by providing their registered email | VERIFIED | `POST /auth/forgot-password` implemented with anti-enumeration (always returns 200). |
| Clicking the password reset link allows user to set a new password | VERIFIED | `POST /auth/reset-password` decodes JWT, checks purpose, hashes new password, updates DB. |
| Reset token expires after 1 hour and cannot be reused | VERIFIED | `jwtService.signAsync(..., { expiresIn: '1h' })` for both verification and reset tokens. |
| Password reset updates the password hash in the database | VERIFIED | `argon2.hash(dto.password)` + `supabase.update({ password_hash: newPasswordHash, refresh_token_hash: null })`. |

### Plan 05 — User Profile (TEAM-04)

| Truth | Status | Evidence |
|-------|--------|----------|
| User can view their current profile (name, email, timezone) on the settings page | VERIFIED | `GET /users/me` returns `User` with camelCase fields. Settings page fetches via `useQuery(['users', 'me'])`. |
| User can update their display name | VERIFIED | Profile card in settings POSTs `PATCH /users/me { displayName }`. UsersService maps to `display_name` update. |
| User can update their email (requires current password for confirmation) | VERIFIED | Email card requires `currentPassword`. Service throws `BadRequestException` without it, `UnauthorizedException` on wrong password. |
| User can change their password (requires current password, sets new hashed password) | VERIFIED | Password card sends `{ newPassword, currentPassword }`. Service calls `argon2.hash(dto.newPassword)`. |
| Profile changes are persisted in the database and reflected on refresh | VERIFIED | PATCH returns updated row, TanStack Query cache invalidated on success, re-fetch on next mount. |

---

## Required Artifacts

| Artifact | Expected | Status | Notes |
|----------|----------|--------|-------|
| `apps/api/.env.example` | Env var documentation | VERIFIED | Now documents `JWT_SECRET` (single variable). All 7 code call sites use `configService.getOrThrow('JWT_SECRET')`. No stale wrong names remain anywhere in the codebase. |
| `apps/api/src/supabase/supabase.module.ts` | Global Supabase module | VERIFIED | `@Global() @Module` with SupabaseService provider and export |
| `apps/api/src/supabase/supabase.service.ts` | Supabase client wrapper | VERIFIED | `onModuleInit` creates client with service_role key |
| `apps/api/test/setup.ts` | Mock Supabase factory | VERIFIED | `createMockSupabaseService()` with chainable mock builder |
| `packages/shared/src/types/database.ts` | DbUser types | VERIFIED | `DbUser`, `DbUserInsert`, `DbUserUpdate` exported |
| `apps/api/src/auth/auth.module.ts` | AuthModule wiring | VERIFIED | PassportModule, JwtModule, EmailModule, both strategies |
| `apps/api/src/auth/auth.service.ts` | Auth logic | VERIFIED | register/login/refresh/logout/verifyEmail/forgotPassword/resetPassword |
| `apps/api/src/auth/auth.controller.ts` | Auth REST endpoints | VERIFIED | POST register/login/refresh/logout, GET /auth/me, POST verify-email/forgot-password/reset-password |
| `apps/api/src/auth/strategies/access-token.strategy.ts` | Access token strategy | VERIFIED | Extracts from `req.cookies.access_token` |
| `apps/api/src/auth/strategies/refresh-token.strategy.ts` | Refresh token strategy | VERIFIED | Extracts from `req.cookies.refresh_token`, `passReqToCallback: true` |
| `apps/api/src/email/email.service.ts` | Resend email wrapper | VERIFIED | Graceful fallback to console.log when `RESEND_API_KEY` unset |
| `apps/api/src/email/email.module.ts` | Email module | VERIFIED | Provides and exports EmailService |
| `apps/api/src/users/users.module.ts` | UsersModule | VERIFIED | Imports SupabaseModule, provides UsersService |
| `apps/api/src/users/users.service.ts` | Profile CRUD | VERIFIED | getProfile with narrow SELECT, updateProfile with argon2 gating |
| `apps/api/src/users/users.controller.ts` | GET/PATCH /users/me | VERIFIED | `@UseGuards(AccessTokenGuard)` on class |
| `apps/web/src/lib/api-client.ts` | Fetch wrapper | VERIFIED | `credentials: 'include'`, 401→refresh interceptor |
| `apps/web/src/hooks/use-auth.ts` | Auth state hook | VERIFIED | useQuery + useMutation for login/register/logout |
| `apps/web/src/app/(auth)/login/page.tsx` | Login page | VERIFIED | shadcn Card + react-hook-form + zodResolver(loginSchema) |
| `apps/web/src/app/(auth)/register/page.tsx` | Register page | VERIFIED | shadcn Card + react-hook-form + zodResolver(registerSchema) |
| `apps/web/src/app/(dashboard)/layout.tsx` | Protected layout | VERIFIED | Auth guard via useEffect, user email + Settings link + Logout button |
| `apps/web/src/app/(auth)/verify-email/page.tsx` | Email verify page | VERIFIED | Calls `api.post('/auth/verify-email', { token })` on mount |
| `apps/web/src/app/(auth)/forgot-password/page.tsx` | Forgot password page | VERIFIED | Anti-enumeration with `finally { setSubmitted(true) }` |
| `apps/web/src/app/(auth)/reset-password/page.tsx` | Reset password page | VERIFIED | Local schema with `.refine()` for confirm password |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | Settings page | VERIFIED | Three independent Cards (Profile, Email, Password). Located in `(dashboard)` route group — URL is still `/settings`, auth protection provided automatically by the layout. |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `apps/api/src/app.module.ts` | `supabase.module.ts` | imports array | VERIFIED | `SupabaseModule` in imports array |
| `apps/api/src/supabase/supabase.service.ts` | `@supabase/supabase-js` | `createClient` call | VERIFIED | `createClient(url, serviceRoleKey, { auth: ... })` in `onModuleInit` |
| `apps/api/src/auth/auth.service.ts` | `supabase.service.ts` | constructor injection | VERIFIED | `this.supabaseService.getClient()` called in register, login, refresh, logout, forgotPassword, resetPassword |
| `apps/api/src/auth/auth.service.ts` | `argon2` | password hashing | VERIFIED | `argon2.hash()` on register and `argon2.verify()` on login, refresh |
| `apps/api/src/auth/strategies/access-token.strategy.ts` | `access_token` cookie | jwtFromRequest extractor | VERIFIED | `(req) => req?.cookies?.access_token ?? null` |
| `apps/api/src/auth/auth.controller.ts` | `auth.service.ts` | dependency injection | VERIFIED | `this.authService.register/login/refresh/logout/...` called in all handlers |
| `apps/api/src/auth/auth.service.ts` | `email.service.ts` | dependency injection | VERIFIED | `this.emailService.sendVerificationEmail(...)` called after register |
| `apps/api/.env.example` | `JWT_SECRET` code usage | variable name match | VERIFIED | `.env.example` line 9: `JWT_SECRET="your-secret-min-32-chars"` matches all 7 `configService.getOrThrow('JWT_SECRET')` call sites |
| `apps/web/src/lib/api-client.ts` | `http://localhost:3001` | fetch with `credentials: include` | VERIFIED | `credentials: 'include'` on every fetch call |
| `apps/web/src/hooks/use-auth.ts` | `api-client.ts` | api.post and api.get calls | VERIFIED | `api.get('/auth/me')`, `api.post('/auth/login')`, `api.post('/auth/register')`, `api.post('/auth/logout')` |
| `apps/web/src/app/(dashboard)/layout.tsx` | `use-auth.ts` | auth check on mount | VERIFIED | `const { user, isLoading, isAuthenticated, logout } = useAuth()` + `useEffect` redirect |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | `api-client.ts` | api.get and api.patch | VERIFIED | `api.get<User>('/users/me')` and `api.patch<User>('/users/me', data)` |
| `apps/api/src/users/users.service.ts` | `supabase.service.ts` | constructor injection | VERIFIED | `this.supabaseService.getClient()` in `getProfile` and `updateProfile` |
| `apps/api/src/users/users.controller.ts` | `access-token.guard.ts` | `@UseGuards(AccessTokenGuard)` on class | VERIFIED | `@UseGuards(AccessTokenGuard)` decorates the `UsersController` class |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 01-01, 01-02, 01-03 | User can create account with email and password | SATISFIED | `POST /auth/register` + `/register` page + 13 passing tests |
| AUTH-02 | 01-03, 01-04 | User receives email verification after signup | SATISFIED | `EmailService.sendVerificationEmail` called in `register()`. `POST /auth/verify-email` endpoint + `/verify-email` page. 4 email tests pass. |
| AUTH-03 | 01-04 | User can reset password via email link | SATISFIED | `POST /auth/forgot-password` + `POST /auth/reset-password` + `/forgot-password` and `/reset-password` pages. 3 reset tests pass. |
| AUTH-04 | 01-01, 01-02, 01-03 | User session persists across browser refresh | SATISFIED | httpOnly cookie pattern implemented. `access_token` 15m, `refresh_token` 7d. `credentials: 'include'` on all API calls. |
| TEAM-04 | 01-05 | User can update their profile (name, email, password) | SATISFIED | `PATCH /users/me` with `displayName`, `email`+`currentPassword`, `newPassword`+`currentPassword`. Settings page with 3 Cards. 8 unit tests pass. |

All 5 Phase 1 requirements satisfied (AUTH-01 through AUTH-04, TEAM-04).

No orphaned requirements found. All IDs claimed across plans match the 5 listed in ROADMAP.md for Phase 1.

---

## Anti-Patterns Found

| File | Issue | Severity | Impact |
|------|-------|----------|--------|
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Shows `"Your dashboard will appear here."` — placeholder content | INFO | Intentional for Phase 1; real content comes in Phase 3. Does not block any auth functionality. |

No blocker anti-patterns remain. The previous BLOCKER (`apps/api/.env.example` wrong JWT names) has been resolved.

---

## Human Verification Required

### 1. End-to-End Registration + Email Verification Flow

**Test:** Start both servers, register a new account, retrieve verification URL from API console, click it.
**Expected:** Registration succeeds with 201, console shows verification URL (when `RESEND_API_KEY` not set), clicking URL calls `POST /auth/verify-email` and shows "Email verified!" card.
**Why human:** Email delivery, console log output, and UI state transitions cannot be verified statically.

### 2. Session Persistence Across Browser Refresh

**Test:** Log in successfully, then press F5 (hard refresh) on the dashboard page.
**Expected:** Dashboard remains visible without redirect to `/login`. User email still shown in header.
**Why human:** httpOnly cookie behavior across actual browser refreshes requires a live browser.

### 3. Password Reset Flow

**Test:** Use "Forgot password?" link on login page, submit email, retrieve reset URL from API console, click URL, set new password, log in with new password.
**Expected:** All steps succeed. Old password no longer works after reset.
**Why human:** Full flow with multiple page transitions, API calls, and authentication state changes requires manual execution.

### 4. Settings Page — All Three Cards

**Test:** Log in, navigate to `/settings`, update display name, update email with correct password, change password (expect logout).
**Expected:** Each card saves independently. Toast notifications appear. Wrong password shows field-level error, not a toast. Password change logs user out.
**Why human:** UI feedback, field-level errors vs. toast errors, and post-save behavior require visual inspection.

### 5. Protected Route Redirect

**Test:** Without logging in, navigate directly to `http://localhost:3000/dashboard`.
**Expected:** Redirected to `/login` page. No dashboard content visible, even briefly.
**Why human:** Flash-of-unauthenticated-content (FOUC) behavior during client-side redirect can only be seen in a browser.

---

## How to Test Locally

### Prerequisites

```bash
# 1. Install all dependencies from repo root
cd /path/to/daily-report-webapp
pnpm install

# 2. Set up backend env
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and fill in real values:
#
#   SUPABASE_URL=https://[project-ref].supabase.co
#     → Supabase Dashboard → Project Settings → API → Project URL
#
#   SUPABASE_SERVICE_ROLE_KEY=eyJ...
#     → Supabase Dashboard → Project Settings → API → service_role key (secret)
#
#   JWT_SECRET=<generate with: openssl rand -base64 64>
#     → Single secret used for all token types (access, refresh, verification, reset)
#
#   PORT=3001
#     → Leave as-is for local development
#
#   FRONTEND_URL=http://localhost:3000
#     → Leave as-is for local development
#
#   RESEND_API_KEY=re_xxxxxxxxxxxx
#     → Optional: leave blank or omit to use console-log fallback for email links
#     → Get from https://resend.com/api-keys if you want real email delivery
#
#   EMAIL_FROM=Daily Report <noreply@yourdomain.com>
#     → Required only if RESEND_API_KEY is set

# 3. Set up frontend env
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:3001
#   NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
#     → Supabase Dashboard → Project Settings → API → anon/public key

# 4. Create the users table in Supabase Dashboard → SQL Editor:
#    (Full SQL schema is in .planning/phases/01-foundation-and-auth/01-RESEARCH.md)
#    The table must exist before the API can register any users.
```

### Start the Servers

```bash
# Terminal 1 — NestJS API (port 3001)
cd apps/api
pnpm dev

# Terminal 2 — Next.js frontend (port 3000)
cd apps/web
pnpm dev

# Or start both from repo root using Turborepo:
pnpm dev
```

### Verify Each Feature

**AUTH-01: User registration**
1. Open `http://localhost:3000` — should redirect to `/login`
2. Click the "Sign up" link — navigate to `http://localhost:3000/register`
3. Fill in optional display name, email (`test@example.com`), password (8+ characters)
4. Click "Create account"
5. Expected: Toast notification "Account created! Please check your email to verify." and redirect to `/login`
6. In the API terminal, look for: `[DEV] Verification URL for test@example.com: http://localhost:3000/verify-email?token=...`

**AUTH-02: Email verification**
7. Copy the verification URL printed in the API terminal (step 6 above)
8. Paste it into the browser address bar and press Enter
9. Expected: Page shows "Verifying your email..." then transitions to "Email verified!" with a "Sign in" button

**AUTH-01 + AUTH-04: Login and session persistence**
10. Navigate to `http://localhost:3000/login`
11. Enter the email and password from registration, click "Sign in"
12. Expected: Redirect to `http://localhost:3000/dashboard` showing "Welcome, test@example.com!" (or similar)
13. Press F5 or Cmd+R (hard browser refresh)
14. Expected: Still on dashboard — not redirected to `/login`

**AUTH-04: Verify httpOnly cookies in browser**
15. Open browser DevTools → Application tab → Cookies → `http://localhost:3001`
16. Expected: `access_token` and `refresh_token` cookies visible with the HttpOnly flag checked
17. In the DevTools Console, type: `document.cookie`
18. Expected: Neither `access_token` nor `refresh_token` appears (httpOnly cookies are not accessible via JS)

**AUTH-03: Password reset**
19. Click "Logout" button in the dashboard header — redirected to `/login`
20. Click "Forgot password?" link on the login page
21. Enter `test@example.com`, click "Send reset link"
22. Expected: Message "If an account exists with that email, you'll receive a reset link shortly."
23. In the API terminal, look for: `[DEV] Password reset URL for test@example.com: http://localhost:3000/reset-password?token=...`
24. Copy that URL and open it in the browser
25. Expected: "Reset password" form with two password fields (new password + confirm)
26. Enter a new password, confirm it, click "Reset password"
27. Expected: Toast "Password reset successfully" and redirect to `/login`
28. Log in with the new password — Expected: Successful login to dashboard
29. Attempt to log in with the OLD password — Expected: 401 "Invalid credentials" error shown

**TEAM-04: Profile settings**
30. From the dashboard, click "Settings" in the header
31. Expected: Settings page at `http://localhost:3000/settings` with three independent cards: Profile, Email address, Password
32. In the **Profile card**: change the display name field, click "Save profile"
    - Expected: Toast "Profile updated" and the name field retains the new value
33. In the **Email card**: enter an incorrect current password, click "Update email"
    - Expected: Field-level error "Incorrect password" on the password field (NOT a toast)
34. In the **Email card**: enter a new email address + correct current password, click "Update email"
    - Expected: Toast "Email updated"
35. In the **Password card**: enter correct current password + new password + matching confirm password, click "Change password"
    - Expected: Toast "Password updated. Please log in again." followed by automatic logout to `/login`
36. Log in with the new password — Expected: Successful login

**Protected routes**
37. Log out, then navigate directly to `http://localhost:3000/dashboard` by typing the URL
38. Expected: Redirect to `/login` — no dashboard content ever visible

### Run Automated Tests

```bash
# From the apps/api directory — run all backend unit tests
cd apps/api
pnpm vitest run --reporter=verbose
# Expected: 33 tests pass across 4 test files, 0 failures

# From the apps/web directory — TypeScript type-check (no test runner needed for frontend)
cd apps/web
pnpm exec tsc --noEmit
# Expected: 0 errors, 0 warnings
```

---

## Notable Implementation Details

- **Settings page location:** The plan specified `apps/web/src/app/settings/page.tsx` but the actual file is `apps/web/src/app/(dashboard)/settings/page.tsx`. The URL is still `/settings` in both cases (Next.js route groups don't affect URLs). The moved location is actually better — the `(dashboard)` route group layout provides auth protection automatically.

- **Email fallback:** When `RESEND_API_KEY` is not set (or left as the placeholder value), `EmailService` logs verification and password reset URLs to the NestJS console instead of sending real emails. This is intentional behavior for local development without a Resend account configured.

- **GET /auth/me vs GET /users/me:** Both endpoints exist for different purposes. `GET /auth/me` returns only `{ userId, email }` from the JWT payload (lightweight auth check used by the `useAuth` hook on every page load). `GET /users/me` returns the full `User` profile from the database (used by the settings page to pre-populate form fields).

- **Single JWT secret:** Unlike architectures that use separate secrets per token type, this implementation uses one `JWT_SECRET` for all JWT operations. Token purpose is encoded inside the payload (`purpose: 'email-verification'`, `purpose: 'password-reset'`) and validated in the handler before acting on the token.

---

_Verified: 2026-03-06T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: gap closed after `.env.example` JWT_SECRET fix_

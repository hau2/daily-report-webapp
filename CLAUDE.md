# Project Instructions

## Tech Stack
- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: NestJS (`apps/api`) — port 3001
- **Frontend**: Next.js 14 App Router (`apps/web`) — port 3000
- **Shared**: `packages/shared` — Zod schemas, TypeScript types
- **Database**: Supabase (postgres) — accessed via `@supabase/supabase-js` (no Prisma)
- **Auth**: Dual JWT (access + refresh) in httpOnly cookies, managed by NestJS

## Env Files
- Backend env: `apps/api/.env` (copy from `apps/api/.env.example`)
- Frontend env: `apps/web/.env.local` (copy from `apps/web/.env.example`)
- Both are required before running locally

## Phase Execution Rules
1. Every phase must implement **both** Backend and Frontend where applicable.
2. Every plan must ensure env vars it introduces are documented in `apps/api/.env.example` or `apps/web/.env.example`.
3. The verification step (VERIFICATION.md) **must** include a **"How to test locally"** section with:
   - Step-by-step commands to start the servers
   - Which URLs to open in the browser
   - Exact manual steps to verify each feature (e.g. "Go to /register, fill in the form, click submit — expect redirect to /login")
   - Any required env var setup or seed data needed first

## Running Locally
```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit both files with real values

# 3. Start all services
pnpm dev
# Backend: http://localhost:3001
# Frontend: http://localhost:3000
```

## Testing
```bash
# Run all tests
pnpm test

# Backend only
cd apps/api && pnpm vitest run

# Frontend type-check
cd apps/web && pnpm exec tsc --noEmit
```

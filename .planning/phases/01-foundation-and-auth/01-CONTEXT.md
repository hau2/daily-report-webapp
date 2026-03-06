# Phase 1: Foundation and Auth - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning
**Source:** User direction

<domain>
## Phase Boundary

Phase 1 delivers: monorepo scaffold, authentication system (register, login, session persistence), email verification, password reset, and user profile settings.

</domain>

<decisions>
## Implementation Decisions

### Database Access
- Use Supabase JS client (`@supabase/supabase-js`) for ALL database operations — NOT Prisma
- No direct PostgreSQL connection strings
- Backend uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for server-side operations
- Frontend uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side

### Environment Variables
- Frontend: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `JWT_SECRET`, `PORT=3001`

### Claude's Discretion
- Auth flow architecture (JWT strategy, cookie handling, BFF proxy)
- Frontend component library and form handling
- Monorepo tooling (pnpm + Turborepo)
- Test framework setup
- Email service for verification/reset

</decisions>

<specifics>
## Specific Ideas

- No Prisma ORM, no prisma schema, no database migrations managed by app
- Supabase handles database schema/tables via its dashboard or SQL editor
- Service role key used in backend for admin-level database operations

</specifics>

<deferred>
## Deferred Ideas

None — context covers phase scope.

</deferred>

---

*Phase: 01-foundation-and-auth*
*Context gathered: 2026-03-06 via user direction*

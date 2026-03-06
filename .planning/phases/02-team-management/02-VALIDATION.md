---
phase: 2
slug: team-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `cd apps/api && pnpm vitest run --reporter=verbose src/teams` |
| **Full suite command** | `cd apps/api && pnpm vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm vitest run --reporter=verbose src/teams`
- **After every plan wave:** Run `cd apps/api && pnpm vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | TEAM-01, TEAM-02, TEAM-03 | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | TEAM-01 | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts -t "createTeam"` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | TEAM-01 | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts -t "createTeam"` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | TEAM-02 | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts -t "inviteMember"` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | TEAM-02 | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts -t "inviteMember"` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 3 | TEAM-03 | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts -t "acceptInvitation"` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 3 | TEAM-03 | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts -t "acceptInvitation"` | ❌ W0 | ⬜ pending |
| 2-03-03 | 03 | 3 | TEAM-03 | unit | `cd apps/api && pnpm vitest run src/teams/teams.service.spec.ts -t "acceptInvitation"` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 4 | TEAM-01, TEAM-02, TEAM-03 | manual | See Manual-Only Verifications | N/A | ⬜ pending |
| 2-04-02 | 04 | 4 | TEAM-03 | manual | See Manual-Only Verifications | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/teams/teams.service.spec.ts` — unit test stubs for TEAM-01, TEAM-02, TEAM-03
- [ ] `apps/api/test/setup.ts` — add `in`, `not`, `is`, `order`, `limit` chainable methods to `mockQueryBuilder` if missing

*Existing Vitest infrastructure covers the project; no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Manager invites non-registered email; invitee registers then accepts link | TEAM-02, TEAM-03 | Requires real email delivery (Resend) and two browser sessions | 1. Log in as manager, go to `/teams/[id]`, enter a new email and send invite. 2. Check email inbox. 3. Click invite link. 4. Register with the same email. 5. Expect redirect back to `/join` and success message. |
| Invitation link shows correct target email on `/join` page | TEAM-03 | UI display check | Visit a `/join?token=...` URL while logged out. Verify the page shows the invitee email decoded from the token. |
| Logged-out user clicking invite link is redirected to login with `?next=` preserved | TEAM-03 | Auth redirect UX | Click invite link while logged out. Verify redirect to `/login?next=/join?token=...`. After login, verify redirect back to `/join?token=...`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

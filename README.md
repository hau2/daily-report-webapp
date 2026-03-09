# Daily Report

A web application where team members log daily tasks, track hours, and submit reports to their manager. Includes a Chrome extension for quick task capture.

## Features

**Core**
- User authentication (signup, login, email verification, password reset)
- Team management — create teams, invite members, transfer ownership
- Task management — create, edit, delete tasks with title, hours, source links, notes
- Daily reporting — review tasks, adjust hours, submit end-of-day reports
- Manager dashboard — view member reports, track non-submitters, CSV export
- Chrome extension — highlight text to add tasks, auto-capture page URLs

**Analytics & Insights**
- Submission rate, hours worked, stress trends, task volume charts
- Time range filtering (week / month / quarter)
- Export charts as PNG, PDF, or CSV

**UX**
- Dark mode / light mode toggle with OS preference detection
- Stress level tracking (Low / Medium / High) on daily reports
- Responsive design for desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | NestJS 11 (port 3001) |
| Frontend | Next.js 15 App Router (port 3000) |
| Database | Supabase (PostgreSQL) |
| Auth | Dual JWT (access + refresh) in httpOnly cookies |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Shared | Zod schemas + TypeScript types (`packages/shared`) |
| Email | Resend |
| Extension | Chrome Manifest V3 |

## Project Structure

```
daily-report-webapp/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Zod schemas & TypeScript types
└── extensions/
    └── chrome/       # Chrome extension (Manifest V3)
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) API key (for email verification)

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd daily-report-webapp

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit both files with your actual values (see below)

# 4. Start all services
pnpm dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000

### Environment Variables

**Backend** (`apps/api/.env`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | Secret for signing JWTs |
| `PORT` | Server port (default: 3001) |
| `FRONTEND_URL` | Frontend URL for CORS and email links |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `EMAIL_FROM` | Sender email address |

**Frontend** (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Scripts

```bash
# Development
pnpm dev              # Start all services in dev mode

# Build
pnpm build            # Build all packages

# Testing
pnpm test             # Run all tests
cd apps/api && pnpm vitest run    # Backend tests only
cd apps/web && pnpm exec tsc --noEmit  # Frontend type-check

# Linting
pnpm lint             # Lint all packages
```

## Chrome Extension

1. Open `chrome://extensions/` in Chrome
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extensions/chrome` directory
4. Highlight any text on a webpage and use the extension to add it as a task

## License

Private project.

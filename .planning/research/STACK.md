# Technology Stack

**Project:** Daily Report Web App
**Researched:** 2026-03-06
**Overall Confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| NestJS | ^10.4 | Backend API framework | Constraint. Modular architecture, decorator-based DI, first-class TypeScript. Mature ecosystem with 65k+ GitHub stars, committed maintenance through 2030. v12 planned Q3 2026, but v10 is the stable production choice today. | HIGH |
| Next.js | ^16.1 | Frontend framework | Constraint. App Router with React Server Components for fast initial loads. Turbopack stable for dev builds. Deploys natively to Vercel. | HIGH |
| React | ^19 | UI library | Ships with Next.js 16. Required by shadcn/ui and TanStack Query. | HIGH |
| TypeScript | ^5.7 | Language | Non-negotiable for a NestJS + Next.js project. Shared types between frontend and backend. | HIGH |
| Node.js | ^22 LTS | Runtime | Current Active LTS. Required by Supabase JS client (dropped Node 18 support). NestJS 10 and Next.js 16 both support it. | HIGH |

### Database & ORM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase (PostgreSQL) | Managed | Database hosting | Constraint. Managed PostgreSQL with connection pooling, dashboard, and backup. Use as a pure database -- auth and realtime handled by NestJS. | HIGH |
| Prisma ORM | ^7.2 | Database ORM | Choose Prisma over Drizzle for this project. Rationale below. | HIGH |
| @prisma/client | ^7.2 | Query client | Auto-generated, type-safe client from Prisma schema. Excellent IntelliSense. | HIGH |

**ORM Decision: Prisma over Drizzle**

Drizzle is faster and lighter, but Prisma is the right choice for this project because:

1. **Team productivity over raw performance.** A daily report app handles modest query loads (tens of daily reports per team). Drizzle's 14x latency advantage is irrelevant at this scale.
2. **Schema-first workflow.** Prisma's `.prisma` schema file is a single source of truth for the data model. `prisma migrate dev` generates and applies migrations automatically. This reduces coordination errors.
3. **First-class NestJS integration.** NestJS docs officially document Prisma. The `nestjs-prisma` package provides `PrismaModule` and `PrismaService` out of the box.
4. **Prisma Studio.** Free visual database browser for development and debugging -- no need for a separate DB client.
5. **Maturity.** Prisma 7 is stable with years of production hardening. Drizzle is still at 0.45 (v1 beta).

**Do NOT use:** TypeORM. Slower than both alternatives, N+1 query problems, stale decorator-based approach, and the TypeScript types are unreliable.

### Authentication & Security

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @nestjs/passport | ^10 | Auth framework | NestJS's official Passport integration. Plug-and-play strategy pattern for JWT auth. Mature and well-documented. | HIGH |
| @nestjs/jwt | ^10 | JWT handling | NestJS's official JWT module built on jsonwebtoken. Handles signing, verification, and token expiry. | HIGH |
| passport-jwt | ^4.0 | JWT strategy | Standard Passport strategy for extracting and validating JWT from request headers. | HIGH |
| argon2 | ^0.41 | Password hashing | Use Argon2id over bcrypt. Winner of the Password Hashing Competition. Memory-hard (resists GPU attacks). No 72-byte password limit like bcrypt. OWASP recommended. | HIGH |

**Do NOT use:** bcrypt. It has a 72-byte password limit, is less resistant to GPU attacks than Argon2, and is the older standard. For a greenfield project, start with Argon2.

**Do NOT use:** Supabase Auth. The project constraint specifies NestJS-managed auth. Using Supabase Auth would create two auth systems and split responsibility.

### Frontend - UI & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.0 | Utility-first CSS | 5x faster full builds than v3. CSS-first config (no `tailwind.config.js`). Native CSS custom properties for design tokens. shadcn/ui requires it. | HIGH |
| shadcn/ui | ^3.5 (CLI) | Component library | Not a dependency -- copies component source into your project. Built on Radix UI (accessible primitives) + Tailwind CSS. Full control, no version lock-in. Covers buttons, forms, tables, modals, sheets, toasts, date pickers. | HIGH |
| Radix UI | (via shadcn) | Accessible primitives | Ships with shadcn/ui. Handles focus management, keyboard navigation, ARIA attributes. Do not install separately unless extending beyond shadcn. | HIGH |
| lucide-react | ^0.469 | Icons | Default icon set for shadcn/ui. Consistent, tree-shakable, 1400+ icons. | MEDIUM |

**Do NOT use:** Material UI (MUI). Heavy bundle, opinionated styling conflicts with Tailwind, and the Google aesthetic doesn't fit a productivity tool. Ant Design has the same problems.

**Do NOT use:** Chakra UI. Overlaps with shadcn/ui but adds a runtime CSS-in-JS layer that conflicts with Tailwind's approach.

### Frontend - State & Data Fetching

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TanStack Query | ^5.90 | Server state management | Handles API data fetching, caching, background refetch, optimistic updates, and mutation state. Eliminates hand-rolled loading/error/cache logic. Works with React Server Components in Next.js 16. | HIGH |
| Zustand | ^5.0 | Client state management | Lightweight (1.1KB), zero boilerplate. Use for UI state only: sidebar open/closed, active tab, selected date, modal visibility. Do NOT duplicate server data here. | HIGH |

**Do NOT use:** Redux / Redux Toolkit. Massive boilerplate for a project this size. Zustand provides the same capabilities in 1/10th the code.

**Do NOT use:** Jotai. Atomic state is overkill for this app's simple UI state needs. Zustand's single-store model is simpler to reason about.

**Do NOT use:** SWR. TanStack Query has richer features (mutations, query invalidation, devtools) that SWR lacks.

### Frontend - Forms & Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-hook-form | ^7.54 | Form management | Uncontrolled components = fewer re-renders. Zero dependencies. Half the bundle size of Formik. Built-in validation and error handling. | HIGH |
| @hookform/resolvers | ^3.9 | Schema validation bridge | Connects react-hook-form to Zod schemas for declarative validation rules. | HIGH |
| zod | ^4.3 | Schema validation | TypeScript-first. 14x faster string parsing than Zod 3. Use for both frontend form validation (via resolvers) and shared type definitions. @zod/mini available at 1.9KB for lighter needs. | HIGH |

**Do NOT use:** Formik. More re-renders, larger bundle, 9 dependencies vs. zero. React Hook Form is the clear winner for performance.

**Do NOT use:** Yup. Zod 4 is faster, TypeScript-native (Yup bolts on TS), and can share schemas between frontend and backend.

### Backend - Validation & Utilities

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| class-validator | ^0.14 | DTO validation | NestJS's native validation pipe uses this. Decorators like `@IsEmail()`, `@IsNotEmpty()`, `@MinLength()` on DTOs. Integrated with NestJS `ValidationPipe`. | HIGH |
| class-transformer | ^0.5 | DTO transformation | Converts plain JSON to typed class instances. Enables `whitelist: true` to strip unknown properties. Required by NestJS validation pipeline. | HIGH |
| @nestjs/config | ^3 | Environment config | Type-safe env variable loading with validation. Supports `.env` files and custom config factories. | HIGH |
| @nestjs/swagger | ^8 | API documentation | Auto-generates OpenAPI spec from decorators. Interactive Swagger UI for frontend developers. | MEDIUM |
| exceljs | ^4.4 | Excel export | Creates `.xlsx` files with formatting, multiple sheets, and styles. Covers the "export reports to CSV/Excel" requirement. Streaming support for large datasets. | MEDIUM |

### Chrome Extension

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| WXT | ^0.20 | Extension framework | Best-in-class extension framework in 2025-2026. Vite-based (fast HMR, even for service workers). React support via `@wxt-dev/module-react`. Generates Manifest V3 automatically. Cross-browser builds from single codebase. Actively maintained (latest release 3 days ago). | HIGH |
| @wxt-dev/module-react | latest | React support for WXT | First-party WXT module. Enables React components in popup and content scripts with HMR. | HIGH |
| React | ^19 | Popup UI | Same React version as the main frontend. Share component patterns (not code -- extension is a separate build). | HIGH |
| Tailwind CSS | ^4.0 | Extension styling | Same styling approach as main app for visual consistency. WXT supports Tailwind via Vite plugin. | HIGH |

**Do NOT use:** Plasmo. Despite higher GitHub stars, community reports indicate maintenance issues since mid-2025. WXT is actively maintained and framework-agnostic. Multiple 2025 analyses conclude WXT is the superior choice.

**Do NOT use:** CRXJS. Development has slowed. WXT provides a superset of CRXJS features with better DX.

**Do NOT use:** Raw webpack/Vite config. Extension development has enough quirks (service workers, content scripts, CSP) that a framework saves significant time and prevents subtle bugs.

### Shared / Cross-Cutting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pnpm | ^9 | Package manager | Faster installs, strict dependency resolution (no phantom deps), disk-efficient via content-addressable store. Works well with monorepos via workspaces. | MEDIUM |
| Turborepo | ^2 | Monorepo build | Caches build outputs, parallelizes tasks across packages. Purpose-built for JS/TS monorepos. Owned by Vercel (same as Next.js) -- tight integration. | MEDIUM |
| date-fns | ^4 | Date manipulation | Tree-shakable, functional API. Smaller than dayjs when using only a few functions (which this project will -- date formatting for reports, relative time). No mutable Date wrappers. | MEDIUM |
| nanoid | ^5 | ID generation | For invite tokens, public-facing IDs where UUIDs are too long. 130 bytes, URL-safe, cryptographically strong. | LOW |

### Deployment & DevOps

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | Managed | Frontend hosting | Constraint. Native Next.js deployment with edge functions, preview deploys per PR, and automatic HTTPS. | HIGH |
| Docker | ^27 | Backend containerization | Constraint. NestJS backend runs in Docker on VPS. Multi-stage builds for small production images. | HIGH |
| Docker Compose | ^2.32 | Local development | Run PostgreSQL, NestJS backend, and any services locally with one command. Matches production topology. | HIGH |
| GitHub Actions | Managed | CI/CD | Standard for open-source and small teams. Run lint, test, build on PRs. Deploy to VPS on merge to main. | MEDIUM |

### Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | ^3 | Unit/integration tests | Vite-native, drop-in Jest replacement with better performance. Works for both NestJS (with SWC) and Next.js. Single test runner for entire monorepo. | MEDIUM |
| Playwright | ^1.50 | E2E testing | Cross-browser E2E tests. Better than Cypress for modern apps (native async/await, multi-tab support, faster). | MEDIUM |
| @nestjs/testing | ^10 | NestJS test utilities | Official testing module for creating test application contexts and mocking providers. | HIGH |

**Do NOT use:** Jest. Vitest is faster, natively understands ESM and TypeScript, and has a compatible API. No reason to use Jest in a 2026 greenfield project.

**Do NOT use:** Cypress. Slower than Playwright, no native multi-tab support, requires paid dashboard for parallelization.

## Project Structure

Use a **pnpm workspace monorepo** with Turborepo:

```
daily-report-webapp/
  apps/
    web/              # Next.js 16 frontend
    api/              # NestJS backend
    extension/        # WXT Chrome extension
  packages/
    shared/           # Shared types, Zod schemas, constants
    eslint-config/    # Shared ESLint configuration
    tsconfig/         # Shared TypeScript configurations
  turbo.json
  pnpm-workspace.yaml
```

**Why monorepo:** NestJS and Next.js share TypeScript types (DTOs, API response shapes). A `packages/shared` workspace avoids type drift. Turborepo caches builds so only changed packages rebuild. Single PR for full-stack changes.

**Why NOT separate repos:** Type definitions would need a published npm package or copy-paste, both of which cause drift. Separate CI pipelines make coordinated releases painful.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Prisma 7 | Drizzle 0.45 | Drizzle's performance advantage irrelevant at this scale. Prisma's auto-migrations, Studio, and maturity win for team productivity. Drizzle is still pre-1.0. |
| ORM | Prisma 7 | TypeORM | N+1 query problems, unreliable TypeScript types, stale development approach. |
| State | Zustand 5 | Redux Toolkit | Massive boilerplate for simple UI state. Redux justified only at large scale with many developers. |
| State | Zustand 5 | Jotai | Atomic model adds conceptual overhead without benefit for this app's simple state needs. |
| Server State | TanStack Query 5 | SWR | TanStack Query has richer mutation handling, query invalidation, and devtools. |
| UI | shadcn/ui + Tailwind | Material UI | Heavy bundle, opinionated Google aesthetic, runtime CSS conflicts with Tailwind. |
| UI | shadcn/ui + Tailwind | Chakra UI | Runtime CSS-in-JS conflicts with Tailwind's build-time approach. |
| Forms | React Hook Form | Formik | More re-renders, larger bundle, more dependencies. RHF is the 2025 standard. |
| Validation | Zod 4 | Yup | Zod is TypeScript-native, 14x faster in v4, and can be shared between frontend and backend. |
| Extension | WXT | Plasmo | Plasmo has maintenance concerns since mid-2025. WXT is actively maintained and framework-agnostic. |
| Extension | WXT | CRXJS | CRXJS development has slowed. WXT is a superset. |
| Password Hash | Argon2 | bcrypt | Argon2 is OWASP-recommended, resists GPU attacks, no 72-byte limit. |
| Date | date-fns | dayjs | Tree-shakable functional API. Smaller when using few functions. |
| Test Runner | Vitest | Jest | Vite-native, faster, ESM/TS native. Compatible API means easy migration if needed. |
| E2E | Playwright | Cypress | Faster execution, native async/await, multi-tab support, free parallelization. |
| Monorepo | Turborepo | Nx | Turborepo is simpler, Vercel-owned (aligns with Next.js deployment), sufficient for 3 apps. Nx is more powerful but adds complexity this project doesn't need. |
| Package Manager | pnpm | npm/yarn | Strict deps prevent phantom dependency bugs. Faster installs. Better monorepo support. |

## Installation

```bash
# Initialize monorepo
pnpm init
npx turbo init

# === apps/api (NestJS Backend) ===
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express
pnpm add @nestjs/passport @nestjs/jwt passport passport-jwt
pnpm add @nestjs/config @nestjs/swagger
pnpm add prisma @prisma/client
pnpm add class-validator class-transformer
pnpm add argon2
pnpm add exceljs
pnpm add -D @nestjs/cli @nestjs/testing
pnpm add -D @types/passport-jwt

# === apps/web (Next.js Frontend) ===
pnpm add next react react-dom
pnpm add @tanstack/react-query
pnpm add zustand
pnpm add react-hook-form @hookform/resolvers zod
pnpm add date-fns
pnpm add tailwindcss @tailwindcss/postcss
npx shadcn@latest init

# === apps/extension (WXT Chrome Extension) ===
pnpm add wxt @wxt-dev/module-react
pnpm add react react-dom
pnpm add tailwindcss

# === Shared dev dependencies (root) ===
pnpm add -Dw typescript vitest @vitest/coverage-v8
pnpm add -Dw eslint prettier
pnpm add -Dw turbo
```

## Version Verification Sources

| Technology | Version Claimed | Source | Date Checked |
|------------|----------------|--------|-------------|
| NestJS | ^10.4 | [GitHub Releases](https://github.com/nestjs/nest/releases) | 2026-03-06 |
| Next.js | ^16.1 | [Next.js Blog](https://nextjs.org/blog/next-16-1) | 2026-03-06 |
| Prisma | ^7.2 | [Prisma Blog](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0) | 2026-03-06 |
| Supabase JS | ^2.98 | [npm](https://www.npmjs.com/package/@supabase/supabase-js) | 2026-03-06 |
| TanStack Query | ^5.90 | [npm](https://www.npmjs.com/package/@tanstack/react-query) | 2026-03-06 |
| Zustand | ^5.0 | [npm](https://www.npmjs.com/package/zustand) | 2026-03-06 |
| Tailwind CSS | ^4.0 | [Tailwind Blog](https://tailwindcss.com/blog/tailwindcss-v4) | 2026-03-06 |
| shadcn/ui CLI | ^3.5 | [shadcn Changelog](https://ui.shadcn.com/docs/changelog) | 2026-03-06 |
| Zod | ^4.3 | [npm](https://www.npmjs.com/package/zod) | 2026-03-06 |
| WXT | ^0.20 | [npm](https://www.npmjs.com/package/wxt) | 2026-03-06 |
| Drizzle ORM | 0.45 (not used) | [npm](https://www.npmjs.com/package/drizzle-orm) | 2026-03-06 |
| Vitest | ^3 | [npm](https://www.npmjs.com/package/vitest) | 2026-03-06 |

## Sources

- [NestJS Documentation](https://docs.nestjs.com/) - Official framework docs
- [NestJS GitHub Releases](https://github.com/nestjs/nest/releases) - Version history
- [Next.js 16.1 Blog Post](https://nextjs.org/blog/next-16-1) - Latest release info
- [Prisma 7.2.0 Announcement](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0) - Latest stable ORM
- [Prisma NestJS Guide](https://www.prisma.io/docs/guides/nestjs) - Official integration guide
- [NestJS Prisma Recipe](https://docs.nestjs.com/recipes/prisma) - NestJS official Prisma docs
- [Supabase JS Client](https://www.npmjs.com/package/@supabase/supabase-js) - npm package
- [Supabase Drizzle Docs](https://supabase.com/docs/guides/database/drizzle) - Supabase ORM integration
- [Drizzle vs Prisma Comparison (2026)](https://www.bytebase.com/blog/drizzle-vs-prisma/) - Detailed ORM comparison
- [NestJS + DrizzleORM (Trilon)](https://trilon.io/blog/nestjs-drizzleorm-a-great-match) - Drizzle integration guide
- [Best ORM for NestJS 2025](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c) - Community comparison
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) - Official setup guide
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) - v4 compatibility
- [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4) - Release announcement
- [TanStack Query Docs](https://tanstack.com/query/latest) - Official docs
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025) - State management analysis
- [WXT Framework](https://wxt.dev/) - Official extension framework site
- [WXT GitHub](https://github.com/wxt-dev/wxt) - Source and releases
- [2025 Browser Extension Framework Comparison](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/) - Framework analysis
- [NestJS Auth Docs](https://docs.nestjs.com/security/authentication) - Official auth guide
- [NestJS Encryption Docs](https://docs.nestjs.com/security/encryption-and-hashing) - Hashing guidance
- [Password Hashing Guide 2025](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/) - Algorithm comparison
- [Zod v4 Release](https://zod.dev/v4) - Release notes
- [React Hook Form](https://react-hook-form.com/) - Official docs
- [Zustand npm](https://www.npmjs.com/package/zustand) - Package info

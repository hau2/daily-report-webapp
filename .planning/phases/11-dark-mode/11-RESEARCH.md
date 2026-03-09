# Phase 11: Dark Mode - Research

**Researched:** 2026-03-09
**Domain:** CSS theming, next-themes, Tailwind CSS v4 dark mode
**Confidence:** HIGH

## Summary

This phase is straightforward because the project already has most of the dark mode infrastructure in place. The CSS variable system in `globals.css` already defines both `:root` (light) and `.dark` (dark) color tokens using oklch values. The `@custom-variant dark (&:is(.dark *))` directive is configured for Tailwind CSS v4 class-based dark mode. The `next-themes` library (v0.4.6) is already installed as a dependency. All shadcn/ui components (`button`, `card`, `input`, `label`, `badge`, `form`) use semantic CSS variables and will automatically adapt to dark mode.

The remaining work is: (1) wrap the app in a `ThemeProvider` from `next-themes`, (2) add `suppressHydrationWarning` to the `<html>` tag, (3) create a theme toggle button in the navigation header, and (4) replace ~25 hardcoded color classes (e.g., `bg-white`, `text-gray-600`, `bg-gray-50`) with semantic Tailwind classes (e.g., `bg-background`, `text-muted-foreground`) across ~10 files. Chart colors in Recharts components should use CSS variables from the theme.

**Primary recommendation:** Use `next-themes` with `attribute="class"` strategy (matching the existing `.dark` CSS class), `defaultTheme="system"`, and `localStorage` persistence (built-in default). No backend changes needed -- this is a frontend-only phase.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| THEME-01 | User can toggle between light and dark mode from the UI | next-themes `useTheme()` hook + toggle button in dashboard header |
| THEME-02 | User's theme preference persists across sessions | next-themes stores in localStorage by default (key: "theme") |
| THEME-03 | App defaults to user's OS/browser color scheme preference | next-themes `defaultTheme="system"` + `enableSystem={true}` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-themes | ^0.4.6 | Theme switching for Next.js App Router | Already installed; de facto standard for Next.js theming |
| tailwindcss | ^4.0.0 | Dark variant via CSS variables | Already configured with `@custom-variant dark` |
| lucide-react | ^0.469.0 | Sun/Moon icons for toggle button | Already installed |

### Supporting
No additional libraries needed. Everything required is already in the project.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-themes | Manual React context + localStorage | next-themes handles SSR flash, system detection, localStorage -- no reason to hand-roll |

**Installation:**
```bash
# Nothing to install -- all dependencies already present
```

## Architecture Patterns

### Pattern 1: ThemeProvider Setup
**What:** Wrap the app with `next-themes` ThemeProvider at the root layout level.
**When to use:** Root layout (`apps/web/src/app/layout.tsx`)
**Example:**
```typescript
// Source: next-themes docs + project convention
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Key configuration:
- `attribute="class"` -- adds/removes `.dark` class on `<html>`, matching the existing `@custom-variant dark` and `.dark { ... }` CSS
- `defaultTheme="system"` -- satisfies THEME-03 (OS preference detection)
- `enableSystem` -- enables `prefers-color-scheme` media query listening
- `disableTransitionOnChange` -- prevents flash of unstyled content during theme switch
- `suppressHydrationWarning` on `<html>` -- required because next-themes modifies the element before React hydration

### Pattern 2: Theme Toggle Component
**What:** A button that cycles between light, dark, and system themes.
**When to use:** In the dashboard header navigation bar.
**Example:**
```typescript
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
      }}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Moon className="h-4 w-4" /> :
       theme === 'light' ? <Sun className="h-4 w-4" /> :
       <Monitor className="h-4 w-4" />}
    </Button>
  );
}
```

### Pattern 3: Replacing Hardcoded Colors
**What:** Replace Tailwind color classes that don't adapt to dark mode with semantic variables.
**Mapping:**

| Hardcoded | Replace With | Notes |
|-----------|-------------|-------|
| `bg-white` | `bg-background` | Main backgrounds |
| `bg-gray-50` | `bg-muted` or `bg-background` | Subtle backgrounds |
| `text-gray-500`, `text-gray-600` | `text-muted-foreground` | Secondary text |
| `text-gray-900` | `text-foreground` | Primary text |
| `border-gray-*` | `border-border` | Borders (already default via base layer) |
| `text-green-600` | `text-green-600 dark:text-green-400` | Status colors need dark variant |
| `text-red-600` | `text-red-600 dark:text-red-400` | Status colors need dark variant |

### Pattern 4: Chart Colors for Dark Mode
**What:** Replace hardcoded hex colors in Recharts with CSS variable references.
**Example:**
```typescript
// Use CSS custom properties via getComputedStyle or oklch values
// The chart-1 through chart-5 variables already have dark variants in globals.css
const chartColor = 'var(--chart-1)'; // These swap automatically
```
Note: Recharts accepts CSS custom properties in `stroke` and `fill` props. The existing `--chart-1` through `--chart-5` variables in globals.css already define dark mode values.

### Anti-Patterns to Avoid
- **Hardcoding colors in JSX:** Never use `bg-white`, `text-gray-*` -- use semantic tokens
- **Checking theme on server:** `useTheme()` returns `undefined` on server; always gate with `mounted` state
- **Missing suppressHydrationWarning:** Without it on `<html>`, React will warn because next-themes modifies the class attribute before hydration

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme persistence | Custom localStorage logic | next-themes built-in | Handles SSR, hydration, system detection |
| OS preference detection | `matchMedia('prefers-color-scheme')` listener | next-themes `enableSystem` | Already handles listener setup/cleanup |
| Flash of wrong theme | Manual `<script>` injection | next-themes script injection | Injects blocking script to set class before paint |
| CSS variable system | Custom dark mode variables | Existing globals.css | Already has complete light/dark token sets |

## Common Pitfalls

### Pitfall 1: Hydration Mismatch
**What goes wrong:** Theme-dependent UI renders differently on server vs client, causing React hydration warnings.
**Why it happens:** Server doesn't know the user's stored theme; client applies it immediately.
**How to avoid:** (1) Add `suppressHydrationWarning` to `<html>`. (2) In components that render theme-specific icons/text, use a `mounted` state guard.
**Warning signs:** Console warnings about hydration mismatches on page load.

### Pitfall 2: Forgetting Hardcoded Colors
**What goes wrong:** Some elements remain white/light in dark mode, looking broken.
**Why it happens:** Developers use `bg-white` or `text-gray-600` instead of semantic tokens.
**How to avoid:** Grep for `bg-white`, `bg-gray`, `text-gray`, `border-gray` and replace systematically.
**Warning signs:** Visual inspection reveals elements that don't change with theme.

### Pitfall 3: Chart Colors Not Adapting
**What goes wrong:** Recharts components use hardcoded hex colors that look bad in dark mode (e.g., dark blue on dark background).
**Why it happens:** Chart colors were set with hex literals like `#3b82f6`.
**How to avoid:** Use CSS variables (`var(--chart-1)`) or use the dark: variant for Recharts tooltip/grid styling.
**Warning signs:** Charts become unreadable in dark mode.

### Pitfall 4: ThemeProvider Must Be Client Component
**What goes wrong:** Build error or runtime crash if ThemeProvider is used in a server component.
**Why it happens:** next-themes uses React context which requires client-side rendering.
**How to avoid:** Create a separate `theme-provider.tsx` client component wrapper, or keep the existing pattern of wrapping in root layout (which can remain a server component as long as ThemeProvider is imported from a client component).
**Warning signs:** "createContext is not a function" or similar SSR errors.

## Files Requiring Changes

### Hardcoded Color Audit (10 files, ~25 instances)

| File | Instances | Key Changes |
|------|-----------|-------------|
| `apps/web/src/app/layout.tsx` | 0 | Add ThemeProvider wrapper + suppressHydrationWarning |
| `apps/web/src/app/(dashboard)/layout.tsx` | 8 | `bg-white` -> `bg-background`, `text-gray-*` -> semantic |
| `apps/web/src/app/(auth)/layout.tsx` | 3 | `bg-gray-50` -> `bg-muted` |
| `apps/web/src/app/(dashboard)/reports/[date]/page.tsx` | 17 | Status colors need `dark:` variants |
| `apps/web/src/app/(dashboard)/manager/[teamId]/page.tsx` | 10 | Status colors need `dark:` variants |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | 3 | Minor color replacements |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | 1 | Minor |
| `apps/web/src/app/(dashboard)/manager/page.tsx` | 1 | Minor |
| `apps/web/src/components/analytics/team-overview.tsx` | 15 | Hardcoded hex chart colors + text-gray |
| `apps/web/src/components/analytics/member-analytics.tsx` | 8 | Hardcoded hex chart colors |
| `apps/web/src/components/analytics/summary-card.tsx` | 3 | Trend colors need `dark:` variants |

### New Files
| File | Purpose |
|------|---------|
| `apps/web/src/components/theme-toggle.tsx` | Theme toggle button component |
| `apps/web/src/providers/theme-provider.tsx` | Client-side ThemeProvider wrapper |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind `darkMode: 'class'` (v3 config) | `@custom-variant dark` in CSS (v4) | Tailwind v4 (2024) | No tailwind.config.js needed; already set up |
| next-themes v0.3 | next-themes v0.4 | 2024 | Better App Router support; same API |

## Open Questions

1. **Simple toggle (light/dark) vs three-way (light/dark/system)?**
   - Recommendation: Three-way cycle (light -> dark -> system) using a single button. This provides full control while keeping UI minimal. The icon changes to indicate current mode (Sun/Moon/Monitor).

2. **Should chart hex colors be replaced with CSS variables?**
   - Recommendation: Yes. The globals.css already defines `--chart-1` through `--chart-5` with dark mode values. Replace hardcoded hex colors in Recharts with `var(--chart-N)` references. Status colors (green/yellow/red for stress levels) can use `dark:` variants since they carry semantic meaning.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.0.18 |
| Config file | apps/web (uses vitest via package.json) |
| Quick run command | `cd apps/web && pnpm vitest run` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THEME-01 | Toggle button switches theme class on html element | manual | Visual inspection in browser | N/A |
| THEME-02 | Theme persists after page reload | manual | Refresh browser, verify theme stays | N/A |
| THEME-03 | First visit uses OS preference | manual | Toggle OS dark mode, load app in incognito | N/A |

### Sampling Rate
- **Per task commit:** `cd apps/web && pnpm exec tsc --noEmit` (type-check)
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + manual visual verification in both themes

### Wave 0 Gaps
None -- dark mode is primarily a visual/CSS concern. Type-checking ensures no TypeScript errors from the new components. Manual visual verification is the appropriate test type for theming.

## Sources

### Primary (HIGH confidence)
- Project codebase analysis: globals.css already has complete light/dark CSS variable system
- Project codebase: next-themes v0.4.6 already installed, Sonner component already uses `useTheme()`
- Tailwind CSS v4: `@custom-variant dark` already configured for class-based dark mode

### Secondary (MEDIUM confidence)
- next-themes library patterns: well-established API (attribute, defaultTheme, enableSystem)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed; no new dependencies
- Architecture: HIGH - pattern is well-established (next-themes + Tailwind class strategy)
- Pitfalls: HIGH - hydration mismatch is well-documented; hardcoded colors found via grep
- File audit: HIGH - complete grep scan of all `.tsx` files for hardcoded colors

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no fast-moving dependencies)

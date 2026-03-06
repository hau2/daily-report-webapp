# Phase 5: Chrome Extension - Research

**Researched:** 2026-03-06
**Domain:** Chrome Extension (Manifest V3), Browser APIs, Cross-origin Auth
**Confidence:** HIGH

## Summary

Phase 5 requires building a Chrome extension that lets users capture tasks from any webpage. The extension must authenticate against the existing NestJS API, capture highlighted text + page URL, and create tasks via the existing `POST /tasks` endpoint.

The most significant technical challenge is **authentication**. The current backend extracts JWTs exclusively from httpOnly cookies (`req.cookies.access_token`). Chrome extensions cannot send httpOnly cookies cross-origin to the API. The backend must be modified to also accept Bearer tokens via the `Authorization` header. A dedicated extension login endpoint should return tokens in the response body (not as Set-Cookie headers) so the extension can store them in `chrome.storage.local`.

The extension itself is straightforward Manifest V3: a service worker for background logic, a popup for login and quick-add UI, a content script to capture selected text and page URL, and the context menus API for the right-click trigger.

**Primary recommendation:** Add Bearer token support to the existing Passport strategies (dual extraction: cookie OR Authorization header), build a minimal MV3 extension as a new `apps/extension` workspace package, use vanilla TypeScript with simple bundling (no React -- the popup is too simple to warrant a framework).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXT-01 | User can log in to the extension to link their account | Backend needs extension login endpoint returning tokens in body; extension stores in chrome.storage.local |
| EXT-02 | User can highlight text on any webpage and trigger quick-add popup | Content script captures window.getSelection(); context menu API triggers popup/side panel |
| EXT-03 | Extension auto-captures current page URL as source link (user can edit it) | Content script reads window.location.href; passed via chrome.runtime messaging to popup |
| EXT-04 | User can enter estimated hours and optional notes in the quick-add popup | Popup HTML form with title (pre-filled), sourceLink (pre-filled, editable), estimatedHours, notes fields |
| EXT-05 | Task created via extension appears in user's daily report on the web app | Uses existing POST /tasks endpoint with Bearer auth; existing getOrCreateReport handles report auto-creation |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Chrome Extension MV3 | Manifest V3 | Extension platform | MV2 deprecated; MV3 mandatory for Chrome Web Store |
| TypeScript | ~5.x (match project) | Type safety | Project standard |
| Vite | ~6.x | Bundling popup/content/service-worker | Lightweight, fast, already familiar in ecosystem |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @crxjs/vite-plugin | ^2.0.0-beta | Vite plugin for Chrome extensions | Simplifies MV3 dev with HMR and manifest handling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vite + CRXJS | Webpack | Heavier config, but more mature for extensions. Vite+CRXJS is simpler for small extensions. |
| Vanilla TS popup | React popup | React is overkill for a 2-form popup. Adds bundle size, build complexity. |
| chrome.storage.local | chrome.storage.session | session clears on browser close; local persists. Users expect to stay logged in. |

**Installation:**
```bash
# New workspace: apps/extension
pnpm --filter @daily-report/extension add -D vite typescript @crxjs/vite-plugin
```

## Architecture Patterns

### Recommended Project Structure
```
apps/extension/
├── manifest.json           # MV3 manifest
├── vite.config.ts          # Vite + CRXJS config
├── tsconfig.json
├── package.json
├── src/
│   ├── background.ts       # Service worker: context menu, message routing
│   ├── content.ts          # Content script: selection capture, messaging
│   ├── popup/
│   │   ├── popup.html      # Popup entry point
│   │   ├── popup.ts        # Login form + quick-add form logic
│   │   └── popup.css       # Simple styling (Tailwind optional)
│   ├── lib/
│   │   ├── api.ts          # Fetch wrapper with Bearer auth
│   │   ├── auth.ts         # Token storage/retrieval (chrome.storage.local)
│   │   └── types.ts        # Shared types (or import from @daily-report/shared)
│   └── icons/              # Extension icons (16, 48, 128)
└── dist/                   # Build output (load unpacked in chrome://extensions)
```

### Pattern 1: Dual JWT Extraction (Backend Change)
**What:** Modify AccessTokenStrategy to extract JWT from cookie OR Authorization header
**When to use:** When both web app (cookies) and extension (Bearer) need to authenticate
**Example:**
```typescript
// apps/api/src/auth/strategies/access-token.strategy.ts
super({
  jwtFromRequest: ExtractJwt.fromExtractors([
    // 1. Try cookie first (web app)
    (req: Request) => req?.cookies?.access_token ?? null,
    // 2. Fall back to Authorization header (extension)
    ExtractJwt.fromAuthHeaderAsBearerToken(),
  ]),
  secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
  ignoreExpiration: false,
});
```

### Pattern 2: Extension Login Endpoint (Backend Change)
**What:** New endpoint that returns tokens in response body instead of cookies
**When to use:** Extension cannot receive httpOnly cookies
**Example:**
```typescript
// POST /auth/extension-login
// Request: { email, password }
// Response: { accessToken, refreshToken }
// Same validation as /auth/login, but returns tokens in body
```

### Pattern 3: Context Menu + Message Passing
**What:** Right-click context menu triggers content script to capture selection, sends to popup
**When to use:** User highlights text and wants to add as task
**Example:**
```typescript
// background.ts (service worker)
chrome.contextMenus.create({
  id: 'add-task',
  title: 'Add to Daily Report',
  contexts: ['selection'],
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-task') {
    // Store selection data, open popup
    chrome.storage.local.set({
      pendingTask: {
        title: info.selectionText,
        sourceLink: info.pageUrl,
      }
    });
    // Open popup programmatically is not possible in MV3
    // Instead: use chrome.action.openPopup() (Chrome 127+)
    // Or: inject a floating UI via content script
  }
});
```

### Pattern 4: Token Refresh in Extension
**What:** Extension handles token expiry with refresh flow
**When to use:** Access token expires (15min in current config)
**Example:**
```typescript
// apps/extension/src/lib/api.ts
async function extensionFetch(endpoint: string, options: RequestInit = {}) {
  const { accessToken } = await chrome.storage.local.get('accessToken');

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return extensionFetch(endpoint, options); // retry once
    }
    // Clear tokens, show login
    await chrome.storage.local.remove(['accessToken', 'refreshToken']);
  }

  return response;
}
```

### Anti-Patterns to Avoid
- **Using chrome.identity for custom API auth:** chrome.identity is for Google OAuth/third-party OAuth only, not for custom email/password auth.
- **Storing tokens in localStorage:** Content scripts share localStorage with the page. Use chrome.storage.local instead (extension-scoped, encrypted at rest on some platforms).
- **Building a React app for the popup:** The popup has exactly two views (login form, task form). React adds 40KB+ for no benefit.
- **Using background page instead of service worker:** MV3 requires service workers. They terminate when idle -- do not rely on in-memory state.
- **Trying to set cookies from extension:** httpOnly cookies cannot be set or read from extension content scripts. The whole point of the Bearer token approach is to avoid cookies entirely for the extension.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text selection capture | Custom DOM traversal | `info.selectionText` from context menu API | Chrome provides selected text directly in the context menu callback |
| Page URL capture | Content script DOM access | `info.pageUrl` from context menu API | Available directly from the contextMenus.onClicked info object |
| Token storage | Custom encrypted storage | `chrome.storage.local` | Extension-scoped, persists across sessions, async API |
| Extension bundling | Custom webpack config | `@crxjs/vite-plugin` | Handles manifest processing, HMR, content script injection |

**Key insight:** Chrome's context menus API provides both `selectionText` and `pageUrl` directly in the click handler info object. No content script is needed just for capturing these two values. A content script is only needed if we want to show an inline floating UI on the page.

## Common Pitfalls

### Pitfall 1: Service Worker Termination
**What goes wrong:** Service worker goes idle and terminates, losing in-memory state
**Why it happens:** MV3 service workers are not persistent (unlike MV2 background pages)
**How to avoid:** Store all state in chrome.storage.local. Never rely on global variables persisting across events.
**Warning signs:** Extension works right after install but breaks after Chrome sits idle.

### Pitfall 2: CORS Blocking Extension Requests
**What goes wrong:** Fetch from extension popup/service worker to API returns CORS error
**Why it happens:** Extension origin is `chrome-extension://[ID]` which does not match FRONTEND_URL
**How to avoid:** Either: (a) add extension origin to CORS allowlist, or (b) use `host_permissions` in manifest.json which bypasses CORS for the extension. With `host_permissions: ["http://localhost:3001/*"]`, fetch from extension is not subject to CORS.
**Warning signs:** Network errors in extension console on API calls.

### Pitfall 3: Popup Closes on Focus Loss
**What goes wrong:** User switches to page to copy text, popup closes, form state lost
**Why it happens:** Chrome extension popups close when they lose focus
**How to avoid:** Pre-fill form from context menu data stored in chrome.storage.local before popup opens. User workflow: highlight text -> right-click -> "Add to Daily Report" -> popup opens pre-filled.
**Warning signs:** Users report losing their form data.

### Pitfall 4: Extension Login Requires teamId
**What goes wrong:** Task creation fails because teamId is required but extension does not know user's team
**Why it happens:** POST /tasks requires teamId, and web app selects first team automatically
**How to avoid:** After extension login, fetch user's teams (GET /teams/my) and store the team list. Auto-select first team (matching web app behavior). Could offer team selector if user has multiple teams.
**Warning signs:** 400 errors on task creation.

### Pitfall 5: Token Refresh Strategy
**What goes wrong:** Refresh token stored in chrome.storage.local but backend endpoint `/auth/refresh` reads it from cookies
**Why it happens:** RefreshTokenStrategy also extracts from cookies only
**How to avoid:** Must also modify RefreshTokenStrategy to support Bearer token extraction (or create a dedicated `/auth/extension-refresh` endpoint). Extension sends refresh token in Authorization header or request body.
**Warning signs:** Users get logged out every 15 minutes (access token expiry).

### Pitfall 6: chrome.action.openPopup() Availability
**What goes wrong:** Trying to programmatically open popup after context menu click does not work
**Why it happens:** `chrome.action.openPopup()` was only added in Chrome 127 and requires the "action" permission
**How to avoid:** Two approaches: (a) require Chrome 127+ and use openPopup(), or (b) have context menu store data in storage and show a notification with "Click extension icon to continue". Approach (a) is simpler and Chrome 127+ is widely deployed by 2026.
**Warning signs:** openPopup() throws "chrome.action.openPopup is not a function" on older Chrome.

## Code Examples

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "Daily Report - Quick Add",
  "version": "1.0.0",
  "description": "Capture tasks from any webpage into your daily report",
  "permissions": [
    "contextMenus",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "http://localhost:3001/*"
  ],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "src/icons/icon-16.png",
      "48": "src/icons/icon-48.png",
      "128": "src/icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "src/background.ts",
    "type": "module"
  },
  "icons": {
    "16": "src/icons/icon-16.png",
    "48": "src/icons/icon-48.png",
    "128": "src/icons/icon-128.png"
  }
}
```

### Backend: Extension Login Endpoint
```typescript
// POST /auth/extension-login
@Post('extension-login')
@HttpCode(HttpStatus.OK)
async extensionLogin(@Body() dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
  return this.authService.extensionLogin(dto);
}

// In AuthService:
async extensionLogin(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
  // Same validation as login()
  const client = this.supabaseService.getClient();
  const { data: user } = await client.from('users').select('*').eq('email', dto.email).single();
  if (!user) throw new UnauthorizedException('Invalid credentials');
  const passwordValid = await argon2.verify(user.password_hash, dto.password);
  if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

  const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
  const [accessToken, refreshToken] = await Promise.all([
    this.jwtService.signAsync({ sub: user.id, email: user.email }, { secret: jwtSecret, expiresIn: '15m' }),
    this.jwtService.signAsync({ sub: user.id, email: user.email }, { secret: jwtSecret, expiresIn: '7d' }),
  ]);

  const refreshTokenHash = await argon2.hash(refreshToken);
  await client.from('users').update({ refresh_token_hash: refreshTokenHash }).eq('id', user.id);

  return { accessToken, refreshToken };
}
```

### Backend: Dual JWT Extraction
```typescript
// Modified access-token.strategy.ts
super({
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req: Request) => req?.cookies?.access_token ?? null,
    ExtractJwt.fromAuthHeaderAsBearerToken(),
  ]),
  secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
  ignoreExpiration: false,
});
```

### Extension: Token Storage
```typescript
// apps/extension/src/lib/auth.ts
export async function saveTokens(accessToken: string, refreshToken: string) {
  await chrome.storage.local.set({ accessToken, refreshToken });
}

export async function getAccessToken(): Promise<string | null> {
  const { accessToken } = await chrome.storage.local.get('accessToken');
  return accessToken ?? null;
}

export async function clearTokens() {
  await chrome.storage.local.remove(['accessToken', 'refreshToken', 'userTeams']);
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}
```

### Extension: API Client with Bearer Auth
```typescript
// apps/extension/src/lib/api.ts
const API_URL = 'http://localhost:3001'; // configurable via chrome.storage

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = await chrome.storage.local.get('accessToken');

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  // Token refresh on 401
  if (response.status === 401 && accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(endpoint, options);
    }
    await clearTokens();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

async function tryRefresh(): Promise<boolean> {
  const { refreshToken } = await chrome.storage.local.get('refreshToken');
  if (!refreshToken) return false;

  const response = await fetch(`${API_URL}/auth/extension-refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (response.ok) {
    const data = await response.json();
    await chrome.storage.local.set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return true;
  }
  return false;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manifest V2 background pages | Manifest V3 service workers | 2023-2024 | Must use service workers, no persistent background |
| chrome.browserAction | chrome.action | MV3 | Unified action API |
| Persistent background scripts | Event-driven service workers | MV3 | All state must go through chrome.storage |
| Web request blocking (webRequestBlocking) | declarativeNetRequest | MV3 | Not relevant here but important MV3 change |

**Deprecated/outdated:**
- Manifest V2: No longer accepted on Chrome Web Store
- `chrome.browserAction`: Replaced by `chrome.action` in MV3
- Background pages: Replaced by service workers in MV3

## Open Questions

1. **API URL Configuration for Production**
   - What we know: Development uses `http://localhost:3001`
   - What's unclear: Production API URL needs to be configurable
   - Recommendation: Store API_URL in manifest.json or allow user to configure in popup settings. For v1 development, hardcode localhost.

2. **CRXJS Vite Plugin Stability**
   - What we know: @crxjs/vite-plugin is in beta (^2.0.0-beta)
   - What's unclear: Whether it handles all MV3 features reliably
   - Recommendation: Use it for development convenience. If issues arise, fall back to plain Vite with manual manifest copy. The extension is simple enough that CRXJS is not critical.

3. **chrome.action.openPopup() Minimum Chrome Version**
   - What we know: Added in Chrome 127, widely available in 2026
   - What's unclear: Whether to require it or provide fallback
   - Recommendation: Require Chrome 127+ (set minimum_chrome_version in manifest). Acceptable for a v1 internal tool.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (matches project) |
| Config file | `apps/api/vitest.config.ts` (existing) |
| Quick run command | `cd apps/api && pnpm vitest run --grep "extension"` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXT-01 | Extension login returns tokens in body | unit | `cd apps/api && pnpm vitest run src/auth/auth.service.spec.ts -t "extensionLogin"` | No -- Wave 0 |
| EXT-02 | Context menu creation and click handling | manual-only | N/A -- requires Chrome browser | N/A |
| EXT-03 | Page URL captured in context menu info | manual-only | N/A -- Chrome contextMenus API | N/A |
| EXT-04 | Popup form renders and submits | manual-only | N/A -- extension popup UI | N/A |
| EXT-05 | Task created via extension uses existing POST /tasks | unit | `cd apps/api && pnpm vitest run src/tasks/tasks.service.spec.ts -t "createTask"` | Existing tests cover this |

### Sampling Rate
- **Per task commit:** `cd apps/api && pnpm vitest run`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + manual extension testing before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/auth/auth.service.spec.ts` -- add tests for extensionLogin and extensionRefresh methods
- [ ] `apps/api/src/auth/access-token.strategy.spec.ts` -- test dual extraction (cookie + Bearer header)
- [ ] Extension popup/background testing is manual-only (Chrome extension testing frameworks are heavy and not worth it for this scope)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `apps/api/src/auth/strategies/access-token.strategy.ts` -- confirmed cookie-only JWT extraction
- Codebase analysis: `apps/api/src/tasks/tasks.controller.ts` -- confirmed POST /tasks API shape
- Codebase analysis: `apps/api/src/main.ts` -- confirmed CORS configured for single FRONTEND_URL origin
- Chrome Developers docs: chrome.contextMenus API provides selectionText and pageUrl directly
- Chrome Developers docs: chrome.storage.local for extension-scoped persistent storage

### Secondary (MEDIUM confidence)
- [Chrome Extensions MV3 docs](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3) -- MV3 requirements and service worker architecture
- [chrome.cookies API](https://developer.chrome.com/docs/extensions/reference/api/cookies) -- httpOnly cookie handling in extensions
- [Vite + Chrome Extension guide](https://arg-software.medium.com/building-a-chrome-extension-with-react-and-vite-a-modern-developers-guide-83f98ee937ed) -- project structure patterns
- [JohnBra/vite-web-extension](https://github.com/JohnBra/vite-web-extension) -- Vite + MV3 template reference

### Tertiary (LOW confidence)
- @crxjs/vite-plugin beta stability -- based on community reports, may need fallback plan

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- MV3 is well-documented, Vite+TS is project standard
- Architecture: HIGH -- Auth challenge is well-understood, solution pattern (dual extraction) is standard passport-jwt
- Pitfalls: HIGH -- Based on direct codebase analysis of cookie-only auth and single-origin CORS
- Extension APIs: MEDIUM -- context menus and storage APIs are stable, but chrome.action.openPopup() is newer

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (Chrome extension APIs are stable; 30-day validity appropriate)

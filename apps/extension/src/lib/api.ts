/** Fetch wrapper with Bearer auth and automatic token refresh */

import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
  saveUserTeams,
  type StoredTeam,
} from './auth';

const API_URL = 'http://localhost:3001';

interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * Authenticated fetch wrapper.
 * Attaches Authorization: Bearer header and handles 401 with token refresh.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // On 401, try refreshing the token once
  if (response.status === 401 && accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = await getAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true if refresh succeeded, false otherwise.
 */
async function tryRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearTokens();
    throw new Error('Session expired');
  }

  try {
    const response = await fetch(`${API_URL}/auth/extension-refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearTokens();
      throw new Error('Session expired');
    }

    const data = await response.json();
    await saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch (err) {
    if (err instanceof Error && err.message === 'Session expired') {
      throw err;
    }
    await clearTokens();
    throw new Error('Session expired');
  }
}

/**
 * Login via the extension-specific endpoint.
 * Saves tokens and fetches user teams.
 */
export async function extensionLogin(
  email: string,
  password: string,
): Promise<void> {
  const response = await fetch(`${API_URL}/auth/extension-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Login failed');
  }

  const data = await response.json();
  await saveTokens(data.accessToken, data.refreshToken);

  // Fetch user teams after successful login
  await fetchAndStoreTeams();
}

/**
 * Fetch teams from API and store mapped to StoredTeam shape.
 * API returns { team: { id, name, ... }, role }[] — we flatten it.
 */
export async function fetchAndStoreTeams(): Promise<StoredTeam[]> {
  const raw = await apiFetch<Array<{ team: { id: string; name: string }; role: string }>>('/teams/my');
  const teams: StoredTeam[] = raw.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    role: m.role,
  }));
  await saveUserTeams(teams);
  return teams;
}

export interface CreateTaskData {
  title: string;
  estimatedHours: number;
  sourceLink?: string;
  notes?: string;
  reportDate: string;
  teamId: string;
}

/**
 * Create a new task via the API.
 */
export async function createTask(
  data: CreateTaskData,
): Promise<{ id: string; title: string }> {
  return apiFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

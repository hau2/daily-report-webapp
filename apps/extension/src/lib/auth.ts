/** Token storage utilities using chrome.storage.local */

export interface StoredTeam {
  id: string;
  name: string;
  role: string;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
}

interface PendingTask {
  title: string;
  sourceLink: string;
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await chrome.storage.local.set({ accessToken, refreshToken });
}

export async function getAccessToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('accessToken');
  return result.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('refreshToken');
  return result.refreshToken ?? null;
}

export async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove([
    'accessToken',
    'refreshToken',
    'userTeams',
    'pendingTask',
  ]);
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}

export async function saveUserTeams(teams: StoredTeam[]): Promise<void> {
  await chrome.storage.local.set({ userTeams: teams });
}

export async function getUserTeams(): Promise<StoredTeam[]> {
  const result = await chrome.storage.local.get('userTeams');
  return result.userTeams ?? [];
}

export async function getPendingTask(): Promise<PendingTask | null> {
  const result = await chrome.storage.local.get('pendingTask');
  return result.pendingTask ?? null;
}

export async function clearPendingTask(): Promise<void> {
  await chrome.storage.local.remove('pendingTask');
}

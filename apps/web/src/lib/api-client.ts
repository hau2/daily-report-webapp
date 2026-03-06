const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function apiClient<T>(
  endpoint: string,
  options: ApiOptions = {},
  retry = true,
): Promise<T> {
  const { body, ...rest } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...rest.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Attempt token refresh on 401 (once)
  if (response.status === 401 && retry) {
    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (refreshResponse.ok) {
      // Retry original request after successful refresh
      return apiClient<T>(endpoint, options, false);
    }
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === 'string') {
        errorMessage = errorBody.message;
      } else if (Array.isArray(errorBody?.message)) {
        errorMessage = errorBody.message.join(', ');
      }
    } catch {
      // Could not parse error body — use default message
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content or empty body
  const contentType = response.headers.get('content-type');
  if (response.status === 204 || !contentType?.includes('application/json')) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get<T>(endpoint: string, options?: Omit<ApiOptions, 'body'>): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: 'POST', body });
  },

  patch<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: 'PATCH', body });
  },

  delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  isForm?: boolean;
  skipRefresh?: boolean;
  headers?: Record<string, string>;
}

async function rawFetch(path: string, options: RequestOptions = {}) {
  const init: RequestInit = {
    method: options.method || 'GET',
    credentials: 'include',
    headers: { ...(options.headers || {}) },
  };

  if (options.isForm) {
    init.body = options.body as FormData;
  } else if (options.body !== undefined) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_URL}${path}`, init);
  return res;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && !options.skipRefresh && path !== '/auth/refresh') {
    const refreshRes = await rawFetch('/auth/refresh', { method: 'POST' });
    if (refreshRes.ok) {
      res = await rawFetch(path, options);
    }
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : undefined;

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || res.statusText;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }

  return data as T;
}

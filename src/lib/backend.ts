const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.port === '3000') return 'http://127.0.0.1:8787';
  return '';
};

const apiUrl = (path: string) => `${getApiBase()}${path}`;

export async function backendGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(apiUrl(path), { cache: 'no-store' });
    if (!response.ok) return fallback;
    return await response.json() as T;
  } catch {
    return fallback;
  }
}

export async function backendPut<T>(path: string, value: T): Promise<T | null> {
  try {
    const response = await fetch(apiUrl(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function backendPost<T>(path: string, value: T): Promise<T | null> {
  try {
    const response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function backendDelete(path: string): Promise<boolean> {
  try {
    const response = await fetch(apiUrl(path), { method: 'DELETE' });
    return response.ok;
  } catch {
    return false;
  }
}

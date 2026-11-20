const configuredApi = import.meta.env.VITE_API_URL?.trim();
const API = configuredApi || (import.meta.env.DEV ? 'http://localhost:4000/api' : '');

let refreshPromise: Promise<string> | null = null;
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() { return accessToken; }

export async function restoreSession(): Promise<any | null> {
  try {
    const response = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) return null;
    const session = await response.json();
    setAccessToken(session.token);
    return session.user || null;
  } catch {
    return null;
  }
}

async function getRefreshedToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshResponse = await fetch(`${API}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!refreshResponse.ok) {
          throw new Error('Refresh failed');
        }

        const refreshed = await refreshResponse.json();
        setAccessToken(refreshed.token);
        return refreshed.token as string;
      } catch (err) {
        setAccessToken(null);
        window.dispatchEvent(new Event('nutronics_logout'));
        throw new Error('Session expired. Please sign in again.');
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  if (!API) {
    throw new Error(
      'The Nutronics API is not configured for this deployment. Set VITE_API_URL to the deployed API base URL and redeploy the client.'
    );
  }
  const token = accessToken;
  const isAuthCall = path.startsWith('/auth/');

  const fetchOptions: RequestInit = {
    ...options,
    credentials: isAuthCall ? 'include' : options.credentials || 'same-origin',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  let response: Response;
  try {
    response = await fetch(`${API}${path}`, fetchOptions);
  } catch {
    throw new Error(
      'Can’t reach the Nutronics API. Check that the backend is deployed and VITE_API_URL points to it.'
    );
  }
  const data = await response.json().catch(() => ({}));

  // Handle 401 with single-flight refresh
  if (
    response.status === 401 &&
    !isRetry &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/register') &&
    !path.startsWith('/auth/refresh')
  ) {
    // If another concurrent request already refreshed the token in localStorage, use it directly
    const newToken =
      accessToken && accessToken !== token ? accessToken : await getRefreshedToken();

    // Retry once with the newly issued token
    return api<T>(
      path,
      {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      },
      true
    );
  }

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data as T;
}

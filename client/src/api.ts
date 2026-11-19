const configuredApi = import.meta.env.VITE_API_URL?.trim();
const API = configuredApi || (import.meta.env.DEV ? 'http://localhost:4000/api' : '');

let refreshPromise: Promise<string> | null = null;

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
        localStorage.setItem('nutronics_token', refreshed.token);
        if (refreshed.user) {
          localStorage.setItem('nutronics_user', JSON.stringify(refreshed.user));
        }
        return refreshed.token as string;
      } catch (err) {
        localStorage.removeItem('nutronics_token');
        localStorage.removeItem('nutronics_user');
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
  const token = localStorage.getItem('nutronics_token');
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
    const currentStoredToken = localStorage.getItem('nutronics_token');
    const newToken =
      currentStoredToken && currentStoredToken !== token
        ? currentStoredToken
        : await getRefreshedToken();

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

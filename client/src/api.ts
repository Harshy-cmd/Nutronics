const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
export async function api<T = any>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("nutronics_token");
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data as T;
}

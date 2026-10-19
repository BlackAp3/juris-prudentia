export async function adminFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem("juris.accessToken");
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}${path}`, { headers });
  const payload = await response.json() as { data?: T; error?: string };
  if (!response.ok || payload.data === undefined) throw new Error(payload.error ?? "Unable to load data");
  return payload.data;
}

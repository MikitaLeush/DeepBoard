import { getAuthToken } from 'deepspace'

/** POST /api/actions/:name with the caller's JWT. Throws the server's error message on refusal. */
export async function callAction<T = unknown>(name: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getAuthToken()}` },
    body: JSON.stringify(params),
  })
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; error?: string }
  if (!res.ok || body.success === false) throw new Error(body.error ?? `Request failed (${res.status})`)
  return body.data as T
}

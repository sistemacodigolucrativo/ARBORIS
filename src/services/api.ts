const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function apiRequest<T = any>(path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'include', cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Arboris-Client': 'web', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => { throw new Error('API indisponível ou endereço incorreto.'); });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('arboris-session-expired'));
    throw new ApiError(response.status, data.error || 'Falha na comunicação com o servidor.');
  }
  return data;
}
// A network failure can happen AFTER COMMIT. Keep the same key for an identical retry.
const pending = new Map<string, string>();
export async function apiMutation(path: string, body: unknown) {
  const signature = JSON.stringify({ path, body });
  const key = pending.get(signature) || crypto.randomUUID();
  pending.set(signature, key);
  try {
    const result = await apiRequest(path, body, key);
    pending.delete(signature);
    return result;
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) pending.delete(signature);
    throw error;
  }
}

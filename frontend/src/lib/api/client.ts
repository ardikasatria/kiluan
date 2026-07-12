import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth/session'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Browser: API publik (subdomain) bila NEXT_PUBLIC_API_URL diset; else proxy same-origin. */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? ''
  }
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
}

type FetchOpts = RequestInit & {
  token?: string
  auth?: boolean
  _retry?: boolean
}

function fetchCredentials(path: string, init?: FetchOpts): RequestCredentials {
  if (init?.credentials) return init.credentials
  // Auth & same-origin API: kirim cookie refresh. Cross-origin subdomain butuh COOKIE_SAMESITE=none.
  if (path.startsWith('/api/v1/')) return 'include'
  return 'same-origin'
}

export async function apiFetch<T>(path: string, init?: FetchOpts): Promise<T> {
  const useAuth = init?.auth !== false
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = init?.token ?? (useAuth ? getAccessToken() : null)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const credentials = fetchCredentials(path, init)

  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
    credentials,
    cache: 'no-store',
  })

  if (res.status === 401 && useAuth && !init?._retry && path !== '/api/v1/auth/segarkan') {
    const refreshed = await cobaSegarkan()
    if (refreshed) {
      return apiFetch<T>(path, { ...init, _retry: true })
    }
    clearAccessToken()
  }

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = undefined
    }
    throw new ApiError(`API ${res.status}`, res.status, body)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function cobaSegarkan(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/auth/segarkan`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    })
    if (!res.ok) return false
    const data = (await res.json()) as { access_token: string }
    setAccessToken(data.access_token)
    return true
  } catch {
    return false
  }
}

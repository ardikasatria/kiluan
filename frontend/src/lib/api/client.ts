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

/** Browser: same-origin proxy Next.js. Server: langsung ke backend. */
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

  const credentials = init?.credentials ?? (path.startsWith('/api/v1/auth') ? 'include' : 'same-origin')

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

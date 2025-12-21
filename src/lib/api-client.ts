/**
 * API Client utility for making requests to the backend
 * Automatically routes requests to the Render backend for mobile apps
 */

const getApiBase = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use relative path (same origin)
    return ''
  }

  // Check if running locally (development mode)
  const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'

  // For local development, use relative paths (same origin)
  // For production/mobile apps, use Render backend
  if (isLocalhost) {
    return '' // Uses same origin (localhost:3000)
  }

  // Production/mobile: use Render backend
  return 'https://kojomoney-app.onrender.com'
}

export interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

/**
 * Make API requests with automatic base URL resolution
 */
export async function apiCall(
  path: string,
  options: FetchOptions = {}
): Promise<Response> {
  const base = getApiBase()
  const url = base ? `${base}${path}` : path

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Convenience wrapper for JSON requests
 */
export async function apiJson<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await apiCall(path, options)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || `API Error: ${response.status}`)
  }
  return response.json()
}

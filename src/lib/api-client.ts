/**
 * API Client utility for making requests to the backend
 * Automatically routes requests to the Render backend for mobile apps
 */

const getApiBase = (): string => {
  // Always use Render backend for both Web and Mobile
  return 'https://kojomoney-api.onrender.com'
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

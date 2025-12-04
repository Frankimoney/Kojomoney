/**
 * API Client utility for making requests to the backend
 * Automatically routes requests to the Render backend for mobile apps
 */

const getApiBase = (): string => {
  // Check if running in Capacitor (mobile app)
  if (typeof window !== 'undefined') {
    const isNative = (
      (window as any)?.Capacitor?.isNativePlatform?.() === true ||
      ((window as any)?.Capacitor?.getPlatform?.() && (window as any).Capacitor.getPlatform() !== 'web')
    )
    
    if (isNative) {
      // Mobile app - use Render backend
      return 'https://kojomoney-api.onrender.com'
    }
  }
  
  // Web app - use relative URLs (same domain)
  return ''
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

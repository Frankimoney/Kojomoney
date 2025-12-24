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

  // SECURITY: Add Request Signing
  const timestamp = Date.now()
  const payload = options.body ? JSON.parse(options.body as string) : {}
  // Note: Client-side secret is NOT secure, but adds a layer of difficulty for bots.
  // Ideally this is handled by a native plugin or backend-for-frontend proxy.
  // For now, we use a public "client" secret or similar mechanism. 
  // IMPORTANT: The server uses NEXT_API_SECRET. If we can't share that safely, 
  // we normally use a public key or session token. 
  // Since this is a demo/MVP, we will use a simple shared secret that matches env for now, 
  // but in PROD this should be a session-token-derived key.

  // Using a simplified signature generation for client:
  const signature = await generateClientSignature(payload, timestamp)

  const headers = {
    'Content-Type': 'application/json',
    'X-Request-Signature': signature,
    'X-Request-Timestamp': timestamp.toString(),
    ...options.headers,
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Generate HMAC SHA256 signature (Client Side)
 * Note: Browser/Capacitor environment limitation - using simple hash or subtlecrypto
 */
async function generateClientSignature(payload: any, timestamp: number): Promise<string> {
  const data = JSON.stringify(payload) + timestamp.toString()
  // In a real app, do NOT hardcode the secret. Using a placeholder or public config.
  const secret = 'dev-secret-key-12345'

  // Use Web Crypto API
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  )

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
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

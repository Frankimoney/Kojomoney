import crypto from 'crypto'

/**
 * Hash a password using PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(32).toString('hex')
        crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
            if (err) reject(err)
            resolve(salt + ':' + derivedKey.toString('hex'))
        })
    })
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const parts = hash.split(':')
        const salt = parts[0]
        const key = parts[1]

        crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
            if (err) reject(err)
            resolve(key === derivedKey.toString('hex'))
        })
    })
}

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Validate username format (alphanumeric, underscores, hyphens, 3-20 chars)
 */
export function validateUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    return usernameRegex.test(username)
}

/**
 * Validate password strength
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long')
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one digit')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Validate phone number (basic international format)
 */
export function validatePhone(phone: string): boolean {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Security Configuration
const API_SECRET = process.env.NEXT_API_SECRET || 'dev-secret-key-12345'
const SIGNATURE_VALIDITY_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Generate a HMAC-SHA256 signature for a request
 */
export function generateRequestSignature(payload: any, timestamp: number): string {
    const data = JSON.stringify(payload) + timestamp.toString()
    return crypto.createHmac('sha256', API_SECRET).update(data).digest('hex')
}

/**
 * Verify a request signature
 * - Checks if timestamp is within validity window (prevention of replay attacks)
 * - Verifies the signature matches the payload and timestamp
 */
export function verifyRequestSignature(signature: string, payload: any, timestamp: number): boolean {
    const now = Date.now()

    // Check if timestamp is too old or in the future (skew allowance 30s)
    if (timestamp < now - SIGNATURE_VALIDITY_MS || timestamp > now + 30000) {
        return false
    }

    const expectedSignature = generateRequestSignature(payload, timestamp)

    // Constant time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )
    } catch (e) {
        return false
    }
}

/**
 * Simple in-memory rate limiter (For serverless functions, use Redis/KV in production)
 * This is a weak implementation for serverless but better than nothing for quick checks
 */
const rateLimitMap = new Map<string, number[]>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const timestamps = rateLimitMap.get(key) || []

    // Filter out old timestamps
    const validTimestamps = timestamps.filter(t => t > now - windowMs)

    if (validTimestamps.length >= limit) {
        return false
    }

    validTimestamps.push(now)
    rateLimitMap.set(key, validTimestamps)

    // Cleanup old keys occasionally (simple optimization)
    if (rateLimitMap.size > 10000) {
        rateLimitMap.clear()
    }

    return true
}

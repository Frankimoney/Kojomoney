import { db } from './firebase-admin'

interface RateLimitConfig {
    maxRequests: number
    windowMs: number // in milliseconds
}

const RATE_LIMITS: Record<string, Record<string, RateLimitConfig>> = {
    'ai-generate': {
        user: { maxRequests: 5, windowMs: 60 * 60 * 1000 },   // 5/hour
        admin: { maxRequests: 20, windowMs: 60 * 60 * 1000 }  // 20/hour
    },
    'ai-humanize': {
        user: { maxRequests: 10, windowMs: 60 * 60 * 1000 },  // 10/hour
        admin: { maxRequests: 30, windowMs: 60 * 60 * 1000 }  // 30/hour
    }
}

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetAt: number
}

export async function checkRateLimit(
    userId: string,
    endpoint: string,
    isAdmin: boolean = false
): Promise<RateLimitResult> {
    const role = isAdmin ? 'admin' : 'user'
    const config = RATE_LIMITS[endpoint]?.[role]

    if (!config) {
        return { allowed: true, remaining: 999, resetAt: 0 }
    }

    const docId = `${userId}_${endpoint}`
    if (!db) {
        console.error('Firestore db not initialized')
        return { allowed: true, remaining: 0, resetAt: 0 }
    }
    const ref = db.collection('rateLimits').doc(docId)

    const now = Date.now()

    try {
        const doc = await ref.get()
        const data = doc.data()

        if (!doc.exists || !data || data.resetAt < now) {
            // Start fresh window
            await ref.set({
                count: 1,
                resetAt: now + config.windowMs,
                userId,
                endpoint
            })
            return {
                allowed: true,
                remaining: config.maxRequests - 1,
                resetAt: now + config.windowMs
            }
        }

        if (data.count >= config.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: data.resetAt
            }
        }

        // Increment count
        await ref.update({ count: data.count + 1 })

        return {
            allowed: true,
            remaining: config.maxRequests - data.count - 1,
            resetAt: data.resetAt
        }

    } catch (error) {
        console.error('Rate limit check error:', error)
        // Fail open - allow the request but log
        return { allowed: true, remaining: 0, resetAt: 0 }
    }
}

export async function logAIUsage(
    userId: string,
    endpoint: string,
    tokensUsed: number,
    model: string
): Promise<void> {
    try {
        if (!db) {
            console.error('Firestore db not initialized')
            return
        }
        await db.collection('aiUsageLogs').add({
            userId,
            endpoint,
            tokensUsed,
            model,
            timestamp: new Date().toISOString(),
            estimatedCost: calculateCost(tokensUsed, model)
        })
    } catch (error) {
        console.error('Failed to log AI usage:', error)
    }
}

function calculateCost(tokens: number, model: string): number {
    // GPT-3.5-turbo pricing (approx)
    const rates: Record<string, number> = {
        'gpt-3.5-turbo': 0.002 / 1000,  // $0.002 per 1K tokens
        'gpt-4': 0.06 / 1000            // $0.06 per 1K tokens
    }
    return tokens * (rates[model] || rates['gpt-3.5-turbo'])
}

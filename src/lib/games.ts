/**
 * Game Provider Types and Configuration
 *
 * Defines TypeScript interfaces and types for the game reward providers system.
 * Supports Gamezop, Adjoe Playtime, and Qureka Lite providers.
 */

import crypto from 'crypto'

// =============================================================================
// Types
// =============================================================================

/**
 * Supported game reward providers.
 */
export type GameProvider = 'gamezop' | 'adjoe' | 'qureka'

/**
 * Status of a game transaction.
 */
export type GameTransactionStatus =
    | 'pending'
    | 'credited'
    | 'rejected'
    | 'duplicate'
    | 'fraud_flagged'

/**
 * Reconciliation status for provider transactions.
 */
export type ReconciliationStatus =
    | 'pending'
    | 'matched'
    | 'discrepancy'
    | 'manual_review'

// =============================================================================
// Interfaces
// =============================================================================

/**
 * Configuration for a game provider.
 * Stores API keys, webhook secrets, and conversion rules.
 */
export interface GameProviderConfig {
    /** Unique provider identifier */
    provider: GameProvider
    /** API key for provider authentication */
    apiKey: string
    /** Secret key for webhook signature verification */
    webhookSecret: string
    /** Application ID if required by provider */
    appId?: string
    /** Whether the provider is currently enabled */
    enabled: boolean
    /** Launch URL template for the provider */
    launchUrlTemplate?: string
    /** Conversion rules for mapping provider rewards to points */
    conversionRules: ConversionRules
    /** Additional provider-specific settings */
    settings?: Record<string, unknown>
    /** Last updated timestamp */
    updatedAt: number
}

/**
 * Conversion rules for mapping provider rewards to Kojomoney points.
 * Each provider has different reward units that need conversion.
 */
export interface ConversionRules {
    /**
     * Multiplier to convert provider value to points.
     * For Gamezop: 1 (direct reward)
     * For Adjoe: points per second of playtime
     * For Qureka: points per coin
     */
    multiplier: number
    /** Minimum reward threshold to credit */
    minimumValue: number
    /** Maximum single credit allowed */
    maximumCredit: number
    /** Description of the conversion rule */
    description: string
}

/**
 * Default conversion rules for each provider.
 */
export const DEFAULT_CONVERSION_RULES: Record<GameProvider, ConversionRules> = {
    gamezop: {
        multiplier: 1,           // Direct 1:1 reward
        minimumValue: 1,
        maximumCredit: 1000,
        description: 'Direct reward - 1 point per reward unit',
    },
    adjoe: {
        multiplier: 1 / 60,      // 1 point per 60 seconds (1 minute)
        minimumValue: 60,        // Minimum 60 seconds
        maximumCredit: 500,
        description: '1 point per minute of playtime',
    },
    qureka: {
        multiplier: 0.1,         // 1 point per 10 coins
        minimumValue: 10,        // Minimum 10 coins
        maximumCredit: 500,
        description: '1 point per 10 coins',
    },
}

/**
 * Game session for tracking user game starts.
 * Sessions are short-lived and used to validate callbacks.
 */
export interface GameSession {
    /** Unique session identifier */
    id: string
    /** User ID who started the session */
    userId: string
    /** Game provider */
    provider: GameProvider
    /** Specific game ID within the provider */
    gameId: string
    /** Short-lived session token for validation */
    sessionToken: string
    /** Session expiration timestamp */
    expiresAt: number
    /** Session creation timestamp */
    createdAt: number
    /** Whether the session has been used */
    used: boolean
}

/**
 * Game transaction record for tracking provider callbacks.
 * Stores raw payload for audit and reconciliation.
 */
export interface GameTransaction {
    /** Internal transaction ID */
    id: string
    /** Provider's transaction ID (for idempotency) */
    providerTransactionId: string
    /** Game provider */
    provider: GameProvider
    /** User ID receiving the reward */
    userId: string
    /** Original value from provider (before conversion) */
    originalValue: number
    /** Value type (e.g., 'seconds' for Adjoe, 'coins' for Qureka) */
    valueType: string
    /** Converted points credited */
    pointsCredited: number
    /** Transaction status */
    status: GameTransactionStatus
    /** Raw payload from provider webhook */
    rawPayload: Record<string, unknown>
    /** Signature from provider webhook */
    signature?: string
    /** Whether signature was valid */
    signatureValid: boolean
    /** Game ID if available */
    gameId?: string
    /** Session ID that initiated this transaction */
    sessionId?: string
    /** Reconciliation status */
    reconciliationStatus: ReconciliationStatus
    /** Fraud check result */
    fraudCheckPassed: boolean
    /** Fraud signals if any */
    fraudSignals?: string[]
    /** Whether this was a replay (admin debugging) */
    isReplay: boolean
    /** Creation timestamp */
    createdAt: number
    /** Last update timestamp */
    updatedAt: number
    /** Processing metadata */
    metadata?: {
        requestId?: string
        processingTimeMs?: number
        ipAddress?: string
        userAgent?: string
    }
}

/**
 * Suspicious event log entry for fraud detection.
 */
export interface SuspiciousEvent {
    /** Event ID */
    id: string
    /** User ID involved */
    userId: string
    /** Event type */
    eventType:
    | 'rate_limit_exceeded'
    | 'user_id_mismatch'
    | 'daily_velocity_exceeded'
    | 'invalid_signature'
    | 'duplicate_transaction'
    | 'suspicious_pattern'
    /** Game provider if applicable */
    provider?: GameProvider
    /** Transaction ID if applicable */
    transactionId?: string
    /** Event details */
    details: Record<string, unknown>
    /** Risk score (0-100) */
    riskScore: number
    /** Event timestamp */
    createdAt: number
}

/**
 * Daily reconciliation report for a provider.
 */
export interface ReconciliationReport {
    /** Report ID */
    id: string
    /** Provider being reconciled */
    provider: GameProvider
    /** Date of the report (YYYY-MM-DD) */
    date: string
    /** Total transactions from provider */
    providerTransactionCount: number
    /** Total transactions in our records */
    internalTransactionCount: number
    /** Total points credited */
    totalPointsCredited: number
    /** Number of matched transactions */
    matchedCount: number
    /** Number of discrepancies */
    discrepancyCount: number
    /** List of discrepancy transaction IDs */
    discrepancyIds: string[]
    /** Report generation timestamp */
    generatedAt: number
    /** Report status */
    status: 'generated' | 'reviewed' | 'resolved'
    /** Notes from admin review */
    notes?: string
}

/**
 * Fraud detection configuration.
 */
export interface FraudConfig {
    /** Maximum credits allowed per minute per user */
    maxCreditsPerMinute: number
    /** Maximum credits allowed per hour per user */
    maxCreditsPerHour: number
    /** Maximum credits allowed per day per user */
    maxCreditsPerDay: number
    /** Threshold to flag user for review */
    flagThreshold: number
}

/**
 * Default fraud configuration.
 */
export const DEFAULT_FRAUD_CONFIG: FraudConfig = {
    maxCreditsPerMinute: 5,
    maxCreditsPerHour: 50,
    maxCreditsPerDay: 200,
    flagThreshold: 100,
}

/**
 * Game session expiry in seconds (5 minutes).
 */
export const GAME_SESSION_EXPIRY_SECONDS = 300

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a cryptographically secure session token.
 *
 * @returns A random 32-character hex string
 */
export function generateSessionToken(): string {
    return crypto.randomBytes(16).toString('hex')
}

/**
 * Generate a unique request ID for logging.
 *
 * @returns A UUID-like request ID
 */
export function generateRequestId(): string {
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
}

/**
 * Check if a game session is expired.
 *
 * @param session - The game session to check
 * @returns True if the session is expired
 */
export function isSessionExpired(session: GameSession): boolean {
    return Date.now() > session.expiresAt
}

/**
 * Convert provider reward to Kojomoney points.
 *
 * @param provider - The game provider
 * @param value - The raw value from the provider
 * @param rules - Optional custom conversion rules
 * @returns The converted points value
 */
export function convertToPoints(
    provider: GameProvider,
    value: number,
    rules?: ConversionRules
): number {
    const conversionRules = rules || DEFAULT_CONVERSION_RULES[provider]

    // Check minimum value
    if (value < conversionRules.minimumValue) {
        return 0
    }

    // Apply multiplier and round down
    let points = Math.floor(value * conversionRules.multiplier)

    // Cap at maximum credit
    if (points > conversionRules.maximumCredit) {
        points = conversionRules.maximumCredit
    }

    return points
}

/**
 * Get the value type label for a provider.
 *
 * @param provider - The game provider
 * @returns Human-readable value type
 */
export function getValueType(provider: GameProvider): string {
    switch (provider) {
        case 'gamezop':
            return 'reward'
        case 'adjoe':
            return 'seconds'
        case 'qureka':
            return 'coins'
        default:
            return 'value'
    }
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate that a string is a valid game provider.
 *
 * @param provider - String to validate
 * @returns True if valid provider
 */
export function isValidProvider(provider: string): provider is GameProvider {
    return ['gamezop', 'adjoe', 'qureka'].includes(provider)
}

/**
 * Validate game start request payload.
 *
 * @param payload - Request body to validate
 * @returns Validation result with errors if any
 */
export function validateStartRequest(payload: unknown): {
    valid: boolean
    errors: string[]
    data?: { userId: string; provider: GameProvider; gameId: string }
} {
    const errors: string[] = []

    if (!payload || typeof payload !== 'object') {
        return { valid: false, errors: ['Invalid request body'] }
    }

    const body = payload as Record<string, unknown>

    // Validate userId
    if (!body.userId || typeof body.userId !== 'string') {
        errors.push('Missing or invalid userId')
    }

    // Validate provider
    if (!body.provider || typeof body.provider !== 'string') {
        errors.push('Missing or invalid provider')
    } else if (!isValidProvider(body.provider)) {
        errors.push(`Invalid provider: ${body.provider}. Must be gamezop, adjoe, or qureka`)
    }

    // Validate gameId
    if (!body.gameId || typeof body.gameId !== 'string') {
        errors.push('Missing or invalid gameId')
    }

    if (errors.length > 0) {
        return { valid: false, errors }
    }

    return {
        valid: true,
        errors: [],
        data: {
            userId: body.userId as string,
            provider: body.provider as GameProvider,
            gameId: body.gameId as string,
        },
    }
}

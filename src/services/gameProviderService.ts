/**
 * Game Provider Service
 *
 * Core service for managing game reward providers:
 * - Provider configuration loading
 * - Session management
 * - Signature verification
 * - Callback processing
 */

import crypto from 'crypto'
import { db } from '@/lib/firebase-admin'
import {
    GameProvider,
    GameProviderConfig,
    GameSession,
    GameTransaction,
    ConversionRules,
    DEFAULT_CONVERSION_RULES,
    GAME_SESSION_EXPIRY_SECONDS,
    generateSessionToken,
    generateRequestId,
    convertToPoints,
    getValueType,
    isValidProvider,
} from '@/lib/games'
import { creditGameReward, GameCreditMetadata } from '@/services/walletService'
import { performFraudCheck, logInvalidSignature } from '@/services/gameFraudService'

// =============================================================================
// Types
// =============================================================================

/**
 * Result of starting a game session.
 */
export interface GameStartResult {
    /** Whether the session was created successfully */
    success: boolean
    /** Session token for validation */
    sessionToken?: string
    /** Provider launch URL */
    launchUrl?: string
    /** SDK configuration if applicable */
    sdkConfig?: Record<string, unknown>
    /** Session expiration timestamp */
    expiresAt?: number
    /** Error message if failed */
    error?: string
}

/**
 * Result of processing a game callback.
 */
export interface GameCallbackResult {
    /** Whether the callback was processed successfully */
    success: boolean
    /** Points credited (0 if duplicate or rejected) */
    pointsCredited: number
    /** Internal transaction ID */
    transactionId?: string
    /** Whether this was a duplicate callback */
    isDuplicate: boolean
    /** Error message if failed */
    error?: string
    /** HTTP status code to return */
    statusCode: number
}

/**
 * Parsed callback payload from providers.
 */
export interface ParsedCallback {
    /** Provider transaction ID */
    transactionId: string
    /** User ID */
    userId: string
    /** Reward value (format depends on provider) */
    value: number
    /** Game ID if available */
    gameId?: string
    /** Signature from provider */
    signature: string
    /** Raw payload */
    rawPayload: Record<string, unknown>
}

// =============================================================================
// Provider Configuration
// =============================================================================

/**
 * Get provider configuration from environment variables.
 *
 * @param provider - Game provider
 * @returns Provider configuration or null if not configured
 */
export function getProviderConfig(provider: GameProvider): GameProviderConfig | null {
    const envPrefix = provider.toUpperCase()

    const apiKey = process.env[`${envPrefix}_API_KEY`]
    const webhookSecret = process.env[`${envPrefix}_WEBHOOK_SECRET`]

    if (!apiKey || !webhookSecret) {
        console.warn(`Provider ${provider} not fully configured`)
        return null
    }

    return {
        provider,
        apiKey,
        webhookSecret,
        appId: process.env[`${envPrefix}_APP_ID`],
        enabled: process.env[`${envPrefix}_ENABLED`] !== 'false',
        launchUrlTemplate: process.env[`${envPrefix}_LAUNCH_URL`],
        conversionRules: DEFAULT_CONVERSION_RULES[provider],
        updatedAt: Date.now(),
    }
}

/**
 * Check if a provider is enabled.
 *
 * @param provider - Game provider
 * @returns True if provider is enabled
 */
export function isProviderEnabled(provider: GameProvider): boolean {
    const config = getProviderConfig(provider)
    return config !== null && config.enabled
}

/**
 * Get all configured providers.
 *
 * @returns List of configured provider configs
 */
export function getAllProviders(): GameProviderConfig[] {
    const providers: GameProvider[] = ['gamezop', 'adjoe', 'qureka']
    const configs: GameProviderConfig[] = []

    for (const provider of providers) {
        const config = getProviderConfig(provider)
        if (config) {
            configs.push(config)
        }
    }

    return configs
}

// =============================================================================
// Session Management
// =============================================================================

/**
 * Create a game session for a user.
 *
 * @param userId - User ID
 * @param provider - Game provider
 * @param gameId - Specific game ID
 * @returns Game start result with session token and launch config
 */
export async function createGameSession(
    userId: string,
    provider: GameProvider,
    gameId: string
): Promise<GameStartResult> {
    if (!db) {
        return { success: false, error: 'Database not available' }
    }

    // Check if provider is enabled
    const config = getProviderConfig(provider)
    if (!config || !config.enabled) {
        return { success: false, error: `Provider ${provider} is not enabled` }
    }

    // Verify user exists
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
        return { success: false, error: 'User not found' }
    }

    try {
        const sessionToken = generateSessionToken()
        const expirySeconds = parseInt(
            process.env.GAME_SESSION_EXPIRY_SECONDS || String(GAME_SESSION_EXPIRY_SECONDS)
        )
        const expiresAt = Date.now() + expirySeconds * 1000

        // Create session document
        const sessionRef = db.collection('game_sessions').doc()
        const session: Omit<GameSession, 'id'> = {
            userId,
            provider,
            gameId,
            sessionToken,
            expiresAt,
            createdAt: Date.now(),
            used: false,
        }

        await sessionRef.set(session)

        // Generate launch URL
        const launchUrl = generateLaunchUrl(provider, userId, gameId, sessionToken, config)

        // Get SDK config if applicable
        const sdkConfig = generateSdkConfig(provider, userId, gameId, config)

        return {
            success: true,
            sessionToken,
            launchUrl,
            sdkConfig,
            expiresAt,
        }
    } catch (error) {
        console.error('Failed to create game session:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

/**
 * Validate a game session token.
 *
 * @param sessionToken - Session token to validate
 * @returns Session data if valid, null otherwise
 */
export async function validateGameSession(
    sessionToken: string
): Promise<GameSession | null> {
    if (!db || !sessionToken) {
        return null
    }

    try {
        const snapshot = await db
            .collection('game_sessions')
            .where('sessionToken', '==', sessionToken)
            .limit(1)
            .get()

        if (snapshot.empty) {
            return null
        }

        const doc = snapshot.docs[0]
        const session = { id: doc.id, ...doc.data() } as GameSession

        // Check if expired
        if (Date.now() > session.expiresAt) {
            return null
        }

        return session
    } catch (error) {
        console.error('Failed to validate game session:', error)
        return null
    }
}

/**
 * Mark a session as used.
 *
 * @param sessionId - Session ID to mark
 */
export async function markSessionUsed(sessionId: string): Promise<void> {
    if (!db) return

    try {
        await db.collection('game_sessions').doc(sessionId).update({
            used: true,
            usedAt: Date.now(),
        })
    } catch (error) {
        console.error('Failed to mark session as used:', error)
    }
}

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Verify Gamezop webhook signature.
 * Gamezop uses HMAC-SHA256 with the entire payload.
 *
 * @param payload - Raw payload object
 * @param signature - Signature from header or payload
 * @param secret - Webhook secret
 * @returns True if signature is valid
 */
export function verifyGamezopSignature(
    payload: Record<string, unknown>,
    signature: string,
    secret: string
): boolean {
    try {
        // Create signature from payload (excluding signature field)
        const { signature: _, ...payloadWithoutSig } = payload
        const dataToSign = JSON.stringify(payloadWithoutSig)

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(dataToSign)
            .digest('hex')

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )
    } catch (error) {
        console.error('Gamezop signature verification error:', error)
        return false
    }
}

/**
 * Verify Adjoe webhook signature.
 * Adjoe uses HMAC-SHA256 with specific parameter ordering.
 *
 * @param payload - Raw payload object
 * @param signature - Signature from header or payload
 * @param secret - Webhook secret
 * @returns True if signature is valid
 */
export function verifyAdjoeSignature(
    payload: Record<string, unknown>,
    signature: string,
    secret: string
): boolean {
    try {
        // Adjoe signature format: userId|transactionId|playtimeSeconds
        const dataToSign = `${payload.userId}|${payload.transactionId}|${payload.playtimeSeconds}`

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(dataToSign)
            .digest('hex')

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )
    } catch (error) {
        console.error('Adjoe signature verification error:', error)
        return false
    }
}

/**
 * Verify Qureka webhook signature.
 * Qureka uses HMAC-SHA256 with query string format.
 *
 * @param payload - Raw payload object
 * @param signature - Signature from header or payload
 * @param secret - Webhook secret
 * @returns True if signature is valid
 */
export function verifyQurekaSignature(
    payload: Record<string, unknown>,
    signature: string,
    secret: string
): boolean {
    try {
        // Qureka signature format: coins=X&transactionId=Y&userId=Z (alphabetical)
        const sortedKeys = Object.keys(payload)
            .filter((k) => k !== 'signature')
            .sort()

        const dataToSign = sortedKeys
            .map((k) => `${k}=${payload[k]}`)
            .join('&')

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(dataToSign)
            .digest('hex')

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )
    } catch (error) {
        console.error('Qureka signature verification error:', error)
        return false
    }
}

/**
 * Verify webhook signature for any provider.
 *
 * @param provider - Game provider
 * @param payload - Raw payload
 * @param signature - Signature to verify
 * @returns True if signature is valid
 */
export function verifySignature(
    provider: GameProvider,
    payload: Record<string, unknown>,
    signature: string
): boolean {
    const config = getProviderConfig(provider)
    if (!config) {
        console.error(`No config found for provider ${provider}`)
        return false
    }

    switch (provider) {
        case 'gamezop':
            return verifyGamezopSignature(payload, signature, config.webhookSecret)
        case 'adjoe':
            return verifyAdjoeSignature(payload, signature, config.webhookSecret)
        case 'qureka':
            return verifyQurekaSignature(payload, signature, config.webhookSecret)
        default:
            console.error(`Unknown provider: ${provider}`)
            return false
    }
}

// =============================================================================
// Callback Processing
// =============================================================================

/**
 * Parse callback payload from Gamezop.
 *
 * @param payload - Raw payload from webhook
 * @returns Parsed callback data
 */
export function parseGamezopCallback(payload: Record<string, unknown>): ParsedCallback {
    return {
        transactionId: String(payload.transactionId || payload.txnId || ''),
        userId: String(payload.userId || payload.userExternalId || ''),
        value: Number(payload.reward || payload.points || 0),
        gameId: String(payload.gameId || ''),
        signature: String(payload.signature || payload.sig || ''),
        rawPayload: payload,
    }
}

/**
 * Parse callback payload from Adjoe.
 *
 * @param payload - Raw payload from webhook
 * @returns Parsed callback data
 */
export function parseAdjoeCallback(payload: Record<string, unknown>): ParsedCallback {
    return {
        transactionId: String(payload.transactionId || payload.trans_id || ''),
        userId: String(payload.userId || payload.user_id || ''),
        value: Number(payload.playtimeSeconds || payload.playtime || 0),
        gameId: String(payload.appId || payload.gameId || ''),
        signature: String(payload.signature || payload.sig || ''),
        rawPayload: payload,
    }
}

/**
 * Parse callback payload from Qureka.
 *
 * @param payload - Raw payload from webhook
 * @returns Parsed callback data
 */
export function parseQurekaCallback(payload: Record<string, unknown>): ParsedCallback {
    return {
        transactionId: String(payload.transactionId || payload.txn_id || ''),
        userId: String(payload.userId || payload.user_id || ''),
        value: Number(payload.coins || payload.reward || 0),
        gameId: String(payload.quizId || payload.gameId || ''),
        signature: String(payload.signature || payload.hash || ''),
        rawPayload: payload,
    }
}

/**
 * Parse callback payload for any provider.
 *
 * @param provider - Game provider
 * @param payload - Raw payload
 * @returns Parsed callback data
 */
export function parseCallback(
    provider: GameProvider,
    payload: Record<string, unknown>
): ParsedCallback {
    switch (provider) {
        case 'gamezop':
            return parseGamezopCallback(payload)
        case 'adjoe':
            return parseAdjoeCallback(payload)
        case 'qureka':
            return parseQurekaCallback(payload)
        default:
            throw new Error(`Unknown provider: ${provider}`)
    }
}

/**
 * Process a game callback from any provider.
 *
 * @param provider - Game provider
 * @param payload - Raw payload from webhook
 * @param requestId - Request ID for logging
 * @returns Callback processing result
 */
export async function processGameCallback(
    provider: GameProvider,
    payload: Record<string, unknown>,
    requestId: string = generateRequestId()
): Promise<GameCallbackResult> {
    const startTime = Date.now()

    // Log incoming callback
    console.log({
        requestId,
        event: 'callback_received',
        provider,
        timestamp: new Date().toISOString(),
    })

    try {
        // 1. Parse the callback
        const parsed = parseCallback(provider, payload)

        // Validate required fields
        if (!parsed.transactionId) {
            return {
                success: false,
                pointsCredited: 0,
                isDuplicate: false,
                error: 'Missing transaction ID',
                statusCode: 400,
            }
        }

        if (!parsed.userId) {
            return {
                success: false,
                pointsCredited: 0,
                isDuplicate: false,
                error: 'Missing user ID',
                statusCode: 400,
            }
        }

        // 2. Verify signature
        const signatureValid = verifySignature(provider, payload, parsed.signature)

        console.log({
            requestId,
            event: 'signature_verified',
            provider,
            valid: signatureValid,
            transactionId: parsed.transactionId,
        })

        if (!signatureValid) {
            await logInvalidSignature(provider, parsed.transactionId, parsed.userId, payload)
            return {
                success: false,
                pointsCredited: 0,
                isDuplicate: false,
                error: 'Invalid signature',
                statusCode: 403,
            }
        }

        // 3. Perform fraud checks
        const fraudCheck = await performFraudCheck(parsed.userId, provider)

        console.log({
            requestId,
            event: 'fraud_check',
            provider,
            passed: fraudCheck.passed,
            signals: fraudCheck.signals,
            riskScore: fraudCheck.riskScore,
        })

        if (!fraudCheck.passed && fraudCheck.riskScore >= 50) {
            return {
                success: false,
                pointsCredited: 0,
                isDuplicate: false,
                error: 'Request rejected due to suspicious activity',
                statusCode: 403,
            }
        }

        // 4. Convert reward to points
        const config = getProviderConfig(provider)
        const points = convertToPoints(provider, parsed.value, config?.conversionRules)

        console.log({
            requestId,
            event: 'conversion',
            provider,
            originalValue: parsed.value,
            valueType: getValueType(provider),
            pointsConverted: points,
        })

        if (points <= 0) {
            return {
                success: false,
                pointsCredited: 0,
                isDuplicate: false,
                error: 'Reward value below minimum threshold',
                statusCode: 200, // Still return 200 to acknowledge receipt
            }
        }

        // 5. Credit wallet
        const creditMetadata: GameCreditMetadata = {
            providerTransactionId: parsed.transactionId,
            provider,
            originalValue: parsed.value,
            valueType: getValueType(provider),
            gameId: parsed.gameId,
            requestId,
            rawPayload: parsed.rawPayload,
            signatureValid,
        }

        const creditResult = await creditGameReward(parsed.userId, points, creditMetadata)

        console.log({
            requestId,
            event: 'wallet_update',
            provider,
            success: creditResult.success,
            isDuplicate: creditResult.isDuplicate,
            transactionId: creditResult.transactionId,
            pointsCredited: creditResult.isDuplicate ? 0 : points,
            processingTimeMs: Date.now() - startTime,
        })

        if (!creditResult.success) {
            return {
                success: false,
                pointsCredited: 0,
                isDuplicate: false,
                error: creditResult.error || 'Failed to credit wallet',
                statusCode: 500,
            }
        }

        // 6. Add Tournament Points (25 pts for game completion)
        if (!creditResult.isDuplicate && db) {
            const TOURNAMENT_POINTS_PER_GAME = 25
            try {
                const now = Date.now()
                const weekDate = new Date(now)
                const startOfYear = new Date(weekDate.getFullYear(), 0, 1)
                const weekNumber = Math.ceil(((weekDate.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
                const weekKey = `${weekDate.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`

                const userDoc = await db.collection('users').doc(parsed.userId).get()
                const userData = userDoc.data() || {}

                const entrySnapshot = await db.collection('tournament_entries')
                    .where('weekKey', '==', weekKey)
                    .where('userId', '==', parsed.userId)
                    .limit(1)
                    .get()

                if (!entrySnapshot.empty) {
                    const entryDoc = entrySnapshot.docs[0]
                    await entryDoc.ref.update({
                        points: (entryDoc.data().points || 0) + TOURNAMENT_POINTS_PER_GAME,
                        lastUpdated: now,
                    })
                } else {
                    // Auto-join tournament
                    await db.collection('tournament_entries').add({
                        weekKey,
                        userId: parsed.userId,
                        name: userData.name || userData.username || 'Anonymous',
                        avatar: userData.avatarUrl || '',
                        points: TOURNAMENT_POINTS_PER_GAME,
                        joinedAt: now,
                        lastUpdated: now,
                    })
                }

                console.log({
                    requestId,
                    event: 'tournament_points_added',
                    provider,
                    userId: parsed.userId,
                    tournamentPoints: TOURNAMENT_POINTS_PER_GAME,
                })
            } catch (tournamentError) {
                console.error('Failed to add tournament points for game:', tournamentError)
            }
        }

        // Return success (200 for duplicates too, but don't re-credit)
        return {
            success: true,
            pointsCredited: creditResult.isDuplicate ? 0 : points,
            transactionId: creditResult.transactionId,
            isDuplicate: creditResult.isDuplicate || false,
            statusCode: 200,
        }
    } catch (error) {
        console.error({
            requestId,
            event: 'callback_error',
            provider,
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTimeMs: Date.now() - startTime,
        })

        return {
            success: false,
            pointsCredited: 0,
            isDuplicate: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            statusCode: 500,
        }
    }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate launch URL for a provider.
 *
 * @param provider - Game provider
 * @param userId - User ID
 * @param gameId - Game ID
 * @param sessionToken - Session token
 * @param config - Provider configuration
 * @returns Launch URL
 */
function generateLaunchUrl(
    provider: GameProvider,
    userId: string,
    gameId: string,
    sessionToken: string,
    config: GameProviderConfig
): string {
    // Use template from config or generate default
    const template = config.launchUrlTemplate || getDefaultLaunchUrl(provider)

    return template
        .replace('{userId}', encodeURIComponent(userId))
        .replace('{gameId}', encodeURIComponent(gameId))
        .replace('{sessionToken}', encodeURIComponent(sessionToken))
        .replace('{appId}', encodeURIComponent(config.appId || ''))
}

/**
 * Get default launch URL template for a provider.
 *
 * @param provider - Game provider
 * @returns URL template
 */
function getDefaultLaunchUrl(provider: GameProvider): string {
    switch (provider) {
        case 'gamezop':
            return 'https://games.gamezop.com/play/{gameId}?userId={userId}&sessionToken={sessionToken}'
        case 'adjoe':
            return 'https://adj.st/playtime?userId={userId}&appId={appId}&sessionToken={sessionToken}'
        case 'qureka':
            return 'https://qurekagames.com/play?userId={userId}&quizId={gameId}&token={sessionToken}'
        default:
            return ''
    }
}

/**
 * Generate SDK configuration for a provider.
 *
 * @param provider - Game provider
 * @param userId - User ID
 * @param gameId - Game ID
 * @param config - Provider configuration
 * @returns SDK configuration object
 */
function generateSdkConfig(
    provider: GameProvider,
    userId: string,
    gameId: string,
    config: GameProviderConfig
): Record<string, unknown> {
    switch (provider) {
        case 'gamezop':
            return {
                partnerId: config.appId,
                userId,
                gameId,
            }
        case 'adjoe':
            return {
                appId: config.appId,
                userId,
                sdkKey: config.apiKey,
            }
        case 'qureka':
            return {
                apiKey: config.apiKey,
                userId,
                quizId: gameId,
            }
        default:
            return {}
    }
}

export default {
    getProviderConfig,
    isProviderEnabled,
    getAllProviders,
    createGameSession,
    validateGameSession,
    markSessionUsed,
    verifySignature,
    verifyGamezopSignature,
    verifyAdjoeSignature,
    verifyQurekaSignature,
    parseCallback,
    parseGamezopCallback,
    parseAdjoeCallback,
    parseQurekaCallback,
    processGameCallback,
}

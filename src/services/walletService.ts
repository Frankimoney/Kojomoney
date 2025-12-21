/**
 * Wallet Service
 *
 * Handles atomic wallet transactions for crediting game rewards.
 * Ensures all-or-nothing updates across multiple Firestore documents.
 */

import { db } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import {
    GameProvider,
    GameTransaction,
    GameTransactionStatus,
    ReconciliationStatus,
} from '@/lib/games'

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a wallet credit operation.
 */
export interface WalletCreditResult {
    /** Whether the operation succeeded */
    success: boolean
    /** Internal transaction ID */
    transactionId?: string
    /** New wallet balance after credit */
    newBalance?: number
    /** Error message if failed */
    error?: string
    /** Whether this was a duplicate (idempotent) */
    isDuplicate?: boolean
}

/**
 * Result of a wallet adjustment operation.
 */
export interface WalletAdjustmentResult {
    /** Whether the operation succeeded */
    success: boolean
    /** Internal transaction ID */
    transactionId?: string
    /** New wallet balance */
    newBalance?: number
    /** Error message if failed */
    error?: string
}

/**
 * Metadata for game credit operations.
 */
export interface GameCreditMetadata {
    /** Provider's original transaction ID */
    providerTransactionId: string
    /** Game provider */
    provider: GameProvider
    /** Original value from provider */
    originalValue: number
    /** Value type (seconds, coins, reward) */
    valueType: string
    /** Game ID if available */
    gameId?: string
    /** Session ID if available */
    sessionId?: string
    /** Request ID for tracing */
    requestId?: string
    /** Raw payload stored */
    rawPayload: Record<string, unknown>
    /** Signature verification result */
    signatureValid: boolean
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Credit game reward to user wallet using atomic transaction.
 *
 * This function performs an all-or-nothing operation:
 * 1. Check for duplicate transaction (idempotency)
 * 2. Create game_transactions document
 * 3. Create transactions document
 * 4. Increment user wallet balance
 *
 * @param userId - User ID to credit
 * @param points - Number of points to credit
 * @param metadata - Transaction metadata
 * @returns Credit result with transaction ID and new balance
 */
export async function creditGameReward(
    userId: string,
    points: number,
    metadata: GameCreditMetadata
): Promise<WalletCreditResult> {
    if (!db) {
        return { success: false, error: 'Database not available' }
    }

    if (points <= 0) {
        return { success: false, error: 'Points must be positive' }
    }

    try {
        // Check for duplicate transaction first
        const existingTx = await db
            .collection('game_transactions')
            .where('providerTransactionId', '==', metadata.providerTransactionId)
            .where('provider', '==', metadata.provider)
            .limit(1)
            .get()

        if (!existingTx.empty) {
            // Transaction already processed - return success without re-crediting
            const existingData = existingTx.docs[0].data()
            return {
                success: true,
                transactionId: existingTx.docs[0].id,
                isDuplicate: true,
                newBalance: undefined, // Don't fetch balance for duplicates
            }
        }

        // Run atomic transaction
        const result = await db.runTransaction(async (transaction) => {
            // Get user document
            const userRef = db!.collection('users').doc(userId)
            const userDoc = await transaction.get(userRef)

            if (!userDoc.exists) {
                throw new Error('User not found')
            }

            const userData = userDoc.data()!
            const currentPoints = userData.points || userData.totalPoints || 0

            // Create game transaction document
            const gameTransactionRef = db!.collection('game_transactions').doc()
            const gameTransaction: Omit<GameTransaction, 'id'> = {
                providerTransactionId: metadata.providerTransactionId,
                provider: metadata.provider,
                userId,
                originalValue: metadata.originalValue,
                valueType: metadata.valueType,
                pointsCredited: points,
                status: 'credited' as GameTransactionStatus,
                rawPayload: metadata.rawPayload,
                signatureValid: metadata.signatureValid,
                gameId: metadata.gameId,
                sessionId: metadata.sessionId,
                reconciliationStatus: 'pending' as ReconciliationStatus,
                fraudCheckPassed: true,
                isReplay: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                metadata: {
                    requestId: metadata.requestId,
                },
            }

            // Create wallet transaction document
            const walletTransactionRef = db!.collection('transactions').doc()
            const walletTransaction = {
                userId,
                type: 'credit',
                amount: points,
                source: 'game',
                sourceId: gameTransactionRef.id,
                status: 'completed',
                metadata: {
                    provider: metadata.provider,
                    providerTransactionId: metadata.providerTransactionId,
                    gameId: metadata.gameId,
                    originalValue: metadata.originalValue,
                    valueType: metadata.valueType,
                },
                createdAt: Date.now(),
            }

            // Perform all writes
            transaction.set(gameTransactionRef, gameTransaction)
            transaction.set(walletTransactionRef, walletTransaction)
            transaction.update(userRef, {
                points: FieldValue.increment(points),
                totalPoints: FieldValue.increment(points),
                totalEarnings: FieldValue.increment(points),
                updatedAt: Date.now(),
            })

            return {
                transactionId: gameTransactionRef.id,
                newBalance: currentPoints + points,
            }
        })

        return {
            success: true,
            transactionId: result.transactionId,
            newBalance: result.newBalance,
            isDuplicate: false,
        }
    } catch (error) {
        console.error('Failed to credit game reward:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

/**
 * Adjust user wallet balance manually (admin function).
 *
 * @param userId - User ID to adjust
 * @param amount - Amount to adjust (positive for credit, negative for debit)
 * @param reason - Reason for adjustment
 * @param adminId - Admin user ID making the adjustment
 * @returns Adjustment result
 */
export async function adjustWalletBalance(
    userId: string,
    amount: number,
    reason: string,
    adminId: string
): Promise<WalletAdjustmentResult> {
    if (!db) {
        return { success: false, error: 'Database not available' }
    }

    if (amount === 0) {
        return { success: false, error: 'Amount cannot be zero' }
    }

    if (!reason || reason.trim().length === 0) {
        return { success: false, error: 'Reason is required' }
    }

    try {
        const result = await db.runTransaction(async (transaction) => {
            const userRef = db!.collection('users').doc(userId)
            const userDoc = await transaction.get(userRef)

            if (!userDoc.exists) {
                throw new Error('User not found')
            }

            const userData = userDoc.data()!
            const currentPoints = userData.points || userData.totalPoints || 0
            const newBalance = currentPoints + amount

            // Don't allow negative balance
            if (newBalance < 0) {
                throw new Error('Insufficient balance for debit')
            }

            // Create adjustment transaction record
            const transactionRef = db!.collection('transactions').doc()
            const transactionRecord = {
                userId,
                type: amount > 0 ? 'credit' : 'debit',
                amount: Math.abs(amount),
                source: 'admin_adjustment',
                status: 'completed',
                metadata: {
                    reason,
                    adminId,
                    previousBalance: currentPoints,
                    newBalance,
                },
                createdAt: Date.now(),
            }

            // Create admin adjustment log
            const adjustmentLogRef = db!.collection('admin_adjustment_logs').doc()
            const adjustmentLog = {
                userId,
                adminId,
                amount,
                reason,
                previousBalance: currentPoints,
                newBalance,
                transactionId: transactionRef.id,
                createdAt: Date.now(),
            }

            // Perform updates
            transaction.set(transactionRef, transactionRecord)
            transaction.set(adjustmentLogRef, adjustmentLog)
            transaction.update(userRef, {
                points: newBalance,
                totalPoints: newBalance,
                updatedAt: Date.now(),
            })

            return {
                transactionId: transactionRef.id,
                newBalance,
            }
        })

        return {
            success: true,
            transactionId: result.transactionId,
            newBalance: result.newBalance,
        }
    } catch (error) {
        console.error('Failed to adjust wallet balance:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

/**
 * Get current wallet balance for a user.
 *
 * @param userId - User ID
 * @returns Current balance or null if user not found
 */
export async function getWalletBalance(userId: string): Promise<number | null> {
    if (!db) {
        return null
    }

    try {
        const userDoc = await db.collection('users').doc(userId).get()

        if (!userDoc.exists) {
            return null
        }

        const userData = userDoc.data()!
        return userData.points || userData.totalPoints || 0
    } catch (error) {
        console.error('Failed to get wallet balance:', error)
        return null
    }
}

/**
 * Mark a game transaction with a specific status.
 *
 * @param transactionId - Game transaction ID
 * @param status - New status
 * @param fraudSignals - Optional fraud signals to record
 */
export async function updateGameTransactionStatus(
    transactionId: string,
    status: GameTransactionStatus,
    fraudSignals?: string[]
): Promise<boolean> {
    if (!db) {
        return false
    }

    try {
        const updateData: Record<string, unknown> = {
            status,
            updatedAt: Date.now(),
        }

        if (fraudSignals && fraudSignals.length > 0) {
            updateData.fraudCheckPassed = false
            updateData.fraudSignals = fraudSignals
        }

        await db.collection('game_transactions').doc(transactionId).update(updateData)
        return true
    } catch (error) {
        console.error('Failed to update game transaction status:', error)
        return false
    }
}

/**
 * Check if a provider transaction already exists (idempotency check).
 *
 * @param provider - Game provider
 * @param providerTransactionId - Provider's transaction ID
 * @returns Existing transaction ID or null
 */
export async function checkDuplicateTransaction(
    provider: GameProvider,
    providerTransactionId: string
): Promise<string | null> {
    if (!db) {
        return null
    }

    try {
        const snapshot = await db
            .collection('game_transactions')
            .where('providerTransactionId', '==', providerTransactionId)
            .where('provider', '==', provider)
            .limit(1)
            .get()

        if (snapshot.empty) {
            return null
        }

        return snapshot.docs[0].id
    } catch (error) {
        console.error('Failed to check duplicate transaction:', error)
        return null
    }
}

export default {
    creditGameReward,
    adjustWalletBalance,
    getWalletBalance,
    updateGameTransactionStatus,
    checkDuplicateTransaction,
}

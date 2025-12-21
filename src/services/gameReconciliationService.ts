/**
 * Game Reconciliation Service
 *
 * Generates daily reconciliation reports comparing provider transactions
 * with internal records. Helps identify discrepancies.
 */

import { db } from '@/lib/firebase-admin'
import {
    GameProvider,
    GameTransaction,
    ReconciliationReport,
    ReconciliationStatus,
} from '@/lib/games'

// =============================================================================
// Types
// =============================================================================

/**
 * Discrepancy details.
 */
export interface Discrepancy {
    transactionId: string
    providerTransactionId: string
    type: 'missing_internal' | 'missing_provider' | 'amount_mismatch' | 'status_mismatch'
    expectedValue?: number
    actualValue?: number
    details?: string
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Generate a daily reconciliation report for a provider.
 *
 * @param provider - Game provider
 * @param date - Date to reconcile (YYYY-MM-DD)
 * @returns Reconciliation report
 */
export async function generateDailyReport(
    provider: GameProvider,
    date: string
): Promise<ReconciliationReport | null> {
    if (!db) {
        console.error('Database not available for reconciliation')
        return null
    }

    try {
        // Parse date range
        const startOfDay = new Date(`${date}T00:00:00.000Z`).getTime()
        const endOfDay = new Date(`${date}T23:59:59.999Z`).getTime()

        // Fetch all game transactions for this provider and date
        const transactionsSnapshot = await db
            .collection('game_transactions')
            .where('provider', '==', provider)
            .where('createdAt', '>=', startOfDay)
            .where('createdAt', '<=', endOfDay)
            .get()

        const transactions: GameTransaction[] = transactionsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        } as GameTransaction))

        // Fetch corresponding wallet transactions
        const walletTransactionsSnapshot = await db
            .collection('transactions')
            .where('source', '==', 'game')
            .where('createdAt', '>=', startOfDay)
            .where('createdAt', '<=', endOfDay)
            .get()

        const walletTransactions = new Map<string, any>()
        walletTransactionsSnapshot.docs.forEach((doc) => {
            const data = doc.data()
            if (data.sourceId) {
                walletTransactions.set(data.sourceId, { id: doc.id, ...data })
            }
        })

        // Analyze discrepancies
        const discrepancies: Discrepancy[] = []
        let matchedCount = 0
        let totalPointsCredited = 0

        for (const tx of transactions) {
            if (tx.status === 'credited') {
                totalPointsCredited += tx.pointsCredited

                // Check if wallet transaction exists
                const walletTx = walletTransactions.get(tx.id)
                if (!walletTx) {
                    discrepancies.push({
                        transactionId: tx.id,
                        providerTransactionId: tx.providerTransactionId,
                        type: 'missing_internal',
                        expectedValue: tx.pointsCredited,
                        details: 'Game transaction credited but no wallet transaction found',
                    })
                } else if (walletTx.amount !== tx.pointsCredited) {
                    discrepancies.push({
                        transactionId: tx.id,
                        providerTransactionId: tx.providerTransactionId,
                        type: 'amount_mismatch',
                        expectedValue: tx.pointsCredited,
                        actualValue: walletTx.amount,
                        details: 'Amount mismatch between game and wallet transaction',
                    })
                } else {
                    matchedCount++
                }
            }
        }

        // Create report
        const reportId = `${provider}_${date}_${Date.now()}`
        const report: ReconciliationReport = {
            id: reportId,
            provider,
            date,
            providerTransactionCount: transactions.length,
            internalTransactionCount: walletTransactions.size,
            totalPointsCredited,
            matchedCount,
            discrepancyCount: discrepancies.length,
            discrepancyIds: discrepancies.map((d) => d.transactionId),
            generatedAt: Date.now(),
            status: 'generated',
        }

        // Store report
        await db.collection('reconciliation_reports').doc(reportId).set(report)

        // Store discrepancy details if any
        if (discrepancies.length > 0) {
            const batch = db.batch()
            for (const discrepancy of discrepancies) {
                const discrepancyRef = db.collection('reconciliation_discrepancies').doc()
                batch.set(discrepancyRef, {
                    reportId,
                    ...discrepancy,
                    createdAt: Date.now(),
                })
            }
            await batch.commit()
        }

        console.log({
            event: 'reconciliation_report_generated',
            provider,
            date,
            transactions: transactions.length,
            matched: matchedCount,
            discrepancies: discrepancies.length,
        })

        return report
    } catch (error) {
        console.error('Failed to generate reconciliation report:', error)
        return null
    }
}

/**
 * Update reconciliation status for a transaction.
 *
 * @param transactionId - Game transaction ID
 * @param status - New reconciliation status
 * @param notes - Optional notes
 */
export async function updateReconciliationStatus(
    transactionId: string,
    status: ReconciliationStatus,
    notes?: string
): Promise<boolean> {
    if (!db) {
        return false
    }

    try {
        await db.collection('game_transactions').doc(transactionId).update({
            reconciliationStatus: status,
            reconciliationNotes: notes,
            reconciliationUpdatedAt: Date.now(),
        })
        return true
    } catch (error) {
        console.error('Failed to update reconciliation status:', error)
        return false
    }
}

/**
 * Get unreconciled transactions for a provider.
 *
 * @param provider - Game provider
 * @param limit - Maximum number to return
 * @returns List of unreconciled transactions
 */
export async function getUnreconciledTransactions(
    provider: GameProvider,
    limit: number = 100
): Promise<GameTransaction[]> {
    if (!db) {
        return []
    }

    try {
        const snapshot = await db
            .collection('game_transactions')
            .where('provider', '==', provider)
            .where('reconciliationStatus', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get()

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        } as GameTransaction))
    } catch (error) {
        console.error('Failed to get unreconciled transactions:', error)
        return []
    }
}

/**
 * Get reconciliation reports for a provider.
 *
 * @param provider - Game provider
 * @param limit - Maximum number to return
 * @returns List of reconciliation reports
 */
export async function getReconciliationReports(
    provider: GameProvider,
    limit: number = 30
): Promise<ReconciliationReport[]> {
    if (!db) {
        return []
    }

    try {
        const snapshot = await db
            .collection('reconciliation_reports')
            .where('provider', '==', provider)
            .orderBy('generatedAt', 'desc')
            .limit(limit)
            .get()

        return snapshot.docs.map((doc) => doc.data() as ReconciliationReport)
    } catch (error) {
        console.error('Failed to get reconciliation reports:', error)
        return []
    }
}

/**
 * Mark a reconciliation report as reviewed.
 *
 * @param reportId - Report ID
 * @param notes - Review notes
 * @param status - New status
 */
export async function markReportReviewed(
    reportId: string,
    notes: string,
    status: 'reviewed' | 'resolved' = 'reviewed'
): Promise<boolean> {
    if (!db) {
        return false
    }

    try {
        await db.collection('reconciliation_reports').doc(reportId).update({
            status,
            notes,
            reviewedAt: Date.now(),
        })
        return true
    } catch (error) {
        console.error('Failed to mark report as reviewed:', error)
        return false
    }
}

/**
 * Get discrepancies for a report.
 *
 * @param reportId - Report ID
 * @returns List of discrepancies
 */
export async function getReportDiscrepancies(reportId: string): Promise<Discrepancy[]> {
    if (!db) {
        return []
    }

    try {
        const snapshot = await db
            .collection('reconciliation_discrepancies')
            .where('reportId', '==', reportId)
            .get()

        return snapshot.docs.map((doc) => doc.data() as Discrepancy)
    } catch (error) {
        console.error('Failed to get report discrepancies:', error)
        return []
    }
}

export default {
    generateDailyReport,
    updateReconciliationStatus,
    getUnreconciledTransactions,
    getReconciliationReports,
    markReportReviewed,
    getReportDiscrepancies,
}

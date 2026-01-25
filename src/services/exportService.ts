/**
 * CSV Export Utility
 * 
 * Generates CSV files for admin reports.
 */

interface ExportOptions {
    filename: string
    headers: string[]
    data: Record<string, any>[]
}

/**
 * Convert data to CSV string
 */
export function generateCSV(headers: string[], data: Record<string, any>[]): string {
    const escapeCsvValue = (value: any): string => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }

    const headerRow = headers.map(escapeCsvValue).join(',')
    const dataRows = data.map(row =>
        headers.map(header => escapeCsvValue(row[header])).join(',')
    )

    return [headerRow, ...dataRows].join('\n')
}

/**
 * Download CSV file in browser
 */
export function downloadCSV(options: ExportOptions): void {
    const csv = generateCSV(options.headers, options.data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${options.filename}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * Export users to CSV
 */
export function exportUsers(users: any[]): void {
    downloadCSV({
        filename: 'kojomoney_users',
        headers: ['id', 'email', 'displayName', 'points', 'totalEarnings', 'referralCode', 'status', 'createdAt'],
        data: users.map(u => ({
            ...u,
            createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : '',
        })),
    })
}

/**
 * Export withdrawals to CSV
 */
export function exportWithdrawals(withdrawals: any[]): void {
    downloadCSV({
        filename: 'kojomoney_withdrawals',
        headers: ['id', 'userId', 'userEmail', 'amount', 'amountUSD', 'method', 'accountDetails', 'status', 'riskScore', 'createdAt', 'processedAt', 'rejectionReason'],
        data: withdrawals.map(w => ({
            ...w,
            createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : '',
            processedAt: w.processedAt ? new Date(w.processedAt).toISOString() : '',
            riskScore: w.riskScore || 0,
        })),
    })
}

/**
 * Export PENDING withdrawals optimized for manual payment processing
 * This creates a clean spreadsheet for Bank/PayPal/Airtime payments
 */
export function exportPendingPayments(withdrawals: any[]): void {
    const pending = withdrawals.filter(w => w.status === 'pending')

    if (pending.length === 0) {
        alert('No pending withdrawals to export!')
        return
    }

    // Separate by payment method for easier processing
    const byMethod: Record<string, any[]> = {}
    pending.forEach(w => {
        const method = w.method || 'other'
        if (!byMethod[method]) byMethod[method] = []
        byMethod[method].push(w)
    })

    // Create payment-focused export
    downloadCSV({
        filename: 'pending_payments',
        headers: [
            'ID',
            'User Email',
            'Method',
            'Amount (Points)',
            'Amount (USD)',
            'Payment Details',
            'Bank Name',
            'Account Number',
            'Account Name',
            'Phone Number',
            'PayPal Email',
            'Crypto Address',
            'Risk Score',
            'Request Date',
            'Notes'
        ],
        data: pending.map(w => ({
            'ID': w.id,
            'User Email': w.userEmail || '',
            'Method': w.method?.toUpperCase() || '',
            'Amount (Points)': w.amount || 0,
            'Amount (USD)': `$${(w.amountUSD || 0).toFixed(2)}`,
            'Payment Details': w.accountDetails || '',
            'Bank Name': w.bankName || '',
            'Account Number': w.accountNumber || '',
            'Account Name': w.accountName || '',
            'Phone Number': w.phoneNumber || '',
            'PayPal Email': w.paypalEmail || '',
            'Crypto Address': w.walletAddress || '',
            'Risk Score': w.riskScore || 0,
            'Request Date': w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '',
            'Notes': w.riskScore > 50 ? '⚠️ HIGH RISK - Review carefully!' : ''
        })),
    })

    // Show summary
    const summary = Object.entries(byMethod).map(([method, items]) => {
        const total = items.reduce((sum, w) => sum + (w.amountUSD || 0), 0)
        return `${method}: ${items.length} payments = $${total.toFixed(2)}`
    }).join('\n')

    alert(`📋 Exported ${pending.length} pending payments!\n\n${summary}\n\nOpen the CSV in Excel to process manually.`)
}

/**
 * Export transactions to CSV
 */
export function exportTransactions(transactions: any[]): void {
    downloadCSV({
        filename: 'kojomoney_transactions',
        headers: ['id', 'userId', 'type', 'amount', 'source', 'status', 'description', 'createdAt'],
        data: transactions.map(t => ({
            ...t,
            createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : '',
        })),
    })
}

/**
 * Export missions to CSV
 */
export function exportMissions(missions: any[]): void {
    downloadCSV({
        filename: 'kojomoney_missions',
        headers: ['id', 'title', 'type', 'payout', 'difficulty', 'affiliateUrl', 'active', 'createdAt'],
        data: missions.map(m => ({
            ...m,
            createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : '',
        })),
    })
}

/**
 * Generate full admin report
 */
export async function generateAdminReport(apiCall: (url: string) => Promise<Response>): Promise<void> {
    try {
        // Fetch all data
        const [usersRes, withdrawalsRes, transactionsRes] = await Promise.all([
            apiCall('/api/admin/users?limit=1000'),
            apiCall('/api/admin/withdrawals?status=all&limit=1000'),
            apiCall('/api/admin/transactions?limit=1000'),
        ])

        const users = usersRes.ok ? (await usersRes.json()).users || [] : []
        const withdrawals = withdrawalsRes.ok ? (await withdrawalsRes.json()).withdrawals || [] : []
        const transactions = transactionsRes.ok ? (await transactionsRes.json()).transactions || [] : []

        // Generate timestamp for report
        const timestamp = new Date().toISOString().split('T')[0]

        // Create combined report
        const reportData = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalUsers: users.length,
                totalWithdrawals: withdrawals.length,
                pendingWithdrawals: withdrawals.filter((w: any) => w.status === 'pending').length,
                totalTransactions: transactions.length,
                totalPointsDistributed: transactions
                    .filter((t: any) => t.type === 'credit')
                    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
            },
        }

        // Download individual CSVs
        if (users.length > 0) exportUsers(users)
        if (withdrawals.length > 0) exportWithdrawals(withdrawals)
        if (transactions.length > 0) exportTransactions(transactions)

        // Download summary JSON
        const summaryBlob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(summaryBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `kojomoney_report_${timestamp}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

    } catch (error) {
        console.error('Failed to generate report:', error)
        throw error
    }
}

export default {
    generateCSV,
    downloadCSV,
    exportUsers,
    exportWithdrawals,
    exportPendingPayments,
    exportTransactions,
    exportMissions,
    generateAdminReport,
}

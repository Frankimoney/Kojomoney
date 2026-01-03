/**
 * Bank Account Verification API
 * 
 * GET /api/bank/verify?account_number=xxx&bank_code=xxx
 * 
 * Returns the account holder's name for Nigerian bank accounts
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyBankAccount, NIGERIAN_BANKS } from '@/services/bankVerificationService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Allow GET for verification, POST for listing banks
    if (req.method === 'GET') {
        return handleVerify(req, res)
    } else if (req.method === 'POST' && req.query.action === 'list-banks') {
        return handleListBanks(req, res)
    } else {
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

/**
 * Verify bank account
 */
async function handleVerify(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { account_number, bank_code } = req.query

        const accountNumber = Array.isArray(account_number) ? account_number[0] : account_number
        const bankCode = Array.isArray(bank_code) ? bank_code[0] : bank_code

        if (!accountNumber || !bankCode) {
            return res.status(400).json({
                success: false,
                error: 'Missing account_number or bank_code'
            })
        }

        const result = await verifyBankAccount({
            accountNumber,
            bankCode
        })

        if (result.success) {
            return res.status(200).json({
                success: true,
                account_name: result.accountName,
                first_name: result.firstName,
                last_name: result.lastName,
                bank_name: result.bankName
            })
        } else {
            return res.status(400).json({
                success: false,
                error: result.error
            })
        }

    } catch (error: any) {
        console.error('Bank verification API error:', error)
        return res.status(500).json({
            success: false,
            error: 'Verification failed'
        })
    }
}

/**
 * List supported banks
 */
async function handleListBanks(req: NextApiRequest, res: NextApiResponse) {
    return res.status(200).json({
        success: true,
        banks: NIGERIAN_BANKS
    })
}

/**
 * Bank Account Verification Service
 * 
 * Uses Paystack to verify Nigerian bank accounts
 * Docs: https://paystack.com/docs/identity-verification/verify-account-number/
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_URL = 'https://api.paystack.co/bank'

/**
 * Nigerian Bank codes (Paystack format)
 * Use list banks endpoint to get dynamic list if needed
 */
export const NIGERIAN_BANKS = [
    { code: '044', name: 'Access Bank' },
    { code: '023', name: 'Citibank Nigeria' },
    { code: '063', name: 'Diamond Bank' },
    { code: '050', name: 'Ecobank Nigeria' },
    { code: '070', name: 'Fidelity Bank' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '214', name: 'First City Monument Bank' },
    { code: '058', name: 'GTBank' },
    { code: '030', name: 'Heritage Bank' },
    { code: '301', name: 'Jaiz Bank' },
    { code: '082', name: 'Keystone Bank' },
    { code: '526', name: 'Parallex Bank' },
    { code: '076', name: 'Polaris Bank' },
    { code: '101', name: 'Providus Bank' },
    { code: '221', name: 'Stanbic IBTC Bank' },
    { code: '068', name: 'Standard Chartered Bank' },
    { code: '232', name: 'Sterling Bank' },
    { code: '100', name: 'Suntrust Bank' },
    { code: '032', name: 'Union Bank of Nigeria' },
    { code: '033', name: 'United Bank for Africa (UBA)' },
    { code: '215', name: 'Unity Bank' },
    { code: '035', name: 'Wema Bank' },
    { code: '057', name: 'Zenith Bank' },
    // Mobile Money / Neobanks
    { code: '999992', name: 'OPay' },
    { code: '100033', name: 'PalmPay' },
    { code: '50211', name: 'Kuda Bank' },
    { code: '50515', name: 'Moniepoint MFB' },
]

/**
 * Verify a Nigerian bank account
 */
export async function verifyBankAccount(params: {
    accountNumber: string
    bankCode: string
}): Promise<{
    success: boolean
    accountName?: string
    bankName?: string
    error?: string
}> {
    const { accountNumber, bankCode } = params

    if (!PAYSTACK_SECRET_KEY) {
        return {
            success: false,
            error: 'Bank verification service not configured (Missing Key)'
        }
    }

    try {
        const url = `${PAYSTACK_URL}/resolve?account_number=${accountNumber}&bank_code=${bankCode}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
            }
        })

        const data = await response.json()

        if (data.status && data.data) {
            return {
                success: true,
                accountName: data.data.account_name,
                bankName: getBankName(bankCode)
            }
        } else {
            return {
                success: false,
                error: data.message || 'Account verification failed'
            }
        }

    } catch (error: any) {
        console.error('Paystack verification error:', error)
        return {
            success: false,
            error: 'Service unavailable'
        }
    }
}

/**
 * Get bank name from code
 */
export function getBankName(bankCode: string): string {
    const bank = NIGERIAN_BANKS.find(b => b.code === bankCode)
    return bank?.name || 'Unknown Bank'
}

/**
 * Bank Account Verification Service
 * 
 * Uses NubAPI to verify Nigerian bank accounts
 * Docs: https://nubapi.com
 */

const NUBAPI_KEY = process.env.NUBAPI_KEY || ''
const NUBAPI_URL = 'https://nubapi.com'

/**
 * Nigerian Bank codes
 */
export const NIGERIAN_BANKS = [
    { code: '044', name: 'Access Bank' },
    { code: '023', name: 'Citibank Nigeria' },
    { code: '063', name: 'Diamond Bank' },
    { code: '050', name: 'Ecobank Nigeria' },
    { code: '084', name: 'Enterprise Bank' },
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
    { code: '999991', name: 'PalmPay' },
    { code: '999240', name: 'Kuda Bank' },
    { code: '090267', name: 'Kuda Microfinance Bank' },
    { code: '50211', name: 'Kuda Bank' },
    { code: '999044', name: 'Moniepoint' },
    { code: '999998', name: 'Carbon' },
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
    firstName?: string
    lastName?: string
    bankName?: string
    error?: string
}> {
    const { accountNumber, bankCode } = params

    if (!NUBAPI_KEY) {
        return {
            success: false,
            error: 'Bank verification service not configured'
        }
    }

    // Validate inputs
    if (!accountNumber || accountNumber.length !== 10) {
        return {
            success: false,
            error: 'Account number must be 10 digits'
        }
    }

    if (!bankCode) {
        return {
            success: false,
            error: 'Bank code is required'
        }
    }

    try {
        const url = `${NUBAPI_URL}/api/verify?account_number=${accountNumber}&bank_code=${bankCode}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${NUBAPI_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('NubAPI error:', errorText)
            return {
                success: false,
                error: 'Failed to verify account'
            }
        }

        const data = await response.json()

        if (data.account_name || data.account_number) {
            return {
                success: true,
                accountName: data.account_name,
                firstName: data.first_name,
                lastName: data.last_name,
                bankName: data.bank_name || getBankName(bankCode)
            }
        } else {
            return {
                success: false,
                error: data.message || 'Account not found'
            }
        }

    } catch (error: any) {
        console.error('Bank verification error:', error)
        return {
            success: false,
            error: error.message || 'Verification service error'
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

/**
 * Check if bank verification is configured
 */
export function isBankVerificationConfigured(): boolean {
    return !!NUBAPI_KEY
}

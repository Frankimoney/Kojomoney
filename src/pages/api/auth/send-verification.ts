import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import crypto from 'crypto'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

// Resend will be initialized lazily when needed

// Generate verification email HTML
const generateEmailHtml = (code: string, type: string) => {
    const isLogin = type === 'login'
    const isProfileVerify = type === 'verify_email'

    let title = 'Email Verification'
    let message = 'Use this code to verify your email and complete your registration:'

    if (isLogin) {
        title = 'Login Verification'
        message = 'Use this code to complete your login to KojoMoney:'
    } else if (isProfileVerify) {
        title = 'Verify Email Address'
        message = 'Use this code to verify this email address for your KojoMoney account:'
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - KojoMoney</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #8b5cf6, #3b82f6); border-radius: 16px 16px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">KojoMoney</h1>
                            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Secure Earnings Platform</p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; text-align: center;">${title}</h2>
                            <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 24px; text-align: center;">
                                ${message}
                            </p>
                            
                            <!-- Code Box -->
                            <div style="background: linear-gradient(135deg, #f4f4f5, #e4e4e7); border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px;">
                                <p style="margin: 0 0 10px; color: #71717a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                                <p style="margin: 0; color: #18181b; font-size: 40px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">${code}</p>
                            </div>
                            
                            <p style="margin: 0 0 10px; color: #71717a; font-size: 14px; text-align: center;">
                                ⏱️ This code expires in <strong>15 minutes</strong>
                            </p>
                            <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                                If you didn't request this code, please ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
                            <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                                © ${new Date().getFullYear()} KojoMoney. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                                This is an automated message. Please do not reply.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`
}

import { allowCors } from '@/lib/cors'

// ... imports

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const startTime = Date.now()
    console.log('[VERIFY-API] Request started')

    try {
        const { email, phone, type, userId } = req.body

        // Determine target (email or phone)
        const target = email || phone
        const isPhone = !!phone

        if (!target) {
            return res.status(400).json({ error: 'Email or Phone is required', success: false })
        }

        if (!db) {
            console.error('[VERIFY-API] Database not available')
            return res.status(500).json({ error: 'Database not available', success: false })
        }

        let normalizedTarget = target.trim()
        if (!isPhone) {
            normalizedTarget = normalizedTarget.toLowerCase()
        }

        // Logic for finding email from username (existing logic)
        if (!isPhone && (type === 'login' || type === 'reset-password') && !normalizedTarget.includes('@')) {
            // ... existing username lookup ...
            console.log(`[VERIFY-API] Looking up email for username: ${normalizedTarget}`)
            const usersRef = db.collection('users')
            const usernameQuery = await usersRef.where('username', '==', normalizedTarget).get()

            if (usernameQuery.empty) {
                return res.status(404).json({ error: 'User not found', success: false })
            }

            const userData = usernameQuery.docs[0].data()
            normalizedTarget = userData.email
            console.log(`[VERIFY-API] Found email for username: ${normalizedTarget}`)
        }

        // Generate a 6-digit verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const verificationId = crypto.randomBytes(16).toString('hex')

        // Store verification in database with expiration (15 minutes)
        const expiresAt = Date.now() + 15 * 60 * 1000

        console.log('[VERIFY-API] Saving to Firestore...')

        const verificationData: any = {
            code,
            type: type || 'register',
            expiresAt,
            createdAt: Date.now(),
            used: false,
            ...(userId && { userId }) // Associate with user if provided
        }

        if (isPhone) {
            verificationData.phone = normalizedTarget
        } else {
            verificationData.email = normalizedTarget
        }

        await db.collection('verifications').doc(verificationId).set(verificationData)

        // SENDING LOGIC
        const isDev = process.env.NODE_ENV === 'development'

        if (isPhone) {
            // MOCK SMS SENDING
            // In a real app, integrate Twilio, AWS SNS, or Firebase Auth here.
            console.log(`[SMS-MOCK] sending SMS to ${normalizedTarget}: Your KojoMoney verification code is ${code}`)
        } else {
            // EMAIL SENDING (Resend)
            const resendConfigured = !!process.env.RESEND_API_KEY
            if (resendConfigured) {
                sendEmailWithResend(normalizedTarget, code, type).catch(err => {
                    console.error('[EMAIL] Background send failed:', err.message)
                })
            } else {
                console.log(`[EMAIL-MOCK] Resend not configured. Code for ${normalizedTarget}: ${code}`)
            }
        }

        // Respond
        res.status(200).json({
            success: true,
            verificationId,
            target: normalizedTarget,
            message: `Verification code sent to ${normalizedTarget}`,
            devCode: isDev ? code : undefined // Return code in response for easier testing/demo only in dev
        })

    } catch (error) {
        console.error('[VERIFY-API] Error:', error)
        return res.status(500).json({ error: 'Failed to send verification code', success: false })
    }
}
// ... sendEmailWithResend function ...

// Async email sending function using Resend (runs in background)
async function sendEmailWithResend(email: string, code: string, type: string) {
    console.log('[EMAIL] Starting Resend email send...')
    const emailStart = Date.now()

    try {
        // Initialize Resend with API key
        const resend = new Resend(process.env.RESEND_API_KEY)

        const isLogin = type === 'login'
        const isProfileVerify = type === 'verify_email'

        let subject = 'Verify Your Email - KojoMoney'
        if (isLogin) {
            subject = 'Login Verification Code - KojoMoney'
        } else if (isProfileVerify) {
            subject = 'Verify Email Address - KojoMoney'
        }

        // Use your verified domain or Resend's test domain
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

        const { data, error } = await resend.emails.send({
            from: `KojoMoney <${fromEmail}>`,
            to: [email],
            subject: subject,
            html: generateEmailHtml(code, type),
        })

        if (error) {
            throw new Error(error.message)
        }

        console.log(`[EMAIL] Sent successfully to ${email} in ${Date.now() - emailStart}ms (ID: ${data?.id})`)
    } catch (error: any) {
        console.error(`[EMAIL] Failed after ${Date.now() - emailStart}ms:`, error.message)
        throw error
    }
}


export default allowCors(handler)

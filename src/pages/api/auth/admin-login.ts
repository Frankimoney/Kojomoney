/**
 * Admin Login with Two-Factor Authentication
 * 
 * Step 1: POST /api/auth/admin-login with { email, password }
 *         Returns { step: 'verify_code' } and sends a 6-digit code to email
 * 
 * Step 2: POST /api/auth/admin-login with { email, code }
 *         Verifies the code and returns the admin token
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { generateAdminToken } from '@/lib/admin-auth'
import { allowCors } from '@/lib/cors'
import nodemailer from 'nodemailer'

// Admin credentials from environment
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'NshumB@EMMANDAK2'
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@kojomoney.com').split(',').map(e => e.trim().toLowerCase())

// Store for pending 2FA codes (in production, use Redis or database)
// Map: email -> { code: string, expiresAt: number, attempts: number }
const pendingCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>()

// Email transporter
function getEmailTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    })
}

// Generate a 6-digit code
function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send 2FA code via email
async function send2FACode(email: string, code: string): Promise<boolean> {
    // Check if email config is present
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('[Admin 2FA] Missing GMAIL_USER or GMAIL_APP_PASSWORD')

        // In development, mock success so admin can still login
        if (process.env.NODE_ENV !== 'production') {
            console.log('==========================================')
            console.log(`[DEV MODE] Mock 2FA code for ${email}: ${code}`)
            console.log('==========================================')
            return true
        }
        return false
    }

    try {
        const transporter = getEmailTransporter()

        await transporter.sendMail({
            from: `"KojoMoney Security" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: '🔐 Your Admin Login Code - KojoMoney',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #6366f1; margin: 0;">🔐 Admin Login Code</h1>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0;">
                        <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
                        <div style="font-size: 36px; font-weight: bold; color: white; letter-spacing: 8px; font-family: monospace;">
                            ${code}
                        </div>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #64748b; font-size: 13px;">
                            ⏰ This code expires in <strong>5 minutes</strong>.<br/>
                            🚫 If you didn't request this, ignore this email.<br/>
                            🔒 Never share this code with anyone.
                        </p>
                    </div>
                    
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                        KojoMoney Admin Security<br/>
                        ${new Date().toLocaleString()}
                    </p>
                </div>
            `
        })

        console.log(`[Admin 2FA] Code sent to ${email}`)
        return true
    } catch (error) {
        console.error('[Admin 2FA] Failed to send code:', error)
        return false
    }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { email, password, code } = req.body

    // STEP 2: Verify 2FA code
    if (code && email) {
        const pending = pendingCodes.get(email.toLowerCase())

        if (!pending) {
            return res.status(400).json({
                error: 'No pending verification. Please login again.',
                step: 'login'
            })
        }

        // Check expiration
        if (Date.now() > pending.expiresAt) {
            pendingCodes.delete(email.toLowerCase())
            return res.status(400).json({
                error: 'Code expired. Please login again.',
                step: 'login'
            })
        }

        // Check attempts
        if (pending.attempts >= 3) {
            pendingCodes.delete(email.toLowerCase())
            return res.status(429).json({
                error: 'Too many attempts. Please login again.',
                step: 'login'
            })
        }

        // Verify code
        if (code !== pending.code) {
            pending.attempts++
            return res.status(401).json({
                error: `Invalid code. ${3 - pending.attempts} attempts remaining.`,
                step: 'verify_code'
            })
        }

        // Code is valid! Generate token and cleanup
        pendingCodes.delete(email.toLowerCase())
        const token = generateAdminToken(email)

        console.log(`[Admin 2FA] Login successful for ${email}`)

        return res.status(200).json({
            success: true,
            step: 'complete',
            token,
            user: { email, role: 'admin' }
        })
    }

    // STEP 1: Verify password and send 2FA code
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
    }

    // Verify password
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid password' })
    }

    // Verify email (must match authorized list)
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
        return res.status(403).json({ error: 'Unauthorized email address' })
    }

    // Generate and store 2FA code
    const verificationCode = generateCode()
    pendingCodes.set(email.toLowerCase(), {
        code: verificationCode,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        attempts: 0
    })

    // Send code via email
    const sent = await send2FACode(email, verificationCode)

    if (!sent) {
        pendingCodes.delete(email.toLowerCase())
        return res.status(500).json({
            error: 'Failed to send verification code. Please try again.'
        })
    }

    return res.status(200).json({
        success: true,
        step: 'verify_code',
        message: `A 6-digit verification code has been sent to ${email}`,
        expiresIn: 300 // 5 minutes in seconds
    })
}

export default allowCors(handler)

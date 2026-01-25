/**
 * Admin Login with Two-Factor Authentication
 * 
 * Step 1: POST /api/auth/admin-login with { email, password }
 *         Returns { step: 'verify_code' } and sends a 6-digit code to email
 * 
 * Step 2: POST /api/auth/admin-login with { email, code }
 *         Verifies the code and returns the admin token
 * 
 * Password validation:
 * - Bootstrapped admins (from ENV): use shared ADMIN_PASSWORD
 * - Invited admins: use their individual passwordHash
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { generateAdminToken } from '@/lib/admin-auth'
import { allowCors } from '@/lib/cors'
import { adminDb } from '@/lib/admin-db'
import bcrypt from 'bcryptjs'

// Admin credentials from environment (for bootstrapped super_admins)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'NshumB@EMMANDAK2'

// Store for pending 2FA codes (in production, use Redis or database)
// Map: email -> { code: string, expiresAt: number, attempts: number }
const pendingCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>()


// Generate a 6-digit code
function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send 2FA code via email using Resend
async function send2FACode(email: string, code: string): Promise<boolean> {
    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
        console.warn('[Admin 2FA] Missing RESEND_API_KEY')

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
        const { Resend } = require('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

        const { data, error } = await resend.emails.send({
            from: `KojoMoney Security <${fromEmail}>`,
            to: [email],
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

        if (error) {
            console.error('[Admin 2FA] Resend error:', error)
            return false
        }

        console.log(`[Admin 2FA] Code sent to ${email} (ID: ${data?.id})`)
        return true
    } catch (error) {
        console.error('[Admin 2FA] Failed to send code:', error)
        return false
    }
}

/**
 * Validate password for an admin user
 * - Bootstrapped admins (status undefined or addedBy='system'): use ADMIN_PASSWORD
 * - Invited admins with passwordHash: use bcrypt comparison
 */
async function validatePassword(admin: any, password: string): Promise<boolean> {
    // Check if this is a bootstrapped admin (from ENV)
    const isBootstrapped = admin.addedBy === 'system' || !admin.passwordHash

    if (isBootstrapped) {
        // Use shared master password for bootstrapped admins
        return password === ADMIN_PASSWORD
    }

    // For invited admins, check against their password hash
    if (admin.passwordHash) {
        return await bcrypt.compare(password, admin.passwordHash)
    }

    return false
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

        // Code is valid! 

        // Fetch role from DB again to be safe
        const adminUser = await adminDb.getAdmin(email)

        // Should not happen if Step 1 passed, but safety first
        if (!adminUser) {
            return res.status(403).json({ error: 'Unauthorized' })
        }

        // Generate token with role
        const token = generateAdminToken(email, adminUser.role)

        // Record login
        await adminDb.recordLogin(email)

        console.log(`[Admin 2FA] Login successful for ${email} (${adminUser.role})`)

        // Clean up code
        pendingCodes.delete(email.toLowerCase())

        return res.status(200).json({
            success: true,
            step: 'complete',
            token,
            user: { email, role: adminUser.role, name: adminUser.name }
        })
    }

    // STEP 1: Verify password and send 2FA code
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
    }

    // Verify email against DB (RBAC)
    try {
        const adminUser = await adminDb.getAdmin(email)

        if (!adminUser) {
            return res.status(403).json({ error: 'Unauthorized: Admin access required' })
        }

        // Check if account is pending (hasn't accepted invite yet)
        if (adminUser.status === 'pending') {
            return res.status(403).json({
                error: 'Please accept your invitation first. Check your email for the invite link.'
            })
        }

        // Verify password (individual or shared)
        const passwordValid = await validatePassword(adminUser, password)

        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid password' })
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

    } catch (error) {
        console.error('[Admin Login] DB Check Failed:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

export default allowCors(handler)

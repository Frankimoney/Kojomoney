/**
 * Email Notification Service using Nodemailer
 * 
 * Handles sending email notifications for admin events.
 * Supports SMTP (Gmail, Outlook, custom SMTP) configuration.
 */

import nodemailer from 'nodemailer'

// Email configuration from environment variables
const EMAIL_CONFIG = {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'KojoMoney <noreply@kojomoney.com>',
}

// Admin emails to notify (comma-separated in env)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@kojomoney.com').split(',').map(e => e.trim())

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: EMAIL_CONFIG.host,
        port: EMAIL_CONFIG.port,
        secure: EMAIL_CONFIG.secure,
        auth: {
            user: EMAIL_CONFIG.user,
            pass: EMAIL_CONFIG.pass,
        },
    })
}

interface EmailOptions {
    to: string | string[]
    subject: string
    html: string
    text?: string
}

interface WithdrawalData {
    id: string
    userId: string
    userEmail: string
    amount: number
    amountUSD: number
    method: string
    accountDetails: string
    createdAt: number
}

/**
 * Send an email using Nodemailer
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
    if (!EMAIL_CONFIG.enabled) {
        console.log('[Email] Service disabled. Would send:', options.subject)
        return false
    }

    if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.pass) {
        console.log('[Email] Missing credentials. Please set EMAIL_USER and EMAIL_PASS')
        return false
    }

    try {
        const transporter = createTransporter()

        const mailOptions = {
            from: EMAIL_CONFIG.from,
            to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
            subject: options.subject,
            text: options.text || '',
            html: options.html,
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('[Email] Sent successfully:', info.messageId)
        return true
    } catch (error) {
        console.error('[Email] Failed to send:', error)
        return false
    }
}

/**
 * Notify admins of a new withdrawal request
 */
export async function notifyNewWithdrawal(withdrawal: WithdrawalData): Promise<void> {
    const subject = `🔔 New Withdrawal Request - ${withdrawal.amount} pts`

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; color: white; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🔔 New Withdrawal Request</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                <p style="color: #64748b; margin-bottom: 20px;">A new withdrawal request needs your attention:</p>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">User</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${withdrawal.userEmail}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Amount</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #10b981;">${withdrawal.amount} pts ($${withdrawal.amountUSD.toFixed(2)})</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Method</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${withdrawal.method}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Account</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${withdrawal.accountDetails}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; color: #64748b;">Requested</td>
                        <td style="padding: 10px;">${new Date(withdrawal.createdAt).toLocaleString()}</td>
                    </tr>
                </table>
                
                <div style="margin-top: 30px; text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://kojomoney.com'}/admin" 
                       style="display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Review in Admin Panel
                    </a>
                </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                <p>This is an automated notification from KojoMoney Admin</p>
            </div>
        </div>
    `

    await sendEmail({
        to: ADMIN_EMAILS,
        subject,
        html,
        text: `New withdrawal request: ${withdrawal.amount} pts from ${withdrawal.userEmail}. Review at ${process.env.NEXT_PUBLIC_APP_URL}/admin`,
    })
}

/**
 * Notify user that their withdrawal was processed
 */
export async function notifyWithdrawalProcessed(
    userEmail: string,
    amount: number,
    status: 'approved' | 'rejected',
    reason?: string
): Promise<void> {
    const isApproved = status === 'approved'
    const subject = isApproved
        ? `✅ Withdrawal Approved - ${amount} pts`
        : `❌ Withdrawal Update - ${amount} pts`

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${isApproved ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'}; padding: 20px; color: white; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">
                    ${isApproved ? '✅ Withdrawal Approved!' : '❌ Withdrawal Status Update'}
                </h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                ${isApproved ? `
                    <p style="color: #374151; font-size: 16px;">
                        Great news! Your withdrawal request for <strong>${amount} points</strong> has been approved.
                    </p>
                    <p style="color: #64748b;">
                        The payment will be processed to your account shortly. Please allow 1-3 business days for the funds to appear in your account.
                    </p>
                ` : `
                    <p style="color: #374151; font-size: 16px;">
                        Unfortunately, your withdrawal request for <strong>${amount} points</strong> could not be processed.
                    </p>
                    ${reason ? `
                        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="color: #991b1b; margin: 0;"><strong>Reason:</strong> ${reason}</p>
                        </div>
                    ` : ''}
                    <p style="color: #64748b;">
                        Your points have been refunded to your account. If you have questions, please contact support.
                    </p>
                `}
                
                <div style="margin-top: 30px; text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://kojomoney.com'}" 
                       style="display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Open KojoMoney
                    </a>
                </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                <p>Thank you for using KojoMoney!</p>
            </div>
        </div>
    `

    await sendEmail({
        to: userEmail,
        subject,
        html,
        text: isApproved
            ? `Your withdrawal of ${amount} pts has been approved! Payment will be processed shortly.`
            : `Your withdrawal of ${amount} pts was not processed. ${reason ? `Reason: ${reason}. ` : ''}Points have been refunded.`,
    })
}

/**
 * Send verification code email
 */
export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
    const subject = '🔐 Your KojoMoney Verification Code'

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; color: white; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🔐 Email Verification</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px; text-align: center;">
                <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">
                    Use this code to verify your email address:
                </p>
                
                <div style="background: #1e1b4b; color: #a5b4fc; padding: 20px 40px; border-radius: 12px; display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">
                    ${code}
                </div>
                
                <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                    This code expires in 10 minutes. If you didn't request this, please ignore this email.
                </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                <p>KojoMoney - Earn rewards on the go!</p>
            </div>
        </div>
    `

    return await sendEmail({
        to: email,
        subject,
        html,
        text: `Your KojoMoney verification code is: ${code}. This code expires in 10 minutes.`,
    })
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(email: string, displayName: string): Promise<boolean> {
    const subject = '🎉 Welcome to KojoMoney!'

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; color: white; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to KojoMoney!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Start earning rewards today</p>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; font-size: 18px;">
                    Hi ${displayName || 'there'}! 👋
                </p>
                <p style="color: #64748b; line-height: 1.6;">
                    Welcome to KojoMoney! You're now part of our community of earners. Here's how to get started:
                </p>
                
                <div style="margin: 30px 0;">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="background: #6366f1; color: white; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">1</span>
                        <span style="color: #374151;"><strong>Complete your daily check-in</strong> - Earn free points every day!</span>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="background: #6366f1; color: white; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">2</span>
                        <span style="color: #374151;"><strong>Complete missions</strong> - Follow, share, and earn big rewards</span>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="background: #6366f1; color: white; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">3</span>
                        <span style="color: #374151;"><strong>Refer friends</strong> - Get bonus points for each referral</span>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://kojomoney.com'}" 
                       style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Start Earning Now
                    </a>
                </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                <p>Questions? Reply to this email or contact support@kojomoney.com</p>
            </div>
        </div>
    `

    return await sendEmail({
        to: email,
        subject,
        html,
        text: `Welcome to KojoMoney, ${displayName}! Start earning rewards today at ${process.env.NEXT_PUBLIC_APP_URL}`,
    })
}

/**
 * Send admin invite email
 */
export async function sendAdminInvite(
    email: string,
    name: string,
    role: string,
    inviteToken: string,
    invitedBy: string
): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kojomoney.com'
    const inviteUrl = `${appUrl}/admin/accept-invite?token=${inviteToken}`

    const subject = '🎉 You\'ve Been Invited to KojoMoney Admin'

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; color: white; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🎉 Admin Invitation</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to join the team</p>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; font-size: 18px;">
                    Hi ${name}! 👋
                </p>
                <p style="color: #64748b; line-height: 1.6;">
                    <strong>${invitedBy}</strong> has invited you to join the KojoMoney admin team as a <strong style="color: #6366f1;">${role}</strong>.
                </p>
                
                <div style="background: #e0e7ff; border: 1px solid #c7d2fe; padding: 20px; border-radius: 10px; margin: 25px 0;">
                    <p style="color: #4338ca; margin: 0; font-size: 14px;">
                        <strong>📋 Your Role:</strong> ${role}<br>
                        <strong>📧 Your Email:</strong> ${email}
                    </p>
                </div>
                
                <p style="color: #64748b; line-height: 1.6;">
                    Click the button below to set your password and activate your account:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteUrl}" 
                       style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Accept Invitation
                    </a>
                </div>
                
                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
                    This invitation expires in 7 days. If you didn't expect this invitation, please ignore this email.
                </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                <p>KojoMoney Admin Panel</p>
            </div>
        </div>
    `

    return await sendEmail({
        to: email,
        subject,
        html,
        text: `Hi ${name}! You've been invited to join KojoMoney as ${role}. Accept your invitation here: ${inviteUrl}`,
    })
}

export default {
    sendEmail,
    notifyNewWithdrawal,
    notifyWithdrawalProcessed,
    sendVerificationCode,
    sendWelcomeEmail,
    sendAdminInvite,
}

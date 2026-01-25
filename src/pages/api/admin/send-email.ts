/**
 * Admin Send Email API
 * 
 * POST /api/admin/send-email - Send personalized email to a user
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { sendEmail } from '@/services/emailService'

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { to, subject, message, userName } = req.body

        if (!to || !subject || !message) {
            return res.status(400).json({
                error: 'to, subject, and message are required'
            })
        }

        // Build the HTML email template
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; color: white; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">📬 Message from KojoMoney</h1>
                </div>
                <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                    ${userName ? `<p style="color: #374151; font-size: 18px; margin-bottom: 20px;">Hi ${userName}! 👋</p>` : ''}
                    
                    <div style="color: #374151; line-height: 1.8; font-size: 16px; white-space: pre-wrap;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://kojomoney.com'}" 
                           style="display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Open KojoMoney
                        </a>
                    </div>
                </div>
                <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                    <p>This is a message from the KojoMoney Team</p>
                    <p style="margin-top: 10px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #6366f1; text-decoration: none;">Visit KojoMoney</a>
                    </p>
                </div>
            </div>
        `

        const success = await sendEmail({
            to,
            subject,
            html,
            text: message,
        })

        if (success) {
            return res.status(200).json({
                success: true,
                message: `Email sent to ${to}`,
            })
        } else {
            return res.status(500).json({
                error: 'Failed to send email. Check email configuration.',
            })
        }
    } catch (error) {
        console.error('Error sending email:', error)
        return res.status(500).json({ error: 'Failed to send email' })
    }
}

export default requireAdmin(handler)

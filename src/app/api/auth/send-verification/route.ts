import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateVerificationCode, validateEmail, validatePhone } from '@/lib/security'
import { Timestamp } from 'firebase-admin/firestore'
import nodemailer from 'nodemailer'

// Initialize email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

export async function POST(request: NextRequest) {
    try {
        const { email, phone, type } = await request.json()

        if (!type || !['register', 'login', 'password-reset'].includes(type)) {
            return NextResponse.json(
                { error: 'Invalid verification type' },
                { status: 400 }
            )
        }

        if (!email && !phone) {
            return NextResponse.json(
                { error: 'Email or phone is required' },
                { status: 400 }
            )
        }

        // Validate email format if provided
        if (email && !validateEmail(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            )
        }

        // Validate phone format if provided
        if (phone && !validatePhone(phone)) {
            return NextResponse.json(
                { error: 'Invalid phone number format' },
                { status: 400 }
            )
        }

        // Generate verification code
        const code = generateVerificationCode()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Store verification code in database
        const contactMethod = email || phone || ''
        const verificationRef = db.collection('verification_codes').doc()
        
        await verificationRef.set({
            contact: contactMethod,
            email: email || null,
            phone: phone || null,
            code,
            type,
            expiresAt: Timestamp.fromDate(expiresAt),
            attempts: 0,
            isUsed: false,
            createdAt: Timestamp.now(),
        })

        // Send verification code via email
        if (email) {
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || 'noreply@kojomoney.com',
                    to: email,
                    subject: 'Your KojoMoney Verification Code',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #7c3aed;">KojoMoney Verification</h2>
                            <p>Your verification code is:</p>
                            <h1 style="color: #7c3aed; letter-spacing: 2px; font-size: 32px;">${code}</h1>
                            <p style="color: #666;">This code will expire in 10 minutes.</p>
                            <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                        </div>
                    `,
                })
            } catch (emailError) {
                console.error('Error sending email:', emailError)
                // Don't fail the request if email fails, SMS might work
            }
        }

        // TODO: Send SMS via Twilio or similar service when phone is provided
        // For now, just log it (in production, integrate with SMS service)
        if (phone) {
            console.log(`SMS Verification Code for ${phone}: ${code}`)
        }

        return NextResponse.json({
            success: true,
            message: 'Verification code sent successfully',
            verificationId: verificationRef.id,
            // Only for development - remove in production
            ...(process.env.NODE_ENV === 'development' && { code }),
        })

    } catch (error) {
        console.error('Error sending verification code:', error)
        return NextResponse.json(
            { error: 'Failed to send verification code' },
            { status: 500 }
        )
    }
}

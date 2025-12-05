import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
    try {
        const { code, verificationId } = await request.json()

        if (!code || !verificationId) {
            return NextResponse.json(
                { error: 'Code and verification ID are required' },
                { status: 400 }
            )
        }

        const verificationRef = db.collection('verification_codes').doc(verificationId)
        const verificationSnap = await verificationRef.get()

        if (!verificationSnap.exists) {
            return NextResponse.json(
                { error: 'Verification record not found' },
                { status: 404 }
            )
        }

        const verificationData = verificationSnap.data() as any

        // Check if code is already used
        if (verificationData.isUsed) {
            return NextResponse.json(
                { error: 'This verification code has already been used' },
                { status: 400 }
            )
        }

        // Check if code is expired
        const expiresAt = verificationData.expiresAt?.toDate?.() || new Date(0)
        if (new Date() > expiresAt) {
            return NextResponse.json(
                { error: 'Verification code has expired' },
                { status: 400 }
            )
        }

        // Check attempts (limit to 5 failed attempts)
        if (verificationData.attempts >= 5) {
            return NextResponse.json(
                { error: 'Too many failed attempts. Please request a new code.' },
                { status: 429 }
            )
        }

        // Verify code
        if (verificationData.code !== code) {
            // Increment attempts
            await verificationRef.update({
                attempts: verificationData.attempts + 1,
            })

            return NextResponse.json(
                { error: 'Invalid verification code' },
                { status: 400 }
            )
        }

        // Mark code as used
        await verificationRef.update({
            isUsed: true,
            usedAt: Timestamp.now(),
        })

        return NextResponse.json({
            success: true,
            message: 'Code verified successfully',
            contact: verificationData.contact,
            email: verificationData.email,
            phone: verificationData.phone,
            type: verificationData.type,
        })

    } catch (error) {
        console.error('Error verifying code:', error)
        return NextResponse.json(
            { error: 'Failed to verify code' },
            { status: 500 }
        )
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Timestamp } from 'firebase-admin/firestore'

// Basic anti-fraud detection
export async function detectFraud(request: NextRequest, userId?: string) {
    const ip = (request as any).ip || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const fraudSignals: string[] = []

    // Check for VPN/Proxy (basic check)
    const suspiciousIPs = ['10.0.0.0', '192.168.0.0', '172.16.0.0'] // Private networks
    if (suspiciousIPs.some(suspiciousIP => ip.startsWith(suspiciousIP))) {
        fraudSignals.push('Suspicious IP range')
    }

    // Check for rapid requests (rate limiting)
    if (userId) {
        const recentAdSnap = await db
            .collection('ad_views')
            .where('userId', '==', userId)
            .where('startedAt', '>=', Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000)))
            .get()
        const recentAdViews = recentAdSnap.size

        if (recentAdViews > 10) {
            fraudSignals.push('Excessive ad views')
        }

        const recentNewsSnap = await db
            .collection('news_reads')
            .where('userId', '==', userId)
            .where('startedAt', '>=', Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000)))
            .get()
        const recentNewsReads = recentNewsSnap.size

        if (recentNewsReads > 20) {
            fraudSignals.push('Excessive news reads')
        }
    }

    // Check for unusual user agent patterns
    if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('automated')) {
        fraudSignals.push('Suspicious user agent')
    }

    return {
        isFraudulent: fraudSignals.length > 0,
        signals: fraudSignals,
        riskScore: Math.min(fraudSignals.length * 25, 100)
    }
}

export async function blockVPN(request: NextRequest) {
    const ip = (request as any).ip || 'unknown'

    // Basic VPN detection - in production, use a proper VPN detection service
    const knownVPNRanges = [
        '185.0.0.0', '185.1.0.0', '185.2.0.0', // Sample VPN ranges
        '104.0.0.0', '104.1.0.0' // More sample ranges
    ]

    return knownVPNRanges.some(range => ip.startsWith(range))
}

export async function checkDeviceLimit(request: NextRequest, userId: string) {
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const deviceId = generateDeviceId(userAgent, (request as any).ip || 'unknown')

    // Check how many accounts are using this device
    const sameDeviceSnap = await db.collection('users').where('deviceId', '==', deviceId).get()
    const accountsWithSameDevice = sameDeviceSnap.size

    return {
        isAllowed: accountsWithSameDevice < 1, // Allow only 1 account per device
        deviceCount: accountsWithSameDevice
    }
}

function generateDeviceId(userAgent: string, ip: string): string {
    // Simple device fingerprinting
    const fingerprint = `${userAgent}-${ip}`
    return Buffer.from(fingerprint).toString('base64').substring(0, 32)
}

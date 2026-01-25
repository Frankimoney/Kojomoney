import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

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
    if (userId && db) {
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
    // Prefer client-side persistent ID, fallback to fingerprint
    const clientDeviceId = request.headers.get('x-device-id')
    const deviceId = clientDeviceId || generateDeviceId(userAgent, (request as any).ip || 'unknown')

    // If db is not available, allow by default
    if (!db) {
        return { isAllowed: true, deviceCount: 1 }
    }

    // Check how many accounts are using this device
    const sameDeviceSnap = await db.collection('users').where('lastDeviceId', '==', deviceId).get()

    // Filter out current user
    const accountsWithSameDevice = sameDeviceSnap.docs.filter(d => d.id !== userId).length

    return {
        isAllowed: accountsWithSameDevice < 1, // Allow only 1 account per device
        deviceCount: accountsWithSameDevice + 1
    }
}

function generateDeviceId(userAgent: string, ip: string): string {
    // Simple device fingerprinting (Fallback)
    const fingerprint = `${userAgent}-${ip}`
    return Buffer.from(fingerprint).toString('base64').substring(0, 32)
}

/**
 * Enhanced Anti-Fraud Check
 * Combines multiple signals to determine risk
 */
export async function enhanceFraudCheck(userId: string, actionType: string, ip: string, deviceId: string) {
    // If db is not available (client side?), return safe default
    if (!db) return { riskScore: 0, block: false }

    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (!userData) return { riskScore: 0, block: false }

    let riskScore = userData.fraudScore || 0
    let signals: string[] = []

    // 1. Device Mismatch
    if (userData.lastDeviceId && userData.lastDeviceId !== deviceId) {
        riskScore += 20
        signals.push('Device Changed')
    }

    // 2. IP Velocity (simplified)
    if (userData.lastIp && userData.lastIp !== ip) {
        riskScore += 10
        signals.push('IP Changed')
    }

    // 3. Action Velocity
    const lastAction = userData.lastActionTimestamp || 0
    const now = Date.now()
    if (now - lastAction < 2000) { // < 2 seconds between major earning actions
        riskScore += 30
        signals.push('High Velocity Action')
    }

    // 4. Multiple Accounts (Shared Device Check)
    try {
        const sameDeviceSnap = await db.collection('users').where('lastDeviceId', '==', deviceId).get()
        if (sameDeviceSnap.size > 1) {
            const otherUsers = sameDeviceSnap.docs.filter(d => d.id !== userId)
            if (otherUsers.length > 0) {
                riskScore += 55
                signals.push(`Duplicate Device: Used by ${otherUsers.length} other account(s)`)
            }
        }
    } catch (e) { console.error('Error checking device duplicates', e) }

    // Update user stats
    await db.collection('users').doc(userId).update({
        fraudScore: riskScore,
        lastActionTimestamp: now,
        lastDeviceId: deviceId,
        lastIp: ip,
        suspiciousActivityLog: signals.length > 0
            ? [...(userData.suspiciousActivityLog || []), { date: now, signals }]
            : userData.suspiciousActivityLog || []
    })

    return {
        riskScore,
        signals, // Returned for storage
        block: riskScore > 80
    }
}

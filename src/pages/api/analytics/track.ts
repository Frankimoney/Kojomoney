import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import requestIp from 'request-ip'
import geoip from 'geoip-lite'

// Country code to name mapping (common countries)
const countryNames: Record<string, string> = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'NG': 'Nigeria',
    'GH': 'Ghana',
    'KE': 'Kenya',
    'ZA': 'South Africa',
    'IN': 'India',
    'PK': 'Pakistan',
    'PH': 'Philippines',
    'ID': 'Indonesia',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'ES': 'Spain',
    'IT': 'Italy',
    'NL': 'Netherlands',
    'SE': 'Sweden',
    'JP': 'Japan',
    'CN': 'China',
    'KR': 'South Korea',
    'EG': 'Egypt',
    'MA': 'Morocco',
    'AE': 'UAE',
    'SA': 'Saudi Arabia',
    'TR': 'Turkey',
    'PL': 'Poland',
    'RU': 'Russia',
    'UA': 'Ukraine',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'MY': 'Malaysia',
    'SG': 'Singapore',
    'BD': 'Bangladesh',
    'ET': 'Ethiopia',
    'TZ': 'Tanzania',
    'UG': 'Uganda',
    'CM': 'Cameroon',
    'CI': 'Ivory Coast',
    'SN': 'Senegal',
}

function getCountryName(code: string | undefined): string {
    if (!code) return 'Unknown'
    return countryNames[code] || code // Return code if no name found
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not available' })
    }

    try {
        const { postId, title, type = 'view', referrer } = req.body

        // Get IP and Geo Data
        let ip = requestIp.getClientIp(req) || 'unknown'

        // Handle local/private IPs - these won't have geo data
        const isLocalIp = ip === 'unknown' ||
            ip === '127.0.0.1' ||
            ip === '::1' ||
            ip.startsWith('192.168.') ||
            ip.startsWith('10.') ||
            ip.startsWith('172.')

        const geo = isLocalIp ? null : geoip.lookup(ip)

        // Convert country code to full name
        const countryCode = geo?.country
        const country = isLocalIp ? 'Local Dev' : getCountryName(countryCode)
        const city = geo?.city || (isLocalIp ? 'Localhost' : 'Unknown')

        console.log(`[Analytics] IP: ${ip}, Country: ${country}, City: ${city}`)

        // Store in Firestore
        // We'll use a subcollection 'analytics' under the post for detailed logs
        // And increment counters on the post document for aggregation

        const FieldValue = require('firebase-admin').firestore.FieldValue;

        await db.collection('posts').doc(postId).collection('analytics').add({
            type, // 'view', 'scroll', etc
            ip: isLocalIp ? 'local' : ip, // Don't store local IPs
            country,
            countryCode: countryCode || 'XX', // Store code for reference
            city,
            referrer: referrer || req.headers.referer || 'direct',
            userAgent: req.headers['user-agent'] || 'unknown',
            createdAt: Date.now()
        })

        // Increment aggregate counters
        // Use sanitized country name (replace dots/slashes which are invalid in Firestore field paths)
        const safeCountry = country.replace(/[.\/]/g, '_')

        if (type === 'view') {
            await db.collection('posts').doc(postId).update({
                'stats.views': FieldValue.increment(1),
                [`stats.countries.${safeCountry}`]: FieldValue.increment(1),
                [`stats.referrers.${getReferrerDomain(referrer || (req.headers.referer as string) || 'direct')}`]: FieldValue.increment(1)
            })
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Analytics error:', error)
        return res.status(200).json({ success: false })
    }
}

function getReferrerDomain(referrer: string): string {
    if (!referrer || referrer === 'direct') return 'Direct'
    try {
        const url = new URL(referrer)
        return url.hostname.replace('www.', '')
    } catch {
        return 'Unknown'
    }
}

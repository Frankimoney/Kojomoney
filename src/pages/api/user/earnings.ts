/**
 * User Earnings API Endpoint
 *
 * GET /api/user/earnings
 *
 * Get user's earning history from all sources (ads, news, trivia, games, offerwalls, surveys, etc.)
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/firebase-admin'
import { allowCors } from '@/lib/cors'

interface EarningEntry {
    id: string
    type: string
    amount: number
    description: string
    createdAt: number
    source?: string
}

interface EarningsResponse {
    success: boolean
    earnings?: EarningEntry[]
    summary?: {
        ads: number
        news: number
        trivia: number
        games: number
        miniGames: number
        offerwalls: number
        surveys: number
        referrals: number
        other: number
        total: number
    }
    error?: string
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse<EarningsResponse>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    const { userId, limit = '50' } = req.query

    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing userId' })
    }

    if (!db) {
        return res.status(500).json({ success: false, error: 'Database unavailable' })
    }

    try {
        // Determine time range
        let startTime = 0;
        const period = req.query.period as string;

        if (period === 'today') {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            startTime = now.getTime();
        }

        let snapshot;
        const limitNum = parseInt(limit as string)

        // Query Strategy
        let query = db.collection('transactions').where('userId', '==', userId);

        if (startTime > 0) {
            // If period filter is active, filter by createdAt >= startTime
            query = query.where('createdAt', '>=', startTime);
        }

        // Always order by createdAt desc
        query = query.orderBy('createdAt', 'desc');

        // Apply limit only if NO period or if period is very long (safety)
        // For 'today', we want ALL transactions to sum correctly, but let's cap at 500 to be safe
        const fetchLimit = period === 'today' ? 500 : limitNum;
        query = query.limit(fetchLimit);

        try {
            snapshot = await query.get();
        } catch (indexError: any) {
            // Fallback for missing index
            console.warn('Firestore index issue, falling back:', indexError.message)
            // Simple fallback without complex ordering if index fails
            snapshot = await db.collection('transactions')
                .where('userId', '==', userId)
                .limit(fetchLimit)
                .get();
            // We will filter/sort in memory below
        }

        const earnings: EarningEntry[] = []
        const summary = {
            ads: 0,
            news: 0,
            trivia: 0,
            games: 0,
            miniGames: 0,
            offerwalls: 0,
            surveys: 0,
            referrals: 0,
            other: 0,
            total: 0,
        }

        snapshot.forEach((doc) => {
            const data = doc.data()
            const amount = data.amount || 0
            const createdAt = data.createdAt || 0;

            // Memory filter for fallback or safety
            if (startTime > 0 && createdAt < startTime) return;

            // Only include credit transactions (positive amounts)
            if (amount > 0) {
                // Determine description
                let description = data.description;
                if (!description || description === 'Earned points') {
                    description = generateDescription(data.type, data.source, data.metadata);
                }

                earnings.push({
                    id: doc.id,
                    type: data.type || 'unknown',
                    amount,
                    description,
                    createdAt: data.createdAt || Date.now(),
                    source: data.source || data.provider,
                })

                // Add to summary
                summary.total += amount

                // Determine category based on type OR source
                const category = (data.source || data.type || '').toLowerCase()

                if (['ad_reward', 'ad_watch', 'ad'].some(k => category.includes(k))) {
                    summary.ads += amount
                } else if (['news_reward', 'news_read', 'news'].some(k => category.includes(k))) {
                    summary.news += amount
                } else if (['trivia_reward', 'trivia_complete', 'trivia'].some(k => category.includes(k))) {
                    summary.trivia += amount
                } else if (['game_reward', 'game'].some(k => category.includes(k)) && !category.includes('mini')) {
                    summary.games += amount
                } else if (['mini_game', 'mini_game_reward'].some(k => category.includes(k))) {
                    summary.miniGames += amount
                } else if (['offerwall', 'offer_complete', 'offer'].some(k => category.includes(k))) {
                    summary.offerwalls += amount
                } else if (['survey', 'survey_complete'].some(k => category.includes(k))) {
                    summary.surveys += amount
                } else if (['referral', 'referral_bonus'].some(k => category.includes(k))) {
                    summary.referrals += amount
                } else {
                    summary.other += amount
                }
            }
        })

        // Sort by createdAt descending and limit (in case fallback was used)
        earnings.sort((a, b) => b.createdAt - a.createdAt)
        const limitedEarnings = earnings.slice(0, limitNum)

        return res.status(200).json({
            success: true,
            earnings: limitedEarnings,
            summary,
        })
    } catch (error: any) {
        console.error('Failed to fetch earnings:', error.message, error.code)
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch earnings',
        })
    }
}

function generateDescription(type: string, source?: string, metadata?: any): string {
    // 1. Check for explicit provider in metadata
    const provider = metadata?.provider || metadata?.network;
    const offerTitle = metadata?.offerTitle || metadata?.offer_name;
    const cleanSource = (source || type || '').toLowerCase();

    // 2. Offerwalls & Surveys
    if (cleanSource.includes('offerwall') || cleanSource.includes('offer')) {
        if (offerTitle) return `Offer: ${offerTitle}`;
        if (provider) return `${provider} Offer Completed`;
        return 'Offerwall Task Completed';
    }

    if (cleanSource.includes('survey')) {
        if (provider) return `${provider} Survey Completed`;
        return 'Survey Completed';
    }

    // 3. Fallback for other types
    switch (type) {
        case 'ad_reward':
        case 'ad_watch':
            return 'Watched an Ad'
        case 'news_reward':
        case 'news_read':
            return 'Read News Article'
        case 'trivia_reward':
        case 'trivia_complete':
            return 'Daily Trivia Reward'
        case 'game_reward':
            return 'Game Win Reward'
        case 'mini_game_reward':
            return 'Mini-Game Practice'
        case 'referral':
        case 'referral_bonus':
            return 'Referral Bonus'
        case 'withdrawal_refund':
            return 'Refund: Withdrawal Rejected'
        default:
            return 'Points Earned'
    }
}

export default allowCors(handler)

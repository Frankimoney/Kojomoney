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
        // Fetch transactions from the transactions collection
        const snapshot = await db
            .collection('transactions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit as string))
            .get()

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

            // Only include credit transactions (positive amounts)
            if (amount > 0) {
                earnings.push({
                    id: doc.id,
                    type: data.type || 'unknown',
                    amount,
                    description: data.description || getDefaultDescription(data.type),
                    createdAt: data.createdAt || Date.now(),
                    source: data.source || data.provider,
                })

                // Add to summary
                summary.total += amount
                switch (data.type) {
                    case 'ad_reward':
                    case 'ad_watch':
                        summary.ads += amount
                        break
                    case 'news_reward':
                    case 'news_read':
                        summary.news += amount
                        break
                    case 'trivia_reward':
                    case 'trivia_complete':
                        summary.trivia += amount
                        break
                    case 'game_reward':
                        summary.games += amount
                        break
                    case 'mini_game_reward':
                        summary.miniGames += amount
                        break
                    case 'offerwall':
                    case 'offer_complete':
                        summary.offerwalls += amount
                        break
                    case 'survey':
                    case 'survey_complete':
                        summary.surveys += amount
                        break
                    case 'referral':
                    case 'referral_bonus':
                        summary.referrals += amount
                        break
                    default:
                        summary.other += amount
                }
            }
        })

        return res.status(200).json({
            success: true,
            earnings,
            summary,
        })
    } catch (error) {
        console.error('Failed to fetch earnings:', error)
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch earnings',
        })
    }
}

function getDefaultDescription(type: string): string {
    switch (type) {
        case 'ad_reward':
        case 'ad_watch':
            return 'Watched an ad'
        case 'news_reward':
        case 'news_read':
            return 'Read a news article'
        case 'trivia_reward':
        case 'trivia_complete':
            return 'Completed trivia'
        case 'game_reward':
            return 'Game reward'
        case 'mini_game_reward':
            return 'Practice game reward'
        case 'offerwall':
        case 'offer_complete':
            return 'Completed an offer'
        case 'survey':
        case 'survey_complete':
            return 'Completed a survey'
        case 'referral':
        case 'referral_bonus':
            return 'Referral bonus'
        default:
            return 'Earned points'
    }
}

export default allowCors(handler)

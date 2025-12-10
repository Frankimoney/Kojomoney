/**
 * Survey Walls API Endpoint
 * 
 * Returns SURVEY URLs only (paid surveys, market research)
 * For offerwalls (games/apps), use /api/offerwalls endpoint
 * 
 * GET /api/surveywalls?userId=X - Get survey wall URLs for embedding
 * GET /api/surveywalls?userId=X&fetch=true - Fetch surveys from external APIs
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import {
    WannadsProvider,
    AdgateProvider,
    MonlixProvider,
    AFRICA_PROVIDER_INFO,
    getSurveyWallUrls
} from '@/services/providers/africaProviders'
import { Offer } from '@/lib/db-schema'

export const dynamic = 'force-dynamic'

// Provider instances (lazy initialized)
let wannadsProvider: WannadsProvider | null = null
let adgateProvider: AdgateProvider | null = null
let monlixProvider: MonlixProvider | null = null

async function getProviders() {
    if (!wannadsProvider && process.env.WANNADS_APP_ID) {
        wannadsProvider = new WannadsProvider()
        try {
            await wannadsProvider.initialize({
                appId: process.env.WANNADS_APP_ID,
                apiKey: process.env.WANNADS_API_KEY,
                apiSecret: process.env.WANNADS_SECRET_KEY,
            })
        } catch (e) {
            console.warn('[Surveys] Wannads init failed:', e)
            wannadsProvider = null
        }
    }

    if (!adgateProvider && process.env.ADGATE_APP_ID) {
        adgateProvider = new AdgateProvider()
        try {
            await adgateProvider.initialize({
                appId: process.env.ADGATE_APP_ID,
                apiKey: process.env.ADGATE_API_KEY,
                apiSecret: process.env.ADGATE_SECRET_KEY,
            })
        } catch (e) {
            console.warn('[Surveys] Adgate init failed:', e)
            adgateProvider = null
        }
    }

    if (!monlixProvider && process.env.MONLIX_APP_ID) {
        monlixProvider = new MonlixProvider()
        try {
            await monlixProvider.initialize({
                appId: process.env.MONLIX_APP_ID,
                apiKey: process.env.MONLIX_API_KEY,
                apiSecret: process.env.MONLIX_SECRET_KEY,
            })
        } catch (e) {
            console.warn('[Surveys] Monlix init failed:', e)
            monlixProvider = null
        }
    }

    return { wannadsProvider, adgateProvider, monlixProvider }
}

interface SurveyWallItem {
    provider: string
    name: string
    description: string
    color: string
    types: readonly string[]
    bestFor: string
    url: string | null
    available: boolean
    message?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { userId, provider, fetch: shouldFetch, country } = req.query
        const userIdStr = Array.isArray(userId) ? userId[0] : userId
        const providerStr = Array.isArray(provider) ? provider[0] : provider
        const countryStr = Array.isArray(country) ? country[0] : country || 'NG'

        if (!userIdStr) {
            return res.status(400).json({ error: 'Missing userId parameter' })
        }

        const providers = await getProviders()

        // Return SURVEY WALL URLs (NOT offerwalls - those are in /api/offerwalls)
        if (!shouldFetch) {
            const surveyWalls: SurveyWallItem[] = []

            // Wannads Survey Wall
            if (process.env.WANNADS_API_KEY) {
                surveyWalls.push({
                    provider: 'Wannads',
                    name: `${AFRICA_PROVIDER_INFO.Wannads.name} Surveys`,
                    description: 'High-paying market research surveys',
                    color: AFRICA_PROVIDER_INFO.Wannads.color,
                    types: AFRICA_PROVIDER_INFO.Wannads.survey_types,
                    bestFor: AFRICA_PROVIDER_INFO.Wannads.best_for_surveys,
                    url: `https://earn.wannads.com/survey-wall?apiKey=${process.env.WANNADS_API_KEY}&userId=${userIdStr}`,
                    available: true,
                })
            }

            // Adgate Media Survey Wall
            if (process.env.ADGATE_APP_ID) {
                surveyWalls.push({
                    provider: 'Adgate',
                    name: `${AFRICA_PROVIDER_INFO.Adgate.name} Surveys`,
                    description: 'Quick and easy surveys',
                    color: AFRICA_PROVIDER_INFO.Adgate.color,
                    types: AFRICA_PROVIDER_INFO.Adgate.survey_types,
                    bestFor: AFRICA_PROVIDER_INFO.Adgate.best_for_surveys,
                    url: `https://wall.adgaterewards.com/oEy${process.env.ADGATE_APP_ID}/${process.env.ADGATE_APP_ID}?s1=${userIdStr}&category=survey`,
                    available: true,
                })
            }

            // Monlix Survey Wall
            if (process.env.MONLIX_APP_ID) {
                surveyWalls.push({
                    provider: 'Monlix',
                    name: `${AFRICA_PROVIDER_INFO.Monlix.name} Surveys`,
                    description: 'High volume survey opportunities',
                    color: AFRICA_PROVIDER_INFO.Monlix.color,
                    types: AFRICA_PROVIDER_INFO.Monlix.survey_types,
                    bestFor: AFRICA_PROVIDER_INFO.Monlix.best_for_surveys,
                    url: `https://offers.monlix.com/?appid=${process.env.MONLIX_APP_ID}&userid=${userIdStr}&type=surveys`,
                    available: true,
                })
            }

            // If no providers configured, return placeholders
            if (surveyWalls.length === 0) {
                return res.status(200).json({
                    surveyWalls: [
                        {
                            provider: 'Wannads',
                            name: 'Wannads Surveys',
                            description: 'High-paying market research surveys',
                            color: '#6366f1',
                            types: ['Survey'],
                            bestFor: 'High-paying surveys',
                            url: null,
                            available: false,
                            message: 'Configure WANNADS_API_KEY in .env.local',
                        },
                        {
                            provider: 'Adgate',
                            name: 'Adgate Surveys',
                            description: 'Quick and easy paid surveys',
                            color: '#10b981',
                            types: ['Survey'],
                            bestFor: 'Quick surveys',
                            url: null,
                            available: false,
                            message: 'Configure ADGATE_APP_ID in .env.local',
                        },
                        {
                            provider: 'Monlix',
                            name: 'Monlix Surveys',
                            description: 'Global survey opportunities',
                            color: '#f59e0b',
                            types: ['Survey'],
                            bestFor: 'High volume surveys',
                            url: null,
                            available: false,
                            message: 'Configure MONLIX_APP_ID in .env.local',
                        },
                    ],
                    configured: false,
                    message: 'No survey providers configured. Add API keys to .env.local',
                    note: 'These are SURVEYS only. For offerwalls (games/apps), use /api/offerwalls endpoint.',
                })
            }

            return res.status(200).json({
                surveyWalls,
                configured: true,
                userId: userIdStr,
                note: 'These are SURVEYS only. For offerwalls (games/apps), use /api/offerwalls endpoint.',
            })
        }

        // Fetch SURVEYS from API (NOT offers)
        const allSurveys: Offer[] = []

        if (!providerStr || providerStr === 'Wannads') {
            if (providers.wannadsProvider) {
                try {
                    // fetchSurveys only returns surveys, NOT games/apps
                    const surveys = await providers.wannadsProvider.fetchSurveys(userIdStr, { country: countryStr })
                    allSurveys.push(...surveys)
                } catch (e) {
                    console.error('[Surveys] Wannads fetch error:', e)
                }
            }
        }

        if (!providerStr || providerStr === 'Adgate') {
            if (providers.adgateProvider) {
                try {
                    const surveys = await providers.adgateProvider.fetchSurveys(userIdStr, { country: countryStr })
                    allSurveys.push(...surveys)
                } catch (e) {
                    console.error('[Surveys] Adgate fetch error:', e)
                }
            }
        }

        if (!providerStr || providerStr === 'Monlix') {
            if (providers.monlixProvider) {
                try {
                    const surveys = await providers.monlixProvider.fetchSurveys(userIdStr, { country: countryStr })
                    allSurveys.push(...surveys)
                } catch (e) {
                    console.error('[Surveys] Monlix fetch error:', e)
                }
            }
        }

        // Sort by payout (highest first)
        allSurveys.sort((a, b) => b.payout - a.payout)

        return res.status(200).json({
            surveys: allSurveys,
            total: allSurveys.length,
            providers: {
                wannads: !!providers.wannadsProvider,
                adgate: !!providers.adgateProvider,
                monlix: !!providers.monlixProvider,
            },
            note: 'These are SURVEYS only. For offerwalls (games/apps), use /api/offerwalls endpoint.',
        })

    } catch (error) {
        console.error('[Surveys] Error:', error)
        return res.status(500).json({ error: 'Failed to fetch survey walls' })
    }
}

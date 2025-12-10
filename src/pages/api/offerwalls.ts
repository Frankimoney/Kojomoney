/**
 * External Offerwall API Endpoint
 * 
 * Returns OFFERWALL URLs only (games, apps, installs)
 * For surveys, use /api/surveys endpoint
 * 
 * GET /api/offerwalls?userId=X - Get offerwall URLs for embedding
 * GET /api/offerwalls?userId=X&fetch=true - Fetch offers from external APIs
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import {
    WannadsProvider,
    AdgateProvider,
    MonlixProvider,
    AFRICA_PROVIDER_INFO,
    getOfferwallUrls
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
            console.warn('[Offerwalls] Wannads init failed:', e)
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
            console.warn('[Offerwalls] Adgate init failed:', e)
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
            console.warn('[Offerwalls] Monlix init failed:', e)
            monlixProvider = null
        }
    }

    return { wannadsProvider, adgateProvider, monlixProvider }
}

interface OfferwallItem {
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

        // Return OFFERWALL URLs (NOT surveys - those are in /api/surveys)
        if (!shouldFetch) {
            const offerwalls: OfferwallItem[] = []

            // Wannads Offerwall (games, apps - NO surveys)
            if (process.env.WANNADS_API_KEY) {
                offerwalls.push({
                    provider: 'Wannads',
                    name: AFRICA_PROVIDER_INFO.Wannads.name,
                    description: AFRICA_PROVIDER_INFO.Wannads.description,
                    color: AFRICA_PROVIDER_INFO.Wannads.color,
                    types: AFRICA_PROVIDER_INFO.Wannads.offerwall_types,
                    bestFor: AFRICA_PROVIDER_INFO.Wannads.best_for_offerwalls,
                    url: `https://earn.wannads.com/wall?apiKey=${process.env.WANNADS_API_KEY}&userId=${userIdStr}`,
                    available: true,
                })
            }

            // Adgate Media Offerwall (games, apps - NO surveys)
            if (process.env.ADGATE_APP_ID) {
                offerwalls.push({
                    provider: 'Adgate',
                    name: AFRICA_PROVIDER_INFO.Adgate.name,
                    description: AFRICA_PROVIDER_INFO.Adgate.description,
                    color: AFRICA_PROVIDER_INFO.Adgate.color,
                    types: AFRICA_PROVIDER_INFO.Adgate.offerwall_types,
                    bestFor: AFRICA_PROVIDER_INFO.Adgate.best_for_offerwalls,
                    url: `https://wall.adgaterewards.com/oEy${process.env.ADGATE_APP_ID}/${process.env.ADGATE_APP_ID}?s1=${userIdStr}`,
                    available: true,
                })
            }

            // Monlix Offerwall (campaigns/offers - NO surveys)
            if (process.env.MONLIX_APP_ID) {
                offerwalls.push({
                    provider: 'Monlix',
                    name: AFRICA_PROVIDER_INFO.Monlix.name,
                    description: AFRICA_PROVIDER_INFO.Monlix.description,
                    color: AFRICA_PROVIDER_INFO.Monlix.color,
                    types: AFRICA_PROVIDER_INFO.Monlix.offerwall_types,
                    bestFor: AFRICA_PROVIDER_INFO.Monlix.best_for_offerwalls,
                    url: `https://offers.monlix.com/?appid=${process.env.MONLIX_APP_ID}&userid=${userIdStr}&type=offers`,
                    available: true,
                })
            }

            // If no providers configured, return placeholders
            if (offerwalls.length === 0) {
                return res.status(200).json({
                    offerwalls: [
                        {
                            provider: 'Wannads',
                            name: 'Wannads',
                            description: 'Games, apps & tasks with African market coverage',
                            color: '#6366f1',
                            types: ['Game', 'Install'],
                            bestFor: 'App installs & games',
                            url: null,
                            available: false,
                            message: 'Configure WANNADS_API_KEY in .env.local',
                        },
                        {
                            provider: 'Adgate',
                            name: 'Adgate Media',
                            description: 'Play games, install apps, watch videos',
                            color: '#10b981',
                            types: ['Game', 'Install', 'Video'],
                            bestFor: 'Game offers & app installs',
                            url: null,
                            available: false,
                            message: 'Configure ADGATE_APP_ID in .env.local',
                        },
                        {
                            provider: 'Monlix',
                            name: 'Monlix',
                            description: 'Easy tasks with global reach',
                            color: '#f59e0b',
                            types: ['Install', 'Sign-up'],
                            bestFor: 'Easy tasks',
                            url: null,
                            available: false,
                            message: 'Configure MONLIX_APP_ID in .env.local',
                        },
                    ],
                    configured: false,
                    message: 'No offerwall providers configured. Add API keys to .env.local',
                    note: 'These are OFFERWALLS only. For surveys, use /api/surveys endpoint.',
                })
            }

            return res.status(200).json({
                offerwalls,
                configured: true,
                userId: userIdStr,
                note: 'These are OFFERWALLS only (games, apps). For surveys, use /api/surveys endpoint.',
            })
        }

        // Fetch OFFERS from API (NOT surveys)
        const allOffers: Offer[] = []

        if (!providerStr || providerStr === 'Wannads') {
            if (providers.wannadsProvider) {
                try {
                    // fetchOffers only returns games/apps, NOT surveys
                    const offers = await providers.wannadsProvider.fetchOffers(userIdStr, { country: countryStr })
                    allOffers.push(...offers)
                } catch (e) {
                    console.error('[Offerwalls] Wannads fetch error:', e)
                }
            }
        }

        if (!providerStr || providerStr === 'Adgate') {
            if (providers.adgateProvider) {
                try {
                    const offers = await providers.adgateProvider.fetchOffers(userIdStr, { country: countryStr })
                    allOffers.push(...offers)
                } catch (e) {
                    console.error('[Offerwalls] Adgate fetch error:', e)
                }
            }
        }

        if (!providerStr || providerStr === 'Monlix') {
            if (providers.monlixProvider) {
                try {
                    const offers = await providers.monlixProvider.fetchOffers(userIdStr, { country: countryStr })
                    allOffers.push(...offers)
                } catch (e) {
                    console.error('[Offerwalls] Monlix fetch error:', e)
                }
            }
        }

        // Sort by payout (highest first)
        allOffers.sort((a, b) => b.payout - a.payout)

        return res.status(200).json({
            offers: allOffers,
            total: allOffers.length,
            providers: {
                wannads: !!providers.wannadsProvider,
                adgate: !!providers.adgateProvider,
                monlix: !!providers.monlixProvider,
            },
            note: 'These are OFFERS only (games, apps). For surveys, use /api/surveys endpoint.',
        })

    } catch (error) {
        console.error('[Offerwalls] Error:', error)
        return res.status(500).json({ error: 'Failed to fetch offerwalls' })
    }
}

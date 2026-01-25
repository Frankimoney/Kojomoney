import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EARNING_RATES, DAILY_LIMITS, POINTS_CONFIG } from '@/lib/points-config'
import { apiCall } from '@/lib/api-client'
import { useEffect } from 'react'

// Increment this when you update earning rates to force cache invalidation
const CONFIG_VERSION = 2

interface EconomyState {
    earningRates: typeof EARNING_RATES
    dailyLimits: typeof DAILY_LIMITS
    pointsConfig: typeof POINTS_CONFIG
    isLoading: boolean
    lastFetched: number
    version: number
    fetchConfig: () => Promise<void>
}

export const useEconomyStore = create<EconomyState>()(
    persist(
        (set, get) => ({
            earningRates: EARNING_RATES,
            dailyLimits: DAILY_LIMITS,
            pointsConfig: POINTS_CONFIG,
            isLoading: false,
            lastFetched: 0,
            version: CONFIG_VERSION,

            fetchConfig: async () => {
                const now = Date.now()
                const state = get()

                // Force fetch if version changed (invalidate old cache)
                const versionChanged = state.version !== CONFIG_VERSION

                // Throttle fetches: Only fetch if > 1 minute have passed (reduced from 5)
                if (!versionChanged && now - state.lastFetched < 1 * 60 * 1000) {
                    return
                }

                set({ isLoading: true })
                try {
                    const res = await apiCall('/api/config')
                    if (res.ok) {
                        const data = await res.json()
                        set({
                            earningRates: data.earningRates || EARNING_RATES,
                            dailyLimits: data.dailyLimits || DAILY_LIMITS,
                            pointsConfig: { ...POINTS_CONFIG, ...data.pointsConfig },
                            lastFetched: now,
                            version: CONFIG_VERSION,
                        })
                    }
                } catch (error) {
                    console.error('Failed to update economy config', error)
                    // On error, still use defaults with new version
                    if (versionChanged) {
                        set({
                            earningRates: EARNING_RATES,
                            dailyLimits: DAILY_LIMITS,
                            version: CONFIG_VERSION,
                        })
                    }
                } finally {
                    set({ isLoading: false })
                }
            }
        }),
        {
            name: 'economy-storage',
            partialize: (state) => ({
                earningRates: state.earningRates,
                dailyLimits: state.dailyLimits,
                lastFetched: state.lastFetched,
                version: state.version
            }),
        }
    )
)

// Helper hook to ensure config is loaded
export const useEconomyInit = () => {
    const fetchConfig = useEconomyStore(state => state.fetchConfig)

    // Call on mount - must be in useEffect to avoid setState during render
    useEffect(() => {
        if (typeof window !== 'undefined') {
            fetchConfig()
        }
    }, [fetchConfig])
}

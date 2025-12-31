import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EARNING_RATES, DAILY_LIMITS, POINTS_CONFIG } from '@/lib/points-config'
import { apiCall } from '@/lib/api-client'

interface EconomyState {
    earningRates: typeof EARNING_RATES
    dailyLimits: typeof DAILY_LIMITS
    pointsConfig: typeof POINTS_CONFIG
    isLoading: boolean
    lastFetched: number
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

            fetchConfig: async () => {
                // Throttle fetches: Only fetch if > 5 minutes have passed
                const now = Date.now()
                if (now - get().lastFetched < 5 * 60 * 1000) {
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
                            // Ensure methods from POINTS_CONFIG are preserved if not serializable
                            // Actually pointsConfig has methods, so we only override properties if any
                            pointsConfig: { ...POINTS_CONFIG, ...data.pointsConfig },
                            lastFetched: now,
                        })
                    }
                } catch (error) {
                    console.error('Failed to update economy config', error)
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
                lastFetched: state.lastFetched
            }), // Don't persist functions in pointsConfig
        }
    )
)

// Helper hook to ensure config is loaded
export const useEconomyInit = () => {
    const fetchConfig = useEconomyStore(state => state.fetchConfig)

    // Call on mount
    if (typeof window !== 'undefined') {
        fetchConfig()
    }
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import AdService, { showBanner, hideBanner, showInterstitial, showRewarded, isAdsInitialized } from '@/services/adService'

/**
 * Hook to manage ad initialization
 * Call this once in your root component
 */
export function useAdsInitialization() {
    const [isInitialized, setIsInitialized] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            try {
                const success = await AdService.initialize()
                setIsInitialized(success)
            } catch (e: any) {
                setError(e.message || 'Failed to initialize ads')
            } finally {
                setIsLoading(false)
            }
        }
        init()

        return () => {
            AdService.cleanup()
        }
    }, [])

    return { isInitialized, isLoading, error }
}

/**
 * Hook to manage banner ads
 * Automatically shows/hides banner based on component mount
 */
export function useBannerAd(position: 'top' | 'bottom' = 'bottom', autoShow: boolean = true) {
    const [isVisible, setIsVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!autoShow || !isAdsInitialized()) return

        const show = async () => {
            setIsLoading(true)
            const success = await showBanner(position)
            setIsVisible(success)
            setIsLoading(false)
        }

        show()

        return () => {
            hideBanner()
            setIsVisible(false)
        }
    }, [position, autoShow])

    const show = useCallback(async () => {
        setIsLoading(true)
        const success = await showBanner(position)
        setIsVisible(success)
        setIsLoading(false)
        return success
    }, [position])

    const hide = useCallback(async () => {
        const success = await hideBanner()
        if (success) setIsVisible(false)
        return success
    }, [])

    return { isVisible, isLoading, show, hide }
}

/**
 * Hook to show interstitial ads
 */
export function useInterstitialAd() {
    const [isShowing, setIsShowing] = useState(false)
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        // Check readiness periodically
        const interval = setInterval(() => {
            setIsReady(AdService.isInterstitialReady())
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    const show = useCallback(async () => {
        setIsShowing(true)
        const success = await showInterstitial()
        setIsShowing(false)
        return success
    }, [])

    const preload = useCallback(async () => {
        await AdService.preloadInterstitial()
    }, [])

    return { show, preload, isReady, isShowing }
}

/**
 * Hook to show rewarded ads
 */
export function useRewardedAd() {
    const [isShowing, setIsShowing] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [lastReward, setLastReward] = useState<{ type: string; amount: number } | null>(null)

    useEffect(() => {
        // Check readiness periodically
        const interval = setInterval(() => {
            setIsReady(AdService.isRewardedReady())
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    const show = useCallback(async (): Promise<{ type: string; amount: number } | null> => {
        setIsShowing(true)
        const reward = await showRewarded()
        setLastReward(reward)
        setIsShowing(false)
        return reward
    }, [])

    const preload = useCallback(async () => {
        await AdService.preloadRewarded()
    }, [])

    return { show, preload, isReady, isShowing, lastReward }
}

/**
 * Component wrapper that shows banner ad when mounted
 */
interface BannerAdContainerProps {
    position?: 'top' | 'bottom'
    children?: React.ReactNode
}

export function BannerAdContainer({ position = 'bottom', children }: BannerAdContainerProps) {
    useBannerAd(position, true)

    return <>{children}</>
}

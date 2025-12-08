/**
 * AdService - Comprehensive AdMob Integration with Mediation Support
 * 
 * Features:
 * - Banner Ads (adaptive, standard)
 * - Interstitial Ads (full-screen between screens)
 * - Rewarded Ads (watch to earn points)
 * - Ad pre-loading for better UX
 * - Mediation support (Meta, Unity, AppLovin)
 * - Event listeners for tracking
 */

// Ad Unit IDs - Your production IDs from AdMob Console
export const AD_UNIT_IDS = {
    // Production IDs for Android
    android: {
        banner: 'ca-app-pub-1074124909116054/9946925160',
        interstitial: 'ca-app-pub-1074124909116054/1960623937',
        rewarded: 'ca-app-pub-1074124909116054/3381516810',
    },
    // Production IDs for iOS (using same IDs - create separate iOS ad units if needed)
    ios: {
        banner: 'ca-app-pub-1074124909116054/9946925160',
        interstitial: 'ca-app-pub-1074124909116054/1960623937',
        rewarded: 'ca-app-pub-1074124909116054/3381516810',
    },
    // Test IDs for development (always work, no revenue)
    test: {
        banner: 'ca-app-pub-3940256099942544/6300978111',
        interstitial: 'ca-app-pub-3940256099942544/1033173712',
        rewarded: 'ca-app-pub-3940256099942544/5224354917',
    },
}

// Configuration
export const AD_CONFIG = {
    // Set to false to use real production ads
    useTestAds: false, // PRODUCTION MODE - Real ads will show!

    // Banner refresh interval (milliseconds)
    bannerRefreshInterval: 60000, // 60 seconds

    // Minimum time between interstitial ads (milliseconds)
    interstitialCooldown: 120000, // 2 minutes

    // Maximum interstitials per session
    maxInterstitialsPerSession: 5,

    // Pre-load ads on app start
    preloadAdsOnInit: true,
}

// Types
export type AdType = 'banner' | 'interstitial' | 'rewarded'
export type BannerPosition = 'top' | 'bottom'

export interface AdEventCallback {
    onAdLoaded?: () => void
    onAdFailedToLoad?: (error: string) => void
    onAdOpened?: () => void
    onAdClosed?: () => void
    onAdRewarded?: (type: string, amount: number) => void
    onAdClicked?: () => void
}

// State
let isInitialized = false
let interstitialReady = false
let rewardedReady = false
let bannerVisible = false
let lastInterstitialTime = 0
let interstitialCount = 0
let currentPlatform: 'android' | 'ios' | 'web' = 'web'
let admobModule: any = null

/**
 * Initialize the AdMob SDK
 * Call this once when the app starts
 */
export async function initializeAds(): Promise<boolean> {
    if (isInitialized) return true

    // Check if running on native platform
    if (typeof window === 'undefined') return false

    const isNative = (window as any)?.Capacitor?.isNativePlatform?.() === true
    if (!isNative) {
        console.log('[AdService] Not a native platform, ads disabled')
        return false
    }

    // Determine platform
    const platform = (window as any)?.Capacitor?.getPlatform?.()
    currentPlatform = platform === 'ios' ? 'ios' : 'android'

    try {
        // Dynamic import for Capacitor AdMob
        admobModule = await import('@capacitor-community/admob')
        const { AdMob } = admobModule

        // Initialize with consent
        await AdMob.initialize({
            requestTrackingAuthorization: true, // iOS ATT prompt
            testingDevices: AD_CONFIG.useTestAds ? ['*'] : [], // Use all devices as test devices during development
            initializeForTesting: AD_CONFIG.useTestAds,
        })

        // Set up event listeners
        setupAdListeners()

        isInitialized = true
        console.log('[AdService] Initialized successfully')

        // Pre-load ads if configured
        if (AD_CONFIG.preloadAdsOnInit) {
            preloadInterstitial()
            preloadRewarded()
        }

        return true
    } catch (error) {
        console.error('[AdService] Initialization failed:', error)
        return false
    }
}

/**
 * Set up event listeners for ad events
 */
function setupAdListeners() {
    if (!admobModule) return

    const { AdMob } = admobModule

    // Interstitial events
    AdMob.addListener('onInterstitialAdLoaded', () => {
        interstitialReady = true
        console.log('[AdService] Interstitial loaded')
    })

    AdMob.addListener('onInterstitialAdFailedToLoad', (error: any) => {
        interstitialReady = false
        console.error('[AdService] Interstitial failed to load:', error)
    })

    AdMob.addListener('onInterstitialAdDismissed', () => {
        interstitialReady = false
        preloadInterstitial() // Pre-load next one
    })

    // Rewarded events
    AdMob.addListener('onRewardedVideoAdLoaded', () => {
        rewardedReady = true
        console.log('[AdService] Rewarded ad loaded')
    })

    AdMob.addListener('onRewardedVideoAdFailedToLoad', (error: any) => {
        rewardedReady = false
        console.error('[AdService] Rewarded ad failed to load:', error)
    })

    AdMob.addListener('onRewardedVideoAdDismissed', () => {
        rewardedReady = false
        preloadRewarded() // Pre-load next one
    })

    // Banner events
    AdMob.addListener('onBannerAdLoaded', () => {
        console.log('[AdService] Banner loaded')
    })

    AdMob.addListener('onBannerAdFailedToLoad', (error: any) => {
        console.error('[AdService] Banner failed to load:', error)
    })
}

/**
 * Get the appropriate ad unit ID
 */
function getAdUnitId(type: AdType): string {
    if (AD_CONFIG.useTestAds) {
        return AD_UNIT_IDS.test[type]
    }
    return AD_UNIT_IDS[currentPlatform][type]
}

/**
 * Show a banner ad
 */
export async function showBanner(position: BannerPosition = 'bottom'): Promise<boolean> {
    if (!isInitialized || !admobModule) {
        console.warn('[AdService] Not initialized, cannot show banner')
        return false
    }

    if (bannerVisible) {
        console.log('[AdService] Banner already visible')
        return true
    }

    try {
        const { AdMob, BannerAdPosition, BannerAdSize } = admobModule

        await AdMob.showBanner({
            adId: getAdUnitId('banner'),
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: position === 'top' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: AD_CONFIG.useTestAds,
        })

        bannerVisible = true
        console.log('[AdService] Banner shown')
        return true
    } catch (error) {
        console.error('[AdService] Failed to show banner:', error)
        return false
    }
}

/**
 * Hide the banner ad
 */
export async function hideBanner(): Promise<boolean> {
    if (!isInitialized || !admobModule || !bannerVisible) return true

    try {
        const { AdMob } = admobModule
        await AdMob.hideBanner()
        bannerVisible = false
        console.log('[AdService] Banner hidden')
        return true
    } catch (error) {
        console.error('[AdService] Failed to hide banner:', error)
        return false
    }
}

/**
 * Resume banner ad (after being hidden)
 */
export async function resumeBanner(): Promise<boolean> {
    if (!isInitialized || !admobModule) return false

    try {
        const { AdMob } = admobModule
        await AdMob.resumeBanner()
        bannerVisible = true
        return true
    } catch (error) {
        console.error('[AdService] Failed to resume banner:', error)
        return false
    }
}

/**
 * Pre-load an interstitial ad
 */
export async function preloadInterstitial(): Promise<boolean> {
    if (!isInitialized || !admobModule) return false

    try {
        const { AdMob } = admobModule
        await AdMob.prepareInterstitial({
            adId: getAdUnitId('interstitial'),
            isTesting: AD_CONFIG.useTestAds,
        })
        return true
    } catch (error) {
        console.error('[AdService] Failed to preload interstitial:', error)
        return false
    }
}

/**
 * Show an interstitial ad
 * Returns true if ad was shown, false otherwise
 */
export async function showInterstitial(): Promise<boolean> {
    if (!isInitialized || !admobModule) {
        console.warn('[AdService] Not initialized, cannot show interstitial')
        return false
    }

    // Check cooldown
    const now = Date.now()
    if (now - lastInterstitialTime < AD_CONFIG.interstitialCooldown) {
        console.log('[AdService] Interstitial on cooldown')
        return false
    }

    // Check session limit
    if (interstitialCount >= AD_CONFIG.maxInterstitialsPerSession) {
        console.log('[AdService] Max interstitials reached for session')
        return false
    }

    try {
        const { AdMob } = admobModule

        // If not pre-loaded, load now
        if (!interstitialReady) {
            await AdMob.prepareInterstitial({
                adId: getAdUnitId('interstitial'),
                isTesting: AD_CONFIG.useTestAds,
            })
        }

        await AdMob.showInterstitial()
        lastInterstitialTime = now
        interstitialCount++
        interstitialReady = false

        console.log('[AdService] Interstitial shown')
        return true
    } catch (error) {
        console.error('[AdService] Failed to show interstitial:', error)
        return false
    }
}

/**
 * Pre-load a rewarded ad
 */
export async function preloadRewarded(): Promise<boolean> {
    if (!isInitialized || !admobModule) return false

    try {
        const { AdMob } = admobModule
        await AdMob.prepareRewardedAd({
            adId: getAdUnitId('rewarded'),
            isTesting: AD_CONFIG.useTestAds,
        })
        return true
    } catch (error) {
        console.error('[AdService] Failed to preload rewarded:', error)
        return false
    }
}

/**
 * Show a rewarded ad
 * Returns a promise that resolves with the reward or null if failed/skipped
 */
export async function showRewarded(): Promise<{ type: string; amount: number } | null> {
    if (!isInitialized || !admobModule) {
        console.warn('[AdService] Not initialized, cannot show rewarded ad')
        return null
    }

    return new Promise(async (resolve) => {
        try {
            const { AdMob } = admobModule

            // Set up reward listener
            const rewardListener = AdMob.addListener('onRewardedVideoAdReward', (reward: any) => {
                console.log('[AdService] User earned reward:', reward)
                rewardListener.remove()
                resolve({ type: reward.type || 'points', amount: reward.amount || 1 })
            })

            // Set up dismiss listener (user closed without reward)
            const dismissListener = AdMob.addListener('onRewardedVideoAdDismissed', () => {
                dismissListener.remove()
                // Note: reward listener may have already resolved
            })

            // If not pre-loaded, load now
            if (!rewardedReady) {
                await AdMob.prepareRewardedAd({
                    adId: getAdUnitId('rewarded'),
                    isTesting: AD_CONFIG.useTestAds,
                })
            }

            await AdMob.showRewardedAd()
            rewardedReady = false

        } catch (error) {
            console.error('[AdService] Failed to show rewarded ad:', error)
            resolve(null)
        }
    })
}

/**
 * Check if rewarded ad is ready to show
 */
export function isRewardedReady(): boolean {
    return rewardedReady
}

/**
 * Check if interstitial ad is ready to show
 */
export function isInterstitialReady(): boolean {
    return interstitialReady
}

/**
 * Check if ads are initialized
 */
export function isAdsInitialized(): boolean {
    return isInitialized
}

/**
 * Check if banner is currently visible
 */
export function isBannerVisible(): boolean {
    return bannerVisible
}

/**
 * Get current platform
 */
export function getAdPlatform(): string {
    return currentPlatform
}

/**
 * Reset session counters (call on new session/day)
 */
export function resetSessionCounters(): void {
    interstitialCount = 0
    lastInterstitialTime = 0
}

/**
 * Clean up - call when app is being destroyed
 */
export async function cleanup(): Promise<void> {
    if (bannerVisible) {
        await hideBanner()
    }
    isInitialized = false
    interstitialReady = false
    rewardedReady = false
}

// Export default object for convenience
const AdService = {
    initialize: initializeAds,
    showBanner,
    hideBanner,
    resumeBanner,
    showInterstitial,
    preloadInterstitial,
    showRewarded,
    preloadRewarded,
    isRewardedReady,
    isInterstitialReady,
    isInitialized: isAdsInitialized,
    isBannerVisible,
    getPlatform: getAdPlatform,
    resetSession: resetSessionCounters,
    cleanup,
}

export default AdService

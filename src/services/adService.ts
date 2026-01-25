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
        rewardedInterstitial: 'ca-app-pub-1074124909116054/2618806276',
        native: 'ca-app-pub-1074124909116054/2678516028',
    },
    // Production IDs for iOS (using same IDs - create separate iOS ad units if needed)
    ios: {
        banner: 'ca-app-pub-1074124909116054/9946925160',
        interstitial: 'ca-app-pub-1074124909116054/1960623937',
        rewarded: 'ca-app-pub-1074124909116054/3381516810',
        rewardedInterstitial: 'ca-app-pub-1074124909116054/2618806276',
        native: 'ca-app-pub-1074124909116054/2678516028',
    },
    // Test IDs for development (always work, no revenue)
    test: {
        banner: 'ca-app-pub-3940256099942544/6300978111',
        interstitial: 'ca-app-pub-3940256099942544/1033173712',
        rewarded: 'ca-app-pub-3940256099942544/5224354917',
        rewardedInterstitial: 'ca-app-pub-3940256099942544/5354046379',
        native: 'ca-app-pub-3940256099942544/2247696110',
    },
}

// Configuration
export const AD_CONFIG = {
    // Set to false to use real production ads
    useTestAds: false, // PRODUCTION MODE - Real ads will show!

    // Test device IDs - These devices will show test ads for debugging
    // Add your device's advertising ID here to see test ads
    testDeviceIds: [
        'a15f0f2c-115e-4fa1-87fa-10ca1ad1abe1', // NWAJI's physical test device
    ],

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
export type AdType = 'banner' | 'interstitial' | 'rewarded' | 'rewardedInterstitial' | 'native'
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
let rewardedInterstitialReady = false
let bannerVisible = false
let lastInterstitialTime = 0
let interstitialCount = 0
let currentPlatform: 'android' | 'ios' | 'web' = 'web'
let admobModule: any = null

// Smart Ad Tracking - for showing ads only every Nth activity
let activityCounter = 0
const SMART_INTERSTITIAL_INTERVAL = 3 // Show interstitial every 3 activities
let dailyTriviaAdShown = false
let lastSmartInterstitialTime = 0
const SMART_INTERSTITIAL_COOLDOWN = 60000 // 1 minute between smart interstitials

/**
 * Initialize the AdMob SDK
 * Call this once when the app starts
 */
export async function initializeAds(): Promise<boolean> {
    console.log('[AdService] === Starting initialization ===')

    if (isInitialized) {
        console.log('[AdService] Already initialized, skipping')
        return true
    }

    // Check if running in browser
    if (typeof window === 'undefined') {
        console.log('[AdService] No window object, running on server')
        return false
    }

    // Log Capacitor status
    const capacitor = (window as any)?.Capacitor
    console.log('[AdService] Capacitor object exists:', !!capacitor)
    console.log('[AdService] Capacitor details:', JSON.stringify({
        exists: !!capacitor,
        isNativePlatform: capacitor?.isNativePlatform?.(),
        platform: capacitor?.getPlatform?.(),
    }))

    // Check if running on native platform
    const isNative = capacitor?.isNativePlatform?.() === true
    if (!isNative) {
        console.log('[AdService] Not a native platform, ads disabled')
        console.log('[AdService] Platform detected:', capacitor?.getPlatform?.() || 'unknown')
        return false
    }

    // Determine platform
    const platform = capacitor?.getPlatform?.()
    currentPlatform = platform === 'ios' ? 'ios' : 'android'
    console.log('[AdService] Running on native platform:', currentPlatform)

    try {
        // Dynamic import for Capacitor AdMob
        admobModule = await import('@capacitor-community/admob')
        const { AdMob } = admobModule

        console.log('[AdService] Initializing AdMob...')
        console.log('[AdService] Platform:', currentPlatform)
        console.log('[AdService] Test mode:', AD_CONFIG.useTestAds)
        console.log('[AdService] Test devices:', AD_CONFIG.testDeviceIds)
        console.log('[AdService] Ad Unit IDs:', AD_UNIT_IDS[currentPlatform])

        // Determine test devices - use configured test device IDs or all devices if in test mode
        const testingDevices = AD_CONFIG.useTestAds
            ? ['*'] // All devices are test devices in test mode
            : AD_CONFIG.testDeviceIds // Use specific test device IDs for debugging

        console.log('[AdService] Using test devices:', testingDevices)

        // Initialize with consent
        await AdMob.initialize({
            requestTrackingAuthorization: true, // iOS ATT prompt
            testingDevices: testingDevices,
            initializeForTesting: AD_CONFIG.useTestAds,
        })

        // Set up event listeners
        setupAdListeners()

        isInitialized = true
        console.log('[AdService] ✅ Initialized successfully with test devices:', testingDevices)

        // Pre-load ads if configured
        if (AD_CONFIG.preloadAdsOnInit) {
            preloadInterstitial()
            preloadRewarded()
        }

        return true
    } catch (error: any) {
        console.error('[AdService] ❌ Initialization failed:', error)
        console.error('[AdService] Error message:', error?.message || 'Unknown error')
        console.error('[AdService] Error code:', error?.code || 'No code')
        console.error('[AdService] Full error object:', JSON.stringify(error, null, 2))
        return false
    }
}

/**
 * Set up event listeners for ad events
 */
function setupAdListeners() {
    if (!admobModule) return

    const { AdMob, RewardAdPluginEvents, InterstitialAdPluginEvents, BannerAdPluginEvents } = admobModule

    // Helper function to decode error codes
    const decodeAdError = (error: any) => {
        const code = error?.code || error?.errorCode || 'unknown'
        const errorMessages: Record<string, string> = {
            '0': 'ERROR_CODE_INTERNAL_ERROR - Something happened internally',
            '1': 'ERROR_CODE_INVALID_REQUEST - Invalid ad request (check ad unit ID)',
            '2': 'ERROR_CODE_NETWORK_ERROR - Network error (check internet)',
            '3': 'ERROR_CODE_NO_FILL - No ad available (inventory issue, try again later)',
            '4': 'ERROR_CODE_APP_ID_MISSING - App ID missing in AndroidManifest',
        }
        return errorMessages[String(code)] || `Unknown error code: ${code}`
    }

    // Interstitial events (using v7 enum names or fallback to string)
    const interstitialLoadedEvent = InterstitialAdPluginEvents?.Loaded || 'interstitialAdLoaded'
    const interstitialFailedEvent = InterstitialAdPluginEvents?.FailedToLoad || 'interstitialAdFailedToLoad'
    const interstitialDismissedEvent = InterstitialAdPluginEvents?.Dismissed || 'interstitialAdDismissed'

    AdMob.addListener(interstitialLoadedEvent, () => {
        interstitialReady = true
        console.log('[AdService] ✅ Interstitial loaded successfully')
    })

    AdMob.addListener(interstitialFailedEvent, (error: any) => {
        interstitialReady = false
        console.error('[AdService] ❌ Interstitial failed to load')
        console.error('[AdService] Error details:', JSON.stringify(error))
        console.error('[AdService] Decoded:', decodeAdError(error))
    })

    AdMob.addListener(interstitialDismissedEvent, () => {
        interstitialReady = false
        preloadInterstitial() // Pre-load next one
    })

    // Rewarded events (using v7 enum names or fallback to string)
    const rewardLoadedEvent = RewardAdPluginEvents?.Loaded || 'rewardedVideoAdLoaded'
    const rewardFailedEvent = RewardAdPluginEvents?.FailedToLoad || 'rewardedVideoAdFailedToLoad'
    const rewardDismissedEvent = RewardAdPluginEvents?.Dismissed || 'rewardedVideoAdDismissed'

    console.log('[AdService] Setting up reward events:', { rewardLoadedEvent, rewardFailedEvent, rewardDismissedEvent })

    AdMob.addListener(rewardLoadedEvent, () => {
        rewardedReady = true
        console.log('[AdService] ✅ Rewarded ad loaded successfully')
    })

    AdMob.addListener(rewardFailedEvent, (error: any) => {
        rewardedReady = false
        console.error('[AdService] ❌ Rewarded ad failed to load')
        console.error('[AdService] Error details:', JSON.stringify(error))
        console.error('[AdService] Decoded:', decodeAdError(error))
    })

    AdMob.addListener(rewardDismissedEvent, () => {
        rewardedReady = false
        preloadRewarded() // Pre-load next one
    })

    // Banner events (using v7 enum names or fallback to string)
    const bannerLoadedEvent = BannerAdPluginEvents?.Loaded || 'bannerAdLoaded'
    const bannerFailedEvent = BannerAdPluginEvents?.FailedToLoad || 'bannerAdFailedToLoad'

    AdMob.addListener(bannerLoadedEvent, () => {
        console.log('[AdService] ✅ Banner loaded successfully')
    })

    AdMob.addListener(bannerFailedEvent, (error: any) => {
        console.error('[AdService] ❌ Banner failed to load')
        console.error('[AdService] Error details:', JSON.stringify(error))
        console.error('[AdService] Decoded:', decodeAdError(error))
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
    console.log('[AdService] showBanner called, position:', position)
    console.log('[AdService] isInitialized:', isInitialized)
    console.log('[AdService] admobModule exists:', !!admobModule)

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
        const adId = getAdUnitId('banner')

        console.log('[AdService] Showing banner with:', {
            adId,
            adSize: 'ADAPTIVE_BANNER',
            position: position === 'top' ? 'TOP_CENTER' : 'BOTTOM_CENTER',
            isTesting: AD_CONFIG.useTestAds,
        })

        await AdMob.showBanner({
            adId: adId,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: position === 'top' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: AD_CONFIG.useTestAds,
        })

        bannerVisible = true
        console.log('[AdService] ✅ Banner shown successfully')
        return true
    } catch (error: any) {
        console.error('[AdService] ❌ Failed to show banner:', error?.message || error)
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
        await AdMob.prepareRewardVideoAd({
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
            const { AdMob, RewardAdPluginEvents } = admobModule

            // Get event names (v7 enums or fallback strings)
            const rewardEvent = RewardAdPluginEvents?.Rewarded || 'onRewardedVideoAdReward'
            const dismissEvent = RewardAdPluginEvents?.Dismissed || 'onRewardedVideoAdDismissed'

            let rewarded: { type: string; amount: number } | null = null
            let resolved = false

            // Set up reward listener
            const rewardListener = AdMob.addListener(rewardEvent, (reward: any) => {
                console.log('[AdService] User earned reward:', reward)
                rewarded = { type: reward.type || 'points', amount: reward.amount || 1 }
            })

            // Set up dismiss listener - ALWAYS resolve the promise here
            const dismissListener = AdMob.addListener(dismissEvent, () => {
                console.log('[AdService] Rewarded ad dismissed, rewarded:', !!rewarded)

                // Clean up listeners
                rewardListener?.remove?.()
                dismissListener?.remove?.()

                // Resolve the promise (only once)
                if (!resolved) {
                    resolved = true
                    resolve(rewarded)
                }

                // Pre-load next ad
                preloadRewarded()
            })

            // If not pre-loaded, load now
            if (!rewardedReady) {
                console.log('[AdService] Loading rewarded ad on demand...')
                await AdMob.prepareRewardVideoAd({
                    adId: getAdUnitId('rewarded'),
                    isTesting: AD_CONFIG.useTestAds,
                })
            }

            console.log('[AdService] Showing rewarded ad...')
            await AdMob.showRewardVideoAd()
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
    activityCounter = 0
    dailyTriviaAdShown = false
    lastSmartInterstitialTime = 0
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

/**
 * Increment activity counter and show interstitial if threshold reached
 * Use this after completing activities like reading news, completing trivia, etc.
 * Shows ad every SMART_INTERSTITIAL_INTERVAL activities (default: 3)
 */
export async function showSmartInterstitial(activityType?: string): Promise<boolean> {
    if (!isInitialized || !admobModule) {
        console.log('[AdService] Not initialized, skipping smart interstitial')
        return false
    }

    // Check cooldown
    const now = Date.now()
    if (now - lastSmartInterstitialTime < SMART_INTERSTITIAL_COOLDOWN) {
        console.log('[AdService] Smart interstitial on cooldown')
        return false
    }

    // Increment counter
    activityCounter++

    // Check if we should show an ad
    if (activityCounter % SMART_INTERSTITIAL_INTERVAL !== 0) {
        console.log(`[AdService] Activity ${activityCounter}/${SMART_INTERSTITIAL_INTERVAL} - not showing ad yet`)
        return false
    }

    console.log(`[AdService] Activity ${activityCounter} - showing smart interstitial for ${activityType || 'activity'}`)

    const result = await showInterstitial()
    if (result) {
        lastSmartInterstitialTime = now
    }
    return result
}

/**
 * Show interstitial after trivia completion (once per day)
 */
export async function showTriviaCompletionInterstitial(): Promise<boolean> {
    if (dailyTriviaAdShown) {
        console.log('[AdService] Daily trivia ad already shown')
        return false
    }

    const result = await showInterstitial()
    if (result) {
        dailyTriviaAdShown = true
    }
    return result
}

/**
 * Reset the smart interstitial activity counter
 */
export function resetActivityCounter(): void {
    activityCounter = 0
}

/**
 * Get current activity count
 */
export function getActivityCount(): number {
    return activityCounter
}

// ==========================================
// REWARDED INTERSTITIAL ADS
// ==========================================

/**
 * Preload a rewarded interstitial ad
 * Use for premium placements like game completion or before withdrawal
 */
export async function preloadRewardedInterstitial(): Promise<boolean> {
    if (!isInitialized || !admobModule) return false

    try {
        const { AdMob } = admobModule

        console.log('[AdService] Preloading rewarded interstitial...')

        await AdMob.prepareRewardInterstitialAd({
            adId: getAdUnitId('rewardedInterstitial'),
            isTesting: AD_CONFIG.useTestAds,
        })

        rewardedInterstitialReady = true
        console.log('[AdService] ✅ Rewarded interstitial preloaded')
        return true
    } catch (error: any) {
        console.error('[AdService] ❌ Failed to preload rewarded interstitial:', error?.message || error)
        rewardedInterstitialReady = false
        return false
    }
}

/**
 * Show a rewarded interstitial ad
 * Returns true if user earned reward, false otherwise
 * Best for: Before withdrawals, after game completion, premium features
 */
export async function showRewardedInterstitial(): Promise<boolean> {
    if (!isInitialized || !admobModule) {
        console.warn('[AdService] Not initialized, cannot show rewarded interstitial')
        return false
    }

    try {
        const { AdMob, RewardInterstitialAdPluginEvents } = admobModule

        // Load if not ready
        if (!rewardedInterstitialReady) {
            console.log('[AdService] Loading rewarded interstitial on demand...')
            await AdMob.prepareRewardInterstitialAd({
                adId: getAdUnitId('rewardedInterstitial'),
                isTesting: AD_CONFIG.useTestAds,
            })
        }

        return new Promise<boolean>((resolve) => {
            let rewarded = false
            let resolved = false

            // Set up event listeners
            const rewardListener = AdMob.addListener(
                RewardInterstitialAdPluginEvents?.Rewarded || 'onRewardInterstitialAdRewarded',
                () => {
                    console.log('[AdService] ✅ User earned reward from rewarded interstitial')
                    rewarded = true
                }
            )

            const dismissListener = AdMob.addListener(
                RewardInterstitialAdPluginEvents?.Dismissed || 'onRewardInterstitialAdDismissed',
                () => {
                    console.log('[AdService] Rewarded interstitial dismissed, rewarded:', rewarded)
                    rewardListener?.remove?.()
                    dismissListener?.remove?.()
                    rewardedInterstitialReady = false

                    if (!resolved) {
                        resolved = true
                        resolve(rewarded)
                    }

                    // Preload next one
                    preloadRewardedInterstitial()
                }
            )

            // Show the ad
            AdMob.showRewardInterstitialAd().catch((error: any) => {
                console.error('[AdService] ❌ Failed to show rewarded interstitial:', error?.message || error)
                rewardListener?.remove?.()
                dismissListener?.remove?.()
                if (!resolved) {
                    resolved = true
                    resolve(false)
                }
            })
        })
    } catch (error: any) {
        console.error('[AdService] ❌ Failed to show rewarded interstitial:', error?.message || error)
        return false
    }
}

/**
 * Check if rewarded interstitial is ready
 */
export function isRewardedInterstitialReady(): boolean {
    return rewardedInterstitialReady
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
    // Smart interstitial functions
    showSmartInterstitial,
    showTriviaCompletionInterstitial,
    resetActivityCounter,
    getActivityCount,
    // Rewarded interstitial functions
    showRewardedInterstitial,
    preloadRewardedInterstitial,
    isRewardedInterstitialReady,
}

export default AdService

/**
 * Safe Confetti Wrapper for Android/Capacitor Compatibility
 * 
 * canvas-confetti can cause memory issues and white screens on some Android
 * WebView versions. This wrapper provides a safe fallback.
 */

// Dynamically import confetti to prevent build issues
let confettiLib: any = null

// Check if we're on a problematic Android WebView
function isProblematicDevice(): boolean {
    if (typeof window === 'undefined') return true

    // Check if it's a Capacitor native app
    const isNative = (window as any)?.Capacitor?.isNativePlatform?.() === true
    const platform = (window as any)?.Capacitor?.getPlatform?.()

    // Disable on Android to prevent white screen crashes
    if (isNative && platform === 'android') {
        return true
    }

    // Check for old Android WebView (API < 26 / Android 8)
    const ua = navigator.userAgent
    const androidMatch = ua.match(/Android\s([0-9.]+)/)
    if (androidMatch) {
        const version = parseFloat(androidMatch[1])
        if (version < 8) {
            return true // Old Android, skip confetti
        }
    }

    return false
}

async function loadConfetti(): Promise<any> {
    if (confettiLib) return confettiLib

    try {
        const module = await import('canvas-confetti')
        confettiLib = module.default
        return confettiLib
    } catch (e) {
        console.warn('[SafeConfetti] Failed to load canvas-confetti:', e)
        return null
    }
}

export interface SafeConfettiOptions {
    particleCount?: number
    spread?: number
    origin?: { x?: number; y?: number }
    colors?: string[]
    zIndex?: number
    startVelocity?: number
    decay?: number
    scalar?: number
}

/**
 * Safely trigger confetti that won't crash on Android
 */
export async function safeConfetti(options: SafeConfettiOptions = {}): Promise<void> {
    // Skip on problematic devices
    if (isProblematicDevice()) {
        console.log('[SafeConfetti] Skipping confetti on this device')
        return
    }

    try {
        const confetti = await loadConfetti()
        if (!confetti || typeof confetti !== 'function') {
            return
        }

        // Apply safe defaults
        const safeOptions = {
            zIndex: 9999,
            useWorker: false, // Disable WebWorker - causes issues on Android
            disableForReducedMotion: false,
            ...options,
            // Limit particle count for performance
            particleCount: Math.min(options.particleCount || 100, 150),
        }

        confetti(safeOptions as any)
    } catch (e) {
        console.error('[SafeConfetti] Error:', e)
        // Don't throw - just skip the confetti silently
    }
}

/**
 * Big celebration confetti burst
 */
export async function celebrationConfetti(): Promise<void> {
    if (isProblematicDevice()) return

    try {
        const confetti = await loadConfetti()
        if (!confetti || typeof confetti !== 'function') return

        const defaults = {
            origin: { y: 0.7 },
            zIndex: 9999,
            useWorker: false,
        }

        const fire = (particleRatio: number, opts: any) => {
            try {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(100 * particleRatio) // Reduced from 200
                } as any)
            } catch (e) {
                // Silent fail for individual bursts
            }
        }

        // Stagger bursts with delays
        fire(0.25, { spread: 26, startVelocity: 55 })
        setTimeout(() => fire(0.2, { spread: 60 }), 50)
        setTimeout(() => fire(0.3, { spread: 80, decay: 0.91 }), 100)

    } catch (e) {
        console.error('[SafeConfetti] Celebration error:', e)
    }
}

/**
 * Small quick confetti burst
 */
export async function quickConfetti(): Promise<void> {
    return safeConfetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.8 }
    })
}

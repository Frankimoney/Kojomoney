'use client'

/**
 * Offerwall System
 * 
 * This component displays offerwalls from approved providers:
 * - Kiwiwall (Games, Apps, Offers)
 * - CPX Research (Surveys)
 * - Timewall (Quick Tasks & Offers)
 * 
 * Features:
 * - Provider selection tabs
 * - Embedded offerwall WebViews
 * - Native app detection for proper WebView handling
 * - Fallback to external browser when needed
 */

import { useState, useEffect, useCallback } from 'react'
import { apiCall } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useBannerAd } from '@/hooks/useAds'
import {
    ArrowLeft,
    ExternalLink,
    RefreshCw,
    Gamepad2,
    ClipboardList,
    Gift,
    AlertCircle,
    CheckCircle2,
    Sparkles,
    TrendingUp,
    Globe,
    Zap,
    Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface OfferwallProvider {
    provider: string
    name: string
    description: string
    color: string
    types: string[]
    bestFor: string
    url: string | null
    available: boolean
    message?: string
}

interface AfricaOfferwallSystemProps {
    userId?: string
    onClose?: () => void
}

export default function AfricaOfferwallSystem({ userId, onClose }: AfricaOfferwallSystemProps) {
    const [offerwalls, setOfferwalls] = useState<OfferwallProvider[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
    const [isNativeApp, setIsNativeApp] = useState(false)
    const [iframeLoading, setIframeLoading] = useState(false)

    // Show banner ad at bottom
    useBannerAd('bottom', true)

    // Detect if running in native app (Capacitor)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const native = (window as any)?.Capacitor?.isNativePlatform?.() === true
            setIsNativeApp(native)
        }
    }, [])

    // Fetch offerwall configurations
    const loadOfferwalls = useCallback(async () => {
        if (!userId) return

        setIsLoading(true)
        setError(null)

        try {
            const response = await apiCall(`/api/offerwalls?userId=${encodeURIComponent(userId)}`)

            if (!response.ok) {
                throw new Error('Failed to load offerwalls')
            }

            const data = await response.json()
            setOfferwalls(data.offerwalls || [])

            // Auto-select first available provider
            const firstAvailable = (data.offerwalls || []).find((o: OfferwallProvider) => o.available)
            if (firstAvailable) {
                setSelectedProvider(firstAvailable.provider)
            }

        } catch (err) {
            console.error('Failed to load offerwalls:', err)
            setError('Failed to load offers. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    useEffect(() => {
        loadOfferwalls()
    }, [loadOfferwalls])

    // Open offerwall in external browser (for web) or in-app browser (for native)
    const openOfferwall = useCallback((url: string) => {
        if (isNativeApp) {
            // Use Capacitor Browser plugin for in-app browser
            import('@capacitor/browser').then(({ Browser }) => {
                Browser.open({ url, presentationStyle: 'popover' })
            }).catch(() => {
                // Fallback to window.open
                window.open(url, '_blank')
            })
        } else {
            // Open in new tab for web
            window.open(url, '_blank')
        }
    }, [isNativeApp])

    // Get provider icon
    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'Kiwiwall':
                return <Gamepad2 className="h-4 w-4" />
            case 'CPX':
                return <ClipboardList className="h-4 w-4" />
            case 'Timewall':
                return <Gift className="h-4 w-4" />
            default:
                return <Zap className="h-4 w-4" />
        }
    }

    // Get provider color classes
    const getProviderColorClasses = (provider: string, isSelected: boolean) => {
        const colors: Record<string, { bg: string, text: string, border: string }> = {
            'Kiwiwall': {
                bg: isSelected ? 'bg-emerald-500' : 'bg-emerald-50 dark:bg-emerald-950/50',
                text: isSelected ? 'text-white' : 'text-emerald-700 dark:text-emerald-300',
                border: 'border-emerald-200 dark:border-emerald-800',
            },
            'CPX': {
                bg: isSelected ? 'bg-teal-500' : 'bg-teal-50 dark:bg-teal-950/50',
                text: isSelected ? 'text-white' : 'text-teal-700 dark:text-teal-300',
                border: 'border-teal-200 dark:border-teal-800',
            },
            'Timewall': {
                bg: isSelected ? 'bg-indigo-500' : 'bg-indigo-50 dark:bg-indigo-950/50',
                text: isSelected ? 'text-white' : 'text-indigo-700 dark:text-indigo-300',
                border: 'border-indigo-200 dark:border-indigo-800',
            },
        }
        return colors[provider] || colors['Kiwiwall']
    }

    const selectedOfferwall = offerwalls.find(o => o.provider === selectedProvider)

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {onClose && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="h-9 w-9 -ml-2"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                            <div>
                                <h1 className="text-lg font-bold flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-purple-500" />
                                    Offerwalls & Tasks
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    Complete tasks to earn big rewards
                                </p>
                            </div>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={loadOfferwalls}
                            disabled={isLoading}
                            className="h-9 w-9"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {/* Info Banner */}
                <Card className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 text-white border-none overflow-hidden">
                    <CardContent className="p-4 relative">
                        <div className="absolute right-0 top-0 opacity-10">
                            <TrendingUp className="h-24 w-24" />
                        </div>
                        <h3 className="font-bold text-lg mb-1">Earn Big Rewards!</h3>
                        <p className="text-sm text-purple-100">
                            Complete surveys, play games, and install apps to earn points.
                            Rewards are credited automatically within 24 hours.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <Badge className="bg-white/20 text-white border-0 text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                Global Access
                            </Badge>
                            <Badge className="bg-white/20 text-white border-0 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Auto-credited
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Error State */}
                {error && (
                    <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <div className="flex-1">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={loadOfferwalls}>
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <Card key={i}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-12 w-12 rounded-xl" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-full" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Provider Selection */}
                {!isLoading && offerwalls.length > 0 && (
                    <>
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                            {offerwalls.map((offerwall) => {
                                const isSelected = selectedProvider === offerwall.provider
                                const colors = getProviderColorClasses(offerwall.provider, isSelected)

                                return (
                                    <button
                                        key={offerwall.provider}
                                        onClick={() => offerwall.available && setSelectedProvider(offerwall.provider)}
                                        disabled={!offerwall.available}
                                        className={`
                                            flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                                            transition-all whitespace-nowrap
                                            ${colors.bg} ${colors.text}
                                            ${!offerwall.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
                                            ${isSelected ? 'shadow-lg' : 'border ' + colors.border}
                                        `}
                                    >
                                        {getProviderIcon(offerwall.provider)}
                                        {offerwall.name}
                                        {!offerwall.available && (
                                            <span className="text-[10px] opacity-70">(Soon)</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Selected Provider Details */}
                        <AnimatePresence mode="wait">
                            {selectedOfferwall && (
                                <motion.div
                                    key={selectedProvider}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Card className="overflow-hidden">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        {getProviderIcon(selectedOfferwall.provider)}
                                                        {selectedOfferwall.name}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {selectedOfferwall.description}
                                                    </CardDescription>
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs"
                                                    style={{ backgroundColor: selectedOfferwall.color + '20', color: selectedOfferwall.color }}
                                                >
                                                    {selectedOfferwall.bestFor}
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {/* Types */}
                                            <div className="flex gap-2 flex-wrap">
                                                {selectedOfferwall.types.map(type => (
                                                    <Badge key={type} variant="outline" className="text-xs">
                                                        {type}
                                                    </Badge>
                                                ))}
                                            </div>

                                            {/* Not Available Message */}
                                            {!selectedOfferwall.available && selectedOfferwall.message && (
                                                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3 flex items-start gap-2">
                                                    <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                                                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                                        {selectedOfferwall.message}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Open Button */}
                                            {selectedOfferwall.available && selectedOfferwall.url && (
                                                <div className="space-y-3">
                                                    <Button
                                                        className="w-full h-12 text-base font-semibold"
                                                        style={{ backgroundColor: selectedOfferwall.color }}
                                                        onClick={() => openOfferwall(selectedOfferwall.url!)}
                                                    >
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        Open {selectedOfferwall.name}
                                                    </Button>

                                                    <p className="text-xs text-center text-muted-foreground">
                                                        Complete offers and your points will be credited automatically
                                                    </p>
                                                </div>
                                            )}

                                            {/* Embedded Iframe (for web preview) */}
                                            {selectedOfferwall.available && selectedOfferwall.url && !isNativeApp && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">Preview</span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setIframeLoading(true)}
                                                        >
                                                            <RefreshCw className={`h-3 w-3 mr-1 ${iframeLoading ? 'animate-spin' : ''}`} />
                                                            Reload
                                                        </Button>
                                                    </div>
                                                    <div className="relative rounded-lg overflow-hidden border bg-white h-[400px]">
                                                        {iframeLoading && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                                                                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <iframe
                                                            src={selectedOfferwall.url}
                                                            className="w-full h-full border-none"
                                                            title={selectedOfferwall.name}
                                                            onLoad={() => setIframeLoading(false)}
                                                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-center text-muted-foreground">
                                                        ⚠️ Some offers may require opening in a full browser for proper tracking
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Instructions */}
                        <Card className="bg-muted/50">
                            <CardContent className="p-4">
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    How It Works
                                </h4>
                                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                                    <li>Choose an offerwall provider above</li>
                                    <li>Browse available surveys, games, or app installs</li>
                                    <li>Complete the task requirements</li>
                                    <li>Points are credited to your account within 24 hours</li>
                                </ol>
                            </CardContent>
                        </Card>

                        {/* Tips */}
                        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                            <CardContent className="p-4">
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                    <Sparkles className="h-4 w-4" />
                                    Pro Tips for Maximum Earnings
                                </h4>
                                <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                                    <li>• Try surveys first - they pay quickly!</li>
                                    <li>• Game offers pay the most but take longer</li>
                                    <li>• Check all three providers for best offers</li>
                                    <li>• Complete profile surveys for higher-paying offers</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* No Providers Message */}
                {!isLoading && offerwalls.length === 0 && !error && (
                    <Card className="text-center py-10">
                        <CardContent>
                            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                            <h3 className="font-semibold text-lg">No Offerwalls Available</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Offerwalls are not configured yet. Check back soon!
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div >
    )
}

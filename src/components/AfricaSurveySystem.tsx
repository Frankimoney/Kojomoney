'use client'

/**
 * Survey System
 * 
 * This component displays SURVEYS from CPX Research:
 * - CPX Research (Premium paid surveys)
 * 
 * NOTE: This is for SURVEYS only, NOT offerwalls (games, apps).
 * For offerwalls, see OfferwallSystem.
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useBannerAd } from '@/hooks/useAds'
import {
    ArrowLeft,
    ExternalLink,
    RefreshCw,
    ClipboardList,
    AlertCircle,
    CheckCircle2,
    Sparkles,
    TrendingUp,
    Globe,
    HelpCircle,
    Info,
    DollarSign,
    Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchExternalSurveyWalls, ExternalSurveyWall } from '@/services/surveyService'

interface AfricaSurveySystemProps {
    userId?: string
    onClose?: () => void
}

export default function AfricaSurveySystem({ userId, onClose }: AfricaSurveySystemProps) {
    const [surveyWalls, setSurveyWalls] = useState<ExternalSurveyWall[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
    const [isNativeApp, setIsNativeApp] = useState(false)
    const [iframeLoading, setIframeLoading] = useState(false)


    // Detect if running in native app (Capacitor)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const native = (window as any)?.Capacitor?.isNativePlatform?.() === true
            setIsNativeApp(native)
        }
    }, [])

    // Fetch survey wall configurations
    const loadSurveyWalls = useCallback(async () => {
        if (!userId) return

        setIsLoading(true)
        setError(null)

        try {
            const data = await fetchExternalSurveyWalls(userId)
            setSurveyWalls(data.surveyWalls || [])

            // Auto-select first available provider
            const firstAvailable = (data.surveyWalls || []).find((s: ExternalSurveyWall) => s.available)
            if (firstAvailable) {
                setSelectedProvider(firstAvailable.provider)
            }

        } catch (err) {
            console.error('Failed to load survey walls:', err)
            setError('Failed to load surveys. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    useEffect(() => {
        loadSurveyWalls()
    }, [loadSurveyWalls])

    // Open survey wall in external browser (for web) or in-app browser (for native)
    const openSurveyWall = useCallback((url: string) => {
        if (isNativeApp) {
            import('@capacitor/browser').then(({ Browser }) => {
                Browser.open({ url, presentationStyle: 'popover' })
            }).catch(() => {
                window.open(url, '_blank')
            })
        } else {
            window.open(url, '_blank')
        }
    }, [isNativeApp])

    // Get provider color classes
    const getProviderColorClasses = (provider: string, isSelected: boolean) => {
        const colors: Record<string, { bg: string, text: string, border: string }> = {
            'CPX': {
                bg: isSelected ? 'bg-teal-500' : 'bg-teal-50 dark:bg-teal-950/50',
                text: isSelected ? 'text-white' : 'text-teal-700 dark:text-teal-300',
                border: 'border-teal-200 dark:border-teal-800',
            },
        }
        return colors[provider] || colors['CPX']
    }

    const selectedSurveyWall = surveyWalls.find(s => s.provider === selectedProvider)

    return (
        <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-emerald-50/50 dark:from-gray-900 dark:to-gray-950">
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
                                    <ClipboardList className="h-5 w-5 text-teal-500" />
                                    Paid Surveys
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    Complete surveys to earn big rewards
                                </p>
                            </div>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={loadSurveyWalls}
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
                <Card className="bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 text-white border-none overflow-hidden">
                    <CardContent className="p-4 relative">
                        <div className="absolute right-0 top-0 opacity-10">
                            <DollarSign className="h-24 w-24" />
                        </div>
                        <h3 className="font-bold text-lg mb-1">Earn Cash with Surveys!</h3>
                        <p className="text-sm text-teal-100">
                            Share your opinions and get paid. Surveys typically pay $0.10 - $2.00 each.
                            Higher paying surveys may take longer.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <Badge className="bg-white/20 text-white border-0 text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                Global Access
                            </Badge>
                            <Badge className="bg-white/20 text-white border-0 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                5-15 mins avg
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
                            <Button size="sm" variant="outline" onClick={loadSurveyWalls}>
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
                {!isLoading && surveyWalls.length > 0 && (
                    <>
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                            {surveyWalls.map((surveyWall) => {
                                const isSelected = selectedProvider === surveyWall.provider
                                const colors = getProviderColorClasses(surveyWall.provider, isSelected)

                                return (
                                    <button
                                        key={surveyWall.provider}
                                        onClick={() => surveyWall.available && setSelectedProvider(surveyWall.provider)}
                                        disabled={!surveyWall.available}
                                        className={`
                                            flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
                                            transition-all whitespace-nowrap
                                            ${colors.bg} ${colors.text}
                                            ${!surveyWall.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
                                            ${isSelected ? 'shadow-lg' : 'border ' + colors.border}
                                        `}
                                    >
                                        <ClipboardList className="h-4 w-4" />
                                        {surveyWall.name}
                                        {!surveyWall.available && (
                                            <span className="text-[10px] opacity-70">(Soon)</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Selected Provider Details */}
                        <AnimatePresence mode="wait">
                            {selectedSurveyWall && (
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
                                                        <ClipboardList className="h-5 w-5" />
                                                        {selectedSurveyWall.name}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {selectedSurveyWall.description}
                                                    </CardDescription>
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs"
                                                    style={{ backgroundColor: selectedSurveyWall.color + '20', color: selectedSurveyWall.color }}
                                                >
                                                    {selectedSurveyWall.bestFor}
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {/* Not Available Message */}
                                            {!selectedSurveyWall.available && selectedSurveyWall.message && (
                                                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3 flex items-start gap-2">
                                                    <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                                                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                                        {selectedSurveyWall.message}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Open Button */}
                                            {selectedSurveyWall.available && selectedSurveyWall.url && (
                                                <div className="space-y-3">
                                                    <Button
                                                        className="w-full h-12 text-base font-semibold"
                                                        style={{ backgroundColor: selectedSurveyWall.color }}
                                                        onClick={() => openSurveyWall(selectedSurveyWall.url!)}
                                                    >
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        Start Surveys
                                                    </Button>

                                                    <p className="text-xs text-center text-muted-foreground">
                                                        Complete surveys honestly - your points are credited automatically
                                                    </p>
                                                </div>
                                            )}

                                            {/* Embedded Iframe (for web preview) */}
                                            {selectedSurveyWall.available && selectedSurveyWall.url && !isNativeApp && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">Survey Wall Preview</span>
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
                                                            src={selectedSurveyWall.url}
                                                            className="w-full h-full border-none"
                                                            title={selectedSurveyWall.name}
                                                            onLoad={() => setIframeLoading(false)}
                                                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Survey Tips */}
                        <Card className="bg-muted/50">
                            <CardContent className="p-4">
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <HelpCircle className="h-4 w-4 text-teal-500" />
                                    Survey Tips for Maximum Earnings
                                </h4>
                                <ul className="text-sm text-muted-foreground space-y-1.5">
                                    <li>✓ Be honest - inconsistent answers lead to disqualification</li>
                                    <li>✓ Take your time - rushing through reduces your rating</li>
                                    <li>✓ Complete your profile - you'll match with better surveys</li>
                                    <li>✓ Check back daily - new surveys are added regularly</li>
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Expected Earnings */}
                        <Card className="border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/20">
                            <CardContent className="p-4">
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-teal-700 dark:text-teal-300">
                                    <TrendingUp className="h-4 w-4" />
                                    Expected Earnings
                                </h4>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                                        <p className="text-lg font-bold text-teal-600">$0.10</p>
                                        <p className="text-[10px] text-muted-foreground">Quick surveys (2-5 min)</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                                        <p className="text-lg font-bold text-teal-600">$0.50</p>
                                        <p className="text-[10px] text-muted-foreground">Standard (10-15 min)</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                                        <p className="text-lg font-bold text-teal-600">$2.00+</p>
                                        <p className="text-[10px] text-muted-foreground">Premium (20+ min)</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* No Providers Message */}
                {!isLoading && surveyWalls.length === 0 && !error && (
                    <Card className="text-center py-10">
                        <CardContent>
                            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                            <h3 className="font-semibold text-lg">No Survey Providers Available</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Survey providers are not configured yet. Check back soon!
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

'use client'

import { ShieldCheck, Mail, Smartphone, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface TrustBadgesProps {
    user: {
        emailVerified?: boolean
        phoneVerified?: boolean
        hasWithdrawn?: boolean
        createdAt?: any
    }
}

export default function TrustBadges({ user }: TrustBadgesProps) {
    const badges = [
        {
            id: 'email',
            label: 'Email Verified',
            icon: Mail,
            earned: !!user.emailVerified,
            description: 'Verify your email address to secure your account.'
        },
        {
            id: 'phone',
            label: 'Phone Verified',
            icon: Smartphone,
            earned: !!user.phoneVerified, // Assuming this property will exist or we mock it
            description: 'Link a phone number for withdrawal security.'
        },
        {
            id: 'cashout',
            label: 'First Cashout',
            icon: CreditCard,
            earned: !!user.hasWithdrawn, // Assuming this property or simple logic
            description: 'Complete your first successful withdrawal.'
        },
        {
            id: 'veteran',
            label: 'Member',
            icon: ShieldCheck,
            earned: true, // Everyone gets this
            description: 'Official member of the KojoMoney community.'
        }
    ]

    const earnedCount = badges.filter(b => b.earned).length
    const totalCount = badges.length

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-blue-500" />
                        Trust Score
                    </CardTitle>
                    <Badge variant={earnedCount === totalCount ? "default" : "secondary"}>
                        {earnedCount}/{totalCount} Badges
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {badges.map((badge) => (
                        <TooltipProvider key={badge.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={`
                                        flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-help
                                        ${badge.earned
                                            ? 'border-green-500/20 bg-green-500/5 dark:bg-green-500/10'
                                            : 'border-dashed border-muted bg-muted/30 opacity-70 grayscale hover:grayscale-0 hover:bg-muted/50'}
                                    `}>
                                        <div className={`
                                            h-10 w-10 rounded-full flex items-center justify-center mb-2
                                            ${badge.earned ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-800'}
                                        `}>
                                            <badge.icon className="h-5 w-5" />
                                        </div>
                                        <span className={`text-xs font-semibold text-center ${badge.earned ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {badge.label}
                                        </span>
                                        {badge.earned && (
                                            <div className="absolute top-2 right-2">
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            </div>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{badge.description}</p>
                                    {!badge.earned && <p className="text-xs text-blue-400 mt-1 font-semibold">Click to verify!</p>}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>

                {earnedCount < totalCount && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-blue-800 dark:text-blue-300">Increase your Trust Score!</p>
                            <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                                Verified users get <strong>2x faster withdrawals</strong> and access to premium surveys.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { getUserLevel } from '@/lib/levels'
import { Lock, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface UserLevelDisplayProps {
    points: number
    compact?: boolean
}

export default function UserLevelDisplay({ points, compact = false }: UserLevelDisplayProps) {
    const { current, next, progress } = getUserLevel(points)
    const CurrentIcon = current.icon

    if (compact) {
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${current.bgColor} border border-opacity-50 border-gray-300`}>
                <CurrentIcon className={`h-4 w-4 ${current.color}`} />
                <span className={`text-xs font-bold ${current.textColor}`}>{current.name}</span>
            </div>
        )
    }

    return (
        <Card className="border-none shadow-sm overflow-hidden relative">
            {/* Background gradients based on level */}
            <div className={`absolute inset-0 opacity-10 ${current.name === 'Gold' ? 'bg-yellow-500' : current.name === 'Platinum' ? 'bg-purple-500' : 'bg-gray-200'}`} />

            <CardContent className="p-4 relative">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-full ${current.bgColor} flex items-center justify-center border-2 ${current.color.replace('text-', 'border-')}`}>
                            <CurrentIcon className={`h-6 w-6 ${current.color}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">{current.name} Level</h3>
                                <Badge variant="secondary" className="text-[10px] h-5">{current.perk}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {next ? `${(next.minPoints - points).toLocaleString()} pts to ${next.name}` : 'Max Level Reached!'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                        <span>{points.toLocaleString()} pts</span>
                        <span>{next ? next.minPoints.toLocaleString() : '∞'} pts</span>
                    </div>
                    <Progress value={progress} className={`h-2.5 ${current.color.replace('text', 'bg').replace('500', '200')}`} /> {/* Simple color mapping fallback */}
                </div>

                {next && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                        <Lock className="h-3 w-3" />
                        <span>Next Perk: </span>
                        <span className="font-semibold text-primary">{next.perk}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

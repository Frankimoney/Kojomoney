import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface ContentSignalsProps {
    content: string
    title: string
    metaTitle: string
    metaDescription: string
    focusKeyword: string
    compact?: boolean
}

export default function ContentSignals({ content, title, metaTitle, metaDescription, focusKeyword, compact = false }: ContentSignalsProps) {
    // 1. Word Count & Reading Time
    const strippedContent = content.replace(/<[^>]*>/g, ' ')
    const wordCount = strippedContent.split(/\s+/).filter(w => w.length > 0).length
    const readingTime = Math.ceil(wordCount / 200) // 200 words per minute

    // 2. Keyword Density
    let keywordCount = 0
    let density = 0
    if (focusKeyword && wordCount > 0) {
        const regex = new RegExp(focusKeyword, 'gi')
        const matches = strippedContent.match(regex)
        keywordCount = matches ? matches.length : 0
        density = (keywordCount / wordCount) * 100
    }

    // 3. Checks
    const checks = [
        {
            label: 'Title Length',
            pass: title.length >= 10 && title.length <= 70,
            info: 'Titles should be between 10 and 70 characters.'
        },
        {
            label: 'Meta Description',
            pass: metaDescription.length >= 120 && metaDescription.length <= 160,
            info: 'Optimal meta description is 120-160 characters.'
        },
        {
            label: 'Focus Keyword in Title',
            pass: focusKeyword ? title.toLowerCase().includes(focusKeyword.toLowerCase()) : false,
            info: 'Include your focus keyword in the main title.'
        },
        {
            label: 'Content Length',
            pass: wordCount >= 300,
            info: 'Posts should be at least 300 words.'
        },
        {
            label: 'Keyword Density',
            pass: density >= 0.5 && density <= 2.5, // 0.5% - 2.5% recommended
            info: `Current density: ${density.toFixed(1)}%. Aim for 0.5% - 2.5%.`
        }
    ]

    const score = checks.filter(c => c.pass).length / checks.length * 100

    if (compact) {
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${score >= 80 ? 'bg-green-50 border-green-200 text-green-700' : score >= 50 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <div className={`w-2 h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-xs font-bold">{Math.round(score)}/100</span>
                <span className="text-[10px] opacity-80 border-l pl-2 border-current">{wordCount} words</span>
            </div>
        )
    }

    return (
        <Card className="border shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b px-4 py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Content Quality</CardTitle>
                    <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {Math.round(score)}/100
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm text-center">
                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                        <div className="font-bold">{wordCount}</div>
                        <div className="text-xs text-muted-foreground">Words</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                        <div className="font-bold">{readingTime} min</div>
                        <div className="text-xs text-muted-foreground">Read Time</div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span>Keyword Density</span>
                        <span>{density.toFixed(1)}% ({keywordCount})</span>
                    </div>
                    <Progress value={Math.min(density * 20, 100)} className={`h-1.5 ${density > 2.5 ? 'bg-red-100' : 'bg-slate-100'}`} />
                </div>

                <div className="space-y-2 pt-2 border-t">
                    {checks.map((check, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                {check.pass ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
                                <span>{check.label}</span>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{check.info}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BookOpen, AlertTriangle, CheckCircle } from 'lucide-react'

interface ReadabilityScoreProps {
    content: string
}

export default function ReadabilityScore({ content }: ReadabilityScoreProps) {
    // Strip HTML tags
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    if (text.length < 100) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <BookOpen className="h-4 w-4" /> Readability
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Write more content to see readability analysis.</p>
                </CardContent>
            </Card>
        )
    }

    // Calculate metrics
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const syllables = countSyllables(text)

    const avgWordsPerSentence = words.length / sentences.length
    const avgSyllablesPerWord = syllables / words.length

    // Flesch Reading Ease Score
    // 206.835 - 1.015 × (words/sentences) - 84.6 × (syllables/words)
    const fleschScore = Math.max(0, Math.min(100,
        206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    ))

    // Flesch-Kincaid Grade Level
    const gradeLevel = Math.max(0,
        (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59
    )

    // Interpretation
    let level = ''
    let color = ''
    if (fleschScore >= 60) {
        level = 'Easy to read'
        color = 'text-green-600'
    } else if (fleschScore >= 30) {
        level = 'Moderate'
        color = 'text-yellow-600'
    } else {
        level = 'Difficult'
        color = 'text-red-600'
    }

    // Issues
    const issues: string[] = []
    if (avgWordsPerSentence > 20) {
        issues.push('Some sentences are too long. Aim for 15-20 words per sentence.')
    }
    if (avgSyllablesPerWord > 1.7) {
        issues.push('Consider using simpler words with fewer syllables.')
    }

    // Long sentence detection
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 25).length
    if (longSentences > 0) {
        issues.push(`${longSentences} sentence(s) have more than 25 words.`)
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Readability
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Score */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className={`text-2xl font-bold ${color}`}>{Math.round(fleschScore)}</div>
                        <div className="text-sm text-muted-foreground">{level}</div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                        <div>Grade Level: {gradeLevel.toFixed(1)}</div>
                        <div>~{avgWordsPerSentence.toFixed(0)} words/sentence</div>
                    </div>
                </div>

                <Progress value={fleschScore} className="h-2" />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted/50 p-2 rounded">
                        <div className="font-bold">{sentences.length}</div>
                        <div className="text-muted-foreground">Sentences</div>
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                        <div className="font-bold">{words.length}</div>
                        <div className="text-muted-foreground">Words</div>
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                        <div className="font-bold">{Math.ceil(words.length / 200)}</div>
                        <div className="text-muted-foreground">Min Read</div>
                    </div>
                </div>

                {/* Issues */}
                {issues.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        {issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{issue}</span>
                            </div>
                        ))}
                    </div>
                )}

                {issues.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 pt-2 border-t">
                        <CheckCircle className="h-4 w-4" />
                        <span>Good readability!</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// Simple syllable counter
function countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/)
    let total = 0

    for (const word of words) {
        const cleaned = word.replace(/[^a-z]/g, '')
        if (cleaned.length === 0) continue

        // Count vowel groups
        const vowelGroups = cleaned.match(/[aeiouy]+/g)
        let count = vowelGroups ? vowelGroups.length : 1

        // Adjustments
        if (cleaned.endsWith('e') && count > 1) count--
        if (cleaned.endsWith('le') && cleaned.length > 2 && !/[aeiouy]/.test(cleaned[cleaned.length - 3])) count++

        total += Math.max(1, count)
    }

    return total
}

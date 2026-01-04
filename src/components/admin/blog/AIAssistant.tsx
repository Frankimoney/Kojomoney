import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import { apiJson } from '@/lib/api-client'
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

interface AIAssistantProps {
    title: string
    content: string
    onApply: (text: string) => void
    adminToken?: string
}

export default function AIAssistant({ title, content, onApply, adminToken }: AIAssistantProps) {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState('')
    const [mode, setMode] = useState('outline')
    const [error, setError] = useState('')

    const generate = async () => {
        setLoading(true)
        setResult('')
        setError('')

        try {
            const res = await apiJson<{ success: boolean, result?: string, error?: string }>('/api/admin/blog/ai-assist', {
                method: 'POST',
                headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
                body: JSON.stringify({ mode, title, content })
            })

            if (res.success && res.result) {
                setResult(res.result)
            } else {
                setError(res.error || 'Failed to generate content')
            }
        } catch (err: any) {
            console.error('AI generation error:', err)
            setError(err.message || 'Failed to connect to AI service')
        } finally {
            setLoading(false)
        }
    }

    const handleApply = () => {
        onApply(result)
        setResult('')
    }

    return (
        <Card className="border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> AI Assistant
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Tabs defaultValue="outline" onValueChange={setMode}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="outline">Outline</TabsTrigger>
                        <TabsTrigger value="rewrite">Titles</TabsTrigger>
                    </TabsList>

                    <div className="pt-4">
                        <div className="text-xs text-muted-foreground mb-4">
                            {mode === 'outline' ? 'Generates a structured outline based on your title.' : 'Suggests catchy alternatives for your title.'}
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                {error}
                            </div>
                        )}

                        {!result && (
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={generate} disabled={loading || !title}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                {mode === 'outline' ? 'Generate Outline' : 'Rewrite Title'}
                            </Button>
                        )}

                        {result && (
                            <div className="space-y-3 animation-fade-in">
                                <div className="p-3 bg-background rounded border text-sm max-h-[200px] overflow-y-auto">
                                    {mode === 'outline' ? (
                                        <div dangerouslySetInnerHTML={{ __html: result }} className="prose prose-sm" />
                                    ) : (
                                        <div className="whitespace-pre-line">{result}</div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => setResult('')}>Discard</Button>
                                    <Button className="flex-1" onClick={handleApply}>Apply</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    )
}

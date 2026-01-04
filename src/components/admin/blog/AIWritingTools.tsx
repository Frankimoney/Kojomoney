import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, Wand2, Eye, Check, X } from 'lucide-react'
import { apiJson } from '@/lib/api-client'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import { Megaphone } from 'lucide-react'

interface AIWritingToolsProps {
    adminToken: string
    currentContent: string
    onApplyContent: (content: string, title?: string) => void
}

export default function AIWritingTools({
    adminToken,
    currentContent,
    onApplyContent
}: AIWritingToolsProps) {
    // Generator state
    const [topic, setTopic] = useState('')
    const [primaryKeyword, setPrimaryKeyword] = useState('')
    const [secondaryKeywords, setSecondaryKeywords] = useState('')
    const [lsiKeywords, setLsiKeywords] = useState('')
    const [tone, setTone] = useState('professional')

    // Humanizer state
    const [persona, setPersona] = useState('casual')
    const [aggressiveness, setAggressiveness] = useState('2')

    // Shared state
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [preview, setPreview] = useState('')
    const [showPreview, setShowPreview] = useState(false)
    const [activeTab, setActiveTab] = useState('generate')

    const handleGenerate = async () => {
        if (!topic || !primaryKeyword) {
            setError('Topic and primary keyword required')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await apiJson<{ success: boolean; content?: string; error?: string }>('/api/admin/blog/ai-generate', {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({
                    topic,
                    primaryKeyword,
                    secondaryKeywords: secondaryKeywords.split(',').map(s => s.trim()).filter(Boolean),
                    lsiKeywords: lsiKeywords.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10),
                    tone
                })
            })

            if (res.success && res.content) {
                setPreview(res.content)
                setShowPreview(true)
            } else {
                setError(res.error || 'Generation failed')
            }
        } catch (err: any) {
            setError(err.message || 'Failed to generate')
        } finally {
            setLoading(false)
        }
    }

    const handleHumanize = async () => {
        if (!currentContent || currentContent.length < 100) {
            setError('Need existing content to humanize (min 100 chars)')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await apiJson<{ success: boolean; content?: string; error?: string }>('/api/admin/blog/ai-humanize', {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({
                    content: currentContent,
                    persona,
                    aggressiveness: parseInt(aggressiveness)
                })
            })

            if (res.success && res.content) {
                setPreview(res.content)
                setShowPreview(true)
            } else {
                setError(res.error || 'Humanization failed')
            }
        } catch (err: any) {
            setError(err.message || 'Failed to humanize')
        } finally {
            setLoading(false)
        }
    }

    const handleApply = () => {
        // Extract H1 if found
        let extractedTitle = ''
        const h1Match = preview.match(/<h1>(.*?)<\/h1>/i)
        if (h1Match && h1Match[1]) {
            extractedTitle = h1Match[1]
        }

        onApplyContent(preview, extractedTitle)
        setShowPreview(false)
        setPreview('')
        // Reset form
        setTopic('')
        setPrimaryKeyword('')
        setSecondaryKeywords('')
        setLsiKeywords('')
    }

    return (
        <>
            <Card className="border-purple-100 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-900/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                        <Wand2 className="h-4 w-4" /> AI Writing Tools
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="generate">Generate Draft</TabsTrigger>
                            <TabsTrigger value="humanize">Improve Flow</TabsTrigger>
                        </TabsList>

                        {error && (
                            <div className="text-sm text-red-500 mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                {error}
                            </div>
                        )}

                        <TabsContent value="generate" className="space-y-3">
                            <div className="space-y-2">
                                <Label className="text-xs">Topic</Label>
                                <Input
                                    placeholder="e.g., How to earn money online in Nigeria"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Primary Keyword</Label>
                                <Input
                                    placeholder="e.g., earn money online"
                                    value={primaryKeyword}
                                    onChange={(e) => setPrimaryKeyword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Secondary Keywords (comma separated)</Label>
                                <Input
                                    placeholder="e.g., make money, side hustle, passive income"
                                    value={secondaryKeywords}
                                    onChange={(e) => setSecondaryKeywords(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">LSI Keywords (optional, max 10)</Label>
                                <Textarea
                                    placeholder="e.g., online jobs, work from home, digital income, freelancing"
                                    value={lsiKeywords}
                                    onChange={(e) => setLsiKeywords(e.target.value)}
                                    className="min-h-[60px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Context keywords used naturally in body text only
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Tone</Label>
                                <Select value={tone} onValueChange={setTone}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="casual">Casual</SelectItem>
                                        <SelectItem value="educational">Educational</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                onClick={handleGenerate}
                                disabled={loading || !topic || !primaryKeyword}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                Generate Draft
                            </Button>
                        </TabsContent>

                        <TabsContent value="humanize" className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Current Content to Rewrite (Paste here if empty)</Label>
                                <Textarea
                                    value={currentContent}
                                    onChange={(e) => { /* Read only usually, but maybe editable? Logic needed */ }}
                                    className="h-48"
                                    placeholder="Select text in editor to populate this..."
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Rewrites your content to sound more human and pass AI detection.
                            </p>
                            <div className="space-y-2">
                                <Label className="text-xs">Writing Persona</Label>
                                <Select value={persona} onValueChange={setPersona}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="skeptical">Skeptical Journalist</SelectItem>
                                        <SelectItem value="casual">Casual Expert</SelectItem>
                                        <SelectItem value="technical">Technical Writer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Rewrite Intensity</Label>
                                <Select value={aggressiveness} onValueChange={setAggressiveness}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Light (Minor tweaks)</SelectItem>
                                        <SelectItem value="2">Medium (Better flow)</SelectItem>
                                        <SelectItem value="3">Strong (Major rewrite)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                onClick={handleHumanize}
                                disabled={loading || !currentContent}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                                Improve Flow
                            </Button>
                            {!currentContent && (
                                <p className="text-xs text-muted-foreground text-center">
                                    Write some content first to humanize
                                </p>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" /> Preview Generated Content
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/30">
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: preview }}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowPreview(false)}>
                            <X className="h-4 w-4 mr-2" /> Discard
                        </Button>
                        <Button onClick={handleApply}>
                            <Check className="h-4 w-4 mr-2" /> Apply to Editor
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

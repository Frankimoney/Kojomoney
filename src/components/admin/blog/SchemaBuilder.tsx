import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, HelpCircle, Wand2, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { apiJson } from '@/lib/api-client'

interface FAQItem {
    question: string
    answer: string
}

interface SchemaBuilderProps {
    value: FAQItem[]
    onChange: (items: FAQItem[]) => void
    title?: string
    content?: string
    adminToken?: string
}

export default function SchemaBuilder({ value = [], onChange, title, content, adminToken }: SchemaBuilderProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [generating, setGenerating] = useState(false)

    const handleAdd = () => {
        onChange([...value, { question: '', answer: '' }])
    }

    const handleChange = (index: number, field: keyof FAQItem, text: string) => {
        const newValue = [...value]
        newValue[index] = { ...newValue[index], [field]: text }
        onChange(newValue)
    }

    const handleRemove = (index: number) => {
        onChange(value.filter((_, i) => i !== index))
    }

    const handleGenerate = async () => {
        if (!title || !content || !adminToken) {
            alert('Need title and content to generate FAQs')
            return
        }

        setGenerating(true)
        try {
            const res = await apiJson<{ success: boolean; data?: FAQItem[]; error?: string }>('/api/admin/blog/ai-faq', {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ title, content })
            })

            if (res.success && res.data) {
                // Append to existing FAQs
                onChange([...value, ...res.data])
            } else {
                alert(res.error || 'Failed to generate FAQs')
            }
        } catch (error) {
            console.error('FAQ generation error:', error)
            alert('Failed to generate FAQs')
        } finally {
            setGenerating(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 justify-start mb-4">
                    <HelpCircle className="h-4 w-4" />
                    Manage FAQ Schema ({value?.length || 0})
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>FAQ Schema Builder</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Add Frequently Asked Questions to Generate "Rich Snippets" in Search Results.
                        </p>
                        {adminToken && title && content && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGenerate}
                                disabled={generating}
                                className="gap-1 shrink-0"
                            >
                                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                                AI Generate
                            </Button>
                        )}
                    </div>

                    {value?.map((item, index) => (
                        <Card key={index}>
                            <CardContent className="pt-6 space-y-3 relative">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2 text-destructive"
                                    onClick={() => handleRemove(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Question</label>
                                    <Input
                                        placeholder="e.g., How do I earn money?"
                                        value={item.question}
                                        onChange={(e) => handleChange(index, 'question', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Answer</label>
                                    <Textarea
                                        placeholder="Short answer..."
                                        value={item.answer}
                                        onChange={(e) => handleChange(index, 'answer', e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Button onClick={handleAdd} className="w-full" variant="secondary">
                        <Plus className="h-4 w-4 mr-2" /> Add Question
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

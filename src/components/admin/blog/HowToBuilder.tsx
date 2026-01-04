import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, ListOrdered, Wand2, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { apiJson } from '@/lib/api-client'
import { HowToBlock, HowToStep } from '@/types/blog'

interface HowToBuilderProps {
    value?: HowToBlock
    onChange: (value: HowToBlock | undefined) => void
    title?: string
    content?: string
    adminToken?: string
}

export default function HowToBuilder({ value, onChange, title, content, adminToken }: HowToBuilderProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [generating, setGenerating] = useState(false)

    const [name, setName] = useState(value?.name || '')
    const [description, setDescription] = useState(value?.description || '')
    const [totalTime, setTotalTime] = useState(value?.totalTime || 'PT30M')
    const [steps, setSteps] = useState<HowToStep[]>(value?.steps || [])
    const [tools, setTools] = useState<string>(value?.tool?.join(', ') || '')
    const [supplies, setSupplies] = useState<string>(value?.supply?.join(', ') || '')

    const handleAddStep = () => {
        setSteps([...steps, { name: '', text: '' }])
    }

    const handleStepChange = (index: number, field: keyof HowToStep, text: string) => {
        const newSteps = [...steps]
        newSteps[index] = { ...newSteps[index], [field]: text }
        setSteps(newSteps)
    }

    const handleRemoveStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index))
    }

    const handleSave = () => {
        if (steps.length === 0) {
            onChange(undefined)
        } else {
            onChange({
                name: name || title || 'How To Guide',
                description: description || '',
                totalTime: totalTime || 'PT30M',
                steps,
                tool: tools.split(',').map(s => s.trim()).filter(Boolean),
                supply: supplies.split(',').map(s => s.trim()).filter(Boolean)
            })
        }
        setIsOpen(false)
    }

    const handleGenerate = async () => {
        if (!title || !content || !adminToken) {
            alert('Need title and content to generate steps')
            return
        }

        setGenerating(true)
        try {
            const res = await apiJson<{ success: boolean; data?: { steps: HowToStep[] }; error?: string }>('/api/admin/blog/ai-howto', {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ title, content })
            })

            if (res.success && res.data?.steps) {
                setSteps([...steps, ...res.data.steps])
                if (!name) setName(title)
            } else {
                alert(res.error || 'Failed to generate steps')
            }
        } catch (error) {
            console.error('HowTo generation error:', error)
            alert('Failed to generate steps')
        } finally {
            setGenerating(false)
        }
    }

    const stepCount = value?.steps?.length || 0

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 justify-start mb-4">
                    <ListOrdered className="h-4 w-4" />
                    Manage HowTo Schema ({stepCount} steps)
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>HowTo Schema Builder</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Create step-by-step instructions for "How To" rich snippets in Google.
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

                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Name</label>
                            <Input
                                placeholder="e.g., How to Earn Points on KojoMoney"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Total Time (ISO 8601)</label>
                            <Input
                                placeholder="e.g., PT30M (30 min) or PT1H (1 hour)"
                                value={totalTime}
                                onChange={(e) => setTotalTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
                        <Textarea
                            placeholder="Brief description of what this guide teaches..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Tools (comma separated)</label>
                            <Input
                                placeholder="e.g., Smartphone, Internet connection"
                                value={tools}
                                onChange={(e) => setTools(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Supplies (comma separated)</label>
                            <Input
                                placeholder="e.g., KojoMoney account"
                                value={supplies}
                                onChange={(e) => setSupplies(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Steps</h3>
                        {steps.map((step, index) => (
                            <Card key={index} className="mb-3">
                                <CardContent className="pt-4 space-y-3 relative">
                                    <div className="absolute top-2 left-4 text-xs font-bold text-muted-foreground">
                                        Step {index + 1}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-2 right-2 text-destructive"
                                        onClick={() => handleRemoveStep(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>

                                    <div className="space-y-1 pt-4">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Step Title</label>
                                        <Input
                                            placeholder="e.g., Download the KojoMoney app"
                                            value={step.name}
                                            onChange={(e) => handleStepChange(index, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Instructions</label>
                                        <Textarea
                                            placeholder="Detailed instructions for this step..."
                                            value={step.text}
                                            onChange={(e) => handleStepChange(index, 'text', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Image URL (optional)</label>
                                        <Input
                                            placeholder="https://..."
                                            value={step.image || ''}
                                            onChange={(e) => handleStepChange(index, 'image', e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        <Button onClick={handleAddStep} className="w-full" variant="secondary">
                            <Plus className="h-4 w-4 mr-2" /> Add Step
                        </Button>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save HowTo Schema</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

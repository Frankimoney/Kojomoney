import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'
import { apiJson } from '@/lib/api-client'

interface BlogSettingsProps {
    adminToken: string
}

export default function BlogSettings({ adminToken }: BlogSettingsProps) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [gaId, setGaId] = useState('')
    const [gscCode, setGscCode] = useState('')

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setLoading(true)
        try {
            const res = await apiJson<{ success: boolean, data: any }>('/api/admin/blog/settings', {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` }
            })
            if (res.success && res.data) {
                setGaId(res.data.googleAnalyticsId || '')
                setGscCode(res.data.googleSearchConsoleCode || '')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await apiJson('/api/admin/blog/settings', {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({
                    googleAnalyticsId: gaId,
                    googleSearchConsoleCode: gscCode
                })
            })
            alert('Settings saved successfully')
        } catch (error) {
            alert('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="max-w-2xl space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Analytics & Integrations</CardTitle>
                    <CardDescription>
                        Configure third-party tracking tools for your blog.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">
                            Google Analytics Measurement ID
                        </label>
                        <Input
                            value={gaId}
                            onChange={(e) => setGaId(e.target.value)}
                            placeholder="G-BX......"
                        />
                        <p className="text-[0.8rem] text-muted-foreground">
                            The G- ID from your GA4 property stream.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">
                            Google Search Console Verification
                        </label>
                        <Input
                            value={gscCode}
                            onChange={(e) => setGscCode(e.target.value)}
                            placeholder='<meta name="google-site-verification" content="..." />'
                        />
                        <p className="text-[0.8rem] text-muted-foreground">
                            Paste the full meta tag provided by GSC.
                        </p>
                    </div>

                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

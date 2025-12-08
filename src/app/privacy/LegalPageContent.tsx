'use client'

import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const LegalPages = dynamic(() => import('@/components/LegalPages'), {
    ssr: false,
    loading: () => <div className="min-h-screen flex items-center justify-center">Loading...</div>
})

interface LegalPageContentProps {
    page: 'privacy' | 'terms' | 'cookies' | 'gdpr'
}

export default function LegalPageContent({ page }: LegalPageContentProps) {
    const router = useRouter()

    return (
        <LegalPages
            initialPage={page}
            onClose={() => router.push('/')}
        />
    )
}

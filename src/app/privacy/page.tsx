import type { Metadata } from 'next'
import LegalPageContent from './LegalPageContent'

export const metadata: Metadata = {
    title: 'Privacy Policy | KojoMoney',
    description: 'KojoMoney Privacy Policy - Learn how we collect, use, and protect your personal information.',
}

export default function PrivacyPolicyPage() {
    return <LegalPageContent page="privacy" />
}

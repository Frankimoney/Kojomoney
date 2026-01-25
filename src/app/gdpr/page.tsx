import type { Metadata } from 'next'
import LegalPageContent from '../privacy/LegalPageContent'

export const metadata: Metadata = {
    title: 'GDPR & Data Rights | KojoMoney',
    description: 'KojoMoney GDPR and Data Rights - Your data protection rights and how to exercise them.',
}

export default function GDPRPage() {
    return <LegalPageContent page="gdpr" />
}

import type { Metadata } from 'next'
import LegalPageContent from '../privacy/LegalPageContent'

export const metadata: Metadata = {
    title: 'Terms of Service | KojoMoney',
    description: 'KojoMoney Terms of Service - Rules and conditions for using our platform.',
}

export default function TermsOfServicePage() {
    return <LegalPageContent page="terms" />
}

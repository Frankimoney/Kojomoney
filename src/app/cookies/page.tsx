import type { Metadata } from 'next'
import LegalPageContent from '../privacy/LegalPageContent'

export const metadata: Metadata = {
    title: 'Cookie Policy | KojoMoney',
    description: 'KojoMoney Cookie Policy - Learn about how we use cookies and similar technologies.',
}

export default function CookiePolicyPage() {
    return <LegalPageContent page="cookies" />
}

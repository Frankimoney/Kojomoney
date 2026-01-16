import type { Metadata } from 'next'
import AccountDeletionContent from './AccountDeletionContent'

export const metadata: Metadata = {
    title: 'Account Deletion | KojoMoney',
    description: 'Learn how to delete your KojoMoney account and what happens to your data. Request account deletion through the app or contact our support team.',
    openGraph: {
        title: 'Account Deletion | KojoMoney',
        description: 'Learn how to delete your KojoMoney account and what happens to your data.',
        type: 'website',
    },
}

export default function AccountDeletionPage() {
    return <AccountDeletionContent />
}

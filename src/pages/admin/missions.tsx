import AdminMissionPanel from '@/components/AdminMissionPanel'
import Head from 'next/head'

export default function AdminMissionsPage() {
    return (
        <>
            <Head>
                <title>Mission Manager - KojoMoney Admin</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <AdminMissionPanel />
        </>
    )
}

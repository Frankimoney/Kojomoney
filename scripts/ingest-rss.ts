import axios from 'axios'

async function main() {
  const ingestUrl = process.env.INGEST_URL ?? 'http://localhost:3000/api/news?action=ingest&source=rss&limit=20&points=5'
  try {
    const res = await axios.post(ingestUrl, undefined, { headers: { Authorization: 'Bearer admin-earnapp-2024' } })
    console.log('RSS ingest result:', res.data)
  } catch (err: any) {
    const msg = err?.response?.data || err?.message || err
    console.error('RSS ingest failed:', msg)
    process.exitCode = 1
  }
}

main()

import { GetServerSideProps } from 'next'
import { db } from '@/lib/firebase-admin'

const EXTERNAL_DATA_URL = 'https://kojomoney.com'

function generateSiteMap(posts: any[]) {
    return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>${EXTERNAL_DATA_URL}</loc>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     <url>
       <loc>${EXTERNAL_DATA_URL}/blog</loc>
       <changefreq>daily</changefreq>
       <priority>0.9</priority>
     </url>
     ${posts
            .map(({ slug, updatedAt }) => {
                return `
       <url>
           <loc>${`${EXTERNAL_DATA_URL}/blog/${slug}`}</loc>
           <lastmod>${new Date(updatedAt).toISOString()}</lastmod>
           <changefreq>weekly</changefreq>
           <priority>0.7</priority>
       </url>
     `
            })
            .join('')}
   </urlset>
 `
}

function SiteMap() {
    // getServerSideProps will do the heavy lifting
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
    // We make an API call to gather the URLs.
    // In production, we can query Firestore directly since this runs on server.

    // Note: db might be undefined if env vars missing in build context, handle gracefully
    let posts: any[] = []

    if (db) {
        try {
            const snapshot = await db.collection('posts')
                .where('status', '==', 'published')
                .orderBy('updatedAt', 'desc')
                .get()

            snapshot.forEach(doc => {
                posts.push(doc.data())
            })
        } catch (e) {
            console.error('Sitemap generation error:', e)
        }
    }

    const sitemap = generateSiteMap(posts)

    res.setHeader('Content-Type', 'text/xml')
    // we send the XML to the browser
    res.write(sitemap)
    res.end()

    return {
        props: {},
    }
}

export default SiteMap

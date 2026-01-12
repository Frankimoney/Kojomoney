import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel="icon" href="/logo.svg" type="image/svg+xml" />
                <link rel="icon" href="/app-icon.png" type="image/png" />
                <link rel="apple-touch-icon" href="/app-icon.png" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}

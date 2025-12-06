import type { Metadata } from "next";
import "./globals.css";
import { RootProviders } from "@/components/providers";

export const metadata: Metadata = {
    title: "KojoMoney",
    description: "KojoMoney - Earn money by reading news, watching ads, and playing trivia.",
    keywords: ["KojoMoney", "Earn Money", "News", "Trivia", "Rewards", "Next.js", "React"],
    authors: [{ name: "KojoMoney Team" }],
    icons: {
        icon: "/favicon.ico",
    },
    openGraph: {
        title: "KojoMoney",
        description: "Earn money by reading news, watching ads, and playing trivia.",
        url: "https://kojomoney.com",
        siteName: "KojoMoney",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "KojoMoney",
        description: "Earn money by reading news, watching ads, and playing trivia.",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                suppressHydrationWarning
                className={`antialiased bg-background text-foreground`}
            >
                <RootProviders>
                    {children}
                </RootProviders>
            </body>
        </html>
    );
}

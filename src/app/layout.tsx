import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

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
                className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
            >
                {children}
            </body>
        </html>
    );
}

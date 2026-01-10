import { Inter, Urbanist } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import Navbar from "@/components/navbar";
import LenisScroll from "@/components/lenis";
import FooterWrapper from "@/components/footer-wrapper";
import { Providers } from "@/components/providers";

const inter = Inter({
    variable: "--font-sans",
    subsets: ["latin"],
});

const urbanist = Urbanist({
    variable: "--font-urbanist",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "Readloom – Community Book Exchange",
        template: "%s | Readloom",
    },
    description:
        "Readloom is a community-driven book swapping platform where books find new readers and stories continue their journey. Exchange books, discover new stories, and build a reading community.",
    keywords: [
        "book exchange",
        "book swapping",
        "community reading",
        "book sharing",
        "book platform",
        "reading community",
        "book discovery",
    ],
    authors: [{ name: "Readloom" }],
    creator: "Readloom",
    applicationName: "Readloom",
    appleWebApp: {
        title: "Readloom",
        capable: true,
        statusBarStyle: "default",
    },
    openGraph: {
        title: "Readloom – Where Books Find New Readers",
        description:
            "Join Readloom, a community-driven book swapping platform. Exchange books, discover new stories, and build a reading community.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Readloom – Where Books Find New Readers",
        description:
            "A community-driven book swapping platform where books find new readers and stories continue their journey.",
    },
};
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    <LenisScroll />
                    <Navbar />
                    {children}
                    <FooterWrapper />
                </Providers>
            </body>
        </html>
    );
}

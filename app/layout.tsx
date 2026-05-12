import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "./context/authContext";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next"
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Fortis Nexus",
    description: "Fortis Nexus: Mentor-Mentee Matching System",
    icons: "./logo.png"
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <html lang="en">
                <body
                    className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                >
                    <AuthContextProvider>

                        {children}

                    </AuthContextProvider>
                    < Toaster />
                    <SpeedInsights />
                </body>
            </html>
        </>
    );
}

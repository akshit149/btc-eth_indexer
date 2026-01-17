import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ChainScope | Multi-Chain Blockchain Explorer",
  description: "Explore Bitcoin and Ethereum with real-time analytics, deep transaction insights, and enterprise-grade performance. A next-generation blockchain explorer.",
  keywords: ["blockchain", "explorer", "bitcoin", "ethereum", "crypto", "analytics", "transactions", "blocks"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <Providers>
          <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
            <Navbar />
            <main className="flex-1 relative">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}

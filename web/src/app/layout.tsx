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
  title: "ChainScope Explorer | Multi-Chain Blockchain Analytics",
  description: "Real-time blockchain explorer for Bitcoin and Ethereum. Track blocks, transactions, and addresses with a premium fintech experience.",
  keywords: ["blockchain", "explorer", "bitcoin", "ethereum", "crypto", "analytics"],
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
              {/* Subtle gradient background */}
              <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20 pointer-events-none" />
              <div className="relative z-10">
                {children}
              </div>
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}


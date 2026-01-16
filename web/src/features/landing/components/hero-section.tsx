"use client";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { GlassCard } from "@/components/ui/glass-card";
import { NetworkBackground } from "@/components/ui/network-background";
import { Bitcoin, Sparkles } from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
    btcHeight: number;
    ethHeight: number;
    btcLoading?: boolean;
    ethLoading?: boolean;
}

export function HeroSection({
    btcHeight,
    ethHeight,
    btcLoading,
    ethLoading,
}: HeroSectionProps) {
    return (
        <section className="relative min-h-[400px] flex flex-col items-center justify-center py-16 overflow-hidden">
            {/* Animated Canvas Background */}
            <NetworkBackground />

            {/* Gradient Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient Orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-btc/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-eth/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

                {/* Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center space-y-8 max-w-4xl mx-auto px-4">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-btc" />
                    <span>Real-time Multi-Chain Explorer</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                    <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                        The Blockchain,
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-btc via-eth to-eth bg-clip-text text-transparent">
                        Decoded.
                    </span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Explore Bitcoin and Ethereum with real-time analytics, deep transaction insights,
                    and enterprise-grade performance.
                </p>

                {/* Chain Orbs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                    <Link href="/block/btc/latest">
                        <GlassCard
                            variant="glow-btc"
                            className="p-6 min-w-[180px] text-center group cursor-pointer"
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-btc/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Bitcoin className="w-6 h-6 text-btc" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Bitcoin</p>
                                    {btcLoading ? (
                                        <div className="h-8 w-24 bg-muted/50 animate-pulse rounded" />
                                    ) : (
                                        <div className="text-2xl font-bold font-mono text-btc">
                                            <AnimatedNumber value={btcHeight} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    </Link>

                    <Link href="/block/eth/latest">
                        <GlassCard
                            variant="glow-eth"
                            className="p-6 min-w-[180px] text-center group cursor-pointer"
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-eth/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6 text-eth" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 1.75L5.75 12.25L12 16L18.25 12.25L12 1.75Z" opacity="0.6" />
                                        <path d="M12 16L5.75 12.25L12 22.25L18.25 12.25L12 16Z" />
                                    </svg>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Ethereum</p>
                                    {ethLoading ? (
                                        <div className="h-8 w-24 bg-muted/50 animate-pulse rounded" />
                                    ) : (
                                        <div className="text-2xl font-bold font-mono text-eth">
                                            <AnimatedNumber value={ethHeight} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    </Link>
                </div>
            </div>
        </section>
    );
}

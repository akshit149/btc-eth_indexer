"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Box, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/shared/animated-counter";

interface NetworkCardProps {
    chain: "btc" | "eth";
    height: number;
    blocksPerMin: number;
    txsPerMin: number;
    lag: number;
    className?: string;
}

export function NetworkCard({ chain, height, blocksPerMin, txsPerMin, lag, className }: NetworkCardProps) {
    const isBtc = chain === "btc";

    return (
        <Link href={`/stats/${chain}`} className="block group h-full">
            <Card className={cn(
                "relative h-full overflow-hidden transition-all duration-500 ease-out",
                "bg-card/80 backdrop-blur-xl border-border/40",
                "hover:translate-y-[-4px]",
                // Dynamic glow on hover
                isBtc
                    ? "hover:shadow-[0_20px_60px_-15px_rgba(247,147,26,0.25)] hover:border-btc/40"
                    : "hover:shadow-[0_20px_60px_-15px_rgba(98,126,234,0.25)] hover:border-eth/40",
                className
            )}>
                {/* Gradient Background Overlay */}
                <div className={cn(
                    "absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500",
                    isBtc
                        ? "bg-gradient-to-br from-btc via-transparent to-transparent"
                        : "bg-gradient-to-br from-eth via-transparent to-transparent"
                )} />

                {/* Shine Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent",
                        "translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
                    )} />
                </div>

                <CardHeader className="pb-3 relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="space-y-3">
                            {/* Network Badge */}
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border-0",
                                    isBtc
                                        ? "bg-btc/10 text-btc"
                                        : "bg-eth/10 text-eth"
                                )}
                            >
                                {isBtc ? "Bitcoin Network" : "Ethereum Network"}
                            </Badge>

                            {/* Block Height - Hero Number */}
                            <CardTitle className="flex items-baseline gap-1.5">
                                <span className="text-muted-foreground/30 text-2xl font-light">#</span>
                                <span className={cn(
                                    "text-4xl md:text-5xl font-black tracking-tight font-mono tabular-nums",
                                    isBtc ? "text-btc" : "text-eth"
                                )}>
                                    <AnimatedCounter value={height} duration={1500} />
                                </span>
                            </CardTitle>

                            <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                                Latest Indexed Block
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                            {/* Arrow Button */}
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center border transition-all duration-300",
                                isBtc
                                    ? "border-btc/20 bg-btc/5 text-btc group-hover:bg-btc group-hover:text-white group-hover:border-btc"
                                    : "border-eth/20 bg-eth/5 text-eth group-hover:bg-eth group-hover:text-white group-hover:border-eth"
                            )}>
                                <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:rotate-45" />
                            </div>

                            {/* Sync Status */}
                            {lag < 30 ? (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 px-3 py-1 rounded-full border border-green-500/20">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                    </span>
                                    Synced
                                </div>
                            ) : (
                                <Badge variant="secondary" className="text-[10px] bg-muted/50 text-muted-foreground font-mono rounded-full px-3">
                                    {lag > 3600 ? `${(lag / 3600).toFixed(1)}h lag` : lag > 60 ? `${Math.floor(lag / 60)}m lag` : `${lag}s lag`}
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="relative z-10 pt-2">
                    {/* Stats Grid - Glass Effect */}
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-background/30 backdrop-blur-sm border border-border/30">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                <Box className="h-3.5 w-3.5 opacity-60" />
                                <span>Blocks/min</span>
                            </div>
                            <div className="text-2xl font-bold font-mono tabular-nums tracking-tight">
                                {blocksPerMin.toFixed(2)}
                            </div>
                        </div>
                        <div className="space-y-1.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                <span>Txs/min</span>
                                <TrendingUp className="h-3.5 w-3.5 opacity-60" />
                            </div>
                            <div className="text-2xl font-bold font-mono tabular-nums tracking-tight">
                                {txsPerMin.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}


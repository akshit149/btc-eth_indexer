"use client";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { GlassCard } from "@/components/ui/glass-card";
import { Activity, Gauge, Layers, Zap } from "lucide-react";

interface LivePulseSectionProps {
    ethTps?: number;
    gasPrice?: number;
    mempoolCount?: number;
    syncStatus?: "synced" | "syncing" | "error";
    lagSeconds?: number;
}

export function LivePulseSection({
    ethTps = 15.2,
    gasPrice = 12,
    mempoolCount = 847,
    syncStatus = "synced",
    lagSeconds = 0,
}: LivePulseSectionProps) {
    const statusColors = {
        synced: "bg-green-500",
        syncing: "bg-yellow-500",
        error: "bg-red-500",
    };

    const statusText = {
        synced: "Synced",
        syncing: "Syncing...",
        error: "Error",
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping" />
                </div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Live Network Pulse
                </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* TPS Card */}
                <GlassCard className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">TPS</p>
                            <div className="text-2xl font-bold font-mono">
                                <AnimatedNumber value={ethTps} decimals={1} />
                            </div>
                            {/* Mini Sparkline Placeholder */}
                            <div className="flex items-end gap-[2px] h-4">
                                {[40, 60, 35, 80, 55, 90, 45, 70, 85, 50].map((h, i) => (
                                    <div
                                        key={i}
                                        className="w-1 bg-eth/60 rounded-full transition-all duration-300"
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-eth/10">
                            <Zap className="w-4 h-4 text-eth" />
                        </div>
                    </div>
                </GlassCard>

                {/* Gas Price Card */}
                <GlassCard className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Gas Price</p>
                            <div className="text-2xl font-bold font-mono">
                                <AnimatedNumber value={gasPrice} />
                                <span className="text-sm text-muted-foreground ml-1">Gwei</span>
                            </div>
                            <div className="flex items-end gap-[2px] h-4">
                                {[20, 30, 45, 35, 50, 40, 55, 45, 60, 50].map((h, i) => (
                                    <div
                                        key={i}
                                        className="w-1 bg-warning/60 rounded-full transition-all duration-300"
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-warning/10">
                            <Gauge className="w-4 h-4 text-warning" />
                        </div>
                    </div>
                </GlassCard>

                {/* Mempool Card */}
                <GlassCard className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Mempool</p>
                            <div className="text-2xl font-bold font-mono">
                                <AnimatedNumber value={mempoolCount} />
                            </div>
                            <p className="text-xs text-muted-foreground">pending txs</p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Layers className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                </GlassCard>

                {/* Sync Status Card */}
                <GlassCard className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Indexer</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${statusColors[syncStatus]} animate-pulse`} />
                                <span className="text-lg font-semibold">{statusText[syncStatus]}</span>
                            </div>
                            {lagSeconds > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    {lagSeconds}s behind
                                </p>
                            ) : (
                                <p className="text-xs text-green-500">Real-time</p>
                            )}
                        </div>
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <Activity className="w-4 h-4 text-green-500" />
                        </div>
                    </div>
                </GlassCard>
            </div>
        </section>
    );
}

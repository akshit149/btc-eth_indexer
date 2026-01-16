"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { getPendingTxs } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { useMemo } from "react";
import { formatUnits } from "ethers";

interface HeatmapDot {
    id: string;
    value: number;
    size: number;
    intensity: number;
}

export function MempoolHeatmap() {
    const { data: pendingTxs, isLoading } = useQuery({
        queryKey: ["pending-txs", "eth"],
        queryFn: () => getPendingTxs("eth"),
        refetchInterval: 3000,
    });

    const dots = useMemo(() => {
        if (!pendingTxs || pendingTxs.length === 0) return [];

        return pendingTxs.slice(0, 50).map((tx, index): HeatmapDot => {
            let value = 0;
            try {
                value = parseFloat(formatUnits(tx.Value || "0", 18));
            } catch {
                value = 0;
            }

            // Size based on value (min 4px, max 16px)
            const size = Math.min(16, Math.max(4, value * 2 + 4));

            // Intensity based on position (newer = brighter)
            const intensity = 1 - (index / 50) * 0.5;

            return {
                id: tx.TxHash,
                value,
                size,
                intensity,
            };
        });
    }, [pendingTxs]);

    const totalPending = pendingTxs?.length || 0;
    const totalValue = useMemo(() => {
        if (!pendingTxs) return 0;
        return pendingTxs.reduce((acc, tx) => {
            try {
                return acc + parseFloat(formatUnits(tx.Value || "0", 18));
            } catch {
                return acc;
            }
        }, 0);
    }, [pendingTxs]);

    if (isLoading) {
        return (
            <GlassCard className="p-6">
                <div className="h-32 flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Loading mempool...</div>
                </div>
            </GlassCard>
        );
    }

    return (
        <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-warning" />
                <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Mempool Heatmap
                </h3>
            </div>

            {/* Heatmap Grid */}
            <div className="relative h-24 overflow-hidden rounded-lg bg-black/20">
                <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 p-2">
                    {dots.map((dot, i) => (
                        <div
                            key={dot.id}
                            className="rounded-full transition-all duration-300 animate-pulse"
                            style={{
                                width: dot.size,
                                height: dot.size,
                                backgroundColor: `rgba(255, 184, 0, ${dot.intensity})`,
                                boxShadow: `0 0 ${dot.size}px rgba(255, 184, 0, ${dot.intensity * 0.5})`,
                                animationDelay: `${i * 50}ms`,
                            }}
                            title={`${dot.value.toFixed(4)} ETH`}
                        />
                    ))}
                    {dots.length === 0 && (
                        <span className="text-xs text-muted-foreground">No pending transactions</span>
                    )}
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                        <span className="font-mono font-bold text-foreground">{totalPending}</span> pending
                    </span>
                </div>
                <span className="text-muted-foreground">
                    Total: <span className="font-mono font-bold text-warning">{totalValue.toFixed(2)} ETH</span>
                </span>
            </div>
        </GlassCard>
    );
}

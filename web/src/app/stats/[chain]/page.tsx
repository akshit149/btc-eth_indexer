"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChainBadge } from "@/components/shared/badges/chain-badge";
import { getStats, getBlocksRange, getLatestBlock } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Loader2, Activity, Blocks, Clock, TrendingUp, BarChart3, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsPageProps {
    params: {
        chain: "btc" | "eth";
    };
}

function StatsPageSkeleton() {
    return (
        <div className="flex-1 space-y-8 p-6 md:p-8 pt-6">
            <div className="space-y-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-5 w-96" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-[350px] rounded-xl" />
        </div>
    );
}

export default function StatsPage({ params }: StatsPageProps) {
    const chain = params.chain === "eth" ? "eth" : "btc";
    const isBtc = chain === "btc";

    const { data: stats, isLoading } = useQuery({
        queryKey: ["stats", chain],
        queryFn: () => getStats(chain),
        refetchInterval: 5000,
    });

    const { data: latestBlock } = useQuery({
        queryKey: ["latest-block", chain],
        queryFn: () => getLatestBlock(chain),
    });

    const latestHeight = latestBlock?.Height || stats?.LatestHeight || 100;
    const { data: blockRange } = useQuery({
        queryKey: ["block-range", chain, latestHeight],
        queryFn: () => getBlocksRange(chain, Math.max(1, latestHeight - 50), latestHeight),
        enabled: latestHeight > 0,
    });

    const chartData = blockRange?.map((b: { Height: number; TxCount: number; Timestamp: string }) => ({
        height: b.Height,
        txs: b.TxCount,
        time: new Date(b.Timestamp).toLocaleTimeString(),
    })) || [];

    if (isLoading) {
        return <StatsPageSkeleton />;
    }

    const accentColor = isBtc ? "#F7931A" : "#627EEA";
    const lagStatus = (stats?.IndexerLagSeconds || 0) > 30 ? "warning" : "healthy";

    return (
        <div className="flex-1 space-y-8 p-6 md:p-8 pt-6">
            {/* Page Header */}
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-10 w-1 rounded-full",
                        isBtc ? "bg-gradient-to-b from-btc to-btc/30" : "bg-gradient-to-b from-eth to-eth/30"
                    )} />
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        Network Statistics
                        <ChainBadge chain={chain} />
                    </h1>
                </div>
                <p className="text-muted-foreground ml-5">
                    Real-time performance metrics for the {isBtc ? "Bitcoin" : "Ethereum"} indexer.
                </p>
            </div>

            {/* Stats Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Latest Height */}
                <Card className="glass-card group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Latest Height</CardTitle>
                        <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center border transition-colors",
                            isBtc ? "bg-btc/5 border-btc/20 text-btc" : "bg-eth/5 border-eth/20 text-eth"
                        )}>
                            <Blocks className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-3xl font-black font-mono tabular-nums tracking-tight",
                            isBtc ? "text-btc" : "text-eth"
                        )}>
                            {stats?.LatestHeight?.toLocaleString() || "---"}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">Indexed blocks</p>
                    </CardContent>
                </Card>

                {/* Blocks/Min */}
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Blocks/Min</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-primary/5 border border-border/50 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-primary/70" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black font-mono tabular-nums tracking-tight">
                            {stats?.BlocksLastMinute || 0}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">Last 60 seconds</p>
                    </CardContent>
                </Card>

                {/* Txs/Min */}
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Txs/Min</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-green-500/70" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black font-mono tabular-nums tracking-tight">
                            {stats?.TxsLastMinute?.toLocaleString() || 0}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">Transaction throughput</p>
                    </CardContent>
                </Card>

                {/* Indexer Lag */}
                <Card className={cn(
                    "glass-card",
                    lagStatus === "warning" && "border-yellow-500/30"
                )}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Indexer Lag</CardTitle>
                        <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center border",
                            lagStatus === "healthy"
                                ? "bg-green-500/5 border-green-500/20"
                                : "bg-yellow-500/5 border-yellow-500/20"
                        )}>
                            <Clock className={cn(
                                "h-4 w-4",
                                lagStatus === "healthy" ? "text-green-500/70" : "text-yellow-500/70"
                            )} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-3xl font-black font-mono tabular-nums tracking-tight",
                            lagStatus === "healthy" ? "text-green-500" : "text-yellow-500"
                        )}>
                            {stats?.IndexerLagSeconds || 0}s
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">Behind network</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Chart */}
            <Card className="glass-card overflow-hidden">
                <CardHeader className="border-b border-border/30 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center border",
                            isBtc ? "bg-btc/5 border-btc/20" : "bg-eth/5 border-eth/20"
                        )}>
                            <BarChart3 className={cn("h-4 w-4", isBtc ? "text-btc" : "text-eth")} />
                        </div>
                        <CardTitle className="text-lg font-semibold tracking-tight">Transactions per Block</CardTitle>
                        <span className="text-xs text-muted-foreground ml-auto">Last 50 blocks</span>
                    </div>
                </CardHeader>
                <CardContent className="h-[300px] p-4">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorTxs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={accentColor} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
                                <XAxis
                                    dataKey="height"
                                    tick={{ fontSize: 10, fill: 'hsl(220 10% 55%)' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: 'hsl(220 10% 55%)' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(220 18% 7%)',
                                        borderColor: 'hsl(220 12% 18%)',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    itemStyle={{ color: 'hsl(0 0% 95%)' }}
                                    labelStyle={{ color: 'hsl(220 10% 55%)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="txs"
                                    stroke={accentColor}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorTxs)"
                                    name="Transactions"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            Loading chart data...
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Secondary Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Block Times Chart */}
                <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-border/30 pb-4">
                        <CardTitle className="text-sm font-semibold tracking-tight">Block History</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[220px] p-4">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" vertical={false} />
                                    <XAxis dataKey="height" tick={{ fontSize: 9, fill: 'hsl(220 10% 55%)' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 9, fill: 'hsl(220 10% 55%)' }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(220 18% 7%)',
                                            borderColor: 'hsl(220 12% 18%)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="txs" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} name="Tx Count" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Loading...
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Indexer Performance */}
                <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-border/30 pb-4">
                        <div className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-primary/70" />
                            <CardTitle className="text-sm font-semibold tracking-tight">Indexer Performance</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[220px] flex flex-col items-center justify-center gap-6 p-4">
                        <div className="text-center">
                            <div className={cn(
                                "text-5xl font-black font-mono tabular-nums",
                                lagStatus === "healthy" ? "text-green-500" : "text-yellow-500"
                            )}>
                                {stats?.AvgBlockTime?.toFixed(1) || "---"}s
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Avg Block Time</div>
                        </div>
                        <div className="grid grid-cols-2 gap-12 text-center">
                            <div className="space-y-1">
                                <div className="text-2xl font-bold font-mono">{stats?.BlocksLastMinute || 0}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Blocks/min</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold font-mono">{stats?.TxsLastMinute || 0}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Txs/min</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


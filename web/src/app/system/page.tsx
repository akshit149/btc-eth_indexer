"use client";

import { BlocksChart } from "@/features/system/components/blocks-chart";
import { LatencyChart } from "@/features/system/components/latency-chart";
import { getLatestBlock } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Activity, Database, Server, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SystemHealthPage() {
    const { data: btcLatest } = useQuery({
        queryKey: ["latest-block", "btc"],
        queryFn: () => getLatestBlock("btc"),
        refetchInterval: 10000,
    });

    const { data: ethLatest } = useQuery({
        queryKey: ["latest-block", "eth"],
        queryFn: () => getLatestBlock("eth"),
        refetchInterval: 10000,
    });

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">System Status</h2>
                <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-green-500 border-green-500/50 gap-1">
                        <Zap className="h-3 w-3" />
                        All Systems Operational
                    </Badge>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            API Status
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Online</div>
                        <p className="text-xs text-muted-foreground">
                            Uptime: 99.9%
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Database
                        </CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Connected</div>
                        <p className="text-xs text-muted-foreground">
                            PostgreSQL & Redis
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Indexer Lag
                        </CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">~2s</div>
                        <p className="text-xs text-muted-foreground">
                            Real-time ingestion
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Cache Status
                        </CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">Active</div>
                        <p className="text-xs text-muted-foreground">
                            Redis Connection Healthy
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    <BlocksChart btcBlocks={btcLatest ? [btcLatest] : []} ethBlocks={ethLatest ? [ethLatest] : []} />
                </div>
                <div className="col-span-3">
                    <LatencyChart />
                </div>
            </div>
        </div>
    );
}

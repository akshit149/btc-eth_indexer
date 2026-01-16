"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestBlock } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Blocks, Clock, Database, Layers } from "lucide-react";

export function StatsTicker() {
    const { data: btcBlock } = useQuery({
        queryKey: ["latest-block", "btc"],
        queryFn: () => getLatestBlock("btc"),
        refetchInterval: 10000,
    });

    const { data: ethBlock } = useQuery({
        queryKey: ["latest-block", "eth"],
        queryFn: () => getLatestBlock("eth"),
        refetchInterval: 10000,
    });

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="fintech-card bg-orange-500/5 hover:bg-orange-500/10 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-orange-500/90">BTC Height</CardTitle>
                    <Layers className="h-4 w-4 text-orange-500/70" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-mono text-foreground/90">
                        {btcBlock?.Height.toLocaleString() || "---"}
                    </div>
                </CardContent>
            </Card>

            <Card className="fintech-card bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-500/90">ETH Height</CardTitle>
                    <Database className="h-4 w-4 text-blue-500/70" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-mono text-foreground/90">
                        {ethBlock?.Height.toLocaleString() || "---"}
                    </div>
                </CardContent>
            </Card>

            <Card className="fintech-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground/80">Chain Lag</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground/50" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-mono text-foreground/90">
                        {Math.max(0, Math.floor((Date.now() - new Date(btcBlock?.Timestamp || Date.now()).getTime()) / 1000))}s
                    </div>
                </CardContent>
            </Card>

            <Card className="fintech-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground/80">Indexed Blocks</CardTitle>
                    <Blocks className="h-4 w-4 text-muted-foreground/50" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-mono text-foreground/90">
                        {((btcBlock?.Height || 0) + (ethBlock?.Height || 0)).toLocaleString()}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

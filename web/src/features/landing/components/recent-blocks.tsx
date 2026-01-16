"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getBlock, getLatestBlock } from "@/lib/api";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowRight, Blocks } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Block } from "@/types";
import { ChainBadge } from "@/components/shared/badges/chain-badge";
import { HashText } from "@/components/shared/ui-text/hash-text";
import { cn } from "@/lib/utils";

function BlockRow({ block, chain }: { block: Block; chain: "btc" | "eth" }) {
    return (
        <TableRow className="hover:bg-muted/30 transition-colors border-border/30">
            <TableCell className="pl-5">
                <div className="flex items-center gap-2.5">
                    <ChainBadge chain={chain} />
                    <span className={cn(
                        "font-bold font-mono",
                        chain === "btc" ? "text-btc" : "text-eth"
                    )}>
                        #{block.Height.toLocaleString()}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <HashText hash={block.Hash} startChars={8} endChars={6} className="text-xs font-mono text-muted-foreground" />
            </TableCell>
            <TableCell className="text-right">
                <div className="flex flex-col items-end">
                    <span className="text-xs font-medium">
                        {formatDistanceToNow(new Date(block.Timestamp), { addSuffix: true })}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 hidden sm:inline-block font-mono">
                        {new Date(block.Timestamp).toLocaleTimeString()}
                    </span>
                </div>
            </TableCell>
            <TableCell className="pr-4">
                <Link href={`/block/${chain}/${block.Height}`}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-background/80 hover-lift"
                    >
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </Link>
            </TableCell>
        </TableRow>
    );
}

function BlockListSkeleton() {
    return (
        <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 w-full rounded-lg bg-muted/20 animate-pulse" />
            ))}
        </div>
    )
}

export function RecentBlocks() {
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

    const btcHistoryQueries = useQueries({
        queries: btcLatest ? Array.from({ length: 4 }).map((_, i) => ({
            queryKey: ["block", "btc", btcLatest.Height - i - 1],
            queryFn: () => getBlock("btc", (btcLatest.Height - i - 1).toString()),
            enabled: !!btcLatest
        })) : []
    });

    const ethHistoryQueries = useQueries({
        queries: ethLatest ? Array.from({ length: 4 }).map((_, i) => ({
            queryKey: ["block", "eth", ethLatest.Height - i - 1],
            queryFn: () => getBlock("eth", (ethLatest.Height - i - 1).toString()),
            enabled: !!ethLatest
        })) : []
    });

    const btcBlocks = btcLatest ? [btcLatest, ...btcHistoryQueries.map(q => q.data).filter(Boolean) as Block[]] : [];
    const ethBlocks = ethLatest ? [ethLatest, ...ethHistoryQueries.map(q => q.data).filter(Boolean) as Block[]] : [];

    const allBlocks = [...btcBlocks.map(b => ({ ...b, chain: "btc" as const })), ...ethBlocks.map(b => ({ ...b, chain: "eth" as const }))]
        .sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime())
        .slice(0, 8);

    if (!btcLatest && !ethLatest) {
        return <BlockListSkeleton />
    }

    return (
        <Card className="glass-card col-span-4 lg:col-span-3 overflow-hidden">
            <CardHeader className="border-b border-border/30 pb-4 px-5">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/5 border border-border/50 flex items-center justify-center">
                        <Blocks className="h-4 w-4 text-primary/70" />
                    </div>
                    <CardTitle className="text-lg font-semibold tracking-tight">Latest Blocks</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/20">
                            <TableHead className="pl-5 h-11 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">Height</TableHead>
                            <TableHead className="h-11 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">Hash</TableHead>
                            <TableHead className="text-right h-11 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">Time</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allBlocks.map((block) => (
                            <BlockRow key={`${block.chain}-${block.Height}`} block={block} chain={block.chain} />
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


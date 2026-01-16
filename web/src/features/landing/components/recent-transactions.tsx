"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { getLatestTxs } from "@/lib/api";
import { Transaction } from "@/types";
import { Loader2, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HashText } from "@/components/shared/ui-text/hash-text";
import { AddressLink } from "@/components/shared/address-link";
import { ValueDisplay } from "@/components/shared/value-display";
import { StatusBadge } from "@/components/shared/badges/status-badge";

function TxRow({ tx, chain }: { tx: Transaction; chain: "btc" | "eth" }) {
    return (
        <TableRow className="hover:bg-muted/50 transition-colors">
            <TableCell className="font-mono text-xs">
                <Link href={`/tx/${chain}/${tx.TxHash}`} className="hover:underline text-primary">
                    <HashText hash={tx.TxHash} startChars={8} endChars={4} />
                </Link>
            </TableCell>
            <TableCell>
                <AddressLink address={tx.FromAddr || "Coinbase"} chain={chain} shorten={true} showLabel={false} />
            </TableCell>
            <TableCell>
                {tx.ToAddr ? (
                    <AddressLink address={tx.ToAddr} chain={chain} shorten={true} showLabel={false} />
                ) : (
                    <span className="text-muted-foreground text-xs">Contract Creation</span>
                )}
            </TableCell>
            <TableCell className="text-right">
                <ValueDisplay value={tx.Value} chain={chain} showUsd={false} size="sm" />
            </TableCell>
            <TableCell>
                <StatusBadge status={tx.Status} />
            </TableCell>
            <TableCell>
                <Link href={`/tx/${chain}/${tx.TxHash}`}>
                    <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </TableCell>
        </TableRow>
    );
}

function TxTable({ chain }: { chain: "btc" | "eth" }) {
    const { data: txs, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["latest-txs", chain],
        queryFn: () => getLatestTxs(chain, 10),
        refetchInterval: 5000,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!txs || txs.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No transactions found. The indexer may still be syncing.
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isRefetching}>
                    <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/5">
                        <TableHead className="pl-6 h-10 text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">Tx Hash</TableHead>
                        <TableHead className="h-10 text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">From</TableHead>
                        <TableHead className="h-10 text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">To</TableHead>
                        <TableHead className="text-right h-10 text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">Value</TableHead>
                        <TableHead className="h-10 text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {txs.map((tx) => (
                        <TxRow key={tx.TxHash} tx={tx} chain={chain} />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function RecentTransactions() {
    return (
        <Card className="fintech-card col-span-4 lg:col-span-3">
            <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-light tracking-tight">
                    Live Transactions
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs defaultValue="eth" className="w-full">
                    <div className="px-6 py-4 border-b border-white/5">
                        <TabsList className="grid w-[200px] grid-cols-2 bg-muted/20">
                            <TabsTrigger value="btc" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-500 font-semibold tracking-wide text-xs">BTC</TabsTrigger>
                            <TabsTrigger value="eth" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500 font-semibold tracking-wide text-xs">ETH</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="btc" className="mt-0">
                        <TxTable chain="btc" />
                    </TabsContent>
                    <TabsContent value="eth" className="mt-0">
                        <TxTable chain="eth" />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

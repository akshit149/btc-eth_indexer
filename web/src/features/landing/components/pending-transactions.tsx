"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { getPendingTxs } from "@/lib/api";
import { Transaction } from "@/types";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HashText } from "@/components/shared/ui-text/hash-text";
import { AddressLink } from "@/components/shared/address-link";
import { ValueDisplay } from "@/components/shared/value-display";
import { Badge } from "@/components/ui/badge";

function TxRow({ tx, chain }: { tx: Transaction; chain: "btc" | "eth" }) {
    return (
        <TableRow className="hover:bg-muted/50 transition-colors">
            <TableCell className="font-mono text-xs">
                <HashText hash={tx.TxHash} startChars={8} endChars={4} />
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
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 text-[10px] uppercase">
                    Pending
                </Badge>
            </TableCell>
        </TableRow>
    );
}

export function PendingTransactions() {
    const chain = "eth"; // Only ETH supports mempool currently
    const { data: txs, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["pending-txs", chain],
        queryFn: () => getPendingTxs(chain),
        refetchInterval: 3000, // Faster poll for mempool
    });

    return (
        <Card className="fintech-card col-span-4 lg:col-span-3 border-yellow-500/20">
            <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-light tracking-tight text-yellow-500">
                    Mempool (Pending)
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : !txs || txs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No pending transactions found.
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-end p-2">
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {txs.map((tx) => (
                                    <TxRow key={tx.TxHash} tx={tx} chain={chain} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

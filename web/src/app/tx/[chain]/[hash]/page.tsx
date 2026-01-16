"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { getTransaction } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ArrowRight, ExternalLink, Clock, Fuel, Hash, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChainBadge } from "@/components/shared/badges/chain-badge";
import { StatusBadge } from "@/components/shared/badges/status-badge";
import { HashText } from "@/components/shared/ui-text/hash-text";
import { ValueDisplay } from "@/components/shared/value-display";
import { AddressLink } from "@/components/shared/address-link";

interface TxPageProps {
    params: {
        chain: string;
        hash: string;
    };
}

export default function TxPage({ params }: TxPageProps) {
    const chain = params.chain === "eth" ? "eth" : "btc";
    const isBtc = chain === "btc";

    const { data: tx, isLoading, isError, error } = useQuery({
        queryKey: ["tx", chain, params.hash],
        queryFn: () => getTransaction(chain, params.hash),
    });

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError || !tx) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <div className="text-xl font-semibold text-destructive">
                    Transaction not found
                </div>
                <p className="text-muted-foreground">
                    {error instanceof Error ? error.message : "Unable to fetch transaction"}
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Link href={`/block/${chain}/${tx.BlockHeight}`}>
                    <Button variant="ghost" size="icon" className="rounded-xl">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>

                <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <ChainBadge chain={chain} />
                        <StatusBadge status={tx.Status} />
                        <Badge variant="outline" className="font-mono text-xs">
                            Block #{tx.BlockHeight.toLocaleString()}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Just now</span>
                    </div>
                </div>
            </div>

            {/* Transaction Hash */}
            <GlassCard className="p-5">
                <div className="flex items-center gap-3">
                    <Hash className={cn("h-5 w-5", isBtc ? "text-btc" : "text-eth")} />
                    <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Transaction Hash</div>
                        <code className="text-sm font-mono break-all">{tx.TxHash}</code>
                    </div>
                </div>
            </GlassCard>

            {/* Flow Visualization - Clean Version */}
            <GlassCard className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* FROM */}
                    <div className="flex flex-col items-center gap-3 w-full md:w-1/3">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center border border-red-500/30">
                            <div className="h-4 w-4 rounded-full bg-red-500" />
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">From</div>
                            <AddressLink
                                address={tx.FromAddr || "Coinbase"}
                                chain={chain}
                                shorten={true}
                                showLabel={true}
                            />
                        </div>
                    </div>

                    {/* Value in Middle */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="hidden md:block h-[2px] w-24 bg-gradient-to-r from-red-500/30 via-foreground/20 to-green-500/30" />
                        <div className={cn(
                            "px-4 py-2 rounded-xl border flex items-center gap-2",
                            isBtc ? "bg-btc/10 border-btc/30" : "bg-eth/10 border-eth/30"
                        )}>
                            <CircleDollarSign className={cn("h-5 w-5", isBtc ? "text-btc" : "text-eth")} />
                            <ValueDisplay value={tx.Value} chain={chain} showUsd={true} size="lg" />
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground md:hidden rotate-90" />
                        <ArrowRight className="hidden md:block h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* TO */}
                    <div className="flex flex-col items-center gap-3 w-full md:w-1/3">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center border border-green-500/30">
                            <div className="h-4 w-4 rounded-full bg-green-500" />
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">To</div>
                            {tx.ToAddr ? (
                                <AddressLink
                                    address={tx.ToAddr}
                                    chain={chain}
                                    shorten={true}
                                    showLabel={true}
                                />
                            ) : (
                                <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                                    Contract Creation
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Transaction Info */}
                <GlassCard className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                            <span className="text-sm text-muted-foreground">Block</span>
                            <Link href={`/block/${chain}/${tx.BlockHeight}`} className="flex items-center gap-1 text-sm hover:text-primary">
                                <span className={cn("font-mono font-bold", isBtc ? "text-btc" : "text-eth")}>
                                    #{tx.BlockHeight.toLocaleString()}
                                </span>
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <StatusBadge status={tx.Status} />
                        </div>

                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-muted-foreground">Block Hash</span>
                            <HashText hash={tx.BlockHash} startChars={8} endChars={6} className="text-xs font-mono text-muted-foreground" />
                        </div>
                    </div>
                </GlassCard>

                {/* Gas Info */}
                <GlassCard className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gas & Fees</h3>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                            <span className="text-sm text-muted-foreground">Gas Used</span>
                            <span className="font-mono text-sm">{tx.GasUsed?.toLocaleString() || "N/A"}</span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                            <span className="text-sm text-muted-foreground">Transaction Fee</span>
                            <span className="font-mono text-sm font-medium">
                                <ValueDisplay value={tx.Fee} chain={chain} showUsd={false} size="sm" />
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-muted-foreground">Index</span>
                            <span className="font-mono text-sm">{tx.TxIndex !== undefined ? tx.TxIndex : "N/A"}</span>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

"use client";

import { Transaction } from "@/types";
import { ArrowLeft, CircleDollarSign, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ChainBadge } from "@/components/shared/badges/chain-badge";
import { StatusBadge } from "@/components/shared/badges/status-badge";
import { HashText } from "@/components/shared/ui-text/hash-text";
import { ValueDisplay } from "@/components/shared/value-display";
import { AddressLink } from "@/components/shared/address-link";
import { GasInfoCard } from "@/components/shared/gas-info-card";
import { InputDataViewer } from "@/components/shared/input-data-viewer";
import { cn } from "@/lib/utils";

interface TxDetailProps {
    tx: Transaction;
    chain: "btc" | "eth";
}

export function TxDetail({ tx, chain }: TxDetailProps) {
    const isBtc = chain === "btc";

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Link href={`/block/${chain}/${tx.BlockHeight}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-muted/50">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <span className="text-[11px] font-bold uppercase tracking-widest">Back to Block #{tx.BlockHeight}</span>
                </div>

                {/* Status and Hash */}
                <div className="flex flex-wrap items-center gap-3">
                    <ChainBadge chain={chain} />
                    <StatusBadge status={tx.Status} />
                    <div className="hidden sm:block h-4 w-px bg-border/50" />
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[300px] md:max-w-[450px]">
                        {tx.TxHash}
                    </span>
                </div>
            </div>

            {/* Visual Transaction Flow */}
            <Card className="glass-card overflow-hidden border-2 border-border/30">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        {/* FROM */}
                        <div className="flex flex-col items-center gap-3 w-full md:w-1/3">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center border border-red-500/30 shadow-lg shadow-red-500/10">
                                <div className="h-4 w-4 rounded-full bg-red-500" />
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">From</div>
                                <AddressLink
                                    address={tx.FromAddr || "Coinbase"}
                                    chain={chain}
                                    shorten={true}
                                    showLabel={true}
                                />
                            </div>
                        </div>

                        {/* ARROW with VALUE - Desktop */}
                        <div className="hidden md:flex flex-col items-center gap-3 flex-1 px-4 relative">
                            <div className="absolute top-8 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/30 via-primary/40 to-green-500/30" />
                            <div className="bg-background px-4 py-2 rounded-xl z-10 flex items-center gap-2.5 border border-border/50 shadow-lg">
                                <CircleDollarSign className={cn("h-5 w-5", isBtc ? "text-btc" : "text-eth")} />
                                <ValueDisplay value={tx.Value} chain={chain} showUsd={true} size="lg" />
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground/50 mt-2" />
                        </div>

                        {/* Mobile Value Display */}
                        <div className="md:hidden flex flex-col items-center gap-2 py-4">
                            <div className="flex items-center gap-2.5 text-xl font-bold bg-muted/30 px-4 py-2 rounded-xl border border-border/30">
                                <CircleDollarSign className={cn("h-5 w-5", isBtc ? "text-btc" : "text-eth")} />
                                <ValueDisplay value={tx.Value} chain={chain} showUsd={true} size="lg" />
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground/50 rotate-90" />
                        </div>

                        {/* TO */}
                        <div className="flex flex-col items-center gap-3 w-full md:w-1/3">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center border border-green-500/30 shadow-lg shadow-green-500/10">
                                <div className="h-4 w-4 rounded-full bg-green-500" />
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">To</div>
                                {tx.ToAddr ? (
                                    <AddressLink
                                        address={tx.ToAddr}
                                        chain={chain}
                                        shorten={true}
                                        showLabel={true}
                                    />
                                ) : (
                                    <span className="text-sm font-mono italic text-muted-foreground">Contract Creation</span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
                {/* Transaction Details */}
                <Card className="glass-card overflow-hidden">
                    <CardHeader className="border-b border-border/30 pb-4">
                        <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            Transaction Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0 pt-4">
                        {/* Tx Hash */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 py-3 border-b border-border/20">
                            <span className="text-xs text-muted-foreground font-medium">Tx Hash</span>
                            <div className="md:col-span-2 font-mono text-xs break-all text-foreground/90">
                                <HashText hash={tx.TxHash} startChars={14} endChars={12} />
                            </div>
                        </div>

                        {/* Block Height */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 py-3 border-b border-border/20">
                            <span className="text-xs text-muted-foreground font-medium">Block Height</span>
                            <div className="md:col-span-2">
                                <Link
                                    href={`/block/${chain}/${tx.BlockHeight}`}
                                    className="font-mono text-sm hover:text-primary transition-colors inline-flex items-center gap-1.5 group"
                                >
                                    <span className={isBtc ? "text-btc" : "text-eth"}>#{tx.BlockHeight.toLocaleString()}</span>
                                    <ExternalLink className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 py-3 border-b border-border/20">
                            <span className="text-xs text-muted-foreground font-medium">Status</span>
                            <div className="md:col-span-2">
                                <StatusBadge status={tx.Status} />
                            </div>
                        </div>

                        {/* Block Hash */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 py-3">
                            <span className="text-xs text-muted-foreground font-medium">Block Hash</span>
                            <div className="md:col-span-2 font-mono text-xs break-all text-muted-foreground/70">
                                <HashText hash={tx.BlockHash} startChars={10} endChars={10} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Gas Info */}
                <GasInfoCard
                    gasUsed={tx.GasUsed}
                    fee={tx.Fee}
                    chain={chain}
                />
            </div>

            {/* Input Data Viewer */}
            <InputDataViewer data={tx.RawData} />
        </div>
    );
}


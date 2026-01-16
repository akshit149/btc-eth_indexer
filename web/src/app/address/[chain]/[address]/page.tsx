"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AddressTransactionList } from "@/features/address/components/address-transaction-list";
import { TokenList } from "@/features/address/components/token-list";
import { getAddressTxs, getContract, getAddressStats } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, FileCode, Copy, Check, QrCode, ArrowDownLeft, ArrowUpRight, History, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { formatUnits } from "ethers";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";

interface AddressPageProps {
    params: {
        chain: string;
        address: string;
    };
}

export default function AddressPage({ params }: AddressPageProps) {
    const chain = params.chain === "eth" ? "eth" : "btc";
    const isBtc = chain === "btc";
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const { data: contract } = useQuery({
        queryKey: ["contract", chain, params.address],
        queryFn: () => getContract(chain, params.address),
        enabled: chain === "eth",
        retry: false,
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["address-stats", chain, params.address],
        queryFn: () => getAddressStats(chain, params.address),
        refetchInterval: 10000,
    });

    const { data: txResponse, isLoading, isError, error } = useQuery({
        queryKey: ["address-txs", chain, params.address],
        queryFn: () => getAddressTxs(chain, params.address),
    });

    const copyAddress = () => {
        navigator.clipboard.writeText(params.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatValue = (val: string | undefined) => {
        if (!val || val === "0") return 0;
        try {
            if (chain === "eth") {
                return parseFloat(formatUnits(val, 18));
            } else {
                return parseInt(val) / 100000000;
            }
        } catch {
            return 0;
        }
    };

    const currency = chain === "eth" ? "ETH" : "BTC";

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError || !txResponse) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <div className="text-xl font-semibold text-destructive">
                    Error fetching address data
                </div>
                <p className="text-muted-foreground">
                    {error instanceof Error ? error.message : "Address data not found"}
                </p>
            </div>
        );
    }

    const transactions = txResponse.data || [];
    const balance = formatValue(stats?.Balance);
    const received = formatValue(stats?.TotalReceived);
    const sent = formatValue(stats?.TotalSent);
    const txCount = stats?.TxCount || 0;

    return (
        <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="rounded-xl">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>

                <div className="flex-1 space-y-3">
                    {/* Title Row */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge
                            className={cn(
                                "uppercase font-bold px-3 py-1",
                                isBtc ? "bg-btc/20 text-btc border-btc/30" : "bg-eth/20 text-eth border-eth/30"
                            )}
                        >
                            {chain}
                        </Badge>
                        {contract && (
                            <Badge variant="outline" className="border-blue-500/50 text-blue-400 gap-1">
                                <FileCode className="w-3 h-3" />
                                CONTRACT
                            </Badge>
                        )}
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-3">
                        <code className="text-sm md:text-base font-mono text-foreground/80 break-all">
                            {params.address}
                        </code>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyAddress}>
                            {copied ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" />
                            )}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowQR(!showQR)}>
                            <QrCode className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>

                    {/* Contract Info */}
                    {contract && (
                        <div className="text-xs text-muted-foreground">
                            Created by{" "}
                            <Link href={`/address/${chain}/${contract.CreatorAddr}`} className="text-primary hover:underline font-mono">
                                {contract.CreatorAddr.slice(0, 10)}...
                            </Link>
                            {" "}in tx{" "}
                            <Link href={`/tx/${chain}/${contract.TxHash}`} className="text-primary hover:underline font-mono">
                                {contract.TxHash.slice(0, 10)}...
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* QR Code Popup */}
            {showQR && (
                <GlassCard className="p-6 flex justify-center">
                    <div className="bg-white p-4 rounded-xl">
                        <QRCode value={params.address} size={150} />
                    </div>
                </GlassCard>
            )}

            {/* Stats Cards - Clean Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard variant={isBtc ? "glow-btc" : "glow-eth"} className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Balance</span>
                            <div className={cn("text-xl md:text-2xl font-bold font-mono", isBtc ? "text-btc" : "text-eth")}>
                                {statsLoading ? (
                                    <div className="h-7 w-20 bg-muted/50 animate-pulse rounded" />
                                ) : (
                                    <AnimatedNumber value={balance} decimals={4} suffix={` ${currency}`} />
                                )}
                            </div>
                        </div>
                        <Wallet className={cn("h-5 w-5", isBtc ? "text-btc/50" : "text-eth/50")} />
                    </div>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Received</span>
                            <div className="text-lg md:text-xl font-bold font-mono text-green-500">
                                {statsLoading ? (
                                    <div className="h-6 w-16 bg-muted/50 animate-pulse rounded" />
                                ) : (
                                    <>+<AnimatedNumber value={received} decimals={4} /></>
                                )}
                            </div>
                        </div>
                        <ArrowDownLeft className="h-4 w-4 text-green-500/50" />
                    </div>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Sent</span>
                            <div className="text-lg md:text-xl font-bold font-mono text-red-500">
                                {statsLoading ? (
                                    <div className="h-6 w-16 bg-muted/50 animate-pulse rounded" />
                                ) : (
                                    <>-<AnimatedNumber value={sent} decimals={4} /></>
                                )}
                            </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-red-500/50" />
                    </div>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Transactions</span>
                            <div className="text-xl md:text-2xl font-bold font-mono">
                                {statsLoading ? (
                                    <div className="h-7 w-12 bg-muted/50 animate-pulse rounded" />
                                ) : (
                                    <AnimatedNumber value={txCount} />
                                )}
                            </div>
                        </div>
                        <History className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                </GlassCard>
            </div>

            {/* Token Holdings (ETH Only) */}
            {chain === "eth" && (
                <TokenList chain={chain} address={params.address} />
            )}

            {/* Transaction History */}
            <AddressTransactionList transactions={transactions} chain={chain} address={params.address} />
        </div>
    );
}

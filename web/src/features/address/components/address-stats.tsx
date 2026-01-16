"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Transaction } from "@/types";
import { ArrowDownLeft, ArrowUpRight, History, Wallet, Copy, Check } from "lucide-react";
import { formatUnits } from "ethers";
import { useState } from "react";
import QRCode from "react-qr-code";
import { getAddressStats } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface AddressStatsProps {
    transactions: Transaction[];
    address: string;
    chain: "btc" | "eth";
}

export function AddressStats({ address, chain }: AddressStatsProps) {
    const [copied, setCopied] = useState(false);
    const isBtc = chain === "btc";

    const { data: stats, isLoading } = useQuery({
        queryKey: ["address-stats", chain, address],
        queryFn: () => getAddressStats(chain, address),
        refetchInterval: 10000,
    });

    const formatValue = (val: string | undefined) => {
        if (!val || val === "0") return 0;
        try {
            if (chain === "eth") {
                return parseFloat(formatUnits(val, 18));
            } else {
                return parseInt(val) / 100000000;
            }
        } catch (e) {
            console.error("Error formatting value:", e);
            return 0;
        }
    };

    const copyAddress = () => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const currency = chain === "eth" ? "ETH" : "BTC";
    const balance = formatValue(stats?.Balance);
    const received = formatValue(stats?.TotalReceived);
    const sent = formatValue(stats?.TotalSent);
    const txCount = stats?.TxCount || 0;

    return (
        <div className="grid gap-4 md:grid-cols-5">
            {/* QR Code Card */}
            <GlassCard
                variant={isBtc ? "glow-btc" : "glow-eth"}
                className="md:col-span-1 p-6 flex flex-col items-center justify-center gap-4"
            >
                <div className="bg-white p-3 rounded-xl shadow-lg">
                    <QRCode
                        value={address}
                        size={100}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                    />
                </div>
                <button
                    onClick={copyAddress}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    {copied ? (
                        <>
                            <Check className="h-3 w-3 text-green-500" />
                            <span className="text-green-500">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Address</span>
                        </>
                    )}
                </button>
            </GlassCard>

            {/* Stats Grid */}
            <div className="md:col-span-4 grid gap-4 grid-cols-2 md:grid-cols-4">
                {/* Balance Card */}
                <GlassCard className="p-5 col-span-2 md:col-span-1">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                Balance
                            </span>
                            <div className={cn(
                                "text-2xl font-bold font-mono tracking-tight",
                                isBtc ? "text-btc" : "text-eth"
                            )}>
                                {isLoading ? (
                                    <div className="h-8 w-24 bg-muted/50 animate-pulse rounded" />
                                ) : (
                                    <>
                                        <AnimatedNumber value={balance} decimals={4} />
                                        <span className="text-sm text-muted-foreground ml-1">{currency}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className={cn(
                            "p-2.5 rounded-xl",
                            isBtc ? "bg-btc/10" : "bg-eth/10"
                        )}>
                            <Wallet className={cn("h-5 w-5", isBtc ? "text-btc" : "text-eth")} />
                        </div>
                    </div>
                </GlassCard>

                {/* Received Card */}
                <GlassCard className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                Received
                            </span>
                            <div className="text-xl font-bold font-mono text-green-500">
                                {isLoading ? (
                                    <div className="h-6 w-20 bg-muted/50 animate-pulse rounded" />
                                ) : (
                                    <>
                                        +<AnimatedNumber value={received} decimals={4} />
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-green-500/10">
                            <ArrowDownLeft className="h-4 w-4 text-green-500" />
                        </div>
                    </div>
                </GlassCard>

                {/* Sent Card */}
                <GlassCard className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                Sent
                            </span>
                            <div className="text-xl font-bold font-mono text-red-500">
                                {isLoading ? (
                                    <div className="h-6 w-20 bg-muted/50 animate-pulse rounded" />
                                ) : (
                                    <>
                                        -<AnimatedNumber value={sent} decimals={4} />
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                        </div>
                    </div>
                </GlassCard>

                {/* Tx Count Card */}
                <GlassCard className="p-5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                Transactions
                            </span>
                            <div className="text-2xl font-bold font-mono">
                                {isLoading ? (
                                    <div className="h-8 w-16 bg-muted/50 animate-pulse rounded" />
                                ) : (
                                    <AnimatedNumber value={txCount} />
                                )}
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10">
                            <History className="h-4 w-4 text-primary" />
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}


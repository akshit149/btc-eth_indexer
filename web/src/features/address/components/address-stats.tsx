"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/types";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";

import { formatUnits } from "ethers";

interface AddressStatsProps {
    transactions: Transaction[];
    address: string;
    chain: "btc" | "eth";
}

import QRCode from "react-qr-code";
import { getAddressBalance } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";

export function AddressStats({ transactions, address, chain }: AddressStatsProps) {
    // Simple stats calculation from loaded txs
    const totalTxs = transactions.length;
    const sentTxs = transactions.filter(tx => tx.FromAddr?.toLowerCase() === address.toLowerCase()).length;
    const receivedTxs = transactions.filter(tx => tx.ToAddr?.toLowerCase() === address.toLowerCase()).length;

    // Fetch Balance
    const { data: balanceData } = useQuery({
        queryKey: ["balance", chain, address],
        queryFn: () => getAddressBalance(chain, address),
        refetchInterval: 10000,
    });

    const formatBalance = (val: string) => {
        if (!val) return "0";
        try {
            if (chain === "eth") {
                return parseFloat(formatUnits(val, 18)).toFixed(4);
            } else {
                return (parseInt(val) / 100000000).toFixed(8);
            }
        } catch {
            return val;
        }
    }

    return (
        <div className="grid gap-4 md:grid-cols-4">
            <Card className="md:col-span-1 flex items-center justify-center p-4 bg-white/5">
                <div className="bg-white p-2 rounded-lg">
                    <QRCode
                        value={address}
                        size={120}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                    />
                </div>
            </Card>

            <div className="md:col-span-3 grid gap-4 grid-cols-1 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{balanceData ? formatBalance(balanceData.balance) : "..."}</div>
                        <p className="text-xs text-muted-foreground">
                            {chain.toUpperCase()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTxs}+</div>
                        <p className="text-xs text-muted-foreground">
                            Known interactions
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sent</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sentTxs}</div>
                        <p className="text-xs text-muted-foreground">
                            Outgoing transfers
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Received</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{receivedTxs}</div>
                        <p className="text-xs text-muted-foreground">
                            Incoming transfers
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

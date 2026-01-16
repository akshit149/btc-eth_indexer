import { Card } from "@/components/ui/card";
import { Transaction } from "@/types";
import { ArrowDownLeft, ArrowUpRight, History, Wallet } from "lucide-react";

import { formatUnits } from "ethers";

interface AddressStatsProps {
    transactions: Transaction[];
    address: string;
    chain: "btc" | "eth";
}

import QRCode from "react-qr-code";
import { getAddressStats } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function AddressStats({ address, chain }: AddressStatsProps) {
    // Simple stats calculation from loaded txs
    // These are no longer used as stats come from API
    // const totalTxs = transactions.length;
    // const sentTxs = transactions.filter(tx => tx.FromAddr?.toLowerCase() === address.toLowerCase()).length;
    // const receivedTxs = transactions.filter(tx => tx.ToAddr?.toLowerCase() === address.toLowerCase()).length;

    // Fetch Balance
    const { data: stats } = useQuery({
        queryKey: ["address-stats", chain, address],
        queryFn: () => getAddressStats(chain, address),
        refetchInterval: 10000,
    });

    // Format helpers
    const formatValue = (val: string | undefined) => {
        if (!val || val === "0") return "0";
        try {
            if (chain === "eth") {
                return parseFloat(formatUnits(val, 18)).toFixed(4);
            } else {
                return (parseInt(val) / 100000000).toFixed(8);
            }
        } catch (e) {
            console.error("Error formatting value:", e);
            return val;
        }
    }

    const currency = chain === "eth" ? "ETH" : "BTC";

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
                <Card className="p-4 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm text-muted-foreground">Current Balance</span>
                        <span className="text-2xl font-bold font-mono tracking-tight text-primary">
                            {formatValue(stats?.Balance)} <span className="text-sm text-muted-foreground">{currency}</span>
                        </span>
                    </div>
                    <Wallet className="h-8 w-8 text-primary/20" />
                </Card>

                <Card className="p-4 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm text-muted-foreground">Total Received</span>
                        <span className="text-lg font-bold font-mono text-green-500">
                            +{formatValue(stats?.TotalReceived)}
                        </span>
                    </div>
                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                </Card>

                <Card className="p-4 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm text-muted-foreground">Total Sent</span>
                        <span className="text-lg font-bold font-mono text-destructive">
                            -{formatValue(stats?.TotalSent)}
                        </span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-destructive" />
                </Card>

                <Card className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Txs</span>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-2xl font-bold font-mono">{stats?.TxCount || 0}</span>
                </Card>
            </div>
        </div>
    );
}

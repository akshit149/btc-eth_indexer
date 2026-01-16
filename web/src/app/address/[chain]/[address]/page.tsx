"use client";

import { AddressStats } from "@/features/address/components/address-stats";
import { AddressTransactionList } from "@/features/address/components/address-transaction-list";
import { TokenList } from "@/features/address/components/token-list";
import { getAddressTxs, getContract } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, FileCode } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AddressPageProps {
    params: {
        chain: string;
        address: string;
    };
}

export default function AddressPage({ params }: AddressPageProps) {
    // Validate chain param
    const chain = params.chain === "eth" ? "eth" : "btc";

    const { data: contract } = useQuery({
        queryKey: ["contract", chain, params.address],
        queryFn: () => getContract(chain, params.address),
        enabled: chain === "eth", // Only fetch for ETH
        retry: false,
    });

    const { data: txResponse, isLoading, isError, error } = useQuery({
        queryKey: ["address-txs", chain, params.address],
        queryFn: () => getAddressTxs(chain, params.address),
    });

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

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        Address
                    </h1>
                    <div className="flex items-center gap-2">
                        <Badge variant={chain === "btc" ? "default" : "secondary"} className="uppercase">
                            {chain}
                        </Badge>
                        <span className="font-mono text-sm text-muted-foreground break-all">{params.address}</span>
                        {contract && (
                            <Badge variant="outline" className="border-blue-500 text-blue-500 gap-1">
                                <FileCode className="w-3 h-3" />
                                CONTRACT
                            </Badge>
                        )}
                    </div>
                    {contract && (
                        <div className="text-xs text-muted-foreground mt-1">
                            Current Creator: <Link href={`/address/${chain}/${contract.CreatorAddr}`} className="text-primary hover:underline font-mono">{contract.CreatorAddr.slice(0, 10)}...</Link>
                            <span className="mx-2">•</span>
                            Tx: <Link href={`/tx/${chain}/${contract.TxHash}`} className="text-primary hover:underline font-mono">{contract.TxHash.slice(0, 10)}...</Link>
                        </div>
                    )}
                </div>
            </div>

            <AddressStats transactions={transactions} address={params.address} chain={chain} />

            {chain === "eth" && (
                <div className="mb-6">
                    <TokenList chain={chain} address={params.address} />
                </div>
            )}

            <AddressTransactionList transactions={transactions} chain={chain} address={params.address} />
        </div>
    );
}

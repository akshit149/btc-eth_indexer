"use client";

import { TxDetail } from "@/features/transaction/components/tx-detail";
import { getTransaction } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface TxPageProps {
    params: {
        chain: string;
        hash: string;
    };
}

export default function TxPage({ params }: TxPageProps) {
    // Validate chain param
    const chain = params.chain === "eth" ? "eth" : "btc";

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
                    Error fetching transaction
                </div>
                <p className="text-muted-foreground">
                    {error instanceof Error ? error.message : "Transaction not found"}
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <TxDetail tx={tx} chain={chain} />
        </div>
    );
}

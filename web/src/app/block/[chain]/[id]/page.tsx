"use client";

import { BlockDetail } from "@/features/block/components/block-detail";
import { TransactionList } from "@/features/block/components/transaction-list";
import { getBlock, getBlockTxs } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BlockPageProps {
    params: {
        chain: string;
        id: string;
    };
}

export default function BlockPage({ params }: BlockPageProps) {
    const chain = params.chain === "eth" ? "eth" : "btc";
    const [cursor, setCursor] = useState<string | undefined>(undefined);

    const { data: block, isLoading, isError, error } = useQuery({
        queryKey: ["block", chain, params.id],
        queryFn: () => getBlock(chain, params.id),
    });

    const { data: txData, isLoading: txLoading } = useQuery({
        queryKey: ["block-txs", chain, params.id, cursor],
        queryFn: () => getBlockTxs(chain, params.id, cursor, 25),
        enabled: !!block,
    });

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError || !block) {
        // Check if it's a chain mismatch (ETH hash on BTC or vice versa)
        const isEthHash = params.id.startsWith("0x");
        const chainMismatch = (chain === "btc" && isEthHash) || (chain === "eth" && !isEthHash && params.id.length < 60);

        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <div className="text-xl font-semibold text-destructive">
                    {chainMismatch ? "Chain Mismatch" : "Error fetching block"}
                </div>
                <p className="text-muted-foreground text-center max-w-md">
                    {chainMismatch
                        ? `This looks like an ${isEthHash ? "Ethereum" : "Bitcoin"} hash, but you're searching on the ${chain.toUpperCase()} chain. Try switching chains.`
                        : (error instanceof Error ? error.message : "Block not found")
                    }
                </p>
                {chainMismatch && (
                    <a
                        href={`/block/${isEthHash ? "eth" : "btc"}/${params.id}`}
                        className="text-sm text-blue-500 hover:underline"
                    >
                        → Try on {isEthHash ? "Ethereum" : "Bitcoin"} instead
                    </a>
                )}
            </div>
        );
    }

    const transactions = txData?.transactions || [];
    const nextCursor = txData?.page?.next_cursor;

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <BlockDetail block={block} chain={chain} />

            {txLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <TransactionList transactions={transactions} chain={chain} />

                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!cursor}
                            onClick={() => setCursor(undefined)}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> First Page
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!nextCursor}
                            onClick={() => setCursor(nextCursor)}
                        >
                            Next Page <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

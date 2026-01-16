"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transaction } from "@/types";
import { HashText } from "@/components/shared/ui-text/hash-text";
import { ArrowRight, FileText, Download, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useCsvExport } from "@/hooks/use-csv-export";
import { ValueDisplay } from "@/components/shared/value-display";
import { AddressLink } from "@/components/shared/address-link";
import { StatusBadge } from "@/components/shared/badges/status-badge";

interface AddressTransactionListProps {
    transactions: Transaction[];
    chain: "btc" | "eth";
    address: string;
}

export function AddressTransactionList({ transactions, chain, address }: AddressTransactionListProps) {
    const [filter, setFilter] = useState<"all" | "in" | "out">("all");

    const filtered = transactions.filter(tx => {
        const isSender = tx.FromAddr?.toLowerCase() === address.toLowerCase();
        if (filter === "in") return !isSender;
        if (filter === "out") return isSender;
        return true;
    });

    const handleExport = useCsvExport(filtered, `address-txs-${chain}-${address}`);

    // Calculate summary
    const inCount = transactions.filter(tx => tx.ToAddr?.toLowerCase() === address.toLowerCase()).length;
    const outCount = transactions.filter(tx => tx.FromAddr?.toLowerCase() === address.toLowerCase()).length;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-4">
                    <CardTitle>Transaction History</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <ArrowDownLeft className="h-3 w-3 text-green-500" />
                            {inCount} in
                        </span>
                        <span className="flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3 text-orange-500" />
                            {outCount} out
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleExport} title="Export CSV">
                        <Download className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "in" | "out")} className="w-[280px]">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
                            <TabsTrigger value="in" className="data-[state=active]:text-green-500">In</TabsTrigger>
                            <TabsTrigger value="out" className="data-[state=active]:text-orange-500">Out</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent>
                {filtered.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No transactions found matching this filter.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60px]">Type</TableHead>
                                <TableHead>Tx Hash</TableHead>
                                <TableHead>Counterparty</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((tx) => {
                                const isSender = tx.FromAddr?.toLowerCase() === address.toLowerCase();
                                const counterparty = isSender ? tx.ToAddr : tx.FromAddr;

                                return (
                                    <TableRow key={tx.TxHash} className="hover:bg-muted/50 transition-colors">
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={isSender
                                                    ? "text-orange-500 border-orange-500/50 bg-orange-500/10"
                                                    : "text-green-500 border-green-500/50 bg-green-500/10"
                                                }
                                            >
                                                {isSender ? (
                                                    <><ArrowUpRight className="h-3 w-3 mr-1" />OUT</>
                                                ) : (
                                                    <><ArrowDownLeft className="h-3 w-3 mr-1" />IN</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/tx/${chain}/${tx.TxHash}`}
                                                className="font-mono text-xs hover:underline text-primary flex items-center gap-2"
                                            >
                                                <FileText className="h-3 w-3 text-muted-foreground" />
                                                <HashText hash={tx.TxHash} startChars={8} endChars={4} />
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            {counterparty ? (
                                                <AddressLink
                                                    address={counterparty}
                                                    chain={chain}
                                                    shorten={true}
                                                    showLabel={true}
                                                />
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Contract Creation</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ValueDisplay value={tx.Value} chain={chain} showUsd={false} size="sm" />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={tx.Status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/tx/${chain}/${tx.TxHash}`}>
                                                <Button variant="ghost" size="sm">
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

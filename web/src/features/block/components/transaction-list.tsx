"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transaction } from "@/types";
import { ArrowRight, FileText, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HashText } from "@/components/shared/ui-text/hash-text";
import { useCsvExport } from "@/hooks/use-csv-export";

interface TransactionListProps {
    transactions: Transaction[];
    chain: "btc" | "eth";
}

export function TransactionList({ transactions, chain }: TransactionListProps) {
    const handleExport = useCsvExport(transactions, `block-txs-${chain}`);

    if (transactions.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    No transactions found in this block (or indexer has not processed them yet).
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Transactions ({transactions.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tx Hash</TableHead>
                            <TableHead>From / To</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="text-right">Fee</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx) => (
                            <TableRow key={tx.TxHash}>
                                <TableCell className="font-mono text-xs max-w-[150px]">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-3 w-3 text-muted-foreground" />
                                        <HashText hash={tx.TxHash} startChars={6} endChars={4} />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 text-xs font-mono">
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">From:</span> {tx.FromAddr || "Coinbase"}
                                        </div>
                                        {tx.ToAddr && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-muted-foreground">To:</span> {tx.ToAddr}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                    {tx.Value}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                    {tx.Fee}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/tx/${chain}/${tx.TxHash}`}>
                                        <Button variant="ghost" size="sm">
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

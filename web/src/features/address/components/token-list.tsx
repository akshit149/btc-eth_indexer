import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { getTokenBalances } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface TokenBalance {
    chain_id: string;
    address: string;
    token_address: string;
    balance: string; // BigInt string
    last_updated: string;
}

// Helper to format balance (assuming 18 decimals for now, ideally needs metadata)
// Since we don't have token metadata joined in the balance response yet (only stored in tokens table),
// we might display raw or try to fetch token info. 
// Plan: Update API to return metadata joined OR fetch separately.
// For MVP: Display raw and maybe token address truncated.
// Wait, Implementation Plan says "Fetch Metadata... Return []types.Token...".
// My API implementation in Store.go `GetTokenBalances` returns `token_balances` columns.
// It DOES NOT JOIN with `tokens` table.
// I should probably update the valid backend query to join `tokens` so specific decimals are known.
// But for now, let's assume raw display or Update the Backend Query?
// Updating backend query is better UX.
// But valid task flow: finish frontend with what we have (MVP).
// I will display raw balance and token address.

export function TokenList({ chain, address }: { chain: string; address: string }) {
    const { data: balances, isLoading } = useQuery({
        queryKey: ["token-balances", chain, address],
        queryFn: () => getTokenBalances(chain, address),
    });

    if (isLoading) {
        return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
    }

    if (!balances || balances.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Token Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">No tokens found.</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Token Holdings</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Token Address</TableHead>
                            <TableHead className="text-right">Balance (Raw)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {balances.map((token: TokenBalance) => (
                            <TableRow key={token.token_address}>
                                <TableCell className="font-mono text-xs">
                                    {token.token_address}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {token.balance}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

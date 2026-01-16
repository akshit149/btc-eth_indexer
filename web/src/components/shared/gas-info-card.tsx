"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, Zap, DollarSign } from "lucide-react";
import { formatGas, formatGwei } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GasInfoCardProps {
    gasUsed?: number;
    gasLimit?: number;
    gasPrice?: string;
    fee?: string;
    chain: "btc" | "eth";
}

export function GasInfoCard({ gasUsed, gasLimit, gasPrice, fee, chain }: GasInfoCardProps) {
    // Calculate gas percentage if we have both values
    const gasPercentage = gasUsed && gasLimit ? ((gasUsed / gasLimit) * 100).toFixed(1) : null;

    // Estimate USD cost (mock ETH price)
    const mockEthPrice = 3421;
    const feeInEth = fee ? Number(fee) / 1e18 : 0;
    const feeUsd = (feeInEth * mockEthPrice).toFixed(2);

    if (chain === "btc") {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="h-4 w-4" /> Fee Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center py-3 border-b">
                        <span className="text-sm text-muted-foreground">Transaction Fee</span>
                        <span className="font-mono text-btc">{fee ? `${(Number(fee) / 1e8).toFixed(8)} BTC` : "---"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                        <span className="text-sm text-muted-foreground">Fee Rate</span>
                        <span className="font-mono">~{fee ? Math.round(Number(fee) / 250) : "---"} sat/vB</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Fuel className="h-4 w-4" /> Gas Information
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Gas Used */}
                {gasUsed !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger className="text-sm text-muted-foreground cursor-help underline decoration-dotted">
                                    Gas Used
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Amount of gas consumed by this transaction</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <div className="flex items-center gap-2">
                            <span className="font-mono">{formatGas(gasUsed)}</span>
                            {gasPercentage && (
                                <span className="text-xs text-muted-foreground">({gasPercentage}%)</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Gas Limit (if available) */}
                {gasLimit && (
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">Gas Limit</span>
                        <span className="font-mono">{formatGas(gasLimit)}</span>
                    </div>
                )}

                {/* Gas Price */}
                {gasPrice && (
                    <div className="flex justify-between items-center py-2 border-b">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger className="text-sm text-muted-foreground cursor-help underline decoration-dotted">
                                    Gas Price
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Price per unit of gas in Gwei</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <span className="font-mono">{formatGwei(gasPrice)}</span>
                    </div>
                )}

                {/* Transaction Fee */}
                <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Transaction Fee
                    </span>
                    <div className="text-right">
                        <div className="font-mono text-eth">{fee ? `${feeInEth.toFixed(6)} ETH` : "---"}</div>
                        {fee && <div className="text-xs text-muted-foreground">≈ ${feeUsd}</div>}
                    </div>
                </div>

                {/* Gas Usage Bar */}
                {gasPercentage && (
                    <div className="pt-2">
                        <div className="text-xs text-muted-foreground mb-1">Gas Usage</div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, parseFloat(gasPercentage))}%` }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

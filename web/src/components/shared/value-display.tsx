"use client";

import { formatValue, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ValueDisplayProps {
    value: string | number;
    chain: "btc" | "eth";
    showUsd?: boolean;
    className?: string;
    size?: "sm" | "md" | "lg";
}

export function ValueDisplay({ value, chain, showUsd = true, className, size = "md" }: ValueDisplayProps) {
    const formattedValue = formatValue(value, chain);
    const usdValue = formatUsd(value, chain);

    const sizeClasses = {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base font-semibold",
    };

    const colorClass = chain === "btc" ? "text-btc" : "text-eth";

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("inline-flex flex-col", className)}>
                        <span className={cn(sizeClasses[size], colorClass, "font-mono")}>
                            {formattedValue}
                        </span>
                        {showUsd && (
                            <span className="text-[10px] text-muted-foreground">
                                ≈ {usdValue}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-mono text-xs">{value}</p>
                    <p className="text-[10px] text-muted-foreground">Raw value in {chain === "btc" ? "satoshi" : "wei"}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChainBadgeProps {
    chain: "btc" | "eth" | string;
    className?: string;
}

export function ChainBadge({ chain, className }: ChainBadgeProps) {
    const isBtc = chain.toLowerCase() === "btc";

    return (
        <Badge
            variant={isBtc ? "default" : "secondary"}
            className={cn("uppercase font-bold tracking-wider", className)}
        >
            {chain}
        </Badge>
    );
}

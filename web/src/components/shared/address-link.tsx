"use client";

import { Badge } from "@/components/ui/badge";
import { getAddressLabel, getAddressTypeColor } from "@/lib/known-addresses";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { shortenAddress } from "@/lib/format";

interface AddressLinkProps {
    address: string;
    chain: "btc" | "eth";
    className?: string;
    showLabel?: boolean;
    shorten?: boolean;
}

export function AddressLink({ address, chain, className, showLabel = true, shorten = true }: AddressLinkProps) {
    const label = getAddressLabel(address);
    const displayAddress = shorten ? shortenAddress(address) : address;

    return (
        <span className={cn("inline-flex items-center gap-1.5", className)}>
            <Link
                href={`/address/${chain}/${address}`}
                className="font-mono text-sm hover:underline text-primary"
            >
                {displayAddress}
            </Link>
            {showLabel && label && (
                <Badge
                    variant="outline"
                    className={cn("text-[10px] font-medium py-0", getAddressTypeColor(label.type))}
                >
                    {label.name}
                </Badge>
            )}
        </span>
    );
}

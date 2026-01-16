"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HashTextProps {
    hash: string;
    startChars?: number;
    endChars?: number;
    copyable?: boolean;
    className?: string;
    linkTo?: string; // Optional: if we want to wrap it in a link internally, but usually best to compose
}

export function HashText({ hash, startChars = 6, endChars = 4, copyable = true, className }: HashTextProps) {
    const [copied, setCopied] = useState(false);

    // Handle potentially missing hash
    if (!hash) return <span className="text-muted-foreground">-</span>;

    const display = hash.length > (startChars + endChars + 3)
        ? `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`
        : hash;

    const onCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={cn("flex items-center gap-1.5 inline-flex", className)}>
            <span className="font-mono truncate" title={hash}>
                {display}
            </span>
            {copyable && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-muted-foreground hover:text-foreground"
                    onClick={onCopy}
                >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
            )}
        </div>
    );
}

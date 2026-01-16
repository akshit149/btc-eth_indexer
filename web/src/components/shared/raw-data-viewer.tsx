"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface RawDataViewerProps {
    data: string | object | null | undefined;
}

export function RawDataViewer({ data }: RawDataViewerProps) {
    const [copied, setCopied] = useState(false);

    if (!data) return null;

    const formattedData = typeof data === "string"
        ? (tryParseJSON(data) || data)
        : data;

    const stringified = JSON.stringify(formattedData, null, 2);

    const onCopy = () => {
        navigator.clipboard.writeText(stringified);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative">
            <div className="absolute right-2 top-2 z-10">
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={onCopy}>
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
            </div>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/50 font-mono text-xs">
                <pre>{stringified}</pre>
            </ScrollArea>
        </div>
    );
}

function tryParseJSON(jsonString: string) {
    try {
        const o = JSON.parse(jsonString);
        if (o && typeof o === "object") {
            return o;
        }
    } catch { }

    return null;
}

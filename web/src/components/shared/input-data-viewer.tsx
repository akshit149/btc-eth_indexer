"use client";

import { useState } from "react";
import { Copy, Check, Code, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InputDataViewerProps {
    data?: string; // Base64 encoded or raw hex
    className?: string;
}

export function InputDataViewer({ data, className }: InputDataViewerProps) {
    const [copied, setCopied] = useState(false);
    const [view, setView] = useState<"hex" | "utf8" | "json">("hex");

    if (!data) {
        return (
            <div className="text-sm text-muted-foreground italic py-4 text-center">
                No input data
            </div>
        );
    }

    // Decode base64 to hex or string
    let hexData = "";
    let utf8Data = "";
    let jsonData: object | null = null;

    try {
        // Try to decode base64
        const decoded = atob(data);
        hexData = Array.from(decoded)
            .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('');

        // Try UTF-8 decode
        try {
            utf8Data = new TextDecoder().decode(
                new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)))
            );
        } catch {
            utf8Data = decoded;
        }

        // Try JSON parse
        try {
            jsonData = JSON.parse(utf8Data);
        } catch {
            // Not JSON, that's fine
        }
    } catch {
        // Not base64, treat as raw hex
        hexData = data.startsWith("0x") ? data.slice(2) : data;
        utf8Data = data;
    }

    const displayHex = hexData ? `0x${hexData}` : "0x";

    // Parse method signature (first 4 bytes = 8 hex chars)
    const methodId = hexData.slice(0, 8);
    const knownMethods: Record<string, string> = {
        "a9059cbb": "transfer(address,uint256)",
        "23b872dd": "transferFrom(address,address,uint256)",
        "095ea7b3": "approve(address,uint256)",
        "70a08231": "balanceOf(address)",
        "18160ddd": "totalSupply()",
        "dd62ed3e": "allowance(address,address)",
        "313ce567": "decimals()",
        "06fdde03": "name()",
        "95d89b41": "symbol()",
        "3ccfd60b": "withdraw()",
        "d0e30db0": "deposit()",
    };
    const methodName = knownMethods[methodId] || null;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(displayHex);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Code className="h-4 w-4" /> Input Data
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Method Signature */}
                {methodName && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Method Detected</div>
                        <div className="font-mono text-sm text-primary font-medium">{methodName}</div>
                    </div>
                )}

                {/* View Tabs */}
                <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
                    <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="hex">Hex</TabsTrigger>
                        <TabsTrigger value="utf8">UTF-8</TabsTrigger>
                        <TabsTrigger value="json" disabled={!jsonData}>
                            <FileJson className="h-3 w-3 mr-1" /> JSON
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="hex" className="mt-3">
                        <div className="bg-muted/50 rounded-lg p-3 max-h-[200px] overflow-auto">
                            <pre className="font-mono text-xs break-all whitespace-pre-wrap">
                                {displayHex}
                            </pre>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                            {hexData.length / 2} bytes
                        </div>
                    </TabsContent>

                    <TabsContent value="utf8" className="mt-3">
                        <div className="bg-muted/50 rounded-lg p-3 max-h-[200px] overflow-auto">
                            <pre className="font-mono text-xs break-all whitespace-pre-wrap">
                                {utf8Data || "(empty or non-printable)"}
                            </pre>
                        </div>
                    </TabsContent>

                    <TabsContent value="json" className="mt-3">
                        {jsonData && (
                            <div className="bg-muted/50 rounded-lg p-3 max-h-[200px] overflow-auto">
                                <pre className="font-mono text-xs whitespace-pre-wrap">
                                    {JSON.stringify(jsonData, null, 2)}
                                </pre>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

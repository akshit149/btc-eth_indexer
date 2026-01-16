import { RawDataViewer } from "@/components/shared/raw-data-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Block } from "@/types";
import { ArrowLeft, Clock, Hash, Layers, ShieldCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { ChainBadge } from "@/components/shared/badges/chain-badge";
import { StatusBadge } from "@/components/shared/badges/status-badge";
import { HashText } from "@/components/shared/ui-text/hash-text";
import { TimeAgo } from "@/components/shared/ui-text/time-ago";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BlockDetailProps {
    block: Block;
    chain: "btc" | "eth";
}

export function BlockDetail({ block, chain }: BlockDetailProps) {
    const isBtc = chain === "btc";

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col gap-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-muted/50">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <span className="text-[11px] font-bold uppercase tracking-widest">Block Details</span>
                </div>

                {/* Main Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <ChainBadge chain={chain} />
                            <StatusBadge status={block.Status} />
                        </div>
                        <h1 className="flex items-baseline gap-2">
                            <span className="text-muted-foreground/30 text-3xl font-light">#</span>
                            <span className={cn(
                                "text-5xl md:text-7xl font-black tracking-tighter font-mono tabular-nums",
                                isBtc ? "text-btc" : "text-eth"
                            )}>
                                {block.Height.toLocaleString()}
                            </span>
                        </h1>
                    </div>

                    {/* Timestamp */}
                    <div className="flex flex-col items-start md:items-end gap-1.5 p-4 rounded-xl bg-muted/30 border border-border/30">
                        <div className="flex items-center gap-2 text-lg font-semibold">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <TimeAgo timestamp={block.Timestamp} />
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                            {new Date(block.Timestamp).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid gap-5 md:grid-cols-3">
                {/* Hash Card */}
                <Card className={cn(
                    "glass-card md:col-span-2 border-l-4",
                    isBtc ? "border-l-btc/50" : "border-l-eth/50"
                )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Block Hash</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center border flex-shrink-0",
                                isBtc ? "bg-btc/5 border-btc/20" : "bg-eth/5 border-eth/20"
                            )}>
                                <Hash className={cn("h-5 w-5", isBtc ? "text-btc/70" : "text-eth/70")} />
                            </div>
                            <div className="font-mono font-medium text-sm md:text-base break-all text-foreground/90 leading-relaxed">
                                {block.Hash}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Parent Hash Card */}
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Parent Block</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Link
                            href={`/block/${chain}/${block.Height - 1}`}
                            className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
                        >
                            <div className="h-10 w-10 rounded-lg bg-primary/5 border border-border/50 flex items-center justify-center flex-shrink-0">
                                <Layers className="h-5 w-5 text-primary/70" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <HashText hash={block.ParentHash} startChars={10} endChars={10} className="text-sm font-mono" />
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </CardContent>
                </Card>

                {/* Technical Details */}
                <Card className="glass-card md:col-span-3 overflow-hidden">
                    <CardHeader className="border-b border-border/30 pb-4">
                        <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
                            <div className="h-8 w-8 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center justify-center">
                                <ShieldCheck className="h-4 w-4 text-green-500/70" />
                            </div>
                            Technical Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-8 pt-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-border/30">
                                <span className="text-sm text-muted-foreground">Raw Size</span>
                                <span className="font-mono text-sm font-medium">{(block.RawData?.length || 0).toLocaleString()} bytes</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border/30">
                                <span className="text-sm text-muted-foreground">Confirmations</span>
                                <Badge variant="secondary" className="font-mono">1 (Latest)</Badge>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <StatusBadge status={block.Status} />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Raw Protocol Data</h4>
                            <RawDataViewer data={block.RawData} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


"use client";

import { getTransaction } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, ArrowRight, ExternalLink,
  Fuel, Hash, Bitcoin, CheckCircle2,
  XCircle, Timer, Copy, Check, Sparkles
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

function EthIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.75L5.75 12.25L12 16L18.25 12.25L12 1.75Z" opacity="0.6" />
      <path d="M12 16L5.75 12.25L12 22.25L18.25 12.25L12 16Z" />
    </svg>
  );
}

function formatValue(value: string, chain: "btc" | "eth"): string {
  if (!value || value === "0") return "0";
  try {
    if (chain === "eth") {
      const wei = BigInt(value);
      const eth = Number(wei) / 1e18;
      return eth.toFixed(6);
    } else {
      const sats = parseInt(value);
      const btc = sats / 1e8;
      return btc.toFixed(8);
    }
  } catch {
    return "0";
  }
}

function StatusIndicator({ status }: { status: string }) {
  if (status === "finalized") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <span className="text-sm font-semibold text-emerald-500">Success</span>
          <p className="text-[10px] text-muted-foreground">Finalized</p>
        </div>
      </div>
    );
  }
  if (status === "orphaned" || status === "failed") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
          <XCircle className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <span className="text-sm font-semibold text-red-500">Failed</span>
          <p className="text-[10px] text-muted-foreground">Reverted</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
        <Timer className="w-4 h-4 text-warning animate-pulse" />
      </div>
      <div>
        <span className="text-sm font-semibold text-warning">Pending</span>
        <p className="text-[10px] text-muted-foreground">Processing</p>
      </div>
    </div>
  );
}

interface TxPageProps {
  params: {
    chain: string;
    hash: string;
  };
}

export default function TxPage({ params }: TxPageProps) {
  const chain = params.chain === "eth" ? "eth" : "btc";
  const isBtc = chain === "btc";
  const [copiedHash, setCopiedHash] = useState(false);

  const { data: tx, isLoading, isError, error } = useQuery({
    queryKey: ["tx", chain, params.hash],
    queryFn: () => getTransaction(chain, params.hash),
  });

  const copyHash = () => {
    navigator.clipboard.writeText(params.hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center",
            isBtc ? "bg-btc/10" : "bg-eth/10"
          )}>
            <Loader2 className={cn("w-8 h-8 animate-spin", isBtc ? "text-btc" : "text-eth")} />
          </div>
          <p className="text-sm text-muted-foreground">Loading transaction...</p>
        </div>
      </div>
    );
  }

  if (isError || !tx) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Hash className="w-10 h-10 text-destructive/60" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-destructive">Transaction Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            {error instanceof Error ? error.message : "Unable to fetch transaction. It may not exist or hasn't been indexed yet."}
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const value = formatValue(tx.Value, chain);
  const fee = formatValue(tx.Fee, chain);
  const currency = isBtc ? "BTC" : "ETH";

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Background */}
        <div className={cn(
          "absolute inset-0 opacity-30",
          isBtc
            ? "bg-gradient-to-br from-btc/20 via-transparent to-transparent"
            : "bg-gradient-to-br from-eth/20 via-transparent to-transparent"
        )} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Back Button */}
          <Link href={`/block/${chain}/${tx.BlockHeight}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Block #{tx.BlockHeight.toLocaleString()}
          </Link>

          {/* Transaction Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                isBtc ? "bg-btc/15 glow-btc" : "bg-eth/15 glow-eth"
              )}>
                {isBtc ? (
                  <Bitcoin className="w-7 h-7 text-btc" />
                ) : (
                  <EthIcon className="w-7 h-7 text-eth" />
                )}
              </div>
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                    isBtc ? "bg-btc/15 text-btc" : "bg-eth/15 text-eth"
                  )}>
                    {chain} Transaction
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs sm:text-sm font-mono text-muted-foreground break-all">
                    {tx.TxHash}
                  </code>
                  <button
                    onClick={copyHash}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    {copiedHash ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <StatusIndicator status={tx.Status} />
          </div>
        </div>
      </section>

      {/* Transaction Flow Visualization */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bento-card p-6 sm:p-8">
          {/* Value in Center Top */}
          <div className="flex justify-center mb-8">
            <div className={cn(
              "px-6 py-3 rounded-2xl border flex items-center gap-3",
              isBtc ? "bg-btc/5 border-btc/20" : "bg-eth/5 border-eth/20"
            )}>
              <Sparkles className={cn("w-5 h-5", isBtc ? "text-btc" : "text-eth")} />
              <span className={cn("text-2xl sm:text-3xl font-bold font-mono", isBtc ? "text-btc" : "text-eth")}>
                {value} {currency}
              </span>
            </div>
          </div>

          {/* Flow Visualization */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            {/* FROM */}
            <div className="flex-1 w-full">
              <div className="bento-card p-5 text-center border-red-500/10 hover:border-red-500/20 transition-colors">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center mb-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                </div>
                <p className="data-label mb-2">From</p>
                {tx.FromAddr ? (
                  <Link
                    href={`/address/${chain}/${tx.FromAddr}`}
                    className="text-sm font-mono text-foreground/80 hover:text-foreground break-all transition-colors"
                  >
                    {tx.FromAddr.slice(0, 10)}...{tx.FromAddr.slice(-8)}
                  </Link>
                ) : (
                  <span className="text-sm font-mono text-muted-foreground">Coinbase</span>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center py-2 md:py-0">
              <div className="hidden md:flex items-center gap-2">
                <div className="w-12 h-[2px] bg-gradient-to-r from-red-500/30 to-transparent" />
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isBtc ? "bg-btc/10" : "bg-eth/10"
                )}>
                  <ArrowRight className={cn("w-5 h-5", isBtc ? "text-btc" : "text-eth")} />
                </div>
                <div className="w-12 h-[2px] bg-gradient-to-l from-emerald-500/30 to-transparent" />
              </div>
              <div className="md:hidden">
                <ArrowRight className={cn("w-6 h-6 rotate-90", isBtc ? "text-btc" : "text-eth")} />
              </div>
            </div>

            {/* TO */}
            <div className="flex-1 w-full">
              <div className="bento-card p-5 text-center border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <p className="data-label mb-2">To</p>
                {tx.ToAddr ? (
                  <Link
                    href={`/address/${chain}/${tx.ToAddr}`}
                    className="text-sm font-mono text-foreground/80 hover:text-foreground break-all transition-colors"
                  >
                    {tx.ToAddr.slice(0, 10)}...{tx.ToAddr.slice(-8)}
                  </Link>
                ) : (
                  <span className="px-3 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-semibold">
                    Contract Creation
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details Grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Transaction Details */}
          <div className="bento-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-ring/10 flex items-center justify-center">
                <Hash className="w-5 h-5 text-ring" />
              </div>
              <h3 className="font-semibold">Transaction Details</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                <span className="text-sm text-muted-foreground">Block</span>
                <Link
                  href={`/block/${chain}/${tx.BlockHeight}`}
                  className="flex items-center gap-1.5 text-sm hover:text-ring transition-colors"
                >
                  <span className={cn("font-mono font-bold", isBtc ? "text-btc" : "text-eth")}>
                    #{tx.BlockHeight.toLocaleString()}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusIndicator status={tx.Status} />
              </div>

              <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                <span className="text-sm text-muted-foreground">Block Hash</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {tx.BlockHash.slice(0, 10)}...{tx.BlockHash.slice(-8)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-muted-foreground">Position in Block</span>
                <span className="font-mono text-sm">{tx.TxIndex !== undefined ? `#${tx.TxIndex}` : "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Gas & Fees */}
          <div className="bento-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Fuel className="w-5 h-5 text-warning" />
              </div>
              <h3 className="font-semibold">Gas & Fees</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                <span className="text-sm text-muted-foreground">Gas Used</span>
                <span className="font-mono text-sm">{tx.GasUsed?.toLocaleString() || "N/A"}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                <span className="text-sm text-muted-foreground">Transaction Fee</span>
                <span className={cn("font-mono text-sm font-semibold", isBtc ? "text-btc" : "text-eth")}>
                  {fee} {currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-muted-foreground">Value Transferred</span>
                <span className={cn("font-mono text-sm font-semibold", isBtc ? "text-btc" : "text-eth")}>
                  {value} {currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

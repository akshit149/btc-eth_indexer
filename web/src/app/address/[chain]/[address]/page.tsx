"use client";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { AddressTransactionList } from "@/features/address/components/address-transaction-list";
import { TokenList } from "@/features/address/components/token-list";
import { getAddressTxs, getContract, getAddressStats } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, Loader2, FileCode, Copy, Check, QrCode, 
  ArrowDownLeft, ArrowUpRight, History, Wallet, 
  Bitcoin, Shield
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatUnits } from "ethers";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";

function EthIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.75L5.75 12.25L12 16L18.25 12.25L12 1.75Z" opacity="0.6" />
      <path d="M12 16L5.75 12.25L12 22.25L18.25 12.25L12 16Z" />
    </svg>
  );
}

interface AddressPageProps {
  params: {
    chain: string;
    address: string;
  };
}

export default function AddressPage({ params }: AddressPageProps) {
  const chain = params.chain === "eth" ? "eth" : "btc";
  const isBtc = chain === "btc";
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const { data: contract } = useQuery({
    queryKey: ["contract", chain, params.address],
    queryFn: () => getContract(chain, params.address),
    enabled: chain === "eth",
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["address-stats", chain, params.address],
    queryFn: () => getAddressStats(chain, params.address),
    refetchInterval: 10000,
  });

  const { data: txResponse, isLoading, isError, error } = useQuery({
    queryKey: ["address-txs", chain, params.address],
    queryFn: () => getAddressTxs(chain, params.address),
  });

  const copyAddress = () => {
    navigator.clipboard.writeText(params.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatValue = (val: string | undefined) => {
    if (!val || val === "0") return 0;
    try {
      if (chain === "eth") {
        return parseFloat(formatUnits(val, 18));
      } else {
        return parseInt(val) / 100000000;
      }
    } catch {
      return 0;
    }
  };

  const currency = chain === "eth" ? "ETH" : "BTC";

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center",
              isBtc ? "bg-btc/10" : "bg-eth/10"
            )}>
              <Loader2 className={cn("w-8 h-8 animate-spin", isBtc ? "text-btc" : "text-eth")} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Loading address data...</p>
        </div>
      </div>
    );
  }

  if (isError || !txResponse) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Shield className="w-10 h-10 text-destructive/60" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-destructive">Address Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            {error instanceof Error ? error.message : "Unable to fetch address data. It may not exist or hasn't been indexed yet."}
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

  const transactions = txResponse.data || [];
  const balance = formatValue(stats?.Balance);
  const received = formatValue(stats?.TotalReceived);
  const sent = formatValue(stats?.TotalSent);
  const txCount = stats?.TxCount || 0;

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Background Effects */}
        <div className={cn(
          "absolute inset-0 opacity-30",
          isBtc 
            ? "bg-gradient-to-br from-btc/20 via-transparent to-transparent"
            : "bg-gradient-to-br from-eth/20 via-transparent to-transparent"
        )} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-ring/10 via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Back Button */}
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Address Header */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              {/* Chain Icon */}
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
                isBtc ? "bg-btc/15 glow-btc" : "bg-eth/15 glow-eth"
              )}>
                {isBtc ? (
                  <Bitcoin className="w-8 h-8 text-btc" />
                ) : (
                  <EthIcon className="w-8 h-8 text-eth" />
                )}
              </div>

              <div className="space-y-2 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                    isBtc ? "bg-btc/15 text-btc" : "bg-eth/15 text-eth"
                  )}>
                    {chain}
                  </span>
                  {contract && (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-semibold flex items-center gap-1.5">
                      <FileCode className="w-3 h-3" />
                      Contract
                    </span>
                  )}
                </div>

                {/* Address */}
                <div className="flex items-center gap-2">
                  <code className="text-sm sm:text-base font-mono text-foreground/90 break-all">
                    {params.address}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-medium transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      showQR 
                        ? "bg-white/[0.08] border-white/[0.12]" 
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06]"
                    )}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    QR Code
                  </button>
                </div>

                {/* Contract Creator Info */}
                {contract && (
                  <div className="text-xs text-muted-foreground pt-1">
                    Created by{" "}
                    <Link href={`/address/${chain}/${contract.CreatorAddr}`} className="text-ring hover:underline font-mono">
                      {contract.CreatorAddr.slice(0, 8)}...{contract.CreatorAddr.slice(-6)}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Balance Card */}
            <div className={cn(
              "bento-card p-6 min-w-[240px]",
              isBtc ? "hover-glow-btc" : "hover-glow-eth"
            )}>
              <div className="flex items-center gap-2 mb-3">
                <Wallet className={cn("w-4 h-4", isBtc ? "text-btc/60" : "text-eth/60")} />
                <span className="data-label">Balance</span>
              </div>
              {statsLoading ? (
                <div className="h-10 w-36 bg-white/5 rounded-lg animate-pulse" />
              ) : (
                <div className={cn("text-3xl font-bold font-mono", isBtc ? "text-btc" : "text-eth")}>
                  <AnimatedNumber value={balance} decimals={4} />
                  <span className="text-lg ml-1.5 text-muted-foreground">{currency}</span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Popup */}
          {showQR && (
            <div className="mt-6 p-6 bento-card inline-block animate-scale-in">
              <div className="bg-white p-4 rounded-xl">
                <QRCode value={params.address} size={160} />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">Scan to copy address</p>
            </div>
          )}
        </div>
      </section>

      {/* Stats & Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Received */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="data-label">Total Received</span>
            </div>
            {statsLoading ? (
              <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <div className="text-2xl font-bold font-mono text-emerald-500">
                +<AnimatedNumber value={received} decimals={4} />
                <span className="text-sm ml-1 text-muted-foreground">{currency}</span>
              </div>
            )}
          </div>

          {/* Sent */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-red-500" />
              </div>
              <span className="data-label">Total Sent</span>
            </div>
            {statsLoading ? (
              <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <div className="text-2xl font-bold font-mono text-red-500">
                -<AnimatedNumber value={sent} decimals={4} />
                <span className="text-sm ml-1 text-muted-foreground">{currency}</span>
              </div>
            )}
          </div>

          {/* Transaction Count */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-ring/10 flex items-center justify-center">
                <History className="w-5 h-5 text-ring" />
              </div>
              <span className="data-label">Transactions</span>
            </div>
            {statsLoading ? (
              <div className="h-8 w-20 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                <AnimatedNumber value={txCount} />
                <span className="text-sm ml-1 text-muted-foreground">total</span>
              </div>
            )}
          </div>
        </div>

        {/* Token Holdings (ETH Only) */}
        {chain === "eth" && (
          <TokenList chain={chain} address={params.address} />
        )}

        {/* Transaction History */}
        <div className="bento-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-eth/20 to-btc/20 flex items-center justify-center">
                <History className="w-5 h-5 text-foreground/80" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Transaction History</h2>
                <p className="text-xs text-muted-foreground">{transactions.length} transactions found</p>
              </div>
            </div>
          </div>

          <AddressTransactionList transactions={transactions} chain={chain} address={params.address} />
        </div>
      </section>
    </div>
  );
}

"use client";

import { getLatestBlock, getPendingTxs, getLatestTxs } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Bitcoin, ArrowUpRight, Zap, Activity, Clock, TrendingUp, Layers, ArrowRight, Hash } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Transaction } from "@/types";

function EthIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.75L5.75 12.25L12 16L18.25 12.25L12 1.75Z" opacity="0.6" />
      <path d="M12 16L5.75 12.25L12 22.25L18.25 12.25L12 16Z" />
    </svg>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

function formatValue(value: string, chain: "btc" | "eth"): string {
  if (!value || value === "0") return "0";
  try {
    if (chain === "eth") {
      const wei = BigInt(value);
      const eth = Number(wei) / 1e18;
      return eth < 0.0001 ? "<0.0001" : eth.toFixed(4);
    } else {
      const sats = parseInt(value);
      const btc = sats / 1e8;
      return btc < 0.0001 ? "<0.0001" : btc.toFixed(4);
    }
  } catch {
    return "0";
  }
}

function TxItem({ tx, chain }: { tx: Transaction; chain: "btc" | "eth" }) {
  const isBtc = chain === "btc";
  return (
    <Link
      href={`/tx/${chain}/${tx.TxHash}`}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300"
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        isBtc ? "bg-btc/10" : "bg-eth/10"
      )}>
        {isBtc ? (
          <Bitcoin className="w-5 h-5 text-btc" />
        ) : (
          <EthIcon className="w-5 h-5 text-eth" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground/90 truncate">
            {tx.TxHash.slice(0, 10)}...{tx.TxHash.slice(-6)}
          </span>
          {tx.Status === "finalized" && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {tx.FromAddr ? `${tx.FromAddr.slice(0, 6)}...` : "Coinbase"} → {tx.ToAddr ? `${tx.ToAddr.slice(0, 6)}...` : "Contract"}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={cn("font-mono text-sm font-semibold", isBtc ? "text-btc" : "text-eth")}>
          {formatValue(tx.Value, chain)} {isBtc ? "BTC" : "ETH"}
        </div>
      </div>
      <ArrowUpRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
    </Link>
  );
}

function PendingTxItem({ tx }: { tx: Transaction }) {
  return (
    <Link
      href={`/tx/eth/${tx.TxHash}`}
      className="group flex items-center gap-3 p-3 rounded-xl bg-warning/5 hover:bg-warning/10 border border-warning/10 hover:border-warning/20 transition-all duration-300"
    >
      <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
      <span className="font-mono text-xs text-foreground/80 truncate flex-1">
        {tx.TxHash.slice(0, 12)}...{tx.TxHash.slice(-8)}
      </span>
      <span className="font-mono text-xs text-warning font-medium">
        {formatValue(tx.Value, "eth")} ETH
      </span>
    </Link>
  );
}

export default function Home() {
  const { data: btcLatest, isLoading: btcLoading } = useQuery({
    queryKey: ["latest-block", "btc"],
    queryFn: () => getLatestBlock("btc"),
    refetchInterval: 10000,
  });

  const { data: ethLatest, isLoading: ethLoading } = useQuery({
    queryKey: ["latest-block", "eth"],
    queryFn: () => getLatestBlock("eth"),
    refetchInterval: 5000,
  });

  const { data: pendingTxs } = useQuery({
    queryKey: ["pending-txs", "eth"],
    queryFn: () => getPendingTxs("eth"),
    refetchInterval: 3000,
  });

  const { data: btcTxs } = useQuery({
    queryKey: ["latest-txs", "btc"],
    queryFn: () => getLatestTxs("btc", 5),
    refetchInterval: 10000,
  });

  const { data: ethTxs } = useQuery({
    queryKey: ["latest-txs", "eth"],
    queryFn: () => getLatestTxs("eth", 5),
    refetchInterval: 5000,
  });

  const ethLag = ethLatest
    ? Math.max(0, Math.floor((Date.now() - new Date(ethLatest.Timestamp).getTime()) / 1000))
    : 0;

  return (
    <div className="min-h-screen">
      {/* Hero Section with Mesh Gradient */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 gradient-mesh opacity-60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-ring/10 via-transparent to-transparent" />
        
        {/* Floating Orbs */}
        <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-btc/10 blur-[100px] animate-float-slow" />
        <div className="absolute top-40 right-[10%] w-96 h-96 rounded-full bg-eth/10 blur-[120px] animate-float" style={{ animationDelay: "-3s" }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-ring/10 blur-[80px] animate-float-slow" style={{ animationDelay: "-5s" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-12">
          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass border-white/[0.08]">
              <LiveDot />
              <span className="text-xs font-medium text-foreground/80">Indexing Live</span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-xs font-mono text-emerald-500">
                {ethLag < 5 ? "Real-time" : `${ethLag}s lag`}
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9]">
              <span className="text-gradient-hero">Explore</span>
              <br />
              <span className="text-gradient-accent">Every Block</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Real-time insights into Bitcoin and Ethereum. 
              <span className="text-foreground/80"> Track transactions, analyze addresses, decode the blockchain.</span>
            </p>
          </div>

          {/* Chain Cards - Hero Stats */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-12">
            <Link href="/block/btc/latest" className="w-full sm:w-auto">
              <div className="bento-card p-6 sm:p-8 hover-glow-btc group cursor-pointer min-w-[200px]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-btc/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Bitcoin className="w-7 h-7 text-btc" />
                  </div>
                  <div>
                    <p className="data-label mb-1">Bitcoin Block</p>
                    {btcLoading ? (
                      <div className="h-9 w-32 bg-white/5 rounded-lg animate-pulse" />
                    ) : (
                      <div className="text-3xl sm:text-4xl font-bold font-mono text-btc">
                        <AnimatedNumber value={btcLatest?.Height || 0} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/block/eth/latest" className="w-full sm:w-auto">
              <div className="bento-card p-6 sm:p-8 hover-glow-eth group cursor-pointer min-w-[200px]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-eth/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <EthIcon className="w-7 h-7 text-eth" />
                  </div>
                  <div>
                    <p className="data-label mb-1">Ethereum Block</p>
                    {ethLoading ? (
                      <div className="h-9 w-32 bg-white/5 rounded-lg animate-pulse" />
                    ) : (
                      <div className="text-3xl sm:text-4xl font-bold font-mono text-eth">
                        <AnimatedNumber value={ethLatest?.Height || 0} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Bento Grid Dashboard */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Live Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bento-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <Zap className="w-4 h-4 text-eth" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">TPS</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono">15.2</div>
            <div className="flex items-end gap-[2px] h-6 mt-2">
              {[40, 60, 35, 80, 55, 90, 45, 70, 85, 50, 65, 75].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-eth/40 rounded-full transition-all"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="bento-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-semibold text-emerald-500">Synced</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {ethLag < 5 ? "Real-time" : `${ethLag}s behind`}
            </div>
          </div>

          <div className="bento-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <Layers className="w-4 h-4 text-ring" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mempool</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono">
              <AnimatedNumber value={pendingTxs?.length || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">pending txs</div>
          </div>

          <div className="bento-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-4 h-4 text-warning" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Gas</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono">12</div>
            <div className="text-xs text-muted-foreground mt-1">Gwei avg</div>
          </div>
        </div>

        {/* Main Content Grid - BENTO LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Live Transactions (MOST IMPORTANT) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Live Transactions Section */}
            <div className="bento-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-eth/20 to-btc/20 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-foreground/80" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Live Transactions</h2>
                    <p className="text-xs text-muted-foreground">Real-time activity across chains</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LiveDot />
                  <span className="text-xs text-muted-foreground">Auto-updating</span>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-2">
                {ethTxs?.slice(0, 4).map((tx) => (
                  <TxItem key={tx.TxHash} tx={tx} chain="eth" />
                ))}
                {btcTxs?.slice(0, 2).map((tx) => (
                  <TxItem key={tx.TxHash} tx={tx} chain="btc" />
                ))}
                {(!ethTxs || ethTxs.length === 0) && (!btcTxs || btcTxs.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Waiting for transactions...</p>
                  </div>
                )}
              </div>

              {/* View All */}
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <Link
                  href="/stats/eth"
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all transactions
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Latest Blocks Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* BTC Latest Block */}
              <Link href={`/block/btc/${btcLatest?.Height || 'latest'}`}>
                <div className="bento-card p-5 hover-glow-btc group h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-btc/15 flex items-center justify-center">
                      <Bitcoin className="w-4 h-4 text-btc" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Latest BTC Block</span>
                  </div>
                  {btcLatest ? (
                    <>
                      <div className="text-2xl font-bold font-mono text-btc mb-2">
                        #{btcLatest.Height.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {btcLatest.Hash.slice(0, 16)}...
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(btcLatest.Timestamp), { addSuffix: true })}
                      </div>
                    </>
                  ) : (
                    <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
                  )}
                </div>
              </Link>

              {/* ETH Latest Block */}
              <Link href={`/block/eth/${ethLatest?.Height || 'latest'}`}>
                <div className="bento-card p-5 hover-glow-eth group h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-eth/15 flex items-center justify-center">
                      <EthIcon className="w-4 h-4 text-eth" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Latest ETH Block</span>
                  </div>
                  {ethLatest ? (
                    <>
                      <div className="text-2xl font-bold font-mono text-eth mb-2">
                        #{ethLatest.Height.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {ethLatest.Hash.slice(0, 16)}...
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(ethLatest.Timestamp), { addSuffix: true })}
                      </div>
                    </>
                  ) : (
                    <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
                  )}
                </div>
              </Link>
            </div>
          </div>

          {/* Right Column - Pending Transactions */}
          <div className="space-y-4">
            {/* Pending Transactions - Compact */}
            <div className="bento-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                  <h3 className="font-semibold">Pending</h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {pendingTxs?.length || 0} txs
                </span>
              </div>

              {!pendingTxs || pendingTxs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-warning/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-warning/60" />
                  </div>
                  No pending transactions
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {pendingTxs.slice(0, 8).map((tx) => (
                    <PendingTxItem key={tx.TxHash} tx={tx} />
                  ))}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="bento-card p-5">
              <h3 className="font-semibold mb-4">Quick Access</h3>
              <div className="space-y-2">
                <Link
                  href="/stats/btc"
                  className="flex items-center gap-3 p-3 rounded-xl bg-btc/5 hover:bg-btc/10 border border-btc/10 transition-all group"
                >
                  <Bitcoin className="w-5 h-5 text-btc" />
                  <span className="text-sm font-medium">Bitcoin Stats</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/stats/eth"
                  className="flex items-center gap-3 p-3 rounded-xl bg-eth/5 hover:bg-eth/10 border border-eth/10 transition-all group"
                >
                  <EthIcon className="w-5 h-5 text-eth" />
                  <span className="text-sm font-medium">Ethereum Stats</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/system"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] transition-all group"
                >
                  <Activity className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium">System Health</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

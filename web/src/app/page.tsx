"use client";

import { RecentBlocks } from "@/features/landing/components/recent-blocks";
import { RecentTransactions } from "@/features/landing/components/recent-transactions";
import { HeroSection } from "@/features/landing/components/hero-section";
import { LivePulseSection } from "@/features/landing/components/live-pulse-section";
import { getLatestBlock, getPendingTxs } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/ui/glass-card";
import { Flame, ArrowRight } from "lucide-react";
import { HashText } from "@/components/shared/ui-text/hash-text";
import { ValueDisplay } from "@/components/shared/value-display";
import Link from "next/link";

export default function Home() {
  const { data: btcLatest, isLoading: btcLoading } = useQuery({
    queryKey: ["latest-block", "btc"],
    queryFn: () => getLatestBlock("btc"),
    refetchInterval: 5000,
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

  const ethLag = ethLatest
    ? Math.max(0, Math.floor((Date.now() - new Date(ethLatest.Timestamp).getTime()) / 1000))
    : 0;

  return (
    <div className="flex-1 min-h-screen">
      {/* Hero Section */}
      <HeroSection
        btcHeight={btcLatest?.Height || 0}
        ethHeight={ethLatest?.Height || 0}
        btcLoading={btcLoading}
        ethLoading={ethLoading}
      />

      {/* Main Content */}
      <div className="space-y-10 p-6 md:p-8 max-w-7xl mx-auto">
        {/* Live Pulse - Compact Stats */}
        <LivePulseSection
          ethTps={15.2}
          gasPrice={12}
          mempoolCount={pendingTxs?.length || 0}
          syncStatus={ethLag < 60 ? "synced" : "syncing"}
          lagSeconds={ethLag}
        />

        {/* Recent Activity - MOST IMPORTANT - FIRST */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-eth to-btc" />
            <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RecentBlocks />
            <RecentTransactions />
          </div>
        </section>

        {/* Mempool - Compact Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-semibold tracking-tight">Pending Transactions</h2>
              <span className="text-sm text-muted-foreground">
                ({pendingTxs?.length || 0} in mempool)
              </span>
            </div>
          </div>

          {/* Compact Pending Tx Preview - MAX 5 items, no scroll */}
          <GlassCard className="p-4">
            {!pendingTxs || pendingTxs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No pending transactions
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTxs.slice(0, 5).map((tx) => (
                  <div
                    key={tx.TxHash}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-warning/5 border border-warning/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                      <HashText hash={tx.TxHash} startChars={8} endChars={6} className="font-mono text-sm" />
                    </div>
                    <div className="flex items-center gap-4">
                      <ValueDisplay value={tx.Value} chain="eth" showUsd={false} size="sm" />
                      <Link href={`/tx/eth/${tx.TxHash}`}>
                        <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      </Link>
                    </div>
                  </div>
                ))}
                {pendingTxs.length > 5 && (
                  <div className="text-center pt-2 text-sm text-muted-foreground">
                    +{pendingTxs.length - 5} more pending...
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </section>
      </div>
    </div>
  );
}



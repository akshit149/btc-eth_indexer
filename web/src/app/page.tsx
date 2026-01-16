"use client";

import { RecentBlocks } from "@/features/landing/components/recent-blocks";
import { RecentTransactions } from "@/features/landing/components/recent-transactions";
import { NetworkCard } from "@/features/landing/components/network-card";
import { StatsTicker } from "@/features/landing/components/stats-ticker";
import { PendingTransactions } from "@/features/landing/components/pending-transactions";
import { getLatestBlock } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Calculate lag from block timestamp
  const btcLag = btcLatest ? Math.max(0, Math.floor((Date.now() - new Date(btcLatest.Timestamp).getTime()) / 1000)) : 0;
  const ethLag = ethLatest ? Math.max(0, Math.floor((Date.now() - new Date(ethLatest.Timestamp).getTime()) / 1000)) : 0;

  return (
    <div className="flex-1 space-y-10 p-6 md:p-8 pt-6 min-h-screen">
      {/* Stats Ticker */}
      <StatsTicker />

      {/* Network Cards Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-btc to-eth" />
          <h2 className="text-lg font-semibold tracking-tight">Network Status</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {btcLoading ? (
            <Skeleton className="h-[260px] w-full rounded-2xl" />
          ) : (
            <NetworkCard
              chain="btc"
              height={btcLatest?.Height || 0}
              blocksPerMin={0.17}
              txsPerMin={45}
              lag={btcLag}
            />
          )}

          {ethLoading ? (
            <Skeleton className="h-[260px] w-full rounded-2xl" />
          ) : (
            <NetworkCard
              chain="eth"
              height={ethLatest?.Height || 0}
              blocksPerMin={5.0}
              txsPerMin={300}
              lag={ethLag}
            />
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary/50 to-primary/20" />
          <h2 className="text-lg font-semibold tracking-tight">Mempool Activity</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-1">
          <PendingTransactions />
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary/50 to-primary/20" />
          <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <RecentBlocks />
          <RecentTransactions />
        </div>
      </section>
    </div>
  );
}


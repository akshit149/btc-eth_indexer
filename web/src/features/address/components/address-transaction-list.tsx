"use client";

import { Transaction } from "@/types";
import { ArrowRight, Download, ArrowDownLeft, ArrowUpRight, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCsvExport } from "@/hooks/use-csv-export";
import { cn } from "@/lib/utils";

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

interface AddressTransactionListProps {
  transactions: Transaction[];
  chain: "btc" | "eth";
  address: string;
}

export function AddressTransactionList({ transactions, chain, address }: AddressTransactionListProps) {
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const currency = chain === "eth" ? "ETH" : "BTC";

  const filtered = transactions.filter(tx => {
    const isSender = tx.FromAddr?.toLowerCase() === address.toLowerCase();
    if (filter === "in") return !isSender;
    if (filter === "out") return isSender;
    return true;
  });

  const handleExport = useCsvExport(filtered, `address-txs-${chain}-${address}`);

  const inCount = transactions.filter(tx => tx.ToAddr?.toLowerCase() === address.toLowerCase()).length;
  const outCount = transactions.filter(tx => tx.FromAddr?.toLowerCase() === address.toLowerCase()).length;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filter === "all"
                ? "bg-white/[0.08] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => setFilter("in")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
              filter === "in"
                ? "bg-emerald-500/15 text-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            In ({inCount})
          </button>
          <button
            onClick={() => setFilter("out")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
              filter === "out"
                ? "bg-red-500/15 text-red-500"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Out ({outCount})
          </button>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-sm text-muted-foreground hover:text-foreground transition-all"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ArrowUpDown className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No transactions found matching this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => {
            const isSender = tx.FromAddr?.toLowerCase() === address.toLowerCase();
            const counterparty = isSender ? tx.ToAddr : tx.FromAddr;

            return (
              <Link
                key={tx.TxHash}
                href={`/tx/${chain}/${tx.TxHash}`}
                className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300"
              >
                {/* Type Indicator */}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  isSender ? "bg-red-500/10" : "bg-emerald-500/10"
                )}>
                  {isSender ? (
                    <ArrowUpRight className="w-5 h-5 text-red-500" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                  )}
                </div>

                {/* Transaction Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-foreground/90">
                      {tx.TxHash.slice(0, 10)}...{tx.TxHash.slice(-6)}
                    </span>
                    {tx.Status === "finalized" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                    {tx.Status === "orphaned" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isSender ? "To: " : "From: "}
                    {counterparty ? (
                      <span className="font-mono">{counterparty.slice(0, 8)}...{counterparty.slice(-6)}</span>
                    ) : (
                      <span className="text-blue-400">Contract Creation</span>
                    )}
                  </div>
                </div>

                {/* Value */}
                <div className="text-right shrink-0">
                  <div className={cn(
                    "font-mono text-sm font-semibold",
                    isSender ? "text-red-500" : "text-emerald-500"
                  )}>
                    {isSender ? "-" : "+"}{formatValue(tx.Value, chain)} {currency}
                  </div>
                  <div className={cn(
                    "text-[10px] uppercase tracking-wider font-semibold",
                    isSender ? "text-red-500/60" : "text-emerald-500/60"
                  )}>
                    {isSender ? "OUT" : "IN"}
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { Terminal, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { SearchInput } from "./search-input";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chain, setChain] = useState<"btc" | "eth">("eth");

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b border-white/[0.06] bg-background/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-ring/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-card to-card/50 border border-white/[0.08] flex items-center justify-center group-hover:border-white/[0.15] transition-all duration-300">
                  <Terminal className="w-5 h-5 text-foreground/80" />
                </div>
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg tracking-tight">ChainScope</span>
                <span className="text-xs text-muted-foreground ml-1.5 font-mono">v2.0</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center">
              <div className="flex items-center p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <Link
                  href="/"
                  className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-all duration-200"
                >
                  Dashboard
                </Link>
                <Link
                  href="/stats/btc"
                  className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-btc/10 text-muted-foreground hover:text-btc transition-all duration-200 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-btc" />
                  Bitcoin
                </Link>
                <Link
                  href="/stats/eth"
                  className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-eth/10 text-muted-foreground hover:text-eth transition-all duration-200 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-eth" />
                  Ethereum
                </Link>
              </div>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search */}
              <div className="hidden sm:block">
                <SearchInput chain={chain} className="w-[180px] lg:w-[240px]" />
              </div>

              {/* Chain Toggle */}
              <div className="hidden sm:flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <button
                  onClick={() => setChain("btc")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                    chain === "btc"
                      ? "bg-btc/15 text-btc"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  BTC
                </button>
                <button
                  onClick={() => setChain("eth")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                    chain === "eth"
                      ? "bg-eth/15 text-eth"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ETH
                </button>
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.06] transition-all press-effect"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-background/95 backdrop-blur-2xl animate-slide-up">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
              {/* Mobile Search */}
              <SearchInput chain={chain} className="w-full" />

              {/* Mobile Chain Toggle */}
              <div className="flex items-center gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <button
                  onClick={() => setChain("btc")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                    chain === "btc"
                      ? "bg-btc/15 text-btc"
                      : "text-muted-foreground"
                  )}
                >
                  Bitcoin
                </button>
                <button
                  onClick={() => setChain("eth")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                    chain === "eth"
                      ? "bg-eth/15 text-eth"
                      : "text-muted-foreground"
                  )}
                >
                  Ethereum
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="space-y-1">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-white/[0.04] transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/stats/btc"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-btc hover:bg-btc/10 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-btc" />
                  Bitcoin Stats
                </Link>
                <Link
                  href="/stats/eth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-eth hover:bg-eth/10 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-eth" />
                  Ethereum Stats
                </Link>
                <Link
                  href="/system"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-white/[0.04] transition-colors"
                >
                  System Health
                </Link>
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

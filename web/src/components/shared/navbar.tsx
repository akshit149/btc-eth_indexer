"use client";

import { Terminal, Server, Menu, X, Activity } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "./theme-toggle";
import { SearchInput } from "./search-input";
import { cn } from "@/lib/utils";

export function Navbar() {
    const [chain, setChain] = useState<"btc" | "eth">("eth");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="fintech-header w-full">
            {/* Top Status Bar - Premium Glass Effect */}
            <div className="h-9 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 border-b border-border/20 flex items-center px-4 justify-between text-[10px] md:text-xs">
                <div className="flex items-center gap-5">
                    {/* Live Status Indicator */}
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="font-mono font-bold text-green-500 tracking-wider">LIVE</span>
                    </div>

                    {/* Price Tickers */}
                    <div className="hidden md:flex items-center gap-1.5 text-muted-foreground">
                        <span className="text-btc font-bold">BTC</span>
                        <span className="font-mono text-foreground/80">$95,432</span>
                        <Activity className="h-3 w-3 text-green-500 ml-0.5" />
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 text-muted-foreground">
                        <span className="text-eth font-bold">ETH</span>
                        <span className="font-mono text-foreground/80">$3,421</span>
                        <Activity className="h-3 w-3 text-green-500 ml-0.5" />
                    </div>
                </div>

                {/* Server Status */}
                <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/50 border border-border/30">
                        <Server className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px]">Lag:</span>
                        <span className="text-foreground font-mono font-medium">2s</span>
                    </div>
                </div>
            </div>

            {/* Main Navbar - Premium Glass */}
            <div className="flex h-16 items-center px-4 md:px-6 gap-4 bg-background/60 backdrop-blur-xl">
                {/* Logo with Gradient */}
                <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight group">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-border/50 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                        <Terminal className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent font-bold tracking-tight">
                        ChainScope
                    </span>
                </Link>

                {/* Desktop Nav - Pill Style */}
                <nav className="hidden md:flex items-center gap-1 ml-6 p-1 rounded-full bg-muted/30 border border-border/30">
                    <Link
                        href="/"
                        className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:bg-background/80 text-muted-foreground hover:text-foreground"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/stats/btc"
                        className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:bg-btc/10 text-muted-foreground hover:text-btc"
                    >
                        Bitcoin
                    </Link>
                    <Link
                        href="/stats/eth"
                        className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:bg-eth/10 text-muted-foreground hover:text-eth"
                    >
                        Ethereum
                    </Link>
                </nav>

                {/* Search & Actions */}
                <div className="ml-auto flex items-center gap-2 md:gap-3">
                    {/* Chain Selector - Enhanced */}
                    <Select value={chain} onValueChange={(v) => setChain(v as "btc" | "eth")}>
                        <SelectTrigger className={cn(
                            "w-[85px] h-9 border-0 focus:ring-0 hidden sm:flex font-medium rounded-full",
                            chain === "btc"
                                ? "bg-btc/10 text-btc hover:bg-btc/15"
                                : "bg-eth/10 text-eth hover:bg-eth/15"
                        )}>
                            <SelectValue placeholder="Chain" />
                        </SelectTrigger>
                        <SelectContent className="glass-elevated rounded-xl">
                            <SelectItem value="btc" className="text-btc font-bold rounded-lg">BTC</SelectItem>
                            <SelectItem value="eth" className="text-eth font-bold rounded-lg">ETH</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Search - Enhanced */}
                    <SearchInput chain={chain} className="hidden sm:block w-[180px] lg:w-[280px]" />

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200 press-effect"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu - Glass Effect */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <nav className="flex flex-col gap-1">
                        <Link
                            href="/"
                            className="text-sm font-medium py-3 px-4 rounded-xl hover:bg-muted/50 transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/stats/btc"
                            className="text-sm font-medium py-3 px-4 rounded-xl hover:bg-btc/10 transition-colors text-btc"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Bitcoin Stats
                        </Link>
                        <Link
                            href="/stats/eth"
                            className="text-sm font-medium py-3 px-4 rounded-xl hover:bg-eth/10 transition-colors text-eth"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Ethereum Stats
                        </Link>
                    </nav>
                    <div className="flex gap-2 pt-2 border-t border-border/30">
                        <Select value={chain} onValueChange={(v) => setChain(v as "btc" | "eth")}>
                            <SelectTrigger className={cn(
                                "w-[85px] h-10 border-0 focus:ring-0 font-medium rounded-xl",
                                chain === "btc" ? "bg-btc/10 text-btc" : "bg-eth/10 text-eth"
                            )}>
                                <SelectValue placeholder="Chain" />
                            </SelectTrigger>
                            <SelectContent className="glass-elevated rounded-xl">
                                <SelectItem value="btc" className="text-btc font-bold">BTC</SelectItem>
                                <SelectItem value="eth" className="text-eth font-bold">ETH</SelectItem>
                            </SelectContent>
                        </Select>
                        <SearchInput chain={chain} className="flex-1" />
                    </div>
                </div>
            )}
        </div>
    );
}


"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Command } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { search as apiSearch } from "@/lib/api";

interface SearchInputProps {
    chain: "btc" | "eth";
    className?: string;
}

export function SearchInput({ chain, className }: SearchInputProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Cmd+K shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
            }
            // Escape to blur
            if (e.key === "Escape") {
                inputRef.current?.blur();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!search.trim()) return;

        setIsSearching(true);
        const term = search.trim();

        // Smart Routing Logic
        const isEthAddress = term.startsWith("0x") && term.length === 42;
        const isEthHash = term.startsWith("0x") && term.length === 66;
        const isBtcAddress = term.startsWith("1") || term.startsWith("3") || term.startsWith("bc1");
        const isNumber = !isNaN(Number(term)) && term.length < 20;

        let route = "";
        if (isEthAddress) {
            route = `/address/eth/${term}`;
        } else if (isBtcAddress) {
            route = `/address/btc/${term}`;
        } else if (isNumber) {
            route = `/block/${chain}/${term}`;
        } else {
            // Hash (64/66 chars) or unknown -> Use Backend Search
            try {
                const res = await apiSearch(term);
                if (res) {
                    if (res.type === 'block') {
                        route = `/block/${chain}/${res.data.Hash}`;
                    } else if (res.type === 'tx') {
                        route = `/tx/${chain}/${res.data.TxHash}`;
                    } else if (res.type === 'address') {
                        route = `/address/${chain}/${res.data.Address}`;
                    } else if (res.type === 'token_list' && Array.isArray(res.data) && res.data.length > 0) {
                        const token = res.data[0];
                        route = `/address/${token.ChainID}/${token.Address}`;
                    } else {
                        // If backend returns nothing but looks like a hash, default to TX (more common) API knows best though
                        // Check if it looks like a hash to fallback
                        if (isEthHash || term.length >= 64) {
                            route = `/tx/${chain}/${term}`;
                        } else {
                            setError("No results found");
                            setIsSearching(false);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error("Search failed", err);
                // Fallback for hashes
                if (isEthHash || term.length >= 64) {
                    route = `/tx/${chain}/${term}`;
                } else {
                    setError("Search failed");
                    setIsSearching(false);
                    return;
                }
            }
        }

        router.push(route);
        setSearch("");
        setIsSearching(false);
    };

    return (
        <form onSubmit={handleSearch} className={`relative ${className}`}>
            <div className="relative">
                {isSearching ? (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                    ref={inputRef}
                    type="search"
                    placeholder="Search..."
                    className={`pl-9 pr-20 h-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-lg ${error ? "ring-1 ring-red-500/50" : ""}`}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (error) setError(null);
                    }}
                />

                {error && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-red-500 font-medium animate-in fade-in slide-in-from-right-2">
                        {error}
                    </div>
                )}

                <div className={`absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-xs text-muted-foreground ${error ? "hidden" : ""}`}>
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                        <Command className="h-3 w-3" />K
                    </kbd>
                </div>
            </div>
        </form>
    );
}

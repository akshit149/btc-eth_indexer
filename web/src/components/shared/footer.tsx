import Link from "next/link";
import { Terminal, Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-background/60 backdrop-blur-xl mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-card to-card/50 border border-white/[0.08] flex items-center justify-center">
                <Terminal className="w-4 h-4 text-foreground/80" />
              </div>
              <span className="font-bold text-lg tracking-tight">ChainScope</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Next-generation blockchain analytics for Bitcoin and Ethereum.
            </p>
            <div className="flex items-center gap-2">
              <Link 
                href="#" 
                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.06] transition-all"
              >
                <Github className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link 
                href="#" 
                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.06] transition-all"
              >
                <Twitter className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="data-label mb-4">Explore</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/stats/btc" className="text-muted-foreground hover:text-btc transition-colors">
                  Bitcoin
                </Link>
              </li>
              <li>
                <Link href="/stats/eth" className="text-muted-foreground hover:text-eth transition-colors">
                  Ethereum
                </Link>
              </li>
              <li>
                <Link href="/system" className="text-muted-foreground hover:text-foreground transition-colors">
                  System Health
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="data-label mb-4">Resources</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  API Docs
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="data-label mb-4">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ChainScope. All rights reserved.
          </span>
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            v2.0
          </span>
        </div>
      </div>
    </footer>
  );
}

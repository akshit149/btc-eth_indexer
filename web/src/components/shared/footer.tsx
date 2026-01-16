import Link from "next/link";
import { Terminal, Github, Twitter } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-border/30 bg-background/80 backdrop-blur-xl mt-auto">
            <div className="container mx-auto px-6 py-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2.5 font-bold text-lg">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-border/50 flex items-center justify-center">
                                <Terminal className="h-4 w-4 text-primary" />
                            </div>
                            <span className="tracking-tight">ChainScope</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Professional-grade blockchain analytics for Bitcoin and Ethereum networks.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <Link href="#" className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                                <Github className="h-4 w-4 text-muted-foreground" />
                            </Link>
                            <Link href="#" className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                                <Twitter className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        </div>
                    </div>

                    {/* Protocol */}
                    <div>
                        <h3 className="font-semibold mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">Protocol</h3>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-foreground transition-colors">Documentation</Link></li>
                            <li><Link href="#" className="hover:text-foreground transition-colors">API Reference</Link></li>
                            <li><Link href="#" className="hover:text-foreground transition-colors">System Status</Link></li>
                        </ul>
                    </div>

                    {/* Explore */}
                    <div>
                        <h3 className="font-semibold mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">Explore</h3>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li><Link href="/stats/btc" className="hover:text-btc transition-colors">Bitcoin</Link></li>
                            <li><Link href="/stats/eth" className="hover:text-eth transition-colors">Ethereum</Link></li>
                            <li><Link href="#" className="hover:text-foreground transition-colors">Recent Blocks</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="font-semibold mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">Legal</h3>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                            <li><Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-10 pt-6 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <span>&copy; {new Date().getFullYear()} ChainScope. All rights reserved.</span>
                    <span className="text-xs">Built with ❤️ for the blockchain community</span>
                </div>
            </div>
        </footer>
    );
}


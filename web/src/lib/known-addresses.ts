/**
 * Known address labels for name tags
 * Add more as needed
 */
export const KNOWN_ADDRESSES: Record<string, { name: string; type: "exchange" | "contract" | "whale" | "bridge" }> = {
    // Ethereum
    "0xdac17f958d2ee523a2206206994597c13d831ec7": { name: "Tether: USDT", type: "contract" },
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { name: "Circle: USDC", type: "contract" },
    "0x28c6c06298d514db089934071355e5743bf21d60": { name: "Binance Hot Wallet", type: "exchange" },
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549": { name: "Binance Hot Wallet 2", type: "exchange" },
    "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503": { name: "Binance Cold Wallet", type: "exchange" },
    "0x974caa59e49682cda0ad2bbe82983419a2ecc400": { name: "Coinbase Prime", type: "exchange" },
    "0x503828976d22510aad0201ac7ec88293211d23da": { name: "Coinbase", type: "exchange" },
    "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": { name: "Binance 7", type: "exchange" },
    "0xf977814e90da44bfa03b6295a0616a897441acec": { name: "Binance 8", type: "exchange" },
    "0x5a52e96bacdabb82fd05763e25335261b270efcb": { name: "Binance 9", type: "exchange" },
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { name: "WETH", type: "contract" },
    "0x6b175474e89094c44da98b954eedeac495271d0f": { name: "Dai Stablecoin", type: "contract" },
    "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": { name: "Uniswap", type: "contract" },
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": { name: "Uniswap V2 Router", type: "contract" },
    "0x7f268357a8c2552623316e2562d90e642bb538e5": { name: "OpenSea", type: "contract" },

    // Bitcoin (example addresses - not real)
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa": { name: "Satoshi's Genesis", type: "whale" },
    "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97": { name: "Bitfinex Cold", type: "exchange" },
};

/**
 * Get label for a known address
 */
export function getAddressLabel(address: string): { name: string; type: string } | null {
    const normalized = address.toLowerCase();
    return KNOWN_ADDRESSES[normalized] || null;
}

/**
 * Get badge color for address type
 */
export function getAddressTypeColor(type: string): string {
    switch (type) {
        case "exchange": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        case "contract": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
        case "whale": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "bridge": return "bg-green-500/20 text-green-400 border-green-500/30";
        default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
}

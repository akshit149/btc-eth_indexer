// Entity Labels - Maps known addresses to human-readable names
// This is a simplified version - in production, this would be fetched from API

export interface EntityLabel {
    name: string;
    type: "exchange" | "defi" | "nft" | "whale" | "contract" | "bridge" | "unknown";
    logo?: string;
}

// Well-known Ethereum addresses
const ETH_LABELS: Record<string, EntityLabel> = {
    // Exchanges
    "0x28c6c06298d514db089934071355e5743bf21d60": { name: "Binance", type: "exchange" },
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549": { name: "Binance", type: "exchange" },
    "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": { name: "Binance", type: "exchange" },
    "0x56eddb7aa87536c09ccc2793473599fd21a8b17f": { name: "Binance", type: "exchange" },
    "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be": { name: "Binance", type: "exchange" },
    "0xd551234ae421e3bcba99a0da6d736074f22192ff": { name: "Binance", type: "exchange" },
    "0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67": { name: "Binance US", type: "exchange" },
    "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": { name: "Coinbase", type: "exchange" },
    "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": { name: "Coinbase", type: "exchange" },
    "0x503828976d22510aad0201ac7ec88293211d23da": { name: "Coinbase", type: "exchange" },
    "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740": { name: "Coinbase", type: "exchange" },
    "0x3cd751e6b0078be393132286c442345e5dc49699": { name: "Coinbase", type: "exchange" },
    "0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511": { name: "Coinbase", type: "exchange" },
    "0xeb2629a2734e272bcc07bda959863f316f4bd4cf": { name: "Coinbase", type: "exchange" },
    "0x02466e547bfdab679fc49e96bbfc62b9747d997c": { name: "Coinbase", type: "exchange" },
    "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b": { name: "OKX", type: "exchange" },
    "0x236f9f97e0e62388479bf9e5ba4889e46b0273c3": { name: "OKX", type: "exchange" },
    "0x75e89d5979e4f6fba9f97c104c2f0afb3f1dcb88": { name: "MEXC", type: "exchange" },
    "0x2910543af39aba0cd09dbb2d50200b3e800a63d2": { name: "Kraken", type: "exchange" },
    "0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13": { name: "Kraken", type: "exchange" },
    "0xe94b04a0fed112f3664e45adb2b8915693dd5ff3": { name: "Bittrex", type: "exchange" },
    "0xfbb1b73c4f0bda4f67dca266ce6ef42f520fbb98": { name: "Bittrex", type: "exchange" },
    "0x1151314c646ce4e0efd76d1af4760ae66a9fe30f": { name: "Bitfinex", type: "exchange" },
    "0x742d35cc6634c0532925a3b844bc454e4438f44e": { name: "Bitfinex", type: "exchange" },
    "0x876eabf441b2ee5b5b0554fd502a8e0600950cfa": { name: "Bitfinex", type: "exchange" },
    "0xdc76cd25977e0a5ae17155770273ad58648900d3": { name: "Bitfinex", type: "exchange" },
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5": { name: "Compound cETH", type: "defi" },

    // DeFi
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": { name: "Uniswap V2 Router", type: "defi" },
    "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": { name: "Uniswap V3 Router", type: "defi" },
    "0xe592427a0aece92de3edee1f18e0157c05861564": { name: "Uniswap V3 Router", type: "defi" },
    "0x1111111254eeb25477b68fb85ed929f73a960582": { name: "1inch Router", type: "defi" },
    "0xdef1c0ded9bec7f1a1670819833240f027b25eff": { name: "0x Exchange", type: "defi" },
    "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f": { name: "SushiSwap Router", type: "defi" },
    "0x881d40237659c251811cec9c364ef91dc08d300c": { name: "Metamask Swap", type: "defi" },
    "0x00000000006c3852cbef3e08e8df289169ede581": { name: "OpenSea", type: "nft" },
    "0x00000000000000adc04c56bf30ac9d3c0aaf14dc": { name: "Seaport", type: "nft" },

    // Bridges
    "0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf": { name: "Polygon Bridge", type: "bridge" },
    "0xa0c68c638235ee32657e8f720a23cec1bfc77c77": { name: "Polygon Bridge", type: "bridge" },
    "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1": { name: "Optimism Bridge", type: "bridge" },
    "0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f": { name: "Arbitrum Bridge", type: "bridge" },

    // Stablecoins & Tokens
    "0xdac17f958d2ee523a2206206994597c13d831ec7": { name: "Tether Treasury", type: "contract" },
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { name: "USDC", type: "contract" },
    "0x6b175474e89094c44da98b954eedeac495271d0f": { name: "DAI", type: "contract" },
};

// Well-known Bitcoin addresses (simplified)
const BTC_LABELS: Record<string, EntityLabel> = {
    "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97": { name: "Bitfinex", type: "exchange" },
    "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h": { name: "Binance", type: "exchange" },
    "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo": { name: "Binance", type: "exchange" },
    "3M219KR5vEneNb47ewrPfWyb5jQ2DjxRP6": { name: "Binance", type: "exchange" },
    "bc1qx9t2l3pyny2spqpqlye8svce70nppwtaxwdrp4": { name: "Binance", type: "exchange" },
};

export function getEntityLabel(address: string, chain: "eth" | "btc"): EntityLabel | null {
    const normalizedAddress = address.toLowerCase();

    if (chain === "eth") {
        return ETH_LABELS[normalizedAddress] || null;
    } else {
        return BTC_LABELS[address] || BTC_LABELS[normalizedAddress] || null;
    }
}

export function getEntityBadgeColor(type: EntityLabel["type"]): string {
    switch (type) {
        case "exchange":
            return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        case "defi":
            return "bg-purple-500/20 text-purple-400 border-purple-500/30";
        case "nft":
            return "bg-pink-500/20 text-pink-400 border-pink-500/30";
        case "whale":
            return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        case "contract":
            return "bg-green-500/20 text-green-400 border-green-500/30";
        case "bridge":
            return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
        default:
            return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
}

export function getEntityIcon(type: EntityLabel["type"]): string {
    switch (type) {
        case "exchange":
            return "🏦";
        case "defi":
            return "💱";
        case "nft":
            return "🖼️";
        case "whale":
            return "🐋";
        case "contract":
            return "📜";
        case "bridge":
            return "🌉";
        default:
            return "❓";
    }
}

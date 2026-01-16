/**
 * Blockchain value formatting utilities
 */

// Mock prices for USD conversion (in real app, fetch from API)
const MOCK_PRICES = {
    btc: 95432,
    eth: 3421,
};

/**
 * Convert Wei to ETH with formatting
 */
export function formatEth(weiValue: string | number, decimals = 4): string {
    if (!weiValue || weiValue === "0") return "0 ETH";

    const wei = BigInt(weiValue.toString());
    const ethValue = Number(wei) / 1e18;

    if (ethValue < 0.0001) {
        return `${ethValue.toExponential(2)} ETH`;
    }

    return `${ethValue.toFixed(decimals)} ETH`;
}

/**
 * Convert Satoshi to BTC with formatting
 */
export function formatBtc(satoshiValue: string | number, decimals = 8): string {
    if (!satoshiValue || satoshiValue === "0") return "0 BTC";

    const satoshi = BigInt(satoshiValue.toString());
    const btcValue = Number(satoshi) / 1e8;

    return `${btcValue.toFixed(decimals)} BTC`;
}

/**
 * Format any blockchain value based on chain
 */
export function formatValue(value: string | number, chain: "btc" | "eth"): string {
    if (!value || value === "0" || value === "") return chain === "btc" ? "0 BTC" : "0 ETH";

    return chain === "btc" ? formatBtc(value) : formatEth(value);
}

/**
 * Get USD value estimate
 */
export function formatUsd(value: string | number, chain: "btc" | "eth"): string {
    if (!value || value === "0" || value === "") return "$0.00";

    try {
        const numValue = chain === "btc"
            ? Number(BigInt(value.toString())) / 1e8
            : Number(BigInt(value.toString())) / 1e18;

        const usdValue = numValue * MOCK_PRICES[chain];

        if (usdValue < 0.01) {
            return "< $0.01";
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(usdValue);
    } catch {
        return "$0.00";
    }
}

/**
 * Format gas value
 */
export function formatGas(gas: number | string): string {
    const gasNum = Number(gas);
    if (gasNum >= 1000000) {
        return `${(gasNum / 1000000).toFixed(2)}M`;
    }
    if (gasNum >= 1000) {
        return `${(gasNum / 1000).toFixed(1)}K`;
    }
    return gasNum.toLocaleString();
}

/**
 * Format gas price in Gwei
 */
export function formatGwei(wei: string | number): string {
    if (!wei) return "0 Gwei";
    const gwei = Number(wei) / 1e9;
    return `${gwei.toFixed(2)} Gwei`;
}

/**
 * Shorten hash for display
 */
export function shortenHash(hash: string, startChars = 6, endChars = 4): string {
    if (!hash || hash.length < startChars + endChars + 3) return hash;
    return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string): string {
    return shortenHash(address, 6, 4);
}

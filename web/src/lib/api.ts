import axios from "axios";
import { Block, Transaction, TxResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add interceptor to include API Key if we implement auth later
api.interceptors.request.use((config) => {
    // For validation runbook, check query params or env, but localstorage is primary for real app.
    // We default to "test" for the certification run if missing.
    const apiKey = typeof window !== "undefined" ? localStorage.getItem("api_key") : null;
    config.headers["X-API-Key"] = apiKey || "test";
    return config;
});

export const getHealth = async () => {
    const { data } = await api.get("/health");
    return data;
};

export const getLatestBlock = async (chain: "btc" | "eth"): Promise<Block> => {
    const { data } = await api.get(`/blocks/latest?chain=${chain}`);
    return data;
};

export const getBlock = async (chain: "btc" | "eth", heightOrHash: string): Promise<Block> => {
    const { data } = await api.get(`/blocks/${chain}/${heightOrHash}`);
    return data;
};

export const getTransaction = async (chain: "btc" | "eth", hash: string): Promise<Transaction> => {
    const { data } = await api.get(`/tx/${chain}/${hash}`);
    return data;
};

export const getAddressTxs = async (
    chain: "btc" | "eth",
    address: string,
    cursor?: string,
    limit = 20
): Promise<TxResponse> => {
    const { data } = await api.get(`/address/${chain}/${address}/txs`, {
        params: { cursor, limit }
    });
    return data;
};

export const getEvents = async (
    chain: "eth",
    topic0?: string,
    from_height?: number,
    to_height?: number,
    cursor?: string
) => {
    const { data } = await api.get("/events", {
        params: { chain, topic0, from_height, to_height, cursor }
    });
    return data;
};

// ------------ NEW EXPLORER APIs ------------

export const getLatestTxs = async (chain: "btc" | "eth", limit = 20): Promise<Transaction[]> => {
    const { data } = await api.get(`/txs/latest`, {
        params: { chain, limit }
    });
    return data;
};

export const getStats = async (chain: "btc" | "eth") => {
    const { data } = await api.get(`/stats/${chain}`);
    return data;
};

export const getBlockTxs = async (
    chain: "btc" | "eth",
    blockId: string,
    cursor?: string,
    limit = 25
): Promise<{ block: Block; page: { next_cursor: string; limit: number }; transactions: Transaction[] }> => {
    const { data } = await api.get(`/blocks/${chain}/${blockId}/txs`, {
        params: { cursor, limit }
    });
    return data;
};

export const getBlocksRange = async (
    chain: "btc" | "eth",
    from: number,
    to: number
) => {
    const { data } = await api.get(`/blocks/${chain}/range`, {
        params: { from, to }
    });
    return data;
};

export const getAddressBalance = async (chain: "btc" | "eth", address: string): Promise<{ balance: string; address: string; chain: string }> => {
    const { data } = await api.get(`/balance/${chain}/${address}`);
    return data;
};

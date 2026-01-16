"use client";

import { Transaction } from "@/types";

export function useCsvExport(data: Transaction[], filename: string) {
    const handleExport = () => {
        if (!data || data.length === 0) return;

        const headers = ["TxHash", "BlockHeight", "From", "To", "Value", "Fee", "Status"];
        const csvContent = [
            headers.join(","),
            ...data.map(tx => [
                tx.TxHash,
                tx.BlockHeight,
                tx.FromAddr,
                tx.ToAddr,
                tx.Value,
                tx.Fee,
                tx.Status
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return handleExport;
}
